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

      {/* Orb 1: Primary Glow (Top Right) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2], // Slightly reduced for "respiro"
          rotate: [0, 45, 0]
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[-25%] right-[-25%] w-[110vw] h-[110vw] md:top-[-10%] md:right-[-5%] md:w-[85vw] md:h-[85vw] max-w-[700px] max-h-[700px] rounded-full blur-[80px] md:blur-[130px]" 
        style={{ backgroundColor: overrideColor || 'rgb(var(--color-primary-glow))' }} 
      />

      {/* Orb 2: Secondary Glow (Bottom Left) */}
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.25, 0.15], // Reduced opacity
          x: [0, 50, 0]
        }}
        transition={{ 
          duration: 25, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute bottom-[-15%] left-[-25%] w-[90vw] h-[90vw] md:bottom-[-10%] md:left-[-10%] md:w-[75vw] md:h-[75vw] max-w-[600px] max-h-[600px] rounded-full blur-[70px] md:blur-[110px]" 
        style={{ backgroundColor: overrideColor ? 'rgb(var(--color-secondary-glow))' : 'rgb(var(--color-secondary-glow))' }}
      />

      {/* Orb 3: Accent/Secondary (Center-Left Float) */}
      <motion.div 
        animate={{ 
          y: [0, -40, 0],
          opacity: [0.1, 0.2, 0.1] // Reduced opacity
        }}
        transition={{ 
          duration: 18, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[25%] left-[-25%] w-[80vw] h-[80vw] md:top-[30%] md:left-[20%] md:w-[50vw] md:h-[50vw] max-w-[500px] max-h-[500px] rounded-full blur-[60px] md:blur-[100px]"
        style={{ backgroundColor: 'rgb(var(--color-secondary-glow))' }}
      />
      
      {/* Orb 4: Primary/Glass (Bottom-Right Float) */}
      <motion.div 
        animate={{ 
          y: [0, 40, 0],
          opacity: [0.15, 0.25, 0.15] // Reduced opacity
        }}
        transition={{ 
          duration: 22, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute bottom-[15%] right-[-15%] w-[70vw] h-[70vw] md:bottom-[20%] md:right-[10%] md:w-[40vw] md:h-[40vw] max-w-[400px] max-h-[400px] rounded-full blur-[70px] md:blur-[120px]"
        style={{ backgroundColor: 'rgb(var(--color-primary-glow))' }}
      />

      {/* Noise Texture for Materiality (Optional, kept subtle) */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
    </div>
  );
};
