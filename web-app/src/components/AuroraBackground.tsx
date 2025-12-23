import React from 'react';
import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  overrideColor?: string;
  className?: string;
  currentTheme?: any; 
  children?: React.ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ overrideColor, className, children }) => {
  return (
    <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020204] transition-colors duration-700 ease-in-out ${className || ''}`}>
      {children}
      
      {/* 
         OPTIMIZED AURORA SYSTEM (MOBILE SAFE)
         Replaced heavy blur filters with radial gradients to prevent GPU crashes on Android.
      */}

      {/* Orb 1: Indigo Deep */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.4, 0.3], // Higher opacity because no blur filter dilutes it
          rotate: [0, 45, 0],
        }}
        transition={{ 
          duration: 15, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[-20%] right-[-20%] w-[120vw] h-[120vw] rounded-full"
        style={{ 
            background: `radial-gradient(circle, ${overrideColor || '#4f46e5'} 0%, transparent 70%)`,
            transform: 'translateZ(0)' // Force hardware acceleration without flicker
        }} 
      />

      {/* Orb 2: Electric Cyan */}
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ 
          duration: 18, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute bottom-[-20%] left-[-20%] w-[100vw] h-[100vw] rounded-full"
        style={{ 
            background: `radial-gradient(circle, ${overrideColor || '#06b6d4'} 0%, transparent 70%)`,
            transform: 'translateZ(0)'
        }}
      />

      {/* Orb 3: Nebula Pink */}
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ 
          duration: 22, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-[10%] left-[-10%] w-[80vw] h-[80vw] rounded-full"
        style={{ 
            background: `radial-gradient(circle, ${overrideColor || '#ec4899'} 0%, transparent 70%)`,
            transform: 'translateZ(0)'
        }}
      />
      
      {/* Orb 4: Violet Mist */}
      <motion.div 
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 3
        }}
        className="absolute bottom-[10%] right-[-10%] w-[90vw] h-[90vw] rounded-full"
        style={{ 
            background: `radial-gradient(circle, ${overrideColor || '#8b5cf6'} 0%, transparent 70%)`,
            transform: 'translateZ(0)'
        }}
      />

      {/* Static Noise Texture (PNG or simple opacity) - Disabled SVG filter for performance */}
      <div className="absolute inset-0 opacity-[0.03] bg-repeat pointer-events-none mix-blend-overlay"
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
      />
    </div>
  );
};
