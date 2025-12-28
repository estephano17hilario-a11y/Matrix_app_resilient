import React from 'react';
import { motion } from 'framer-motion';
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
  onClick,
  className,
}) => {
  return (
    <>
      <style>
        {`
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          .animate-breathe {
            animation: breathe 6s ease-in-out infinite;
            will-change: transform;
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
          }
          .animate-pulse-glow {
            animation: pulse-glow 3s ease-in-out infinite;
            will-change: transform, opacity;
          }
        `}
      </style>
      <motion.div
        layoutId={`avatar-card-${id}`}
        className={cn(
          "relative w-full aspect-[9/16] rounded-2xl overflow-visible cursor-pointer", // overflow-visible for glow
          "group", 
          className
        )}
        onClick={() => onClick?.(id)}
        initial={false}
        whileHover="hover"
        whileTap="tap"
        style={{
          ['--theme-color' as any]: themeColor,
        }}
      >
        {/* === OPTIMIZED GLOW SYSTEM (GPU FRIENDLY) === */}
        {/* 1. Static Ambient Glow (Opacity transition only) */}
        <div 
          className={cn(
            "absolute -inset-4 rounded-3xl -z-10 transition-opacity duration-500",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          )}
          style={{
            background: `radial-gradient(circle at center, ${themeColor}40 0%, transparent 70%)`,
            transform: 'translateZ(0)', // Force GPU layer
          }}
        />
        
        {/* 2. Selected Halo (CSS Animation instead of JS) */}
        {isSelected && (
          <div
            className="absolute -inset-1 rounded-2xl -z-20 animate-pulse-glow"
            style={{ 
              backgroundColor: themeColor, 
              filter: 'blur(12px)', // Kept minimal blur
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
            "relative w-full h-full z-10 bg-gray-900 rounded-2xl overflow-hidden",
            !isSelected && "animate-breathe" // CSS Animation for idle
          )}
          variants={{
            hover: { 
              y: -8, // Reduced movement
              scale: 1.05,
              transition: { type: "spring", stiffness: 400, damping: 25 } // Snappier, less floaty
            },
            tap: { scale: 0.98 },
          }}
        >
          {/* Layer 1: Image (Hardware Accelerated) */}
          <div className="w-full h-full overflow-hidden bg-gray-800 relative">
            <motion.img 
              src={imageUrl} 
              alt={name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover will-change-transform"
              variants={{
                hover: { scale: 1.1 },
              }}
              transition={{ duration: 0.4 }}
              onError={(e) => {
                console.error(`Image failed to load: ${imageUrl}`);
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('fallback-avatar');
              }}
            />
            {/* Fallback Content (Hidden by default, shown via CSS if image hides) */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 -z-10">
               <span className="text-4xl opacity-20">?</span>
            </div>
          </div>

          {/* Layer 2: Gradient Overlay (Static) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 pointer-events-none" />

          {/* Layer 3: Info */}
          <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col items-start justify-end z-20 pointer-events-none">
            <span 
              className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/70 mb-1 transition-colors duration-300"
              style={{ color: isSelected ? themeColor : 'rgba(255,255,255,0.7)' }}
            >
              {rarity}
            </span>
            <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">
              {name}
            </h3>
          </div>

          {/* Layer 4: Subtle Top Shine */}
          <div 
            className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-30"
          />
        </motion.div>
      </motion.div>
    </>
  );
};

export default AvatarSelectorCard;
