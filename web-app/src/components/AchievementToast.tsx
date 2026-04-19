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
  const notificationRoot = typeof document !== 'undefined' ? document.getElementById('notification-stack-root') : null;
  
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
          layout
          initial={{ y: -40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30, 
            mass: 0.8
          }}
          className="w-full flex justify-center pointer-events-none p-2 will-change-transform"
        >
          <div className="
            relative
            flex items-center gap-4 px-5 py-4
            bg-[#080808] border border-emerald-500/30
            rounded-2xl
            shadow-[0_12px_40px_rgba(0,0,0,0.7)]
            pointer-events-auto
            overflow-hidden
            w-full max-w-sm
            group
          ">
            {/* Optimized Background Effect (No heavy blur during animation) */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-50" />
            
            {/* Icon Container with Static Glow (Performance Optimized) */}
            <div className="
              relative z-10 flex items-center justify-center
              p-2.5 rounded-xl
              bg-emerald-500/10
              border border-emerald-500/20
              shadow-[0_0_20px_rgba(16,185,129,0.2)]
            ">
              <achievement.icon className="relative w-6 h-6 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
            </div>
            
            <div className="relative z-10 flex flex-col min-w-0 flex-1">
              <span className="text-[9px] font-black tracking-[0.25em] text-emerald-400/80 uppercase mb-0.5 font-mono">
                {t('achievements.unlocked')}
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-white leading-tight tracking-tight truncate">
                  {t(achievement.title)}
                </span>
                <span className="
                    flex items-center justify-center shrink-0
                    text-[10px] font-mono font-black text-emerald-300
                    bg-emerald-500/10 px-2 py-0.5 rounded-md 
                    border border-emerald-500/20
                ">
                  +{Math.floor(achievement.xpReward)} XP
                </span>
              </div>
            </div>

            {/* Subtle light sweep animation (CSS only, GPU friendly) */}
            <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:animate-[sweep_1.5s_ease-in-out_infinite]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    notificationRoot || document.body
  );
};
