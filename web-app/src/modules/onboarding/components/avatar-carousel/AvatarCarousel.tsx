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
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (initialAvatarId) {
      const index = AVAILABLE_AVATARS.findIndex(a => a.id === initialAvatarId);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [initialAvatarId]);

  // === PRELOAD NEXT/PREV IMAGES ===
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % AVAILABLE_AVATARS.length;
    const prevIndex = (currentIndex - 1 + AVAILABLE_AVATARS.length) % AVAILABLE_AVATARS.length;
    
    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
    };

    preloadImage(AVAILABLE_AVATARS[nextIndex].path);
    preloadImage(AVAILABLE_AVATARS[prevIndex].path);
  }, [currentIndex]);

  const currentAvatar = AVAILABLE_AVATARS[currentIndex];

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let nextIndex = prev + newDirection;
      if (nextIndex < 0) nextIndex = AVAILABLE_AVATARS.length - 1;
      if (nextIndex >= AVAILABLE_AVATARS.length) nextIndex = 0;
      return nextIndex;
    });
  };

  const handleNext = () => paginate(1);
  const handlePrev = () => paginate(-1);

  const handleConfirm = () => {
    onSelect(currentAvatar.id);
  };

  // === ULTRA-FLUID TRANSITIONS ===
  const variants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      scale: 0.85,
      opacity: 0,
      zIndex: 0,
      rotateY: direction > 0 ? 10 : -10 // Reduced rotation for less "3D jank"
    }),
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
      zIndex: 1,
      rotateY: 0,
      transition: {
        x: { type: "spring", stiffness: 400, damping: 35, mass: 0.8 }, // Snappier but smooth
        scale: { duration: 0.3, ease: "circOut" },
        opacity: { duration: 0.2 },
        rotateY: { type: "spring", stiffness: 400, damping: 35 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      scale: 0.85,
      opacity: 0,
      zIndex: 0,
      rotateY: direction < 0 ? 10 : -10,
      transition: {
        x: { type: "spring", stiffness: 400, damping: 35, mass: 0.8 },
        scale: { duration: 0.3 },
        opacity: { duration: 0.2 }
      }
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden touch-none select-none">
      
      {/* 
         DYNAMIC ATMOSPHERE BACKGROUND (OPTIMIZED - NO UNMOUNTING)
      */}
      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-950">
         {/* 1. Global Tint (Subtle Color Wash) - Hardware Accelerated */}
         <motion.div 
            className="absolute inset-0 will-change-[background-color]"
            animate={{ backgroundColor: currentAvatar.themeColor }}
            transition={{ duration: 0.5 }} // Faster tint transition
            style={{ opacity: 0.1 }}
         />

         {/* 2. The "Gradient" Overlay (Static) */}
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80" />

         {/* 3. The Radial Aura (Optimized) */}
         <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] opacity-30 pointer-events-none will-change-[background-color]"
            animate={{ backgroundColor: currentAvatar.themeColor }}
            transition={{ duration: 0.5 }}
            style={{ 
                maskImage: 'radial-gradient(circle, black 0%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 70%)'
            }}
         />
      </div>

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
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragStart={() => setDragging(true)}
              onDragEnd={(e, { offset, velocity }) => {
                setDragging(false);
                const swipe = swipePower(offset.x, velocity.x);

                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
              className="absolute inset-0 w-full h-full flex items-center justify-center touch-pan-y cursor-grab active:cursor-grabbing will-change-transform"
            >
              <AvatarSelectorCard
                id={currentAvatar.id}
                name={currentAvatar.name}
                rarity={currentAvatar.rarity}
                imageUrl={currentAvatar.path}
                themeColor={currentAvatar.themeColor}
                isSelected={true} 
                // Removed backdrop-blur-sm and simplified shadow
                className="w-full h-full border-0 ring-1 ring-white/10 shadow-2xl pointer-events-none" // pointer-events-none to prevent image dragging issues
                onClick={() => !dragging && handleConfirm()} // Only click if not dragging
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls & Name */}
      <div className="flex flex-col items-center gap-6 z-20 w-full px-6 mb-8 pointer-events-none">
        
        {/* Avatar Info Text */}
        <motion.div 
          key={`text-${currentAvatar.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-center"
        >
           <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">
             {currentAvatar.name}
           </h2>
           <p className="text-white/50 text-sm uppercase tracking-widest mt-1">
             {currentAvatar.rarity}
           </p>
        </motion.div>

        {/* Navigation Buttons (Pointer events auto to enable clicking) */}
        <div className="flex items-center gap-6 sm:gap-12 pointer-events-auto">
            <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrev}
                className="p-4 rounded-full border border-white/10 text-white/70 hover:text-white transition-colors backdrop-blur-md bg-black/20"
            >
                <ChevronLeft size={24} />
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirm}
                className="px-8 py-3 rounded-full font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2 z-30"
                style={{ backgroundColor: currentAvatar.themeColor || '#fff' }}
            >
                <span>SELECT</span>
                <Check size={18} />
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
                className="p-4 rounded-full border border-white/10 text-white/70 hover:text-white transition-colors backdrop-blur-md bg-black/20"
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
