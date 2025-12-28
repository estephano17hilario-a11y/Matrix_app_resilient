import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeartExplosionProps {
  isActive: boolean;
}

export const HeartExplosion: React.FC<HeartExplosionProps> = ({ isActive }) => {
  const [hearts, setHearts] = useState<{ id: number; x: number; scale: number; rotation: number }[]>([]);

  useEffect(() => {
    if (isActive) {
      // Generate 20 hearts
      const newHearts = Array.from({ length: 25 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100, // Random percentage
        scale: 0.5 + Math.random() * 1.5, // Random size
        rotation: Math.random() * 40 - 20, // Slight tilt
      }));
      setHearts(newHearts);

      // Cleanup after animation
      const timer = setTimeout(() => setHearts([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <AnimatePresence>
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ 
            opacity: 0, 
            y: '100vh', 
            x: `${heart.x}vw`,
            scale: 0,
            rotate: heart.rotation
          }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: '-20vh',
            scale: heart.scale,
            rotate: heart.rotation + (Math.random() > 0.5 ? 20 : -20)
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 2 + Math.random() * 2,
            ease: "easeOut",
            delay: Math.random() * 0.5
          }}
          className="fixed pointer-events-none z-[100] text-red-500 drop-shadow-lg"
          style={{ left: 0, top: 0 }}
        >
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};
