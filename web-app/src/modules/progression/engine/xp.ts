// Level / XP: measures total effort and never goes down.

import { PROGRESSION_CONFIG } from './config';

const { XP } = PROGRESSION_CONFIG;

export type XpSource = 'FOCUS' | 'HABIT' | 'TASK' | 'SUBTASK';

/** XP for one action. `amount` is minutes for FOCUS and a count for the rest. */
export const xpFor = (source: XpSource, amount = 1): number => {
  const n = Math.max(0, Math.floor(amount));
  switch (source) {
    case 'FOCUS': return n * XP.PER_FOCUS_MINUTE;
    case 'HABIT': return n * XP.PER_HABIT;
    case 'TASK': return n * XP.PER_TASK;
    case 'SUBTASK': return n * XP.PER_SUBTASK;
  }
};

/** XP needed to go from `level` to `level + 1`. */
export const xpToNextLevel = (level: number): number =>
  XP.LEVEL_BASE + XP.LEVEL_STEP * (Math.max(1, Math.floor(level)) - 1);

/** Total XP required to *reach* `level` (level 1 = 0). */
export const totalXpForLevel = (level: number): number => {
  const k = Math.max(1, Math.floor(level)) - 1;
  return XP.LEVEL_BASE * k + (XP.LEVEL_STEP * k * (k - 1)) / 2;
};

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP the current level requires in total. */
  levelSpan: number;
  /** 0..1 */
  progress: number;
}

export const levelFromXp = (totalXp: number): LevelInfo => {
  const xp = Math.max(0, Math.floor(totalXp));
  // Closed form of totalXpForLevel, then correct for float rounding.
  const a = XP.LEVEL_STEP / 2;
  const b = XP.LEVEL_BASE - XP.LEVEL_STEP / 2;
  let k = Math.floor((-b + Math.sqrt(b * b + 4 * a * xp)) / (2 * a));
  while (k > 0 && totalXpForLevel(k + 1) > xp) k--;
  while (totalXpForLevel(k + 2) <= xp) k++;
  const level = k + 1;
  const intoLevel = xp - totalXpForLevel(level);
  const levelSpan = xpToNextLevel(level);
  return { level, intoLevel, levelSpan, progress: intoLevel / levelSpan };
};
