import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithGoogle, auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { verifySync } from 'otplib';
import { 
  LogIn, UserPlus, Mail, Chrome, 
  ShieldCheck, ArrowRight, RotateCcw, AlertCircle,
  Key as KeyIcon, Sparkles, Lock, CheckCircle2, Copy
} from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { ThreeHoloOrb } from './ThreeHoloOrb';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [currentStep, setCurrentStep] = useState<'auth' | 'verify' | '2fa'>('auth');
  const [tempUser, setTempUser] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [generatedCode, setGeneratedCode] = useState('');
  const [demoNotification, setDemoNotification] = useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
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
      setError('Пожалуйста, подтвердите капчу');
      return;
    }
    if (!email || !password || (!isLogin && !displayName)) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (!isLogin) {
      const nameRegex = /^[a-zA-Z0-9_а-яА-ЯёЁ\s]{3,20}$/;
      if (!nameRegex.test(displayName.trim())) {
        setError('Имя должно быть от 3 до 20 символов и без спецсимволов.');
        return;
      }

      const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!handleRegex.test(handle)) {
        setError('Никнейм может содержать только латиницу, цифры и подчеркивание (3-20 символов).');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Find email by handle or email
        let loginEmail = email.trim();
        if (!loginEmail.includes('@')) {
          const cleanHandle = loginEmail.replace(/^@/, '').toLowerCase();
          const q = query(collection(db, 'users'), where('handle', '==', cleanHandle));
          const snap = await getDocs(q);
          if (snap.empty) {
             throw new Error('Пользователь с таким никнеймом не найден');
          }
          loginEmail = snap.docs[0].data().email;
        }

        const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        const userData = userDoc.data();

        if (userData?.isVerified === false) {
          setGeneratedCode(userData.verificationCode);
          setCurrentStep('verify');
          setDemoNotification(`Код верификации: ${userData.verificationCode}`);
          return;
        }

        if (userData?.twoFactorEnabled) {
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
        const cleanHandle = handle.replace(/^@/, '').toLowerCase();
        const q = query(collection(db, 'users'), where('handle', '==', cleanHandle));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error('Этот никнейм уже занят');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: displayName.trim() });
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
          displayName: displayName.trim(),
          handle: cleanHandle,
          email: user.email,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          theme: 'oled',
          isVerified: false,
          verificationCode: code,
          role: role,
          createdAt: serverTimestamp()
        }, { merge: true });
        
        setCurrentStep('verify');
        setDemoNotification(`Код подтверждения для теста: ${code}`);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Регистрация по почте отключена. Пожалуйста, зайдите через Google или включите Email/Password в Firebase Console.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Неверный логин или пароль');
      } else {
        setError(err.message || 'Ошибка авторизации');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!tempUser || !twoFactorCode) {
      setError('Введите 6-значный код');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userDoc = await getDoc(doc(db, 'users', tempUser.uid));
      const secret = userDoc.data()?.twoFactorSecret;
      
      const isValid = verifySync({ token: twoFactorCode, secret });
      if (isValid) {
        navigate('/chat');
      } else {
        setError('Неверный код 2FA. Попробуйте еще раз.');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка проверки 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const enteredCode = verificationCode.join('');
    if (enteredCode === generatedCode) {
      setLoading(true);
      setError('');
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

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    if (!isCaptchaVerified) {
      setError('Пожалуйста, подтвердите капчу');
      return;
    }
    setIsGoogleLoading(true);
    setError('');
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
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Futuristic Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/5 rounded-full blur-[200px]" />
        
        {/* Neon Cyber Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.07]" 
          style={{
            backgroundImage: `linear-gradient(to right, rgba(56, 189, 248, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.4) 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }} 
        />
      </div>

      <motion.div 
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-zinc-950/70 backdrop-blur-2xl border border-cyan-500/20 rounded-[2.2rem] p-7 sm:p-9 shadow-[0_0_50px_rgba(6,182,212,0.12)] relative z-10"
      >
        {/* Hologram 3D Core Visual Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-2">
            <ThreeHoloOrb size={130} interactive={true} />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono tracking-widest text-cyan-400 uppercase shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              NOVA PROTOCOL
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-sky-400 bg-clip-text text-transparent">
            {currentStep === '2fa' ? '2FA Аутентификация' : currentStep === 'verify' ? 'Код подтверждения' : isLogin ? 'Авторизация в Nova' : 'Регистрация аккаунта'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            {currentStep === '2fa' ? 'Введите одноразовый ключ' : currentStep === 'verify' ? 'Проверка безопасности' : 'Защищенный квантовый мессенджер нового поколения'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (when in auth step) */}
        {currentStep === 'auth' && (
          <div className="flex p-1 bg-zinc-900/80 border border-white/5 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isLogin
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/25'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Вход
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                !isLogin
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/25'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Регистрация
            </button>
          </div>
        )}

        {/* Demo Notification / Simulation Badge */}
        {demoNotification && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs text-cyan-300 font-mono"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>{demoNotification}</span>
            </div>
            <button 
              onClick={() => {
                const match = demoNotification.match(/\d{6}/);
                if (match) {
                  const digits = match[0].split('');
                  setVerificationCode(digits);
                }
              }}
              className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 rounded-lg text-[10px] font-sans flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Вставить
            </button>
          </motion.div>
        )}

        {/* Error Notification */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentStep === 'auth' ? (
            <motion.div 
              key="auth"
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 16, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              {/* Email / Nickname field */}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder={isLogin ? "Email или @никнейм" : "Email адрес"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
                />
              </div>

              {/* Registration Extra Fields */}
              {!isLogin && (
                <>
                  <div className="relative group">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Имя отображения (Display Name)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
                    />
                  </div>
                  <div className="relative group">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Уникальный @хэндл (латиница)"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans font-mono"
                    />
                  </div>
                </>
              )}

              {/* Password field */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="password" 
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
                />
              </div>

              {/* 2FA optional input during login */}
              {isLogin && (
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="2FA Код (если включен)"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono tracking-wider"
                  />
                </div>
              )}

              {/* ReCAPTCHA Box */}
              <div className="flex justify-center py-1 overflow-hidden rounded-xl">
                 <ReCAPTCHA
                  sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" 
                  onChange={(val) => setIsCaptchaVerified(!!val)}
                  theme="dark"
                />
              </div>

              {/* Primary Submit Button */}
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleAuth}
                disabled={loading}
                className={`w-full py-3.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 text-sm ${loading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {loading ? 'Обработка данных...' : (isLogin ? 'Войти в Nova' : 'Завершить регистрацию')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </motion.button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-[10px] tracking-widest uppercase font-mono"><span className="bg-zinc-950 px-2.5 text-zinc-500">Или продолжить через</span></div>
              </div>

              {/* Google Fast Sign-in */}
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className={`w-full flex items-center justify-center gap-2.5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-colors text-xs font-medium text-zinc-200 ${isGoogleLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isGoogleLoading ? <Sparkles className="w-4 h-4 animate-spin text-cyan-400" /> : <Chrome className="w-4 h-4 text-cyan-400" />}
                <span>Войти через Google аккаунт</span>
              </motion.button>
            </motion.div>
          ) : currentStep === '2fa' ? (
            /* Perfectly Centered 2FA Screen - Fixes the crooked icon! */
            <motion.div 
              key="2fa"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="text-center pt-2"
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Двухфакторная защита</h3>
              <p className="text-zinc-400 text-xs mb-6 max-w-xs mx-auto">
                Откройте Google Authenticator или ваш 2FA-клиент и введите 6-значный код
              </p>
              
              <div className="mb-6">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="000 000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify2FA()}
                  className="w-full bg-zinc-900/90 border border-cyan-500/40 rounded-2xl py-4 px-4 text-center text-3xl tracking-[0.35em] font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 transition-all shadow-inner"
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleVerify2FA}
                disabled={loading || twoFactorCode.length < 6}
                className={`w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-cyan-500/20 transition-all mb-3 text-sm flex items-center justify-center gap-2 ${loading || twoFactorCode.length < 6 ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Проверка ключа...' : 'Подтвердить вход'}
                <CheckCircle2 className="w-4 h-4" />
              </motion.button>

              <button 
                onClick={() => { setCurrentStep('auth'); setError(''); }}
                className="flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white text-xs w-full py-2 font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Вернуться к вводу логина
              </button>
            </motion.div>
          ) : (
            /* Email Verification Step */
            <motion.div 
              key="verify"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="text-center pt-2"
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                <KeyIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Подтвердите адрес Email</h3>
              <p className="text-zinc-400 text-xs mb-6">
                Введите 6-значный код безопасности для завершения настройки
              </p>
              
              <div className="flex justify-center gap-2 sm:gap-2.5 mb-6">
                {verificationCode.map((digit, i) => (
                  <input 
                    key={i}
                    ref={codeRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    className="w-11 h-13 sm:w-12 sm:h-14 bg-zinc-900/90 border border-cyan-500/30 rounded-xl text-center text-xl font-bold font-mono text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                  />
                ))}
              </div>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleVerify}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-cyan-500/20 transition-all mb-3 text-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Верификация...' : 'Подтвердить и войти'}
                <CheckCircle2 className="w-4 h-4" />
              </motion.button>

              <button 
                onClick={() => { setCurrentStep('auth'); setError(''); }}
                className="flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white text-xs w-full py-2 font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Вернуться назад
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
