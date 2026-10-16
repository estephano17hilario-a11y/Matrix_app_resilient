import { useSyncExternalStore } from 'react';

// Per-device preferences for the immersive layer. They live in localStorage on
// purpose: how much motion/haptics a phone can take is a property of the device,
// not of the account.

export interface ImmersionPrefs {
  enabled: boolean;   // master switch: living world, scene travel, depth
  motion: boolean;    // tilt / pointer parallax and glass sheen
  haptics: boolean;   // vibration ticks on touch and travel
  sound: boolean;     // soft spatial UI sounds
  adaptive: boolean;  // the world reads your day (tasks, habits, streak, hour) and adapts
  areaTitles: boolean; // show the section name ("— HÁBITOS —") when travelling to it
}

const STORAGE_KEY = 'lux-immersion-prefs';

const DEFAULTS: ImmersionPrefs = { enabled: true, motion: true, haptics: true, sound: false, adaptive: true, areaTitles: false };

const read = (): ImmersionPrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return DEFAULTS;
};

let current = read();
const listeners = new Set<() => void>();

export const getImmersionPrefs = () => current;

export const setImmersionPrefs = (patch: Partial<ImmersionPrefs>) => {
  current = { ...current, ...patch };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignore */ }
  listeners.forEach(l => l());
};

export const subscribeImmersionPrefs = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useImmersionPrefs = () =>
  useSyncExternalStore(subscribeImmersionPrefs, getImmersionPrefs, getImmersionPrefs);

// ── Device capability ────────────────────────────────────────────────────────

const reducedMotionQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

export const prefersReducedMotion = () => !!reducedMotionQuery?.matches;

// "Lite" devices keep the world but drop the costlier layers (blur in scene
// transitions, the third star layer, sheen tracking).
export const isLiteDevice = (() => {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 8;
  const memory = (navigator as any).deviceMemory || 8;
  return cores <= 4 || memory <= 3;
})();

// Whether the immersive layer should animate at all right now.
export const immersionActive = () => current.enabled && !prefersReducedMotion();
