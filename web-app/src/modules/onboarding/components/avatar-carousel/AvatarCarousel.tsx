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
         Responsive container height and width
      */}
      <div className="relative w-full h-[65vh] min-h-[400px] max-h-[600px] flex items-center justify-center perspective-1000 mb-4 md:mb-8">
        
        {AVAILABLE_AVATARS.map((avatar, index) => {
            const relativeIndex = getRelativeIndex(index);
            const isCenter = relativeIndex === 0;
            
            // Only render visible items (center + 1 neighbor on each side)
            // Render +/- 2 for smoother transitions if needed, but keeping it tight for performance
            const isVisible = Math.abs(relativeIndex) <= 2;

            if (!isVisible) return null;

            return (
                <motion.div
                    key={avatar.id}
                    layoutId={`avatar-${avatar.id}`}
                    // Responsive width: 75vw on mobile, fixed 320px on desktop
                    className="absolute top-1/2 left-1/2 w-[70vw] sm:w-[320px] aspect-[9/16] origin-center"
                    initial={false}
                    animate={{
                        // Spacing: 85% of width for tighter overlap (showing more of side cards)
                        x: `calc(-50% + ${relativeIndex * 85}%)`, 
                        y: '-50%',
                        scale: isCenter ? 1 : 0.85,
                        opacity: isCenter ? 1 : 0.4,
                        zIndex: isCenter ? 50 : 10 - Math.abs(relativeIndex),
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
                            if (relativeIndex < 0) handlePrev();
                            if (relativeIndex > 0) handleNext();
                        }}
                    >
                        <AvatarSelectorCard
                            id={avatar.id}
                            name={avatar.name}
                            rarity={avatar.rarity}
                            imageUrl={avatar.path}
                            themeColor={avatar.themeColor}
                            isSelected={isCenter}
                            showInfo={isCenter} // Hide text on side cards to prevent visual clutter
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
      <div className="flex flex-col items-center gap-6 z-20 w-full px-6 pb-8">
        
        {/* Removed redundant H2 Name/Rarity since it's on the card now */}

        <div className="flex items-center gap-6 md:gap-8">
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
                className="px-8 md:px-10 py-4 rounded-full font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2 text-sm md:text-base whitespace-nowrap"
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
        <div className="flex gap-2 mt-4">
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