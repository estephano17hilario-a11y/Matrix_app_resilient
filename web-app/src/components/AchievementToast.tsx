import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Achievement } from '../config/achievements';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onClose }) => {
  const { t } = useTranslation();
  
  useEffect(() => {
    if (achievement) {
      // HAPTICS: Vibration pattern for achievement
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
      
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  return createPortal(
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ y: -150, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -150, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, mass: 1.2 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex justify-center pointer-events-none w-full max-w-sm px-4"
        >
          {/* Hyper-Glass Capsule */}
          <div className="
            relative
            flex items-center gap-4 px-6 py-4
            bg-[#050505]/95 backdrop-blur-md
            border border-white/20
            rounded-2xl
            shadow-[0_0_50px_rgba(16,185,129,0.25)]
            pointer-events-auto
            overflow-hidden
          ">
            {/* Inner Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-50" />
            
            {/* Icon Container with Glow */}
            <div className="
              relative z-10 flex items-center justify-center
              p-2.5 rounded-xl
              bg-emerald-500/10
              border border-emerald-500/30
              shadow-[0_0_15px_rgba(16,185,129,0.3)]
            ">
              <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full animate-pulse" />
              <achievement.icon className="relative w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            
            {/* Text Content */}
            <div className="relative z-10 flex flex-col min-w-[180px]">
              <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase mb-1 drop-shadow-sm">
                {t('achievements.unlocked')}
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-white leading-none tracking-tight drop-shadow-md">
                  {t(achievement.title)}
                </span>
                <span className="
                    flex items-center justify-center
                    text-xs font-mono font-bold text-emerald-300 
                    bg-emerald-950/50 px-2 py-1 rounded-md 
                    border border-emerald-500/30
                    shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]
                ">
                  +{Math.floor(achievement.xpReward)} {t('achievements.currency')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
