import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvatarState } from '../../../hooks/useAvatarState';

interface AvatarDisplayProps {
  hp: number;
  size?: number;
  className?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ hp, size = 120, className = '' }) => {
  const { mode, color, shadowColor, Icon } = useAvatarState(hp);

  // SVG Configuration
  const strokeWidth = 6; // Slightly thicker for visibility
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Ensure HP is valid for stroke calculation
  const safeHp = Math.max(0, Math.min(100, hp));
  const strokeDashoffset = circumference - (safeHp / 100) * circumference;

  // Animation Variants
  const containerVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      boxShadow: `0 20px 50px -12px ${shadowColor}, inset 0 1px 0 0 rgba(255,255,255,0.15)`
    },
    exit: { scale: 0.9, opacity: 0 }
  };

  const heartbeatTransition = {
    scale: {
      repeat: Infinity,
      repeatType: "reverse" as const,
      duration: 0.6, // Fast heartbeat
      ease: "easeInOut" as const
    },
    opacity: {
      repeat: Infinity,
      repeatType: "reverse" as const,
      duration: 0.6,
      ease: "easeInOut" as const
    }
  };

  const breatheTransition = {
    scale: {
      repeat: Infinity,
      repeatType: "reverse" as const,
      duration: 3, // Slow breathing
      ease: "easeInOut" as const
    }
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* 1. Liquid Glass Container (Background) */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gray-900/60 backdrop-blur-md border border-white/10"
        variants={containerVariants}
        initial="initial"
        animate="animate"
        // Dynamic shadow update
        style={{ 
          boxShadow: `0 20px 50px -12px ${shadowColor}, inset 0 1px 0 0 rgba(255,255,255,0.15)` 
        }}
      />

      {/* 2. HP Ring (SVG) */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 rotate-[-90deg]" // Start from top
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Indicator */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset, stroke: color }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        />
      </svg>

      {/* 3. Dynamic Avatar Icon (Center) */}
      <div className="relative z-10 w-1/2 h-1/2 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode} // Triggers animation when state changes
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ 
              opacity: 1, 
              scale: mode === 'DECAYED' ? [1, 1.1, 1] : mode === 'NEUTRAL' ? [1, 1.05, 1] : 1,
              rotate: 0,
              filter: mode === 'PRIME' ? 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))' : 'none'
            }}
            exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
            transition={{
              default: { type: "spring", stiffness: 200, damping: 20 },
              scale: mode === 'DECAYED' ? heartbeatTransition.scale : (mode === 'NEUTRAL' ? breatheTransition.scale : { type: "spring", stiffness: 200, damping: 20 })
            }}
          >
            <Icon 
              size={size * 0.4} 
              color={mode === 'DECAYED' ? '#f43f5e' : 'white'} 
              className={mode === 'DECAYED' ? 'animate-pulse' : ''}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 4. Glitch/Static Effect Overlay for DECAYED */}
      {mode === 'DECAYED' && (
        <GlitchOverlay />
      )}
    </div>
  );
};

const GlitchOverlay = React.memo(() => {
    // Stable random delay using memo, but for glitches we might want variation.
    // However, for animation definition in render, we should use a constant or pre-defined random.
    // Let's use a fixed random value seeded by something or just a set of random constants.
    // Better yet, let framer handle the randomness via keyframes or just use a fixed fast repeat.
    
    return (
        <motion.div
          className="absolute inset-0 rounded-full bg-red-500/10 pointer-events-none mix-blend-overlay"
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 0.1 }}
        />
    );
});
