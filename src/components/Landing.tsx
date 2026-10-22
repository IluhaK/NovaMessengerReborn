import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Zap, Sparkles, MoveRight, Layers, Fingerprint } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Nova <span className="text-indigo-400">Rework</span></span>
        </div>
        
        <button 
          onClick={() => navigate('/auth')}
          className="group relative px-6 py-2.5 rounded-full overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <span className="relative text-sm font-medium">Вход</span>
        </button>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-40 pb-20 lg:pt-52 lg:pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-8"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Новое измерение общения
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-8 max-w-4xl leading-[1.1]"
        >
          Реальное время. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Абсолютная свобода.
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 font-medium leading-relaxed"
        >
          Мессенджер, который стирает границы. Моментальные сообщения, безупречный дизайн и бескомпромиссная безопасность в каждом пикселе.
        </motion.p>
        
        <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <button 
            onClick={() => navigate('/auth')}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Начать прямо сейчас
            <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </main>

      {/* Floating UI Elements Showcase */}
      <section className="relative z-10 w-full overflow-hidden py-20 bg-black/40 border-y border-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 relative h-[400px] flex items-center justify-center">
            <motion.div style={{ y: y1 }} className="absolute left-[10%] top-10">
              <div className="bg-zinc-900/80 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-indigo-400" /></div>
                <div>
                  <div className="text-xs text-zinc-500">Биометрия</div>
                  <div className="text-sm font-medium">Доступ разрешен</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div style={{ y: y2 }} className="absolute right-[10%] bottom-10 z-20">
              <div className="bg-zinc-900/80 backdrop-blur border border-white/10 rounded-2xl p-5 shadow-2xl max-w-xs">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-zinc-500">Сейчас</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div className="text-sm leading-relaxed">Привет! Обновленный интерфейс выглядит просто космически 🚀</div>
              </div>
            </motion.div>

            <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               whileInView={{ scale: 1, opacity: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 1, ease: "easeOut" }}
               className="relative z-10 w-full max-w-lg aspect-[4/3] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center group"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center p-6 group-hover:scale-110 transition-transform duration-700">
                <Layers className="w-full h-full text-white/50" />
              </div>
            </motion.div>
        </div>
      </section>

      {/* Minimal Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Zap />, title: "Молниеносно", desc: "Минимальный пинг. Сообщения доставляются мгновенно." },
            { icon: <ShieldCheck />, title: "Безопасно", desc: "Строгие политики доступа и защита от спама." },
            { icon: <MessageSquare />, title: "Удобно", desc: "Ничего лишнего. Фокус только на вашем общении." }
          ].map((f, i) => (
            <motion.div 
              key={f.title}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 + 0.2 }}
              className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-indigo-400">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
