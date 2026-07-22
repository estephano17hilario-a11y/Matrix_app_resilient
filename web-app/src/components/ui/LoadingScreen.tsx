import { motion } from 'framer-motion';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#030307] z-[9999] pointer-events-auto select-none">
      {/* 🔮 Cosmic Space Radial Glows (Nebula Orbs) */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.15, 0.28, 0.15]
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-[450px] h-[450px] rounded-full blur-[90px] bg-indigo-500/20 pointer-events-none will-change-transform"
        style={{ top: '20%', left: '15%' }}
      />
      <motion.div
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5
        }}
        className="absolute w-[350px] h-[350px] rounded-full blur-[80px] bg-purple-500/15 pointer-events-none will-change-transform"
        style={{ bottom: '25%', right: '10%' }}
      />

      {/* 💫 Starry Constellation Ring - Rotating slowly */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute w-[280px] h-[280px] md:w-[360px] md:h-[360px] rounded-full border border-dashed border-white/5 pointer-events-none will-change-transform"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute w-[300px] h-[300px] md:w-[395px] md:h-[395px] rounded-full border border-dotted border-indigo-500/10 pointer-events-none will-change-transform"
      />

      {/* 🌌 Central Logo Container */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Soft aura behind the logo */}
        <motion.div 
          animate={{
            scale: [0.92, 1.08, 0.92],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-44 h-44 rounded-full bg-indigo-500/10 blur-xl pointer-events-none will-change-transform"
        />

        {/* Staggered Spring Letters for LUX */}
        <div className="flex gap-4 md:gap-6 items-center justify-center mb-6">
          {["L", "U", "X"].map((letter, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 25, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 14,
                delay: i * 0.16
              }}
              className="text-5xl md:text-7xl font-sans font-extralight tracking-widest text-white/95 drop-shadow-[0_0_20px_rgba(255,255,255,0.18)]"
              style={{ willChange: 'transform, opacity' }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* Premium Luxury Progress Shimmer Bar */}
        <div className="relative w-40 md:w-52 h-[2px] bg-white/[0.04] overflow-hidden rounded-full border border-white/[0.02]">
          {/* Active sliding shimmer */}
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-indigo-400 to-transparent blur-[1px] will-change-transform"
          />
        </div>
      </div>
    </div>
  );
};
