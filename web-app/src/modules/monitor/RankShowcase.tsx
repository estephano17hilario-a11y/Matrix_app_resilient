// Motion-graphics panel for El Monitor: the 8 ranks rise one by one along a glowing ladder,
// from Bronze to Legend, with their ELO entry. Transform / opacity only.

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RankBadge } from '../progression/ui/RankBadge';
import { PROGRESSION_CONFIG } from '../progression/engine/config';
import type { Lang } from './scripts';

const EN: Record<string, string> = {
  BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum',
  DIAMOND: 'Diamond', CHAMPION: 'Champion', GRAND_CHAMPION: 'Grand Champion', LEGEND: 'Legend',
};

export const RankShowcase = memo(({ lang }: { lang: Lang }) => {
  const reduce = !!useReducedMotion();
  const ranks = PROGRESSION_CONFIG.RANKS;
  const last = ranks.length - 1;
  const step = 0.16;

  return (
    <div className="relative mt-3 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(99,102,241,0.22),rgba(5,5,15,0.6)_70%)] px-2 pt-3 pb-2.5">
      {/* rising light beam */}
      {!reduce && (
        <motion.div aria-hidden className="absolute inset-y-0 w-16"
          style={{ pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
          initial={{ x: -80 }} animate={{ x: 420 }} transition={{ duration: 1.6, delay: ranks.length * step, ease: 'easeInOut' }} />
      )}

      <div className="relative grid grid-cols-4 gap-y-2.5">
        {ranks.map((r, i) => (
          <motion.div key={r.id} className="flex flex-col items-center"
            initial={reduce ? false : { opacity: 0, y: 22, scale: 0.4, rotate: -20 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={{ delay: reduce ? 0 : 0.15 + i * step, type: 'spring', stiffness: 360, damping: 15 }}>
            <div className="relative grid h-[46px] place-items-center">
              {i === last && !reduce && (
                <motion.span aria-hidden className="absolute h-11 w-11 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(253,230,138,0.55), transparent 70%)' }}
                  animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8, repeat: Infinity }} />
              )}
              <RankBadge rankIndex={i} division={i === last ? null : 0} size={i === last ? 40 : 34} animate={i === last} />
            </div>
            <span className="mt-1 max-w-full px-0.5 text-center text-[10px] font-black leading-[1.1]" style={{ color: r.color }}>
              {lang === 'es' ? r.name : EN[r.id]}
            </span>
            <span className="text-[9px] font-bold tabular-nums text-white/40">{r.entry} ELO</span>
          </motion.div>
        ))}
      </div>

      {/* progress rail */}
      <div className="relative mx-2 mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div className="absolute inset-0 rounded-full"
          style={{ originX: 0, background: `linear-gradient(90deg, ${ranks.map(r => r.color).join(', ')})` }}
          initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: reduce ? 0 : ranks.length * step + 0.2, delay: 0.15, ease: 'easeOut' }} />
      </div>
      <div className="mt-1.5 flex justify-between px-2 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white/40">
        <span>{lang === 'es' ? 'Empiezas aquí' : 'You start here'}</span>
        <span className="text-amber-200/80">{lang === 'es' ? 'La cima' : 'The top'}</span>
      </div>
    </div>
  );
});
RankShowcase.displayName = 'RankShowcase';
