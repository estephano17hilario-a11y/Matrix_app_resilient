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
    <div 
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-700 ease-in-out ${className || ''}`}
      style={{ backgroundColor: 'rgb(var(--color-bg-depth))' }}
    >
      {children}
      
      {/* 
         ULTRA-OPTIMIZED AURORA SYSTEM (ANDROID STABLE)
         - No Scale Animation (Expensive re-rasterization)
         - No Translate Animation (Expensive composite)
         - Opacity Only (Cheap)
         - Reduced Layer Count (3 Orbs)
      */}

      {/* Orb 1: Primary (Top Right) */}
      <motion.div 
        animate={{ 
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full will-change-[opacity]"
        style={{ 
            background: `radial-gradient(circle, ${overrideColor || 'rgb(var(--color-primary-glow))'} 0%, transparent 70%)`,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
        }} 
      />

      {/* Orb 2: Secondary (Bottom Left) */}
      <motion.div 
        animate={{ 
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute bottom-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full will-change-[opacity]"
        style={{ 
            background: `radial-gradient(circle, ${overrideColor || 'rgb(var(--color-secondary-glow))'} 0%, transparent 70%)`,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
        }}
      />

      {/* Orb 3: Accent (Center/Floating) - Uses Primary for cohesion */}
      <motion.div 
        animate={{ 
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ 
          duration: 12, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full will-change-[opacity]"
        style={{ 
            background: `radial-gradient(circle, ${overrideColor || 'rgb(var(--color-primary-glow))'} 0%, transparent 60%)`,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
        }}
      />
    </div>
  );
};
