import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithGoogle, auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { generateSecret, verifySync } from 'otplib';
import { 
  LogIn, UserPlus, Github, Mail, Chrome, 
  ShieldCheck, ArrowRight, RotateCcw, AlertCircle,
  Key as KeyIcon, Sparkles
} from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'auth' | 'verify'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [currentStep, setCurrentStep] = useState<'auth' | 'verify' | '2fa'>('auth');
  const [tempUser, setTempUser] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [generatedCode, setGeneratedCode] = useState(''); // Simulated for demo
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const codeRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  React.useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(docSnap => {
        if (docSnap.exists()) {
           const data = docSnap.data();
           if (data.isVerified === false) {
             setGeneratedCode(data.verificationCode);
             setCurrentStep('verify');
           }
        }
      });
    }
  }, []);

  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    return code;
  };

  const handleAuth = async () => {
    if (!isCaptchaVerified) {
      setError('Пожалуйста, подтвердите, что вы не робот');
      return;
    }
    if (!email || !password || (!isLogin && !displayName)) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (!isLogin) {
      const nameRegex = /^[a-zA-Z0-9_а-яА-ЯёЁ\s]{3,20}$/;
      if (!nameRegex.test(displayName.trim())) {
        setError('Имя должно быть от 3 до 20 символов и не содержать спецсимволов.');
        return;
      }

      const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!handleRegex.test(handle)) {
        setError('Никнейм-ID может содержать только латиницу, цифры и подчеркивание.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Find email by handle or email
        let loginEmail = email;
        if (!email.includes('@')) {
          const q = query(collection(db, 'users'), where('handle', '==', email.toLowerCase()));
          const snap = await getDocs(q);
          if (snap.empty) {
             throw new Error('Пользователь с таким ником не найден');
          }
          loginEmail = snap.docs[0].data().email;
        }

        const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        const userData = userDoc.data();

        if (userData?.isVerified === false) {
          setGeneratedCode(userData.verificationCode);
          setCurrentStep('verify');
          setTimeout(() => {
            alert(`[SIMULATION] Код подтверждения отправлен на ${loginEmail}: ${userData.verificationCode}`);
          }, 500);
          return;
        }

        if (userData?.twoFactorEnabled) {
          // If they provided code in the first step, verify it
          if (twoFactorCode) {
            const isValid = verifySync({ token: twoFactorCode, secret: userData.twoFactorSecret });
            if (!isValid) {
              await auth.signOut();
              throw new Error('Неверный код 2FA');
            }
          } else {
            setTempUser(cred.user);
            setCurrentStep('2fa');
            return;
          }
        }

        navigate('/chat');
      } else {
        // Check handle uniqueness
        const q = query(collection(db, 'users'), where('handle', '==', handle.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error('Такой ник уже занят');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });
        
        const code = generateCode();
        
        const configRef = doc(db, 'system', 'config');
        const configSnap = await getDoc(configRef);
        let nextId: number;
        let availableIds: number[] = [];

        if (configSnap.exists()) {
          const data = configSnap.data();
          availableIds = data.availableIds || [];
          if (availableIds.length > 0) {
            nextId = availableIds.shift()!;
            await setDoc(configRef, { availableIds }, { merge: true });
          } else {
            nextId = (data.userSequence || 0) + 1;
            await setDoc(configRef, { userSequence: nextId }, { merge: true });
          }
        } else {
          nextId = 1;
          await setDoc(configRef, { userSequence: nextId, availableIds: [] });
        }
        
        // Role assignment
        const role = email.toLowerCase() === 'iluha1032020@gmail.com' ? 'creator' : 'user';

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          id: nextId,
          displayName,
          handle: handle.toLowerCase(),
          email: user.email,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
          theme: 'dark',
          isVerified: false,
          verificationCode: code,
          role: role,
          createdAt: serverTimestamp()
        }, { merge: true });
        
        setCurrentStep('verify');
        setTimeout(() => {
          alert(`[SIMULATION] Код подтверждения отправлен на ${email}: ${code}`);
        }, 1000);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Регистрация по почте отключена. Пожалуйста, зайдите через Google или включите Email/Password в Firebase Console.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!tempUser || !twoFactorCode) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', tempUser.uid));
      const secret = userDoc.data()?.twoFactorSecret;
      
      const isValid = verifySync({ token: twoFactorCode, secret });
      if (isValid) {
        navigate('/chat');
      } else {
        setError('Неверный код 2FA');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const enteredCode = verificationCode.join('');
    if (enteredCode === generatedCode) {
      setLoading(true);
      try {
        await setDoc(doc(db, 'users', auth.currentUser!.uid), { isVerified: true }, { merge: true });
        navigate('/chat');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Неверный код подтверждения');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    if (!isCaptchaVerified) {
      setError('Пожалуйста, подтвердите, что вы не робот');
      return;
    }
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/chat');
    } catch (err: any) {
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/20"
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">
            {isLogin ? 'С возвращением' : 'Присоединяйтесь к Nova'}
          </h2>
          <p className="text-zinc-400 font-medium">Безопасный вход в мессенджер</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentStep === 'auth' ? (
            <motion.div 
              key="auth"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder={isLogin ? "Email или @никнейм" : "Email адрес"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                />
              </div>

              {!isLogin && (
                <>
                  <div className="relative group">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Имя (Display Name)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                    />
                  </div>
                  <div className="relative group">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Уникальный @никнейм (без пробелов)"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                    />
                  </div>
                </>
              )}

              <div className="relative group">
                <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                />
              </div>

              {isLogin && (
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="2FA Код (если есть)"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 px-4">Если 2FA не настроен, оставьте поле пустым</p>
                </div>
              )}

              <div className="flex justify-center py-2 overflow-hidden rounded-xl">
                 <ReCAPTCHA
                  sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" 
                  onChange={(val) => setIsCaptchaVerified(!!val)}
                  theme="dark"
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAuth}
                disabled={loading}
                className={`w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {loading ? 'Обработка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </motion.button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">Или войти через</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className={`flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-colors ${isGoogleLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isGoogleLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5" />}
                  <span className="text-sm font-medium">Google</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-colors"
                >
                  <Github className="w-5 h-5" />
                  <span className="text-sm font-medium">GitHub</span>
                </motion.button>
              </div>
            </motion.div>
          ) : currentStep === '2fa' ? (
            <motion.div 
              key="2fa"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center text-indigo-500">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Двухфакторная защита</h3>
              <p className="text-zinc-400 text-sm mb-8">Введите код из вашего аутентификатора</p>
              
              <div className="relative group mb-8">
                <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify2FA()}
                  className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-center text-2xl tracking-[0.3em] font-black text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerify2FA}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all mb-4"
              >
                {loading ? 'Проверка...' : 'Войти'}
              </motion.button>

              <button 
                onClick={() => setCurrentStep('auth')}
                className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm w-full font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Вернуться назад
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="verify"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center text-indigo-500">
                <KeyIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Подтвердите Email</h3>
              <p className="text-zinc-400 text-sm mb-8">Мы отправили 6-значный код на <br/><span className="text-indigo-400 font-medium">{email}</span></p>
              
              <div className="flex justify-center gap-2 mb-8">
                {verificationCode.map((digit, i) => (
                  <input 
                    key={i}
                    ref={codeRefs[i]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    className="w-12 h-14 bg-zinc-800/50 border border-white/5 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                ))}
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerify}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all mb-4"
              >
                {loading ? 'Проверка...' : 'Подтвердить'}
              </motion.button>

              <button 
                onClick={() => setStep('auth')}
                className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm w-full font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Вернуться назад
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-zinc-400 text-sm">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
