import React, { useEffect } from 'react';
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
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.9 }}
          animate={{ y: 24, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
        >
          {/* Glass Capsule */}
          <div className="
            flex items-center gap-4 px-6 py-3
            bg-gray-950/80 backdrop-blur-lg
            border border-white/10 rounded-full
            shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]
            pointer-events-auto
          ">
            {/* Icon Container with Glow */}
            <div className="
              relative flex items-center justify-center
              p-2 rounded-full 
              bg-gradient-to-br from-emerald-500/20 to-teal-500/10
              border border-emerald-500/30
            ">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
              <achievement.icon className="relative w-6 h-6 text-emerald-400" />
            </div>
            
            {/* Text Content */}
            <div className="flex flex-col min-w-[160px]">
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mb-0.5">
                {t('achievements.unlocked')}
              </span>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-white leading-none">
                  {t(achievement.title)}
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  +{Math.floor(achievement.xpReward)} {t('achievements.currency')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
