// Small animated building blocks. Every animation runs on transform/opacity
// or writes textContent directly (no React re-render per frame), and all of
// them collapse to the final state under prefers-reduced-motion.

import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MOTION } from './tokens';

/** Progress bar animated with transform: scaleX. */
export const DivisionBar: React.FC<{
  value: number;
  from?: number;
  delay?: number;
  height?: number;
  shine?: boolean;
  label?: string;
}> = memo(({ value, from, delay = 0, height = 8, shine = false, label }) => {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="prog-bar" style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <motion.div
        className="prog-bar__fill"
        initial={{ scaleX: reduce ? v : from ?? 0 }}
        animate={{ scaleX: v }}
        transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay, ease: MOTION.easeOut }}
        style={{ willChange: 'transform' }}
      />
      {shine && !reduce && (
        <motion.div
          className="prog-bar__shine"
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '100%', opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: delay + 0.5, ease: 'easeOut' }}
        />
      )}
    </div>
  );
});
DivisionBar.displayName = 'DivisionBar';

/** Counts from 0 to `value`, writing to the DOM directly via rAF. */
export const CountUp: React.FC<{
  value: number;
  delay?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  signed?: boolean;
  className?: string;
}> = memo(({ value, delay = 0, duration = 600, prefix = '', suffix = '', signed = false, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (n: number) => `${prefix}${signed && n > 0 ? '+' : ''}${n}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || value === 0) {
      el.textContent = fmt(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = fmt(0);
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay, duration, reduce]);

  return <span ref={ref} className={className} aria-label={fmt(value)}>{fmt(reduce ? value : 0)}</span>;
});
CountUp.displayName = 'CountUp';

/**
 * Types `text` progressively (~35 chars/s). Tap to reveal everything.
 * Screen readers get the full text immediately.
 */
export const Typewriter: React.FC<{
  text: string;
  cps?: number;
  delay?: number;
  onDone?: () => void;
  className?: string;
}> = ({ text, cps = 35, delay = 0, onDone, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const skip = useRef<() => void>(() => {});
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finish = () => {
      el.textContent = text;
      setDone(true);
      onDoneRef.current?.();
    };
    skip.current = finish;
    if (reduce) {
      finish();
      return;
    }
    setDone(false);
    el.textContent = '';
    let raf = 0;
    let start = 0;
    let shown = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const n = Math.min(text.length, Math.floor(((t - start) / 1000) * cps));
      if (n !== shown) {
        shown = n;
        el.textContent = text.slice(0, n);
      }
      if (n < text.length) raf = requestAnimationFrame(tick);
      else finish();
    };
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [text, cps, delay, reduce]);

  return (
    <p className={className} onClick={() => !done && skip.current()} style={{ cursor: done ? 'default' : 'pointer' }}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" />
      {!done && !reduce && <span aria-hidden="true" className="inline-block w-[2px] h-[1em] align-[-0.15em] ml-[1px] bg-current opacity-60 animate-pulse" />}
    </p>
  );
};

/** Tiny haptic helper honouring the user's setting. */
export const haptic = (enabled: boolean, pattern: number | number[]) => {
  if (!enabled) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
};
