import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for dynamic classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface AvatarSelectorCardProps {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string;
  themeColor?: string; // Hex color e.g., #00ffcc
  isSelected?: boolean;
  showInfo?: boolean;
  onClick?: (id: string) => void;
  className?: string;
}

export const AvatarSelectorCard: React.FC<AvatarSelectorCardProps> = ({
  id,
  name,
  rarity,
  imageUrl,
  themeColor = '#00ffcc',
  isSelected = false,
  showInfo = true,
  onClick,
  className,
}) => {
  return (
    <motion.div
      className={cn(
        "relative w-full aspect-[9/16] rounded-2xl cursor-pointer", // Removed perspective-1000 to avoid conflicts
        "group", 
        className
      )}
      onClick={() => onClick?.(id)}
      initial={false}
      whileHover={isSelected ? undefined : "hover"}
      whileTap="tap"
      style={{
        ['--theme-color' as any]: themeColor,
        transform: 'translateZ(0)', // GPU promotion
      }}
    >
      {/* === OPTIMIZED GLOW SYSTEM (GPU FRIENDLY) === */}
      {/* 1. Static Ambient Glow (Opacity transition only) */}
      <div 
        className={cn(
          "absolute -inset-4 rounded-3xl -z-10 transition-opacity duration-300",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        )}
        style={{
          background: `radial-gradient(circle at center, ${themeColor}40 0%, transparent 70%)`,
        }}
      />
      
      {/* 2. Selected Halo (Opacity Pulse Only - No Scale for Perf) */}
      {isSelected && (
        <motion.div
          className="absolute -inset-1 rounded-2xl -z-20"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ 
            background: `radial-gradient(circle, ${themeColor} 0%, transparent 80%)`,
          }}
        />
      )}

      {/* 3. Border Ring (CSS Transition) */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl z-50 pointer-events-none transition-colors duration-300 border",
          isSelected ? "border-2" : "border-white/10"
        )}
        style={{ borderColor: isSelected ? themeColor : 'rgba(255,255,255,0.1)' }}
      />

      {/* === CONTENT CONTAINER === */}
      <motion.div
        className={cn(
          "relative w-full h-full z-10 bg-gray-900 rounded-2xl overflow-hidden backface-hidden",
        )}
        variants={{
          hover: { 
            y: -4,
            scale: 1.02,
            transition: { type: "spring", stiffness: 400, damping: 25 }
          },
          tap: { scale: 0.98 },
        }}
      >
        {/* Layer 1: Image (Hardware Accelerated) */}
        <div className="w-full h-full bg-gray-800 relative">
          <motion.img 
            src={imageUrl} 
            alt={name}
            loading="lazy"
            decoding="async"
            // object-top ensures that when aspect ratio is constrained (e.g. 4:5), we don't cut off the head
            className="w-full h-full object-cover object-top will-change-transform"
            variants={{
              hover: { scale: 1.05 },
            }}
            transition={{ duration: 0.4 }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('fallback-avatar');
            }}
          />
        </div>

        {/* Layer 2: Gradient Overlay (Static) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 pointer-events-none" />

      {/* Layer 3: Info */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-start justify-end z-20 pointer-events-none"
          >
            <span 
              className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/70 mb-2"
              style={{ color: isSelected ? themeColor : 'rgba(255,255,255,0.7)' }}
            >
              {rarity}
            </span>
            <h3 className="text-white font-bold text-xl leading-none tracking-tight drop-shadow-md">
              {name}
            </h3>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default AvatarSelectorCard;
