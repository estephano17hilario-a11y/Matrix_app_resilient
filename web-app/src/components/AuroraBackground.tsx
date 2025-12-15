import React from 'react';
import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  overrideColor?: string;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ overrideColor }) => {
  // If overrideColor is provided (e.g. Focus Mode), we use it to tint the orbs
  const baseStyle = overrideColor ? { backgroundColor: overrideColor } : {};

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020204] transition-colors duration-1000">
      {/* 
        THE AURORA SYSTEM 
        Concepts: 
        - Deep Void Base (#020204)
        - Moving Orbs of Light (Indigo, Cyan, Pink, Violet)
        - Heavy Blur (blur-[120px])
        - Slow, breathing animation
      */}

      {/* Orb 1: Indigo Deep - Top Right */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3], // Increased visibility
          x: [0, 50, 0],
          y: [0, -50, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] rounded-full blur-[100px]" 
        style={{ backgroundColor: overrideColor || '#4f46e5' }} 
      />

      {/* Orb 2: Electric Cyan - Bottom Left */}
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -30, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-10%] left-[-20%] w-[70vw] h-[70vw] max-w-[500px] max-h-[500px] rounded-full blur-[80px]" 
        style={{ backgroundColor: overrideColor || '#06b6d4' }}
      />

      {/* Orb 3: Nebula Pink - Center/Top */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-[20%] left-[30%] w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] rounded-full blur-[120px]" 
        style={{ backgroundColor: overrideColor || '#ec4899' }}
      />

      {/* Orb 4: Violet Mist - Floating */}
      <motion.div 
        animate={{ 
          x: [0, 100, 0],
          y: [0, 50, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full blur-[100px]" 
        style={{ backgroundColor: overrideColor || '#8b5cf6' }}
      />

      {/* Noise Texture Overlay (Optional for grit/texture) */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />
    </div>
  );
};
