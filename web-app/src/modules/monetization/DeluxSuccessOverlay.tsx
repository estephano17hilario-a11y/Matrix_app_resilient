import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Zap, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DeluxSuccessOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeluxSuccessOverlay: React.FC<DeluxSuccessOverlayProps> = ({ isOpen, onClose }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStage(0);
      
      // Stage 1: Lock appears and shakes (0-1s)
      const t1 = setTimeout(() => setStage(1), 1000);
      
      // Stage 2: Lock breaks (Unlock) and explosion (1-2s)
      const t2 = setTimeout(() => {
        setStage(2);
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#6366f1', '#ec4899', '#ffffff']
        });
      }, 2000);
      
      // Stage 3: Welcome text appears (2-4s)
      const t3 = setTimeout(() => setStage(3), 3500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
        {/* Dark Background */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#050010]"
        />

        {/* Cosmic Background (Same as ProUpgradeModal) */}
        <motion.div 
          className="absolute inset-0 z-0 opacity-50"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: "linear" }}
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 15% 15%, white 100%, transparent), 
              radial-gradient(1.5px 1.5px at 35% 45%, rgba(255,255,255,0.8) 100%, transparent), 
              radial-gradient(2px 2px at 55% 85%, white 100%, transparent), 
              radial-gradient(circle at 50% 50%, rgba(99,102,241,0.5) 0%, rgba(168,85,247,0.3) 50%, transparent 100%)
            `,
            backgroundSize: '200px 200px, 200px 200px, 200px 200px, 200% 200%'
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl px-6 text-center">
          
          {/* Lock Animation Area */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-12">
            <AnimatePresence mode="wait">
              {stage < 2 && (
                <motion.div
                  key="locked"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={stage === 1 ? { 
                    scale: 1, 
                    opacity: 1,
                    x: [-5, 5, -5, 5, 0],
                    transition: { x: { duration: 0.4, repeat: Infinity } }
                  } : { scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }} 
                  className="absolute flex items-center justify-center text-white/50"
                >
                  <Lock size={100} strokeWidth={1} />
                </motion.div>
              )}

              {stage >= 2 && (
                <motion.div
                  key="unlocked"
                  initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
                  className="absolute flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400 drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]"
                >
                  <Unlock size={120} strokeWidth={1.5} color="#a855f7" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Energy Ring */}
            {stage >= 2 && (
              <motion.div 
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.8)]"
              />
            )}
          </div>

          {/* Text Area */}
          <div className="h-40 flex flex-col items-center justify-start">
            <AnimatePresence>
              {stage >= 2 && (
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter"
                >
                  AHORA ERES <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">DELUX</span>
                </motion.h1>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {stage >= 3 && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg md:text-xl text-white/60 font-medium max-w-md mx-auto"
                >
                  Camina hacia el futuro. Los límites han sido removidos de tu sistema.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Continue Button */}
          <AnimatePresence>
            {stage >= 3 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="mt-8 px-12 py-4 rounded-full bg-white text-black font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all flex items-center gap-3"
              >
                <Zap size={20} className="text-indigo-600" />
                Iniciar Secuencia
              </motion.button>
            )}
          </AnimatePresence>
          
          {/* Security Badge */}
          <AnimatePresence>
            {stage >= 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 flex items-center gap-2 text-emerald-400/60 text-xs font-mono uppercase tracking-widest"
              >
                <ShieldCheck size={14} />
                <span>Auditoría de Transacción: Verificada</span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </AnimatePresence>
  );
};