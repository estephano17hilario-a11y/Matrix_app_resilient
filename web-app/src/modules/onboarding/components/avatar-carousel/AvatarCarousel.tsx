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
  const accentHex = currentAvatar.themeColor || '#ffffff';

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
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAvatar.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(1200px 900px at 10% 20%, rgba(${accentRgb}, 0.35) 0%, transparent 60%), radial-gradient(900px 700px at 85% 25%, rgba(${accentRgb}, 0.22) 0%, transparent 55%), linear-gradient(180deg, rgba(${accentRgb}, 0.12) 0%, rgba(2, 2, 4, 0.85) 60%, rgba(2, 2, 4, 0.95) 100%)`
            }}
          />
          {/* OPTIMIZED: Removed blur-md and heavy animations, using static opacity */}
          <div
            className="absolute -top-[10%] left-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full"
            style={{
              opacity: 0.35,
              background: `radial-gradient(circle, rgba(${accentRgb}, 0.5) 0%, transparent 65%)`
            }}
          />
          <div
            className="absolute bottom-[-20%] right-[-5%] w-[55vw] h-[55vw] max-w-[620px] max-h-[620px] rounded-full"
            style={{
              opacity: 0.3,
              background: `radial-gradient(circle, rgba(${accentRgb}, 0.4) 0%, transparent 70%)`
            }}
          />
          <div
              className="absolute inset-0"
            style={{
              background: `radial-gradient(600px 400px at 50% 50%, ${accentHex}22 0%, transparent 70%)`
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* 
         2. CAROUSEL AREA 
         Responsive container height and width
      */}
      <div className="relative w-full h-[54vh] min-h-[300px] max-h-[540px] flex items-center justify-center perspective-1000 mb-2 md:mb-6">
        
        {AVAILABLE_AVATARS.map((avatar, index) => {
            const relativeIndex = getRelativeIndex(index);
            const isCenter = relativeIndex === 0;
            const isVisible = Math.abs(relativeIndex) <= 2;

            if (!isVisible) return null;

            return (
                <div
                    key={avatar.id}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                    <motion.div
                        className="h-[46vh] sm:h-[52vh] max-h-[520px] w-auto max-w-[72vw] aspect-[9/16] origin-center"
                        initial={false}
                        animate={{
                            x: `${relativeIndex * 85}%`,
                            scale: isCenter ? 1 : 0.85,
                            opacity: isCenter ? 1 : 0.55,
                            zIndex: isCenter ? 50 : 10 - Math.abs(relativeIndex),
                            rotateY: relativeIndex * -15,
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
                </div>
            );
        })}
      </div>

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
