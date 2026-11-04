// ─────────────────────────────────────────────────────────────────────────────
// ARENA KIT — building blocks shared by the Progression and Friends screens:
// aurora backdrop, header, floating icon dock, cards, rings and bottom sheets.
// Animations stay on transform/opacity and honour prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────────────────

import React, { memo, useEffect, useId, useState } from 'react';
import { motion, useDragControls, useIsPresent, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { MOTION } from './tokens';

/**
 * Keeps a full-screen overlay mounted while it animates out, then removes it
 * on a timer. AnimatePresence alone can leave an invisible overlay mounted
 * (nested presence / layoutId), which swallows every tap underneath.
 */
export const useMountTransition = (open: boolean, ms = 320) => {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const timer = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(timer);
  }, [open, ms]);
  return mounted;
};

/** Rank-tinted aurora + dot grid. Put it first inside a `prog-root` container. */
export const ArenaBackdrop: React.FC = memo(() => (
  <div className="arena-backdrop" aria-hidden="true">
    <div className="arena-orb arena-orb--a" />
    <div className="arena-orb arena-orb--b" />
    <div className="arena-orb arena-orb--c" />
    <div className="arena-grid" />
  </div>
));
ArenaBackdrop.displayName = 'ArenaBackdrop';

export const ArenaHeader: React.FC<{ title: string; kicker?: string; onBack: () => void; right?: React.ReactNode; backLabel?: string }> = ({ title, kicker, onBack, right, backLabel = 'Volver' }) => (
  <header className="relative z-10 pt-[calc(env(safe-area-inset-top)+8px)] px-4">
    <div className="mx-auto max-w-[640px] flex items-center gap-3">
      <button type="button" onClick={onBack} className="prog-tap flex items-center justify-center rounded-full arena-card" style={{ width: 44, height: 44 }} aria-label={backLabel}>
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1 min-w-0">
        {kicker && <p className="arena-kicker leading-none mb-1">{kicker}</p>}
        <h1 className="text-[21px] font-black leading-none tracking-[-0.01em] truncate">{title}</h1>
      </div>
      {right}
    </div>
  </header>
);

export interface DockTab<T extends string> { id: T; label: string; icon: React.ReactNode; badge?: number }

/** Floating, thumb-reachable icon dock with a sliding highlight. */
export function ArenaDock<T extends string>({ tabs, value, onChange, layoutId }: { tabs: DockTab<T>[]; value: T; onChange: (t: T) => void; layoutId: string }) {
  const reduce = useReducedMotion();
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-6" style={{ background: 'linear-gradient(to top, rgb(var(--p-bg)) 45%, rgb(var(--p-bg) / 0))' }}>
      <div className="arena-dock mx-auto max-w-[560px] flex gap-1" role="tablist">
        {tabs.map(x => {
          const on = value === x.id;
          return (
            <button
              key={x.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(x.id)}
              className="prog-tap relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[20px] py-1.5"
              style={{ color: on ? 'rgb(var(--p-text))' : 'rgb(var(--p-text-3))' }}
            >
              {on && (
                <motion.span
                  layoutId={layoutId} className="absolute inset-0 rounded-[20px]"
                  style={{ background: 'linear-gradient(180deg, rgb(var(--rank) / 0.26), rgb(var(--rank) / 0.08))', boxShadow: 'inset 0 0 0 1px rgb(var(--rank) / 0.35)' }}
                  transition={reduce ? { duration: 0 } : MOTION.pop}
                />
              )}
              <span className="relative" style={{ color: on ? 'rgb(var(--rank))' : undefined }}>{x.icon}</span>
              <span className="relative text-[10.5px] font-bold leading-none">{x.label}</span>
              {!!x.badge && (
                <span className="absolute top-1 right-[calc(50%-20px)] min-w-[17px] h-[17px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ background: '#ef4444', boxShadow: '0 0 0 2px rgb(var(--p-surface))' }}>
                  {x.badge > 9 ? '9+' : x.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const Card: React.FC<React.HTMLAttributes<HTMLElement> & { glow?: boolean; as?: 'section' | 'div' | 'article' | 'li' }> = ({ glow, as = 'section', className, children, ...rest }) => {
  const Tag = as as 'section';
  return <Tag {...rest} className={`arena-card ${glow ? 'arena-card--glow' : ''} ${className ?? ''}`}>{children}</Tag>;
};

export const SectionHead: React.FC<{ kicker?: string; title: string; action?: React.ReactNode; icon?: React.ReactNode }> = ({ kicker, title, action, icon }) => (
  <div className="flex items-end justify-between gap-3 mb-3">
    <div className="min-w-0">
      {kicker && <p className="arena-kicker mb-1">{kicker}</p>}
      <h3 className="text-[16px] font-black leading-tight flex items-center gap-2">
        {icon && <span style={{ color: 'rgb(var(--rank))' }}>{icon}</span>}
        <span className="truncate">{title}</span>
      </h3>
    </div>
    {action}
  </div>
);

/** Circular progress drawn with SVG; the fill animates once on mount. */
export const ProgressRing: React.FC<{ value: number; size: number; stroke?: number; children?: React.ReactNode; track?: string; color?: string; delay?: number }> = memo(({ value, size, stroke = 6, children, track, color, delay = 0.15 }) => {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const gid = `ring${useId().replace(/:/g, '')}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--rank-to)" />
            <stop offset="1" stopColor="var(--rank-from)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'rgb(var(--p-line) / 0.09)'} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? `url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          initial={{ pathLength: reduce ? v : 0 }} animate={{ pathLength: v }}
          transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : delay, ease: MOTION.easeOut }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';

export const StatTile: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; tint?: string }> = ({ icon, label, value, sub, tint }) => (
  <div className="arena-card p-3 flex flex-col gap-2 min-w-0">
    <span className="w-8 h-8 rounded-[11px] flex items-center justify-center" style={{ background: tint ? `${tint}22` : 'rgb(var(--rank) / 0.14)', color: tint ?? 'rgb(var(--rank))' }}>{icon}</span>
    <div className="min-w-0">
      <p className="text-[22px] font-black leading-none tabular-nums truncate">{value}</p>
      <p className="mt-1 text-[11px] font-semibold prog-text-3 truncate">{label}</p>
      {sub}
    </div>
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }> = ({ icon, title, text, children }) => (
  <div className="flex flex-col items-center text-center py-8 px-4">
    <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
      <div className="arena-halo" style={{ inset: -10 }} />
      <div className="relative w-16 h-16 rounded-[22px] flex items-center justify-center rotate-[8deg] arena-card arena-card--glow" style={{ color: 'rgb(var(--rank))' }}>
        <span className="-rotate-[8deg]">{icon}</span>
      </div>
    </div>
    <p className="text-[16px] font-black">{title}</p>
    <p className="mt-1.5 text-[13px] leading-relaxed prog-text-3 max-w-[300px]">{text}</p>
    {children && <div className="mt-4 w-full max-w-[300px]">{children}</div>}
  </div>
);

export const Toggle: React.FC<{ label: string; hint?: string; icon?: React.ReactNode; value: boolean; onChange: (v: boolean) => void }> = ({ label, hint, icon, value, onChange }) => (
  <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} className="prog-tap w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--p-r-lg)] text-left">
    {icon && <span className="w-9 h-9 rounded-[12px] shrink-0 flex items-center justify-center" style={{ background: 'rgb(var(--rank) / 0.12)', color: 'rgb(var(--rank))' }}>{icon}</span>}
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-semibold">{label}</span>
      {hint && <span className="block text-[11.5px] prog-text-3">{hint}</span>}
    </span>
    <span className="relative w-12 h-7 rounded-full shrink-0 transition-colors duration-200" style={{ background: value ? 'linear-gradient(90deg, var(--rank-from), var(--rank-to))' : 'rgb(var(--p-line) / 0.16)' }}>
      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: `translateX(${value ? 20 : 0}px)` }} />
    </span>
  </button>
);

/** Choice chips in a row (role="radiogroup"). */
export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { id: T; label: React.ReactNode; disabled?: boolean }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="flex gap-1.5 p-1 rounded-[16px]" style={{ background: 'rgb(var(--p-line) / 0.05)' }} role="radiogroup" aria-label={label}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <button
            key={String(o.id)} type="button" role="radio" aria-checked={on} disabled={o.disabled} onClick={() => onChange(o.id)}
            className="prog-tap flex-1 rounded-[12px] px-2 text-[13px] font-bold disabled:opacity-40 transition-colors"
            style={on ? { background: 'linear-gradient(100deg, var(--rank-from), var(--rank-to))', color: '#0b0b10', boxShadow: '0 6px 16px -8px rgb(var(--rank) / 0.8)' } : { color: 'rgb(var(--p-text-2))' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Bottom sheet with a drag-to-close handle. Render it inside <AnimatePresence>. */
export const ArenaSheet: React.FC<{ onClose: () => void; label: string; children: React.ReactNode; footer?: React.ReactNode; style?: React.CSSProperties; z?: number; header?: React.ReactNode }> = ({ onClose, label, children, footer, style, z = 950, header }) => {
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const present = useIsPresent();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: z, pointerEvents: present ? undefined : 'none' }} role="dialog" aria-modal="true" aria-label={label}>
      <motion.div className="absolute inset-0 bg-black/65" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: MOTION.short }} />
      <motion.div
        className="prog-root relative w-full max-w-[560px] max-h-[93vh] rounded-t-[30px] flex flex-col overflow-hidden"
        style={{ background: 'rgb(var(--p-bg))', boxShadow: '0 -20px 60px -20px rgb(0 0 0 / 0.8)', ...style }}
        initial={reduce ? { opacity: 0 } : { y: '100%' }} animate={reduce ? { opacity: 1 } : { y: 0 }} exit={reduce ? { opacity: 0 } : { y: '100%' }}
        transition={reduce ? { duration: 0.15 } : MOTION.sheet}
        drag={reduce ? false : 'y'} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} dragListener={false}
        dragControls={controls}
        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
      >
        <ArenaBackdrop />
        <div className="relative z-10 flex justify-center pt-2.5 pb-3 cursor-grab" style={{ touchAction: 'none' }} onPointerDown={e => controls.start(e)}>
          <div className="prog-sheet-handle" />
        </div>
        <button type="button" onClick={onClose} className="prog-tap absolute right-3 top-3 z-20 flex items-center justify-center rounded-full arena-card" style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }} aria-label="Cerrar"><X size={18} /></button>
        {header}
        <div className="relative z-10 prog-scroll flex-1 min-h-0">{children}</div>
        {footer && <div className="relative z-10 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]" style={{ background: 'linear-gradient(to top, rgb(var(--p-bg)) 70%, rgb(var(--p-bg) / 0))' }}>{footer}</div>}
      </motion.div>
    </div>
  );
};

export const Delta: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <span className={`font-black tabular-nums ${value > 0 ? 'prog-positive' : value < 0 ? 'prog-negative' : 'prog-text-3'} ${className ?? ''}`}>{value > 0 ? '+' : ''}{value}</span>
);

/** Staggered entrance for lists of cards. */
export const rise = (i: number, reduce: boolean | null) => ({
  initial: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION.short, delay: reduce ? 0 : Math.min(i, 8) * 0.045, ease: MOTION.easeOut },
});
