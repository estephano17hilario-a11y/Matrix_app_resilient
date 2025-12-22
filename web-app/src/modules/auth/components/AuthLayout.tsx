import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#050505] text-white selection:bg-indigo-500/30">
      
      {/* 1. Animated Mesh Gradients (The "Living" Background) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orb 1: Indigo/Violet */}
        <motion.div 
          className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-indigo-600/30 rounded-full blur-[120px]"
          animate={{ 
            x: [0, 50, 0], 
            y: [0, 30, 0], 
            scale: [1, 1.1, 1] 
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        
        {/* Orb 2: Cyan/Blue */}
        <motion.div 
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-600/20 rounded-full blur-[100px]"
          animate={{ 
            x: [0, -40, 0], 
            y: [0, -40, 0], 
            scale: [1, 1.2, 1] 
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Orb 3: Accent Purple */}
        <motion.div 
          className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] bg-violet-600/20 rounded-full blur-[90px]"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>

      {/* 2. Cinematic Grain / Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
           }}
      />

      {/* 3. Content Wrapper */}
      <div className="relative z-20 w-full max-w-md px-6">
        {children}
      </div>

    </div>
  );
}
