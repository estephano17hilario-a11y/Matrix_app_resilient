import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AVAILABLE_AVATARS } from '../../../../config/avatars';
import { AvatarSelectorCard } from '../../../customization/components/AvatarSelectorCard';
import { useTranslation } from 'react-i18next';

interface AvatarCarouselProps {
  onSelect: (avatarId: string) => void;
  initialAvatarId?: string;
}

export const AvatarCarousel: React.FC<AvatarCarouselProps> = ({ onSelect, initialAvatarId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useTranslation();

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
  const accentRgb = currentAvatar.themeColorRgb || '255 255 255';

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
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-transparent">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cosmic-fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes cosmic-breathe {
          0% { transform: scale(1) translate3d(0, 0, 0); }
          100% { transform: scale(1.15) translate3d(0, 2%, 0); }
        }
      `}} />

      {/* Dynamic Cosmic Background that crossfades on avatar change */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-black overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={currentAvatar.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute pointer-events-none"
            style={{
              top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
              background: `radial-gradient(circle at 50% 40%, rgba(${accentRgb.includes(',') ? accentRgb : accentRgb.split(' ').join(',')}, 0.15) 0%, rgba(${accentRgb.includes(',') ? accentRgb : accentRgb.split(' ').join(',')}, 0.08) 45%, rgba(${accentRgb.includes(',') ? accentRgb : accentRgb.split(' ').join(',')}, 0.02) 75%, #000000 100%)`,
              transformOrigin: 'center',
              animation: 'cosmic-breathe 25s ease-in-out infinite alternate'
            }}
          />
        </AnimatePresence>
      </div>

      {/* 
         2. CAROUSEL AREA 
         Responsive container height and width
      */}
      <motion.div 
        className="relative w-full h-[54vh] min-h-[300px] max-h-[540px] flex items-center justify-center perspective-1000 mb-2 md:mb-6 cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_e, { offset }) => {
          if (offset.x < -30) handleNext();
          else if (offset.x > 30) handlePrev();
        }}
        style={{ touchAction: 'pan-y' }}
      >
        
        {AVAILABLE_AVATARS.map((avatar, index) => {
            const relativeIndex = getRelativeIndex(index);
            const isCenter = relativeIndex === 0;
            const isVisible = Math.abs(relativeIndex) <= 2;

            if (!isVisible) return null;

            return (
                <motion.div
                    key={avatar.id}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    initial={false}
                    animate={{
                        zIndex: isCenter ? 50 : 10 - Math.abs(relativeIndex)
                    }}
                >
                    <motion.div
                        className="h-[46vh] sm:h-[52vh] max-h-[520px] w-auto max-w-[72vw] aspect-[9/16] origin-center pointer-events-auto"
                        initial={false}
                        animate={{
                            x: `${relativeIndex * 85}%`,
                            scale: isCenter ? 1 : 0.85,
                            opacity: isCenter ? 1 : 0.55,
                            rotateY: relativeIndex * -15,
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 250,
                            damping: 25,
                            mass: 0.8
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
                                name={t(`avatars.${avatar.id}`, avatar.name)}
                                rarity={avatar.rarity}
                                imageUrl={avatar.path}
                                themeColor={avatar.themeColor}
                                isSelected={isCenter}
                                showInfo={isCenter}
                                className={`w-full h-full ${isCenter ? 'shadow-md ring-1 ring-white/20' : ''}`}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            );
        })}
      </motion.div>

      {/* 
         3. CONTROLS & INFO
         Clean typography, centered.
      */}
      <div className="flex flex-col items-center gap-4 z-50 w-full px-4 pb-8 pointer-events-auto">
        
        {/* Removed redundant H2 Name/Rarity since it's on the card now */}

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 md:gap-8 w-full max-w-[520px]">
            <button
                onClick={handlePrev}
                className="p-4 rounded-full border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95 bg-white/5"
            >
                <ChevronLeft size={24} />
            </button>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirm}
                className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base whitespace-nowrap"
                style={{ backgroundColor: currentAvatar.themeColor || '#fff' }}
            >
                <span>CONFIRM IDENTITY</span>
                <Check size={18} />
            </motion.button>

            <button
                onClick={handleNext}
                className="p-4 rounded-full border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95 bg-white/5"
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
