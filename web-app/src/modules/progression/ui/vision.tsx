// ─────────────────────────────────────────────────────────────────────────────
// VISION KIT — the pieces that give the Progression screen its spatial-glass look:
// the tinted room, floating header and tab bar, large titles and the hero stage.
// Colours come from rankTheme (rank + division); styles live in vision.css.
// ─────────────────────────────────────────────────────────────────────────────

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { MOTION } from './tokens';
import type { RankTheme } from './rankTheme';

/** The room: aurora orbs in the rank hue; rays from division II; sparkles at III; a prism for Legend. */
export const VisionBackdrop: React.FC<{ theme: RankTheme }> = memo(({ theme }) => {
  // Fixed sparkle layout (deterministic, so it does not reshuffle on re-render).
  const sparks = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ left: (i * 83 + 11) % 100, delay: -((i * 7) % 9), dx: ((i % 5) - 2) * 10, dur: 8 + (i % 4) * 1.5 })), []);
  return (
    <div className="vp-backdrop" aria-hidden="true">
      <div className="vp-orb vp-orb--a" />
      <div className="vp-orb vp-orb--b" />
      <div className="vp-orb vp-orb--c" />
      {theme.legend && <div className="vp-prism" />}
      {theme.rays && <div className="vp-rays" />}
      {theme.sparkles && sparks.map((s, i) => (
        <span key={i} className="vp-spark" style={{ left: `${s.left}%`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`, ['--vp-dx' as string]: `${s.dx}px` }} />
      ))}
      <div className="vp-vignette" />
    </div>
  );
});
VisionBackdrop.displayName = 'VisionBackdrop';

export const VisionHeader: React.FC<{ title: string; onBack: () => void; backLabel: string; right?: React.ReactNode }> = ({ title, onBack, backLabel, right }) => (
  <header className="vp-header">
    <div className="mx-auto max-w-[640px] flex items-center gap-3">
      <button type="button" onClick={onBack} className="vp-roundbtn prog-tap" aria-label={backLabel}><ArrowLeft size={20} /></button>
      <h1 className="flex-1 min-w-0 truncate text-center text-[17px] font-bold" style={{ letterSpacing: '-0.01em' }}>{title}</h1>
      <div className="min-w-[44px] flex justify-end">{right}</div>
    </div>
  </header>
);

export const LargeTitle: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (
  <div className="flex items-end justify-between gap-3 px-1 pb-4 pt-1">
    <div className="min-w-0">
      <h2 className="vp-large-title">{title}</h2>
      {sub && <p className="vp-large-sub">{sub}</p>}
    </div>
    {right}
  </div>
);

export interface VisionTab<T extends string> { id: T; label: string; icon: React.ReactNode }

/** Floating glass tab bar (an "ornament"): the selected tab gets a sliding rank-tinted capsule. */
export function VisionTabBar<T extends string>({ tabs, value, onChange }: { tabs: VisionTab<T>[]; value: T; onChange: (t: T) => void }) {
  const reduce = useReducedMotion();
  return (
    <nav className="vp-tabbar" aria-label="Progresión">
      <div className="vp-tabs" role="tablist">
        {tabs.map(x => {
          const on = value === x.id;
          return (
            <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(x.id)} className="vp-tab prog-tap">
              {on && <motion.span layoutId="vp-tab-hl" className="vp-tab__hl" transition={reduce ? { duration: 0 } : MOTION.pop} />}
              <span className="relative" style={{ color: on ? 'rgb(var(--rank))' : undefined }}>{x.icon}</span>
              <span className="relative text-[10.5px] font-semibold leading-none">{x.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Hero stage: the insignia floating over a glass platform inside a progress ring (the whole rank, three
 * divisions, ticks between them). Dragging a finger over it tilts the insignia in 3D.
 */
export const RankStage: React.FC<{ children: React.ReactNode; progress: number | null; tier: number; legend: boolean }> = ({ children, progress, tier, legend }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tilt = (e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty('--vp-tx', `${(x * 16).toFixed(1)}deg`);
      ref.current?.style.setProperty('--vp-ty', `${(-y * 12).toFixed(1)}deg`);
    });
  };
  const rest = () => {
    cancelAnimationFrame(raf.current);
    ref.current?.style.setProperty('--vp-tx', '0deg');
    ref.current?.style.setProperty('--vp-ty', '0deg');
  };

  const R = 150; // viewBox 340 × 320 → ring centre (170, 156)
  const C = 2 * Math.PI * R;
  const v = legend ? 1 : Math.max(0, Math.min(1, progress ?? 0));
  const ticks = legend ? [] : [1 / 3, 2 / 3];
  return (
    <div ref={ref} className="vp-stage" onPointerMove={tilt} onPointerDown={tilt} onPointerLeave={rest} onPointerUp={rest} onPointerCancel={rest}>
      <div className="vp-halo" aria-hidden="true" />
      <svg className="vp-ring" viewBox="0 0 340 320" aria-hidden="true">
        <defs>
          <linearGradient id="vp-ring-grad" x1="0" y1="0" x2="1" y2="1">
            {legend ? (
              <>
                <stop offset="0" stopColor="#ff6b6b" /><stop offset="0.25" stopColor="#fbbf24" /><stop offset="0.5" stopColor="#22d3ee" /><stop offset="0.75" stopColor="#818cf8" /><stop offset="1" stopColor="#e879f9" />
              </>
            ) : (
              <>
                <stop offset="0" style={{ stopColor: 'var(--rank-to)' }} /><stop offset="1" style={{ stopColor: 'var(--rank-from)' }} />
              </>
            )}
          </linearGradient>
        </defs>
        <g transform="rotate(-90 170 156)">
          <circle cx="170" cy="156" r={R} fill="none" stroke="rgb(var(--p-line) / 0.1)" strokeWidth="7" />
          <motion.circle
            cx="170" cy="156" r={R} fill="none" stroke="url(#vp-ring-grad)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: reduce ? C * (1 - v) : C }} animate={{ strokeDashoffset: C * (1 - v) }}
            transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.2, ease: MOTION.easeOut }}
            style={{ filter: 'drop-shadow(0 0 6px rgb(var(--rank) / 0.8))' }}
          />
          {ticks.map(t => {
            const a = t * 2 * Math.PI;
            return <line key={t} x1={170 + (R - 9) * Math.cos(a)} y1={156 + (R - 9) * Math.sin(a)} x2={170 + (R + 9) * Math.cos(a)} y2={156 + (R + 9) * Math.sin(a)} stroke="rgb(var(--p-bg))" strokeWidth="3.5" strokeLinecap="round" />;
          })}
        </g>
      </svg>
      <div className="vp-platform" aria-hidden="true" />
      <div className="vp-badge-wrap">
        <div className={reduce ? undefined : 'vp-badge-float'} data-tier={tier}>{children}</div>
      </div>
    </div>
  );
};
