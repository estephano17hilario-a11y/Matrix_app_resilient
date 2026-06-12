import React, { useState, useEffect } from 'react';
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
  const [startX, setStartX] = useState<number | null>(null);
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

  // Swipe / Drag Gestures handlers
  const handleGestureStart = (clientX: number) => {
    setStartX(clientX);
  };

  const handleGestureMove = (clientX: number) => {
    if (startX === null) return;
    const diff = clientX - startX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handlePrev();
      } else {
        handleNext();
      }
      setStartX(null);
    }
  };

  const handleGestureEnd = () => {
    setStartX(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-transparent">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cosmic-breathe {
          0% { transform: scale(1) translate3d(0, 0, 0); }
          100% { transform: scale(1.15) translate3d(0, 2%, 0); }
        }
      `}} />

      {/* Dynamic Cosmic Background that crossfades on avatar change */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-black overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
            background: `radial-gradient(circle at 50% 40%, rgba(${accentRgb.includes(',') ? accentRgb : accentRgb.split(' ').join(',')}, 0.15) 0%, rgba(${accentRgb.includes(',') ? accentRgb : accentRgb.split(' ').join(',')}, 0.08) 45%, rgba(${accentRgb.includes(',') ? accentRgb : accentRgb.split(' ').join(',')}, 0.02) 75%, #000000 100%)`,
            transformOrigin: 'center',
            animation: 'cosmic-breathe 25s ease-in-out infinite alternate',
            transition: 'background 500ms ease-in-out',
            willChange: 'background'
          }}
        />
      </div>

      {/* Carousel Area */}
      <div 
        className="relative w-full h-[54vh] min-h-[300px] max-h-[540px] flex items-center justify-center perspective-1000 mb-2 md:mb-6 cursor-grab active:cursor-grabbing select-none"
        onTouchStart={(e) => handleGestureStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleGestureMove(e.touches[0].clientX)}
        onTouchEnd={handleGestureEnd}
        onMouseDown={(e) => handleGestureStart(e.clientX)}
        onMouseMove={(e) => handleGestureMove(e.clientX)}
        onMouseUp={handleGestureEnd}
        onMouseLeave={handleGestureEnd}
        style={{ touchAction: 'pan-y' }}
      >
        
        {AVAILABLE_AVATARS.map((avatar, index) => {
            const relativeIndex = getRelativeIndex(index);
            const isCenter = relativeIndex === 0;
            const isVisible = Math.abs(relativeIndex) <= 2;

            if (!isVisible) return null;

            return (
                <div
                    key={avatar.id}
                    className="absolute top-1/2 left-1/2 origin-center pointer-events-none h-[46vh] sm:h-[52vh] max-h-[520px] w-auto max-w-[72vw] aspect-[9/16]"
                    style={{
                        transform: `translate3d(calc(-50% + ${relativeIndex * 85}%), -50%, 0) scale(${isCenter ? 1 : 0.85}) rotateY(${relativeIndex * -15}deg)`,
                        opacity: isCenter ? 1 : 0.55,
                        zIndex: isCenter ? 50 : 10 - Math.abs(relativeIndex),
                        transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease, z-index 350ms step-end',
                        willChange: 'transform, opacity',
                        transformStyle: 'preserve-3d'
                    }}
                >
                    <div 
                        className={`w-full h-full transition-all duration-200 ${isCenter ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
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
                </div>
            );
        })}
      </div>

      {/* Controls & Progress */}
      <div className="flex flex-col items-center gap-4 z-50 w-full px-4 pb-8 pointer-events-auto">
        
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 md:gap-8 w-full max-w-[520px]">
            <button
                onClick={handlePrev}
                className="p-4 rounded-full border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95 bg-white/5"
            >
                <ChevronLeft size={24} />
            </button>

            <button
                onClick={handleConfirm}
                className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base whitespace-nowrap transition-transform duration-150 hover:scale-[1.05] active:scale-[0.95]"
                style={{ backgroundColor: currentAvatar.themeColor || '#fff' }}
            >
                <span>CONFIRM IDENTITY</span>
                <Check size={18} />
            </button>

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
                className={`h-1 rounded-full transition-all duration-200 ${
                idx === currentIndex ? 'w-8 bg-white' : 'w-1 bg-white/20'
                }`}
            />
            ))}
        </div>

      </div>
    </div>
  );
};
