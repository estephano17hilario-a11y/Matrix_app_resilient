import React, { memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { playLevelUpSound, playStellarSound } from '@/utils/soundEffects';
import { progressionStore, useProgression, type Celebration } from '../progressionStore';
import { RankBadge } from './RankBadge';
import { DivisionBar, haptic } from './primitives';
import { MOTION, rankRgb, rankStyle } from './tokens';

/** Hard cap so the effect never costs frames on mid-range phones. */
const MAX_PARTICLES = 90;
const PARTICLE_MS = 1800;

export const CelebrationLayer: React.FC = memo(() => {
  const { celebration, meta, pendingReport } = useProgression();
  // Wait for the report sheet to close so both don't compete for attention.
  const show = celebration && !pendingReport ? celebration : null;

  useEffect(() => {
    if (!show) return;
    if (show.kind === 'RANK_UP') {
      haptic(meta.hapticsEnabled, [40, 60, 40, 60, 120]);
      if (meta.soundEnabled) playLevelUpSound();
    } else {
      haptic(meta.hapticsEnabled, [20, 40, 20]);
      if (meta.soundEnabled) playStellarSound();
    }
    const timer = setTimeout(() => progressionStore.clearCelebration(), show.kind === 'RANK_UP' ? 3600 : 2600);
    return () => clearTimeout(timer);
  }, [show, meta.hapticsEnabled, meta.soundEnabled]);

  return createPortal(
    <AnimatePresence>
      {show?.kind === 'RANK_UP' && <RankUp key={show.at} c={show} />}
      {show?.kind === 'DIVISION_UP' && <DivisionUp key={show.at} c={show} />}
    </AnimatePresence>,
    document.body,
  );
});
CelebrationLayer.displayName = 'CelebrationLayer';

const DivisionUp: React.FC<{ c: Celebration }> = ({ c }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="prog-root fixed inset-x-0 mx-auto top-[calc(env(safe-area-inset-top)+12px)] z-[950] w-[min(92vw,420px)]"
      style={rankStyle(c.standing.rankIndex)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={reduce ? { duration: 0.15 } : MOTION.pop}
      onClick={() => progressionStore.clearCelebration()}
      role="status" aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-[var(--p-r-xl)] px-4 py-3 flex items-center gap-3 shadow-[var(--p-shadow-2)]" style={{ background: 'rgb(var(--p-surface))', border: '1px solid rgb(var(--rank) / 0.4)' }}>
        <div className="relative">
          {!reduce && <motion.div className="prog-glow" animate={{ opacity: [0, 1, 0.35] }} transition={{ duration: 0.6, ease: 'easeOut' }} />}
          <motion.div initial={reduce ? false : { scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={MOTION.pop}>
            <RankBadge rankIndex={c.standing.rankIndex} division={c.standing.division} size={38} />
          </motion.div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--rank))' }}>{t('progression.celebrate.division', '¡Subiste de división!')}</p>
          <p className="text-[17px] font-black">{c.standing.label}</p>
          {c.standing.progress !== null && <div className="mt-1.5"><DivisionBar value={c.standing.progress} shine height={6} /></div>}
        </div>
      </div>
    </motion.div>
  );
};

const RankUp: React.FC<{ c: Celebration }> = ({ c }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="prog-root fixed inset-0 z-[960] flex flex-col items-center justify-center px-6 text-center"
      style={{ ...rankStyle(c.standing.rankIndex), background: 'radial-gradient(80% 60% at 50% 45%, rgb(var(--rank) / 0.28), transparent 70%), rgb(5 5 8 / 0.97)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: MOTION.short }}
      onClick={() => progressionStore.clearCelebration()}
      role="alertdialog" aria-live="assertive" aria-label={`${t('progression.celebrate.rank', 'Nuevo rango')}: ${c.standing.rank.name}`}
    >
      {!reduce && <Particles rgb={rankRgb(c.standing.rankIndex)} />}
      <motion.p
        className="text-[12px] font-bold uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--rank))' }}
        initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: MOTION.short }}
      >
        {t('progression.celebrate.rank', 'Nuevo rango')}
      </motion.p>
      <div className="relative my-6">
        {!reduce && <motion.div className="prog-glow" style={{ inset: '-60%' }} animate={{ opacity: [0, 1, 0.6] }} transition={{ duration: MOTION.celebrate, delay: 0.2 }} />}
        <motion.div
          initial={reduce ? false : { scale: 0.3, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
          style={{ willChange: 'transform' }}
        >
          <RankBadge rankIndex={c.standing.rankIndex} division={c.standing.division} size={230} animate />
        </motion.div>
      </div>
      <motion.h2
        className="text-[34px] font-black leading-none"
        initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45, duration: MOTION.celebrate, ease: MOTION.easeOut }}
      >
        {c.standing.label}
      </motion.h2>
      <motion.p className="mt-3 text-[14px] prog-text-2" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        {t('progression.celebrate.tap', 'Toca para continuar')}
      </motion.p>
    </motion.div>
  );
};

/** Canvas burst: capped particle count, DPR ≤ 2, stops itself. */
const Particles: React.FC<{ rgb: string }> = ({ rgb }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const colors = [`rgb(${rgb})`, '#ffffff', `rgb(${rgb} / 0.7)`];
    const ps = Array.from({ length: MAX_PARTICLES }, () => {
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 6;
      return { x: w / 2, y: h * 0.45, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 1.5 + Math.random() * 3, c: colors[(Math.random() * colors.length) | 0] };
    });
    let raf = 0;
    const start = performance.now();
    const frame = (t: number) => {
      const p = (t - start) / PARTICLE_MS;
      ctx.clearRect(0, 0, w, h);
      if (p >= 1) return;
      ctx.globalAlpha = 1 - p;
      for (const q of ps) {
        q.vy += 0.12;
        q.vx *= 0.985;
        q.x += q.vx;
        q.y += q.vy;
        ctx.fillStyle = q.c;
        ctx.fillRect(q.x, q.y, q.r, q.r);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rgb]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
};
