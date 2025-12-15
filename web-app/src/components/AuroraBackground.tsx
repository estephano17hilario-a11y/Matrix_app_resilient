import React from 'react';
// Removed framer-motion for performance optimization

interface AuroraBackgroundProps {
  overrideColor?: string;
  className?: string;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ overrideColor, className }) => {
  // OPTIMIZATION: "Static Two-Radian System"
  // Replaces the heavy 4-orb animated system with 2 static, performant gradients.
  
  return (
    <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-theme-bg transition-colors duration-700 ease-in-out ${className || ''}`}>
      {/* 
        THE AURORA SYSTEM (OPTIMIZED)
        Concepts: 
        - Deep Void Base (Theme Bg)
        - Two Static Orbs (No re-renders)
        - Heavy Blur (blur-[120px])
      */}

      {/* Radian 1: Primary Intelligence (Top Right) */}
      <div 
        className="absolute top-[-10%] right-[-5%] w-[85vw] h-[85vw] max-w-[700px] max-h-[700px] rounded-full blur-[130px] opacity-40 transition-colors duration-700" 
        style={{ backgroundColor: overrideColor || 'rgb(var(--color-primary-glow))' }} 
      />

      {/* Radian 2: Secondary Essence (Bottom Left) */}
      <div 
        className="absolute bottom-[-10%] left-[-10%] w-[75vw] h-[75vw] max-w-[600px] max-h-[600px] rounded-full blur-[110px] opacity-30 transition-colors duration-700" 
        style={{ backgroundColor: overrideColor || 'rgb(var(--color-secondary-glow))' }}
      />

      {/* Noise Texture removed for GPU optimization */}
    </div>
  );
};
