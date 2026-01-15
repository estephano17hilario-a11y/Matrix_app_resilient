import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AVAILABLE_AVATARS } from '../../../../config/avatars';
import { AvatarSelectorCard } from '../../../customization/components/AvatarSelectorCard';

interface AvatarCarouselProps {
  onSelect: (avatarId: string) => void;
  initialAvatarId?: string;
}

export const AvatarCarousel: React.FC<AvatarCarouselProps> = ({ onSelect, initialAvatarId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (initialAvatarId) {
      const index = AVAILABLE_AVATARS.findIndex(a => a.id === initialAvatarId);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [initialAvatarId]);

  // === PRELOAD IMAGES ===
  useEffect(() => {
    // Preload all avatars for smoothness
    AVAILABLE_AVATARS.forEach(avatar => {
        const img = new Image();
        img.src = avatar.path;
    });
  }, []);

  const currentAvatar = AVAILABLE_AVATARS[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % AVAILABLE_AVATARS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + AVAILABLE_AVATARS.length) % AVAILABLE_AVATARS.length);
  };

  const handleConfirm = () => {
    onSelect(currentAvatar.id);
  };

  // Helper to get relative index for circular rendering
  const getRelativeIndex = (index: number) => {
    const len = AVAILABLE_AVATARS.length;
    // Normalized difference handling wrap-around
    let diff = (index - currentIndex + len) % len;
    if (diff > len / 2) diff -= len;
    return diff;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#020204]">
      
      {/* 
         1. DYNAMIC ATMOSPHERE (Optimized)
         Background glow based on current avatar theme
      */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
         {/* Base Dark */}
         <div className="absolute inset-0 bg-[#020204]" />
         
         {/* Ambient Glow */}
         <motion.div 
            className="absolute inset-0 opacity-20 transition-colors duration-700"
            animate={{ backgroundColor: currentAvatar.themeColor }}
         />
         
         {/* Central Spot */}
         <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] opacity-20 blur-[100px] rounded-full transition-colors duration-700"
            animate={{ backgroundColor: currentAvatar.themeColor }}
         />
      </div>

      {/* 
         2. CAROUSEL AREA 
         Fixed height container to prevent "Too Big" feel.
      */}
      <div className="relative w-full max-w-7xl mx-auto h-[60vh] min-h-[400px] max-h-[600px] flex items-center justify-center perspective-1000 mb-8">
        
        {AVAILABLE_AVATARS.map((avatar, index) => {
            const relativeIndex = getRelativeIndex(index);
            const isCenter = relativeIndex === 0;
            const isLeft = relativeIndex === -1;
            const isRight = relativeIndex === 1;
            
            // Only render visible items (center + 1 neighbor on each side)
            // For smoother exit, maybe render +/- 2 if needed, but +/- 1 is usually enough for strict control
            const isVisible = Math.abs(relativeIndex) <= 1;

            if (!isVisible) return null;

            return (
                <motion.div
                    key={avatar.id}
                    layoutId={`avatar-${avatar.id}`}
                    className="absolute top-1/2 left-1/2 w-[300px] aspect-[9/16] origin-center"
                    initial={false}
                    animate={{
                        x: `calc(-50% + ${relativeIndex * 110}%)`, // Spacing
                        y: '-50%',
                        scale: isCenter ? 1 : 0.85,
                        opacity: isCenter ? 1 : 0.4,
                        zIndex: isCenter ? 50 : 10,
                        rotateY: relativeIndex * -15, // Slight rotation towards center
                        filter: isCenter ? 'blur(0px) brightness(1)' : 'blur(2px) brightness(0.6)',
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 1
                    }}
                    style={{
                        transformStyle: 'preserve-3d'
                    }}
                >
                    <div 
                        className={`w-full h-full transition-all duration-300 ${isCenter ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                        onClick={() => {
                            if (isLeft) handlePrev();
                            if (isRight) handleNext();
                        }}
                    >
                        <AvatarSelectorCard
                            id={avatar.id}
                            name={avatar.name}
                            rarity={avatar.rarity}
                            imageUrl={avatar.path}
                            themeColor={avatar.themeColor}
                            isSelected={isCenter}
                            className={`w-full h-full ${isCenter ? 'shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/20' : ''}`}
                        />
                    </div>
                </motion.div>
            );
        })}
      </div>

      {/* 
         3. CONTROLS & INFO
         Clean typography, centered.
      */}
      <div className="flex flex-col items-center gap-6 z-20 w-full px-6">
        
        <div className="text-center space-y-2">
           <motion.h2 
             key={currentAvatar.id}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-3xl font-bold text-white tracking-tight drop-shadow-xl"
           >
             {currentAvatar.name}
           </motion.h2>
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.1 }}
             className="flex items-center justify-center gap-3"
           >
             <span 
                className="px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.2em] uppercase bg-white/10 border border-white/10"
                style={{ color: currentAvatar.themeColor }}
             >
                {currentAvatar.rarity}
             </span>
           </motion.div>
        </div>

        <div className="flex items-center gap-8 mt-4">
            <button
                onClick={handlePrev}
                className="p-4 rounded-full border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95 backdrop-blur-sm"
            >
                <ChevronLeft size={24} />
            </button>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirm}
                className="px-10 py-4 rounded-full font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2"
                style={{ backgroundColor: currentAvatar.themeColor || '#fff' }}
            >
                <span>CONFIRM IDENTITY</span>
                <Check size={18} />
            </motion.button>

            <button
                onClick={handleNext}
                className="p-4 rounded-full border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95 backdrop-blur-sm"
            >
                <ChevronRight size={24} />
            </button>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 mt-8">
            {AVAILABLE_AVATARS.map((_, idx) => (
            <div 
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-8 bg-white' : 'w-1 bg-white/20'
                }`}
            />
            ))}
        </div>

      </div>
    </div>
  );
};
