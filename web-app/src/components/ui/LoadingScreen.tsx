import { motion } from 'framer-motion';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-transparent">
      <div className="relative z-10 flex items-center justify-center h-full w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="text-center relative"
        >
          <h1
            className="text-4xl md:text-6xl font-sans font-extralight tracking-[0.45em] text-white/90 select-none uppercase"
          >
            Lux
          </h1>
          <div className="mt-5 flex justify-center">
            <div className="h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent w-36 rounded-full" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
