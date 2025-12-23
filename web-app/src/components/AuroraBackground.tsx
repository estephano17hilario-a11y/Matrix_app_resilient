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
    <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020204] transition-colors duration-700 ease-in-out ${className || ''}`}>
      {children}
      {/* 
        THE LIQUID INTELLIGENCE PROTOCOL (AURORA SYSTEM)
        Philosophy: "Sentient Glass" - Nothing is completely still.
      */}

      {/* Orb 1: Indigo Deep (#4f46e5) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
          rotate: [0, 45, 0],
          x: [0, 50, 0]
        }}
        transition={{ 
          duration: 15, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[-10%] right-[-10%] w-[100vw] h-[100vw] max-w-[800px] max-h-[800px] rounded-full blur-[120px]" 
        style={{ backgroundColor: overrideColor || '#4f46e5' }} 
      />

      {/* Orb 2: Electric Cyan (#06b6d4) */}
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
          x: [0, -60, 0],
          y: [0, 40, 0]
        }}
        transition={{ 
          duration: 18, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute bottom-[-10%] left-[-10%] w-[90vw] h-[90vw] max-w-[700px] max-h-[700px] rounded-full blur-[120px]" 
        style={{ backgroundColor: overrideColor || '#06b6d4' }}
      />

      {/* Orb 3: Nebula Pink (#ec4899) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.05, 0.15, 0.05],
          y: [0, -50, 0]
        }}
        transition={{ 
          duration: 22, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-[20%] left-[-5%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] rounded-full blur-[100px]"
        style={{ backgroundColor: overrideColor || '#ec4899' }}
      />
      
      {/* Orb 4: Violet Mist (#8b5cf6) */}
      <motion.div 
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, 40, 0],
          y: [0, -40, 0]
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 3
        }}
        className="absolute bottom-[20%] right-[-5%] w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full blur-[110px]"
        style={{ backgroundColor: overrideColor || '#8b5cf6' }}
      />

      {/* Noise Texture for Materiality (Optional, kept subtle) */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />
    </div>
  );
};
