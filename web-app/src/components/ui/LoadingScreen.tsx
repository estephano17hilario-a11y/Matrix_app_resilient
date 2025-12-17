import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const QUOTES = [
  { text: "The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.", author: "JOHN MILTON" },
  { text: "We do not see things as they are, we see them as we are.", author: "ANAÏS NIN" },
  { text: "He who has a why to live for can bear almost any how.", author: "FRIEDRICH NIETZSCHE" },
  { text: "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.", author: "ALBERT CAMUS" }
];

export const LoadingScreen = () => {
  const [quote, setQuote] = useState(QUOTES[0]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    // Small delay to ensure smooth entry
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* 
        NOTE: Background is handled in App.tsx to ensure persistence.
        This component only handles the text overlay.
      */}
      
      <div className="relative z-10 flex flex-col items-center justify-between h-full py-20">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: showContent ? 1 : 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-sans font-light tracking-[0.5em] text-white/90 select-none">
              MATRIX
            </h1>
          </motion.div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showContent ? 1 : 0, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-center max-w-md px-6"
        >
          <p className="text-white/60 text-sm font-medium italic mb-3 font-serif tracking-wide">
            "{quote.text}"
          </p>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">
            {quote.author}
          </p>
        </motion.div>
      </div>
    </div>
  );
};
