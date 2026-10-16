import { isLiteDevice } from './immersionPrefs';

// ─────────────────────────────────────────────────────────────────────────────
// Frame-rate governor. The immersive layer must never cost the 60fps.
//
// The engine reports how long its frames actually take while something moves.
// If they run slow for a sustained stretch, the governor steps the visual
// quality down a tier (and remembers it for the session):
//   0  full     – 3 star depths, motion blur in scene travel, live glass sheen
//   1  reduced  – 2 star depths, no blur, static sheen, half-rate tilt redraw
//   2  minimal  – 1 star depth, the sky ignores tilt (only the DOM layers move)
// Low battery (not charging, < 20%) forces at least tier 1: the world goes eco.
// ─────────────────────────────────────────────────────────────────────────────

export type PerfTier = 0 | 1 | 2;

const KEY = 'lux-perf-tier';

const initial = (): PerfTier => {
  try {
    const saved = Number(sessionStorage.getItem(KEY));
    if (saved === 1 || saved === 2) return saved;
  } catch { /* ignore */ }
  return isLiteDevice ? 1 : 0;
};

let measured: PerfTier = initial();
let eco = false;
const listeners = new Set<() => void>();

export const getPerfTier = (): PerfTier => Math.max(measured, eco ? 1 : 0) as PerfTier;

export const subscribePerf = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

const emit = () => {
  document.documentElement.classList.toggle('lux-lite', getPerfTier() >= 1);
  listeners.forEach(l => l());
};

export const setEcoMode = (on: boolean) => {
  if (on === eco) return;
  eco = on;
  emit();
};

export const isEcoMode = () => eco;

let ema = 16.7;
let samples = 0;
let slowStreak = 0;

/** Called by the engine with the duration of each animated frame (ms). */
export const reportFrame = (ms: number) => {
  if (ms <= 0 || ms > 100) return; // stalls (tab switch, GC) are not a trend
  // One heavy frame (a view rendering on navigation) shouldn't count as much
  // as a device that is slow all the time.
  ema = ema * 0.93 + Math.min(ms, 50) * 0.07;
  samples++;
  slowStreak = ema > 21.5 ? slowStreak + 1 : 0;
  if (samples >= 50 && slowStreak >= 30 && measured < 2) {
    measured = (measured + 1) as PerfTier;
    samples = 0;
    slowStreak = 0;
    ema = 16.7;
    try { sessionStorage.setItem(KEY, String(measured)); } catch { /* ignore */ }
    emit();
  }
};

/** Apply the current tier to <html> (called once the engine starts). */
export const applyPerfClass = () => emit();
