import { useState } from 'react';
import { motion } from 'framer-motion';
import { loginWithGoogle } from '../../services/firebaseService';

/**
 * COMPONENT: THE PORTAL (Login Screen)
 * DESIGN PHILOSOPHY: "Liquid Physiform"
 * 
 * - Deep Void Background
 * - Aurora Borealis Orbs (Breathing)
 * - Ultra-Fidelity Glass (The Monolith)
 * - Apple Intelligence Button
 */

export default function LoginScreen() {
  const [isHovering, setIsHovering] = useState(false);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      // Transition handled by App.tsx router state change + AnimatePresence
    } catch (error) {
      console.error("Authentication Failed", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="relative w-full h-screen overflow-hidden bg-[#050505] flex items-center justify-center"
    >
      {/* --- AMBIENT AURORA (BACKGROUND) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orb 1: Indigo/Violet */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1], 
            x: [0, 50, 0], 
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-indigo-600 rounded-full mix-blend-screen blur-[120px] opacity-30"
        />
        
        {/* Orb 2: Cyan/Blue */}
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2], 
            x: [0, -40, 0], 
            y: [0, 60, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-cyan-500 rounded-full mix-blend-screen blur-[100px] opacity-20"
        />

        {/* Orb 3: Deep Violet (Center Pulse) */}
        <motion.div 
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-violet-700 rounded-full mix-blend-overlay blur-[90px] opacity-20"
        />
        
        {/* Noise Texture (Film Grain) - Avoids banding on OLED */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
        />
      </div>

      {/* --- THE MONOLITH (CARD) --- */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="relative z-10 w-full max-w-md p-8 mx-4"
      >
        {/* Glass Material Construction */}
        <div className="absolute inset-0 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_-10px_rgba(120,119,198,0.3)] ring-1 ring-white/5" />
        
        <div className="relative z-20 flex flex-col items-center text-center space-y-8 py-4">
          
          {/* Typography */}
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-sans font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70"
            >
              MATRIX
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-medium text-white/60 tracking-wide"
            >
              Architect your reality
            </motion.p>
          </div>

          {/* Apple Intelligence Button */}
          <motion.button
            onClick={handleLogin}
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative w-full h-14 rounded-2xl overflow-hidden"
          >
            {/* Button Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] opacity-90" />
            
            {/* Specular Shine Effect (Moving) */}
            <motion.div 
              animate={{ x: isHovering ? ['100%', '-100%'] : '100%' }}
              transition={{ duration: 1.5, repeat: isHovering ? Infinity : 0, ease: "linear" }}
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
              style={{ x: '-100%' }}
            />
            
            {/* Border Glow */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 group-hover:ring-white/30 transition-all duration-500" />
            
            {/* Content */}
            <div className="relative flex items-center justify-center gap-3 h-full">
              {/* Minimalist Google Icon */}
              <svg className="w-5 h-5 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"/>
              </svg>
              <span className="text-[15px] font-medium text-white tracking-wide antialiased">
                Continue with Google
              </span>
            </div>
          </motion.button>

        </div>
      </motion.div>
      
      {/* Bottom Legal/Version (Optional subtle detail) */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-[10px] text-white tracking-widest uppercase"
      >
        System v1.0 • Secure Enclave
      </motion.div>
    </motion.div>
  );
}
