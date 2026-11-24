// Personal navigation preferences, read synchronously (localStorage) so they are
// available on the very first render, before any profile has loaded.

/** Sections that can be the landing screen. */
export const START_SECTIONS = ['TASKS', 'HABITS', 'FOCUS', 'NOTES', 'FEED', 'ROUTINE', 'ACHIEVEMENTS', 'STORE'] as const;
export type StartSection = (typeof START_SECTIONS)[number];

/** Where holding "+" goes: the dock editor, an overlay/modal, or a section. */
export const HOLD_TARGETS = ['DOCK_CONFIG', 'QUEST', 'SETTINGS', 'RANKS', 'FRIENDS', ...START_SECTIONS] as const;
export type HoldTarget = (typeof HOLD_TARGETS)[number];

export const HOLD_MS_MIN = 300;
export const HOLD_MS_MAX = 3000;
export const HOLD_MS_DEFAULT = 1700;

const START_KEY = 'lux_start_section';
const HOLD_TARGET_KEY = 'lux_plus_hold_target';
const HOLD_MS_KEY = 'lux_plus_hold_ms';

const read = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
};

/** 'LAST' = reopen on the section the user left (the original behaviour). */
export const getStartSection = (): StartSection | 'LAST' => {
  const v = read(START_KEY);
  return (START_SECTIONS as readonly string[]).includes(v ?? '') ? (v as StartSection) : 'LAST';
};
export const setStartSection = (v: StartSection | 'LAST') => write(START_KEY, v);

/** The view the app opens on at launch. */
export const initialView = (): string => {
  const pinned = getStartSection();
  if (pinned !== 'LAST') return pinned;
  return read('lux_last_view') || read('matrix_last_view') || 'TASKS';
};

export const getHoldTarget = (): HoldTarget => {
  const v = read(HOLD_TARGET_KEY);
  return (HOLD_TARGETS as readonly string[]).includes(v ?? '') ? (v as HoldTarget) : 'DOCK_CONFIG';
};
export const setHoldTarget = (v: HoldTarget) => write(HOLD_TARGET_KEY, v);

export const getHoldMs = (): number => {
  const n = Number(read(HOLD_MS_KEY));
  return Number.isFinite(n) && n >= HOLD_MS_MIN && n <= HOLD_MS_MAX ? Math.round(n) : HOLD_MS_DEFAULT;
};
export const setHoldMs = (ms: number) =>
  write(HOLD_MS_KEY, String(Math.max(HOLD_MS_MIN, Math.min(HOLD_MS_MAX, Math.round(ms)))));
