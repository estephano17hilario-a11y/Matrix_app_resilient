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
  const { theme, vividMode, availableThemes } = useTheme();
  const themeConfig = availableThemes?.[theme];
  const isSolid = themeConfig?.isSolid;
  const bgStyle = themeConfig?.bgStyle;
  
  const primaryGlow = overrideColor || 'var(--color-override-glow, rgb(var(--color-primary-glow)))';
  const secondaryGlow = overrideColor || 'var(--color-override-glow, rgb(var(--color-secondary-glow)))';
  const accentGlow = overrideColor || 'var(--color-override-glow, rgb(var(--color-primary-glow)))';

  // Generate deterministic random values for hearts and words
  const hearts = useMemo(() => {
    if (theme !== 'amy' || isSolid) return [];
    
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
  }, [theme, isSolid]);

  return (
    <div 
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-700 ease-in-out ${className || ''}`}
      style={{ 
          background: bgStyle || 'rgb(var(--color-bg-depth))'
      }}
    >
      {children}
      
      {/* 
         ULTRA-OPTIMIZED AURORA SYSTEM (ANDROID STABLE)
         - No Scale Animation (Expensive re-rasterization)
         - No Translate Animation (Expensive composite)
         - Opacity Only (Cheap)
         - Reduced Layer Count (3 Orbs)
      */}

      {themeConfig?.category === 'holo' && !isSolid ? (
        <>
            {/* HOLO ENGINE: MESH GRADIENT & NOISE */}
            
            {/* 1. Base Gradient Mesh (Static, Deep) */}
            <div 
                className="absolute inset-0 w-full h-full"
                style={{ 
                    background: `
                         radial-gradient(at 0% 0%, ${primaryGlow} 0px, transparent 50%),
                         radial-gradient(at 100% 0%, ${secondaryGlow} 0px, transparent 50%),
                         radial-gradient(at 100% 100%, ${primaryGlow} 0px, transparent 50%),
                         radial-gradient(at 0% 100%, ${secondaryGlow} 0px, transparent 50%)
                     `,
                     opacity: vividMode ? 0.8 : 0.5,
                     filter: 'blur(60px)',
                     transform: 'translateZ(0)'
                 }}
             />

             {/* 2. Fluid Shape 1 (Large, Slow Moving) */}
             <motion.div 
                className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vw] rounded-full opacity-50 mix-blend-screen"
                style={{ 
                    background: `radial-gradient(circle, ${primaryGlow} 0%, transparent 60%)`,
                    filter: 'blur(80px)',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

             {/* 3. Fluid Shape 2 (Secondary, Counter-Moving) */}
             <motion.div 
                className="absolute bottom-[-20%] right-[-10%] w-[100vw] h-[100vw] rounded-full opacity-40 mix-blend-screen"
                style={{ 
                    background: `radial-gradient(circle, ${secondaryGlow} 0%, transparent 60%)`,
                    filter: 'blur(80px)',
                }}
                animate={{
                    scale: [1.2, 1, 1.2],
                    x: [0, -50, 0],
                    y: [0, -30, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* 4. Center Accent (Pulsing) */}
            <motion.div 
                className="absolute top-[30%] left-[30%] w-[40vw] h-[40vw] rounded-full opacity-30 mix-blend-overlay"
                style={{ 
                    background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`,
                    filter: 'blur(40px)',
                }}
                animate={{
                    opacity: [0.2, 0.4, 0.2],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* 5. NOISE TEXTURE (CRITICAL FOR FIGMA LOOK) */}
            <div 
                className="absolute inset-0 w-full h-full opacity-[0.07] mix-blend-overlay pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '128px'
                }}
            />
            
            {/* 6. Scanline Overlay (Optional Tech Feel) */}
            <div 
                className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none"
                style={{
                    background: 'linear-gradient(to bottom, transparent 50%, #000 50%)',
                    backgroundSize: '100% 4px'
                }}
            />
        </>
      ) : !isSolid && (
        <>
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
                  className={`absolute flex items-center justify-center whitespace-nowrap will-change-transform ${h.type === 'text' ? 'text-emerald-200/30 font-serif italic tracking-wider' : 'text-emerald-300/20'}`}
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
          <div 
            className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full"
            style={{ 
                background: `radial-gradient(circle, ${primaryGlow} 0%, transparent 70%)`,
                opacity: vividMode ? 0.75 : 0.4,
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
            }} 
          />

          {/* Orb 2: Secondary (Bottom Left) */}
          <div 
            className="absolute bottom-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full"
            style={{ 
                background: `radial-gradient(circle, ${secondaryGlow} 0%, transparent 70%)`,
                opacity: vividMode ? 0.65 : 0.3,
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
            }}
          />

          {/* Orb 3: Accent (Center/Floating) - Uses Primary for cohesion */}
          <div 
            className="absolute top-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full"
            style={{ 
                background: `radial-gradient(circle, ${accentGlow} 0%, transparent 60%)`,
                opacity: vividMode ? 0.45 : 0.18,
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
            }}
          />
        </>
      )}
    </div>
  );
};
