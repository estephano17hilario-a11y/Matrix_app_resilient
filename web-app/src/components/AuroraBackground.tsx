import React from 'react';
import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  overrideColor?: string;
  className?: string;
  currentTheme?: any; // Keep consistent with usage
  children?: React.ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ overrideColor, className, children }) => {
  return (
    <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-aurora-bg transition-colors duration-700 ease-in-out ${className || ''}`}>
      {children}
      {/* 
        THE AURORA SYSTEM (SENTIENT)
        Concepts: 
        - Deep Void Base (#020204)
        - Breathing Orbs (animate-pulse-slow equivalent but smoother with motion)
        - Heavy Blur (blur-[120px])
      */}

      {/* Orb 1: Indigo Deep (Top Right) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
          rotate: [0, 45, 0]
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[-10%] right-[-5%] w-[85vw] h-[85vw] max-w-[700px] max-h-[700px] rounded-full blur-[130px]" 
        style={{ backgroundColor: overrideColor || '#4f46e5' }} 
      />

      {/* Orb 2: Electric Cyan (Bottom Left) */}
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 50, 0]
        }}
        transition={{ 
          duration: 25, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute bottom-[-10%] left-[-10%] w-[75vw] h-[75vw] max-w-[600px] max-h-[600px] rounded-full blur-[110px]" 
        style={{ backgroundColor: overrideColor ? 'var(--color-secondary-glow)' : '#06b6d4' }}
      />

      {/* Orb 3: Nebula Pink (Center-Left Float) */}
      <motion.div 
        animate={{ 
          y: [0, -40, 0],
          opacity: [0.05, 0.15, 0.05]
        }}
        transition={{ 
          duration: 18, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[30%] left-[20%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full blur-[100px] bg-[#ec4899]"
      />
      
      {/* Orb 4: Violet Mist (Bottom-Right Float) */}
      <motion.div 
        animate={{ 
          y: [0, 40, 0],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ 
          duration: 22, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute bottom-[20%] right-[10%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full blur-[120px] bg-[#8b5cf6]"
      />

      {/* Noise Texture for Materiality (Optional, kept subtle) */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
    </div>
  );
};
