// End of sign-up: Lux (the flame mascot) congratulates the user, glitches out and is rebuilt as
// El Monitor's orb — the guide that takes over inside the app. ~5.5 s, tap "Saltar" to skip.
// Only transform / opacity / clip-path animate; the RGB-split layers live < 1 s.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LuxMascot } from '../../auth/components/LuxMascot';
import { MonitorOrb } from '../../monitor/MonitorOrb';

type Phase = 'hello' | 'glitch' | 'rebuild' | 'out';

const SLICES = [
  'inset(8% 0 72% 0)', 'inset(40% 0 38% 0)', 'inset(66% 0 12% 0)', 'inset(22% 0 60% 0)',
  'inset(52% 0 30% 0)', 'inset(80% 0 4% 0)', 'inset(0% 0 86% 0)', 'inset(30% 0 50% 0)',
];

export const LuxToMonitorCinematic = ({ name, lang, onDone }: { name?: string | null; lang: 'es' | 'en'; onDone: () => void }) => {
  const reduce = !!useReducedMotion();
  const [phase, setPhase] = useState<Phase>('hello');
  const first = (name || '').trim().split(' ')[0];
  const line = lang === 'es'
    ? `¡Muy bien${first ? `, ${first}` : ''}! Ahora empecemos a usar la app 🚀`
    : `Great job${first ? `, ${first}` : ''}! Now let's start using the app 🚀`;

  // Keep the latest callback without restarting the timeline on parent re-renders.
  const done = useRef(onDone);
  done.current = onDone;
  const finish = () => done.current();

  useEffect(() => {
    const onDone = () => done.current();
    if (reduce) {
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setPhase('glitch'), 2500);
    const t2 = setTimeout(() => setPhase('rebuild'), 3500);
    const t3 = setTimeout(() => setPhase('out'), 6300);
    const t4 = setTimeout(onDone, 6900);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [reduce]);

  const sparks = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    return { x: Math.cos(a) * (90 + (i % 4) * 26), y: Math.sin(a) * (90 + (i % 4) * 26), c: ['#fbbf24', '#f472b6', '#67e8f9', '#a78bfa'][i % 4] };
  }), []);

  const glitching = phase === 'glitch';
  const showLux = phase === 'hello' || phase === 'glitch';

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100800] overflow-hidden flex flex-col items-center justify-center text-white"
      style={{ background: 'radial-gradient(110% 80% at 50% 40%, #1a1045 0%, #07061a 55%, #000 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-label={line}
    >
      <style>{`
        .cine-scan { background: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px); }
        .lux-float { animation: cine-float 3.2s ease-in-out infinite; }
        .lux-glow { animation: cine-glow 3.2s ease-in-out infinite; }
        @keyframes cine-float { 0%,100% { transform: translate3d(0,0,0) } 50% { transform: translate3d(0,-8px,0) } }
        @keyframes cine-glow { 0%,100% { transform: scale(0.92); opacity: .75 } 50% { transform: scale(1.06); opacity: 1 } }
      `}</style>

      {/* Perspective grid */}
      <motion.div aria-hidden className="absolute -left-1/2 -right-1/2 bottom-[-10%] h-[50%]"
        style={{ pointerEvents: 'none', transform: 'perspective(420px) rotateX(62deg)', backgroundImage: 'linear-gradient(rgba(103,232,249,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.2) 1px, transparent 1px)', backgroundSize: '42px 42px', maskImage: 'linear-gradient(to top, black, transparent)', WebkitMaskImage: 'linear-gradient(to top, black, transparent)' }}
        initial={{ opacity: 0 }} animate={{ opacity: phase === 'hello' ? 0.25 : 0.6 }} transition={{ duration: 0.8 }} />

      {/* Scanlines + screen shake during the glitch */}
      <AnimatePresence>
        {glitching && (
          <motion.div key="scan" aria-hidden className="cine-scan absolute inset-0" style={{ pointerEvents: 'none' }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4, 1] }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
        )}
      </AnimatePresence>

      <motion.div
        className="relative w-[260px] h-[260px] grid place-items-center"
        animate={glitching ? { x: [0, -6, 5, -3, 7, -2, 0], y: [0, 3, -4, 2, -1, 0] } : { x: 0, y: 0 }}
        transition={glitching ? { duration: 0.35, repeat: 2 } : { duration: 0.2 }}
      >
        {/* ── Lux ── */}
        <AnimatePresence>
          {showLux && (
            <motion.div key="lux" className="absolute inset-0 grid place-items-center"
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: [1, 1.25, 0], opacity: [1, 1, 0], filter: ['brightness(1)', 'brightness(3)', 'brightness(6)'], transition: { duration: 0.45, ease: 'easeIn' } }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
              <LuxMascot mood={glitching ? 'thinking' : 'excited'} size={170} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* RGB split + slice layers */}
        {glitching && (
          <>
            {[{ c: 'hue-rotate(160deg) saturate(3)', dx: -8 }, { c: 'hue-rotate(-60deg) saturate(4)', dx: 8 }].map((l, i) => (
              <motion.div key={i} aria-hidden className="absolute inset-0 grid place-items-center mix-blend-screen" style={{ filter: l.c, pointerEvents: 'none' }}
                animate={{ x: [0, l.dx, -l.dx / 2, l.dx, 0], opacity: [0, 0.85, 0.5, 0.9, 0] }}
                transition={{ duration: 0.9, ease: 'linear' }}>
                <LuxMascot mood="thinking" size={170} />
              </motion.div>
            ))}
            <motion.div aria-hidden className="absolute inset-0 grid place-items-center" style={{ pointerEvents: 'none' }}
              animate={{ clipPath: SLICES, x: [0, 14, -18, 10, -8, 20, -12, 0] }}
              transition={{ duration: 0.9, ease: 'linear' }}>
              <LuxMascot mood="thinking" size={170} />
            </motion.div>
          </>
        )}

        {/* ── El Monitor ── */}
        {(phase === 'rebuild' || phase === 'out') && (
          <>
            <motion.span aria-hidden className="absolute w-[150px] h-[150px] rounded-full border-2 border-cyan-300"
              initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 2.8, opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
            <motion.span aria-hidden className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(103,232,249,0.5) 25%, transparent 60%)' }}
              initial={{ opacity: 1, scale: 0.4 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: 0.6 }} />
            {sparks.map((s, i) => (
              <motion.span key={i} aria-hidden className="absolute w-1.5 h-1.5 rounded-full"
                style={{ background: s.c, boxShadow: `0 0 10px ${s.c}` }}
                initial={{ x: s.x * 1.8, y: s.y * 1.8, opacity: 0 }} animate={{ x: s.x * 0.15, y: s.y * 0.15, opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, delay: (i % 6) * 0.03, ease: 'easeIn' }} />
            ))}
            <motion.div initial={{ scale: 0, rotate: -160, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.15 }}>
              <MonitorOrb size={180} mood="talk" speaking look={{ x: 0, y: 0.15 }} />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Copy */}
      <div className="relative mt-6 h-[110px] w-full max-w-[340px] px-4 text-center">
        <AnimatePresence>
          {showLux ? (
            <motion.div key="hello" style={{ position: 'absolute', left: 16, right: 16, top: 0 }}
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={glitching ? { opacity: [1, 0.2, 1, 0.1, 1], x: [0, -6, 6, -3, 0], scale: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={glitching ? { duration: 0.6 } : { delay: 0.35, type: 'spring', stiffness: 380, damping: 24 }}
              className="relative inline-block rounded-[20px] bg-white px-5 py-3.5 text-[17px] font-extrabold leading-snug text-slate-800">
              <span aria-hidden className="absolute left-1/2 -top-[7px] -ml-[7px] h-3.5 w-3.5 rotate-45 bg-white" />
              {line}
            </motion.div>
          ) : (
            <motion.div key="monitor" style={{ position: 'absolute', left: 0, right: 0, top: 0 }} initial={{ opacity: 0 }} animate={{ opacity: phase === 'out' ? 0 : 1 }} transition={{ duration: 0.4 }}>
              <div className="flex justify-center gap-[3px]">
                {'EL MONITOR'.split('').map((ch, i) => (
                  <motion.span key={i} className="text-[30px] font-black tracking-[0.12em]"
                    style={{ width: ch === ' ' ? 12 : undefined, background: 'linear-gradient(180deg,#fff,#a5f3fc 55%,#818cf8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
                    initial={{ opacity: 0, y: 18, x: (i % 2 ? 1 : -1) * 10 }} animate={{ opacity: [0, 1, 0.3, 1], y: 0, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.045, duration: 0.45 }}>
                    {ch}
                  </motion.span>
                ))}
              </div>
              <motion.p className="mt-2 text-[12px] font-extrabold uppercase tracking-[0.3em] text-cyan-200/70"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
                {lang === 'es' ? 'Iniciando tu guía…' : 'Starting your guide…'}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fade to black handoff */}
      <motion.div aria-hidden className="absolute inset-0 bg-black" style={{ pointerEvents: 'none' }}
        initial={{ opacity: 0 }} animate={{ opacity: phase === 'out' ? 1 : 0 }} transition={{ duration: 0.55 }} />

      <button type="button" onClick={finish}
        className="absolute right-4 top-[max(env(safe-area-inset-top),14px)] rounded-full bg-white/10 px-4 py-2 text-[13px] font-bold text-white/70 active:scale-95">
        {lang === 'es' ? 'Saltar' : 'Skip'}
      </button>
    </motion.div>,
    document.body,
  );
};
