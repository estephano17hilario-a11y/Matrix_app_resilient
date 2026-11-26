// Super habits — pure rules (no React, no storage).
//
// Everything here is DERIVED from the habit's current streak. Nothing about
// badges is stored: when the streak breaks the badges disappear on their own,
// which is exactly the rule ("you only keep it until you lose the streak").

/** Days that award a badge on the 60-day roadmap. */
export const SUPER_MILESTONES = [2, 4, 7, 14, 21, 30, 45, 60] as const;
export type SuperMilestone = (typeof SUPER_MILESTONES)[number];

export const ROADMAP_DAYS = 60;

const clampStreak = (streak: number) => (Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0);

/** Milestones the habit holds right now. They are lost when the streak breaks. */
export const earnedMilestones = (streak: number): SuperMilestone[] => {
  const s = clampStreak(streak);
  return SUPER_MILESTONES.filter(m => s >= m);
};

/** Next milestone still to reach, or null once the 60-day roadmap is complete. */
export const nextMilestone = (streak: number): SuperMilestone | null => {
  const s = clampStreak(streak);
  return SUPER_MILESTONES.find(m => m > s) ?? null;
};

/** Highest milestone currently held, or null. */
export const lastEarnedMilestone = (streak: number): SuperMilestone | null => {
  const earned = earnedMilestones(streak);
  return earned.length ? earned[earned.length - 1] : null;
};

/** True when reaching `streak` is itself a milestone day (a badge was just unlocked). */
export const isMilestoneDay = (streak: number): streak is SuperMilestone =>
  (SUPER_MILESTONES as readonly number[]).includes(clampStreak(streak)) && clampStreak(streak) === streak;

/** Index (0-7) of a milestone in the roadmap, or -1. */
export const milestoneIndex = (day: number) => (SUPER_MILESTONES as readonly number[]).indexOf(day);

export const daysToNextMilestone = (streak: number): number | null => {
  const next = nextMilestone(streak);
  return next === null ? null : next - clampStreak(streak);
};

/** 0..1 progress through the 60 days. */
export const roadmapProgress = (streak: number) => Math.min(1, clampStreak(streak) / ROADMAP_DAYS);

/**
 * Whether the streak a habit just reached unlocks a badge compared to where it
 * was before — used to decide between the normal and the milestone celebration.
 */
export const unlockedMilestone = (before: number, after: number): SuperMilestone | null => {
  const b = clampStreak(before);
  const a = clampStreak(after);
  if (a <= b) return null;
  for (let i = SUPER_MILESTONES.length - 1; i >= 0; i--) {
    const m = SUPER_MILESTONES[i];
    if (a >= m && b < m) return m;
  }
  return null;
};

/** Longest run of consecutive calendar days found in a completion history. */
export const bestStreakFromHistory = (history: string[] | undefined, fallback = 0): number => {
  const days = Array.from(new Set((history || []).map(h => String(h).slice(0, 10)))).sort();
  if (days.length === 0) return clampStreak(fallback);
  const toNum = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
  };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = toNum(days[i]) - toNum(days[i - 1]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return Math.max(best, clampStreak(fallback));
};

// ── Streak flame evolution (applies to every habit, super or not) ────────────

export interface FlameTier {
  /** 0 = no streak. */
  index: number;
  key: string;
  name: string;
  /** First streak day that shows this tier. */
  min: number;
}

export const FLAME_TIERS: readonly FlameTier[] = [
  { index: 0, key: 'ash', name: 'Ceniza', min: 0 },
  { index: 1, key: 'spark', name: 'Chispa', min: 1 },
  { index: 2, key: 'flame', name: 'Llama', min: 3 },
  { index: 3, key: 'fire', name: 'Fuego', min: 7 },
  { index: 4, key: 'inferno', name: 'Inferno', min: 14 },
  { index: 5, key: 'plasma', name: 'Plasma', min: 21 },
  { index: 6, key: 'cosmic', name: 'Cósmica', min: 30 },
  { index: 7, key: 'platinum', name: 'Platino', min: 45 },
  { index: 8, key: 'mythic', name: 'Mítica', min: 60 },
];

export const flameTierFor = (streak: number): FlameTier => {
  const s = clampStreak(streak);
  let tier = FLAME_TIERS[0];
  for (const t of FLAME_TIERS) if (s >= t.min) tier = t;
  return tier;
};

/** Next tier above the current one, with the days left to reach it. */
export const nextFlameTier = (streak: number): { tier: FlameTier; daysLeft: number } | null => {
  const cur = flameTierFor(streak);
  const next = FLAME_TIERS[cur.index + 1];
  return next ? { tier: next, daysLeft: next.min - clampStreak(streak) } : null;
};

// ── World progress ───────────────────────────────────────────────────────────

/** Level (0..1) of milestone `i` in a world: the 8 milestones are evenly spaced. */
export const milestoneLevel = (i: number) => (Math.max(0, Math.min(7, i)) + 1) / 8;

/**
 * 0..1 fill of a world's metaphor (water level, rocket altitude, sun position…).
 * Each milestone is one eighth, and the days in between interpolate linearly,
 * so the 2/4/7 early badges don't pile up in the first 10% of the scene.
 */
export const worldLevel = (streak: number): number => {
  const s = clampStreak(streak);
  if (s <= 0) return 0;
  let prevDay = 0;
  let prevLvl = 0;
  for (let i = 0; i < SUPER_MILESTONES.length; i++) {
    const day = SUPER_MILESTONES[i];
    const lvl = milestoneLevel(i);
    if (s <= day) return prevLvl + (lvl - prevLvl) * ((s - prevDay) / (day - prevDay));
    prevDay = day;
    prevLvl = lvl;
  }
  return 1;
};
