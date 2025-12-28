import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Heart } from 'lucide-react';

interface AuroraBackgroundProps {
  overrideColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ overrideColor, className, children }) => {
  const { theme, vividMode } = useTheme();

  // Generate deterministic random values for hearts and words
  const hearts = useMemo(() => {
    if (theme !== 'amy') return [];
    
    const compliments = [
      "bonita", "guapa", "hermosa", "perfecta", "radiante", "única", 
      "maravillosa", "brillante", "inigualable", "preciosa", "divina", 
      "encantadora", "fascinante", "increíble", "asombrosa", "espectacular",
      "mágica", "especial", "inspiradora", "magnífica", "sublime", "admirable",
      "extraordinaria", "fenomenal", "cautivadora", "deslumbrante"
    ];
    
    // Increased count to 35 to handle more words and density
    return Array.from({ length: 35 }).map((_, i) => {
      const isWord = i % 3 === 0; // Increased frequency: Every 3rd item is a word (approx 33%)
      const word = compliments[i % compliments.length];
      
      return {
        id: i,
        left: `${(i * 3) % 100}%`, // Denser distribution
        delay: i * 0.6, // Faster staggering
        duration: 18 + (i % 10), // Varied speeds
        scale: isWord ? 0.9 + (i % 3) * 0.15 : 0.5 + (i % 5) * 0.1, // Words slightly larger
        rotation: isWord ? (i % 2 === 0 ? 3 : -3) : (i % 2 === 0 ? 1 : -1) * (10 + (i % 10)), // Words less rotated
        type: isWord ? 'text' : 'heart',
        content: isWord ? word : null
      };
    });
  }, [theme]);

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

      {/* AMY THEME: HEARTS & WORDS LAYER */}
      {theme === 'amy' && (
        <div className="absolute inset-0 z-[1] overflow-hidden">
          {hearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ 
                y: '110vh', 
                opacity: 0, 
                x: 0,
                scale: h.scale,
                rotate: h.rotation
              }}
              animate={{ 
                y: '-20vh', 
                opacity: [0, 0.4, 0.4, 0],
                x: [0, Math.sin(h.id) * 50, 0] // Gentle sway
              }}
              transition={{
                duration: h.duration,
                repeat: Infinity,
                delay: h.delay,
                ease: "linear",
              }}
              className={`absolute flex items-center justify-center whitespace-nowrap ${h.type === 'text' ? 'text-emerald-200/30 font-serif italic tracking-wider' : 'text-emerald-300/20'}`}
              style={{ 
                left: h.left,
                fontSize: h.type === 'text' ? '1.5rem' : undefined,
                textShadow: h.type === 'text' ? '0 0 10px rgba(16, 185, 129, 0.2)' : undefined
              }}
            >
              {h.type === 'text' ? (
                <span>{h.content}</span>
              ) : (
                <Heart fill="currentColor" size={48} />
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Orb 1: Primary (Top Right) */}
      <motion.div 
        animate={{ 
          opacity: vividMode ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3],
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
          opacity: vividMode ? [0.5, 0.8, 0.5] : [0.2, 0.4, 0.2],
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
          opacity: vividMode ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
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
