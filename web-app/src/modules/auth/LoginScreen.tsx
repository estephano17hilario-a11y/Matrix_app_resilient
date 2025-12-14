import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Terminal, ShieldAlert, Lock, ChevronRight } from 'lucide-react';
import { loginWithGoogle } from '../../services/firebaseService';

export default function LoginScreen() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);
    
    try {
      await loginWithGoogle();
      // AuthContext will handle the redirect automatically
    } catch (err: any) {
      console.error("Matrix Auth Error:", err);
      
      // 🛡️ ERROR DECODING PROTOCOL
      let msg = "ACCESS DENIED: CONNECTION RESET";
      
      if (err.code === 'auth/popup-closed-by-user') {
        msg = "SEQUENCE ABORTED BY USER";
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = "DOMAIN UNAUTHORIZED (CHECK FIREBASE CONSOLE)";
      } else if (err.code === 'auth/popup-blocked') {
        msg = "POPUP BLOCKED: ENABLE POPUPS FOR THIS SITE";
      } else if (err.code === 'auth/cancelled-popup-request') {
        msg = "MULTIPLE REQUESTS DETECTED";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "GOOGLE LOGIN DISABLED IN FIREBASE CONSOLE";
      } else if (err.code) {
        msg = `ERROR: ${err.code}`;
      }

      setError(msg);
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none touch-callout-none font-mono">
      {/* 💎 AMBIENT LIGHTING (VOLUMETRIC) */}
      <div className="absolute top-0 left-0 w-full h-96 bg-green-500/5 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-900/10 blur-[100px] pointer-events-none" />
      
      {/* GRID TEXTURE */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      
      {/* MAIN INTERFACE */}
      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">
        
        {/* LOGO SYSTEM */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 relative group"
        >
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-24 h-24 border border-green-500/20 bg-black/50 backdrop-blur-md rounded-2xl flex items-center justify-center relative overflow-hidden shadow-2xl shadow-green-900/20">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent opacity-50" />
                <Terminal className="text-green-500 w-10 h-10 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            </div>
        </motion.div>

        {/* TYPOGRAPHY */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="text-center mb-12 space-y-2"
        >
            <h1 className="text-white text-3xl font-black tracking-tighter drop-shadow-lg">
                SYSTEM <span className="text-green-500">ACCESS</span>
            </h1>
            <p className="text-green-500/60 text-xs tracking-[0.2em] uppercase font-bold">
                Restricted Area • V.2.0.4
            </p>
        </motion.div>

        {/* ERROR CONSOLE */}
        {error && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full mb-6 bg-red-950/30 border border-red-500/30 rounded-lg p-3 flex items-center gap-3"
            >
                <ShieldAlert className="text-red-500 shrink-0" size={16} />
                <span className="text-red-400 text-xs font-bold tracking-wide">{error}</span>
            </motion.div>
        )}

        {/* INTERACTION LAYER */}
        <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(34, 197, 94, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={isAuthenticating}
            className="group relative w-full h-16 bg-green-500/10 border border-green-500/30 rounded-xl overflow-hidden transition-all duration-300 active:bg-green-500/20"
        >
            {/* BUTTON GLASS EFFECT */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
            
            {/* CONTENT */}
            <div className="relative h-full flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                        <Lock className="text-green-400 w-4 h-4" />
                    </div>
                    <span className="text-green-400 font-bold tracking-wider text-sm">
                        {isAuthenticating ? 'ESTABLISHING LINK...' : 'INITIALIZE UPLINK'}
                    </span>
                </div>
                
                <ChevronRight className={`text-green-500/50 transition-transform duration-300 ${isAuthenticating ? 'translate-x-10 opacity-0' : 'group-hover:translate-x-1'}`} />
                
                {/* LOADING SPINNER */}
                {isAuthenticating && (
                    <div className="absolute right-6 w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {/* SCANLINE EFFECT */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-green-400/30 animate-scan-down opacity-0 group-hover:opacity-100" />
        </motion.button>

        {/* FOOTER */}
        <div className="mt-12 flex flex-col items-center gap-4 opacity-40">
            <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-green-500 font-mono">SECURE CONNECTION READY</span>
            </div>
        </div>

      </div>
      
      <style>{`
        @keyframes scan-down {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scan-down {
            animation: scan-down 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
