import { useState } from 'react';
import { motion } from 'framer-motion';
import { GoogleAuthProvider, signInWithPopup } from '../../firebase';
import { auth, configStatus } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen = () => {
  const { error: contextError } = useAuth();
  const [error, setError] = useState<string | null>(contextError);
  
  // CHECK CONFIGURATION STATUS -> If invalid, we use PHANTOM MODE
  const isPhantomMode = !configStatus.isValid;

  const handleGoogleLogin = async () => {
    // In Phantom Mode, this will use the mock login
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login Failed:", err);
      setError(err.message || "Uplink connection failed.");
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex items-center justify-center">
      {/* --- ATMOSPHERIC BACKGROUND --- */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500 rounded-full blur-[150px] opacity-20 animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-fuchsia-600 rounded-full blur-[150px] opacity-20 animate-pulse-slow delay-1000" />
      
      {/* --- GRID OVERLAY --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      <div className="absolute inset-0 bg-grid-white/[0.02]" />

      {/* --- GLASS MONOLITH --- */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", duration: 1.5 }}
        className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)] flex flex-col items-center gap-8"
      >
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            MATRIX OS
          </h1>
          <motion.p 
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`font-mono text-xs tracking-wider ${isPhantomMode ? 'text-amber-400' : 'text-emerald-400'}`}
          >
            {isPhantomMode ? '> SYSTEM READY. SIMULATION MODE ACTIVE.' : '> SYSTEM READY. WAITING FOR UPLINK...'}
          </motion.p>
        </div>

        {/* ERROR DISPLAY OR INSTRUCTIONS */}
        {(error || isPhantomMode) && (
          <div className={`w-full p-4 rounded-lg text-left space-y-2 ${isPhantomMode ? 'bg-amber-950/30 border border-amber-500/30' : 'bg-red-950/30 border border-red-500/30'}`}>
            <div className={`flex items-center gap-2 text-xs font-mono font-bold uppercase border-b pb-2 ${isPhantomMode ? 'text-amber-400 border-amber-500/20' : 'text-red-400 border-red-500/20'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isPhantomMode ? 'SIMULATION ENVIRONMENT' : 'CONNECTION ERROR'}
            </div>
            
            {isPhantomMode ? (
                <div className="text-gray-300 text-xs font-mono leading-relaxed">
                    <p className="mb-2 text-amber-200/80">Running in offline Phantom Mode.</p>
                    <p className="text-gray-400">Database changes are temporary and will reset on reload. Configure .env for persistence.</p>
                </div>
            ) : (
                <p className="text-red-300 text-xs font-mono">{error}</p>
            )}
          </div>
        )}

        {/* ACTION AREA */}
        <div className="w-full space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full h-[56px] rounded-xl font-semibold text-lg flex items-center justify-center gap-3 shadow-lg transition-all bg-white text-black shadow-white/10 hover:shadow-white/20 cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                />
                <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                />
            </svg>
            {isPhantomMode ? 'INITIALIZE SIMULATION' : 'INITIALIZE UPLINK'}
          </motion.button>
        </div>

        {/* FOOTER DECORATION */}
        <div className="w-full flex justify-between items-center px-2 opacity-30">
          <div className="w-16 h-[1px] bg-white/50" />
          <span className="font-mono text-[10px] text-white/50">V.9.0.1 SAFE MODE</span>
          <div className="w-16 h-[1px] bg-white/50" />
        </div>
      </motion.div>
    </div>
  );
};
