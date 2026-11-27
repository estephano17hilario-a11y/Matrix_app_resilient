// Building blocks of the Deluxe funnel: countdown, animated numbers, switch, slider, chips.

import { ReactNode, useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { offerEndsAt } from '../valueCalc';

export type FL = 'es' | 'en';
export const tr = (lang: FL, es: string, en: string) => (lang === 'es' ? es : en);

// ── Countdown to Dec 31 ──
export const useCountdown = () => {
  const end = offerEndsAt();
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(id);
  }, [end]);
  const s = Math.floor(left / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, over: left <= 0 };
};
const pad = (n: number) => String(n).padStart(2, '0');

export const CountdownChip = ({ lang }: { lang: FL }) => {
  const c = useCountdown();
  if (c.over) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-black tabular-nums text-rose-200">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
      {c.days}{tr(lang, 'd', 'd')} {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
    </div>
  );
};

export const CountdownBig = ({ lang }: { lang: FL }) => {
  const c = useCountdown();
  if (c.over) return null;
  const cells: [number, string][] = [[c.days, tr(lang, 'Días', 'Days')], [c.hours, tr(lang, 'Horas', 'Hrs')], [c.minutes, 'Min'], [c.seconds, tr(lang, 'Seg', 'Sec')]];
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-rose-200">
        🔥 {tr(lang, 'La oferta termina el 31 de diciembre', 'Offer ends December 31')}
      </div>
      <div className="flex gap-2" style={{ perspective: 400 }}>
        {cells.map(([v, l], i) => (
          <div key={l} className={`min-w-[62px] rounded-2xl border px-2 py-2 text-center ${i === 3 ? 'border-rose-400/30 bg-rose-500/[0.08]' : 'border-white/10 bg-white/[0.04]'}`}>
            <motion.div key={v} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} style={{ transformOrigin: '50% 0%' }} className={`text-[24px] font-black leading-none tabular-nums ${i === 3 ? 'text-rose-300' : 'text-white'}`}>{pad(v)}</motion.div>
            <div className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-white/45">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Counting number ──
export const CountUp = ({ value, format, duration = 1.4, delay = 0 }: { value: number; format: (n: number) => string; duration?: number; delay?: number }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) { el.textContent = format(value); return; }
    const ctl = animate(0, value, { duration, delay, ease: [0.16, 1, 0.3, 1], onUpdate: v => { el.textContent = format(v); } });
    return () => ctl.stop();
  }, [value, format, duration, delay, reduce]);
  return <span ref={ref} className="tabular-nums">{format(0)}</span>;
};

// ── Big Yes/No switch ──
export const BigSwitch = ({ value, onChange, yes, no }: { value: boolean | null; onChange: (v: boolean) => void; yes: string; no: string }) => (
  <div role="radiogroup" className="relative grid w-full grid-cols-2 rounded-[22px] border border-white/10 bg-white/[0.04] p-1.5">
    {value !== null && (
      <motion.span aria-hidden className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] rounded-[17px]"
        style={{ background: value ? 'linear-gradient(135deg,#34d399,#059669)' : 'linear-gradient(135deg,#818cf8,#6366f1)', boxShadow: '0 10px 30px -12px rgba(0,0,0,0.8)' }}
        initial={false} animate={{ x: value ? '0%' : '100%' }}
        transition={{ type: 'spring', stiffness: 500, damping: 36 }} />
    )}
    {[true, false].map(v => (
      <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
        className={`relative z-10 h-16 rounded-[17px] text-[17px] font-black transition-colors ${value === v ? 'text-white' : 'text-white/50'}`}>
        {v ? yes : no}
      </button>
    ))}
  </div>
);

// ── Slider with value bubble ──
export const NiceSlider = ({ value, min, max, step, onChange, label, display, accent = '#a78bfa' }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; display: string; accent?: string;
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold text-white/70">{label}</span>
        <motion.span key={display} initial={{ scale: 0.85, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="text-[20px] font-black tabular-nums" style={{ color: accent }}>{display}</motion.span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        className="lux-range mt-3 w-full"
        style={{ background: `linear-gradient(90deg, ${accent} ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }} />
    </div>
  );
};

export const RANGE_CSS = `
.lux-range { -webkit-appearance: none; appearance: none; height: 8px; border-radius: 99px; outline: none; }
.lux-range::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 4px solid #8b5cf6; box-shadow: 0 4px 14px rgba(0,0,0,0.6); cursor: pointer; }
.lux-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 4px solid #8b5cf6; cursor: pointer; }
`;

// ── Chip ──
export const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onClick} aria-pressed={on}
    className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-[13.5px] font-bold transition-colors ${on ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-white/10 bg-white/[0.04] text-white/60'}`}>
    {children}
  </motion.button>
);

// ── Primary CTA ──
export const FunnelCTA = ({ children, onClick, disabled, tone = 'violet' }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'violet' | 'gold' }) => (
  <div className="relative">
  {!disabled && (
    <span aria-hidden className="lux-breathe absolute -inset-2 rounded-[30px]"
      style={{ pointerEvents: 'none', background: tone === 'gold' ? 'radial-gradient(60% 80% at 50% 50%, rgba(249,115,22,0.55), transparent 75%)' : 'radial-gradient(60% 80% at 50% 50%, rgba(99,102,241,0.6), transparent 75%)' }} />
  )}
  <motion.button type="button" onClick={onClick} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.96 }} whileHover={disabled ? undefined : { scale: 1.015 }}
    className="relative h-[68px] w-full overflow-hidden rounded-[24px] text-[18px] font-black tracking-wide text-white disabled:opacity-35"
    style={{
      background: tone === 'gold' ? 'linear-gradient(100deg,#f59e0b,#f97316 45%,#ec4899)' : 'linear-gradient(100deg,#06b6d4,#6366f1 55%,#a855f7)',
      boxShadow: tone === 'gold' ? '0 18px 40px -16px rgba(249,115,22,0.9)' : '0 18px 40px -16px rgba(99,102,241,0.95)',
    }}>
    {!disabled && (
      <motion.span aria-hidden className="absolute inset-y-0 w-1/3"
        style={{ background: 'linear-gradient(100deg,transparent,rgba(255,255,255,0.35),transparent)', pointerEvents: 'none' }}
        initial={{ x: '-120%' }} animate={{ x: '360%' }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }} />
    )}
    <span aria-hidden className="absolute inset-x-3 top-[3px] h-[40%] rounded-[18px] bg-gradient-to-b from-white/30 to-transparent" style={{ pointerEvents: 'none' }} />
    <span className="relative flex items-center justify-center gap-2.5">{children}</span>
  </motion.button>
  </div>
);
