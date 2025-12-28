import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AVAILABLE_AVATARS } from '../../../../config/avatars';
import { AvatarSelectorCard } from '../../../customization/components/AvatarSelectorCard';

interface AvatarCarouselProps {
  onSelect: (avatarId: string) => void;
  initialAvatarId?: string;
}

export const AvatarCarousel: React.FC<AvatarCarouselProps> = ({ onSelect, initialAvatarId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  useEffect(() => {
    if (initialAvatarId) {
      const index = AVAILABLE_AVATARS.findIndex(a => a.id === initialAvatarId);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [initialAvatarId]);

  const currentAvatar = AVAILABLE_AVATARS[currentIndex];
  // Calculate previous and next for potential future "peek" implementation, 
  // but for now we focus on the main transition.

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % AVAILABLE_AVATARS.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + AVAILABLE_AVATARS.length) % AVAILABLE_AVATARS.length);
  };

  const handleConfirm = () => {
    onSelect(currentAvatar.id);
  };

  // Apple-style "Spring" transitions
  // The entering card starts slightly smaller and offset
  // The exiting card scales down slightly and fades
  const variants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      scale: 0.85,
      opacity: 0,
      zIndex: 0,
      rotateY: direction > 0 ? 15 : -15
    }),
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
      zIndex: 1,
      rotateY: 0,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        scale: { duration: 0.4, ease: "circOut" },
        opacity: { duration: 0.3 },
        rotateY: { type: "spring", stiffness: 300, damping: 30 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%', // Move opposite to direction
      scale: 0.85,
      opacity: 0,
      zIndex: 0,
      rotateY: direction < 0 ? 15 : -15,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        scale: { duration: 0.4 },
        opacity: { duration: 0.3 }
      }
    })
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      
      {/* 
         DYNAMIC ATMOSPHERE BACKGROUND (RESTORING "THE GRADIENTS")
      */}
      <AnimatePresence mode="popLayout">
         <motion.div
            key={currentAvatar.id}
            className="absolute inset-0 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* 1. Global Tint (Subtle Color Wash) */}
            <div 
                className="absolute inset-0 transition-colors duration-700"
                style={{ 
                    backgroundColor: currentAvatar.themeColor, 
                    opacity: 0.15 
                }}
            />

            {/* 2. The "Gradient" Overlay (Darkness from bottom/top) */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />

            {/* 3. The Radial Aura (Centered Glow) */}
            <div 
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-40 pointer-events-none blur-[100px]"
               style={{ 
                   background: `radial-gradient(circle, ${currentAvatar.themeColor} 0%, transparent 70%)` 
               }}
            />
          </motion.div>
      </AnimatePresence>

      {/* Main Card Carousel */}
      <div className="relative w-full flex-1 flex items-center justify-center min-h-0 py-4 z-10 px-6">
        <div className="relative w-full max-w-[320px] aspect-[9/16] max-h-full perspective-1000">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full flex items-center justify-center"
            >
              <AvatarSelectorCard
                id={currentAvatar.id}
                name={currentAvatar.name}
                rarity={currentAvatar.rarity}
                imageUrl={currentAvatar.path}
                themeColor={currentAvatar.themeColor}
                isSelected={true} 
                className="w-full h-full border-0 ring-1 ring-white/10 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]" 
                onClick={() => {}} 
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls & Name */}
      <div className="flex flex-col items-center gap-6 z-20 w-full px-6 mb-8">
        
        {/* Avatar Info Text */}
        <motion.div 
          key={`text-${currentAvatar.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
           <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">
             {currentAvatar.name}
           </h2>
           <p className="text-white/50 text-sm uppercase tracking-widest mt-1">
             {currentAvatar.rarity}
           </p>
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-6 sm:gap-12">
            <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrev}
                className="p-4 rounded-full border border-white/10 text-white/70 hover:text-white transition-colors"
            >
                <ChevronLeft size={24} />
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirm}
                className="px-8 py-3 rounded-full font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2"
                style={{ backgroundColor: currentAvatar.themeColor || '#fff' }}
            >
                <span>SELECT</span>
                <Check size={18} />
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
                className="p-4 rounded-full border border-white/10 text-white/70 hover:text-white transition-colors"
            >
                <ChevronRight size={24} />
            </motion.button>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-6 flex gap-2 z-20">
        {AVAILABLE_AVATARS.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-6' : 'w-1.5 bg-white/20'
            }`}
            style={{ 
              backgroundColor: idx === currentIndex ? currentAvatar.themeColor : undefined 
            }}
          />
        ))}
      </div>
    </div>
  );
};
