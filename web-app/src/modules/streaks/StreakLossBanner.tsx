import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ChevronRight, Clock } from 'lucide-react';
import { LostStreak, openStreakRecovery, RestoreCategory } from './recovery';
import './streaks.css';

interface StreakLossBannerProps {
  losses: LostStreak[];
  category: RestoreCategory;
}

/** A compact reminder inside a section (e.g. habits) while a lost streak can still be bought back. */
export const StreakLossBanner = React.memo(({ losses, category }: StreakLossBannerProps) => {
  const mine = useMemo(() => losses.filter(l => l.category === category), [losses, category]);
  const first = mine[0];
  const minDays = mine.reduce((m, l) => Math.min(m, l.daysLeft), 9);
  return (
    <AnimatePresence>
      {first && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          onClick={() => openStreakRecovery({ category, targetId: mine.length === 1 ? first.targetId : undefined })}
          className="sk-sheen mx-4 mt-2 mb-1 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-amber-400/25 px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(110deg, rgba(245,158,11,0.16), rgba(244,63,94,0.08) 55%, rgba(10,10,12,0.6))' }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/15">
            <RotateCcw size={16} className="text-amber-300" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-black text-white">
              {mine.length === 1 ? `Perdiste la racha de “${first.title}” (${first.lost} días)` : `Perdiste ${mine.length} rachas de hábitos`}
            </span>
            <span className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-200/70">
              <Clock size={10} /> {minDays <= 1 ? 'Último día para restaurar' : `Restaurable ${minDays} días más`} · desde {first.price.toLocaleString()} de oro
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-white/35" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});
