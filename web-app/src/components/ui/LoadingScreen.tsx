import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Quote {
  text: string;
  author: string;
}

export const LoadingScreen = () => {
  const { t } = useTranslation();
  // Get quotes from translation files, ensure it's an array
  const quotes = t('loading.quotes', { returnObjects: true }) as Quote[];
  
  // Fallback if translation fails or returns string
  const validQuotes = Array.isArray(quotes) ? quotes : [
    { text: "Loading Matrix...", author: "SYSTEM" }
  ];

  const [quote, setQuote] = useState<Quote>(validQuotes[0]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Pick random quote
    setQuote(validQuotes[Math.floor(Math.random() * validQuotes.length)]);
    
    // Small delay to ensure smooth entry
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 50); // Reduced from 100ms
    return () => clearTimeout(timer);
  }, []); // Run once on mount

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-transparent">
      {/* 
        NOTE: Background is handled in App.tsx to ensure persistence.
        This component only handles the text overlay.
      */}
      
      <div className="relative z-10 flex flex-col items-center justify-between h-full py-20 w-full">
        <div className="flex-1 flex items-center justify-center w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ 
              opacity: showContent ? 1 : 0, 
              scale: showContent ? 1 : 0.95, 
              filter: showContent ? 'blur(0px)' : 'blur(10px)',
            }}
            transition={{ 
              duration: 0.6, // Reduced from 1.5
              ease: [0.22, 1, 0.36, 1],
              delay: 0.1 // Reduced from 0.2
            }}
            className="text-center relative"
          >
            <motion.h1 
              animate={{ 
                textShadow: [
                  "0 0 20px rgba(79,70,229,0)", 
                  "0 0 30px rgba(79,70,229,0.4)", 
                  "0 0 20px rgba(79,70,229,0)"
                ],
                letterSpacing: ["0.4em", "0.5em", "0.4em"]
              }}
              transition={{ 
                duration: 2, // Faster pulse
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="text-4xl md:text-6xl font-sans font-extralight tracking-[0.5em] text-white/90 select-none uppercase"
            >
              Matrix
            </motion.h1>
            
            <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
                <motion.div 
                    className="h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent w-48 rounded-full"
                    animate={{ 
                      width: ["20%", "60%", "20%"], 
                      opacity: [0.2, 0.5, 0.2],
                      // REMOVED BLUR ANIMATION for Android stability
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
          animate={{ 
            opacity: showContent ? 1 : 0, 
            y: showContent ? 0 : 10,
            filter: showContent ? 'blur(0px)' : 'blur(5px)'
          }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} // Reduced from 1.2 and 0.8
          className="text-center max-w-md px-8"
        >
          <p className="text-white/50 text-sm font-light italic mb-4 font-serif tracking-wider leading-relaxed">
            "{quote.text}"
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-4 bg-white/10" />
            <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">
              {quote.author}
            </p>
            <div className="h-[1px] w-4 bg-white/10" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
