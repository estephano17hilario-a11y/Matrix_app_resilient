// ELO rules that don't depend on history: compliance zones and focus hours.

import { PROGRESSION_CONFIG } from './config';

const { ELO } = PROGRESSION_CONFIG;
const Z = ELO.COMPLIANCE;

export type ComplianceZone = 'EXCELLENT' | 'MET' | 'PARTIAL' | 'NEUTRAL' | 'FAIL';

export const clampHabitGoal = (goalPct: number | undefined): number => {
  const g = Number.isFinite(goalPct) ? (goalPct as number) : ELO.HABIT_GOAL_DEFAULT_PCT;
  return Math.max(ELO.HABIT_GOAL_MIN_PCT, Math.min(ELO.HABIT_GOAL_MAX_PCT, g));
};

/** r = achieved% / goal%. Both arguments are percentages (0-100+). */
export const complianceRatio = (achievedPct: number, goalPct: number): number =>
  goalPct > 0 ? achievedPct / goalPct : 0;

export const complianceZone = (r: number): ComplianceZone => {
  if (r >= Z.EXCELLENT_R) return 'EXCELLENT';
  if (r >= Z.MET_R) return 'MET';
  if (r >= Z.PARTIAL_R) return 'PARTIAL';
  if (r >= Z.NEUTRAL_R) return 'NEUTRAL';
  return 'FAIL';
};

// Ratios are rounded to 6 decimals first so 0.7 computed as 0.6999999 still lands in PARTIAL.
const tidy = (r: number) => Math.round(r * 1e6) / 1e6;

/** The compliance function shared by habits and tasks. */
export const complianceDelta = (rawR: number): number => {
  const r = tidy(rawR);
  switch (complianceZone(r)) {
    case 'EXCELLENT': return Z.EXCELLENT_DELTA;
    case 'MET': return Z.MET_DELTA;
    case 'PARTIAL':
      return Math.max(Z.PARTIAL_MIN, Math.round((Z.MET_DELTA * (r - Z.PARTIAL_PIVOT)) / Z.PARTIAL_PIVOT));
    case 'NEUTRAL': return 0;
    case 'FAIL': return Z.FAIL_DELTA;
  }
};

/** Habit delta for a day, or null when nothing was scheduled. */
export const habitDelta = (completed: number, scheduled: number, goalPct?: number): number | null => {
  if (scheduled <= 0) return null;
  const pct = (100 * completed) / scheduled;
  return complianceDelta(complianceRatio(pct, clampHabitGoal(goalPct)));
};

/** Task delta for a day, or null when no task was planned. */
export const taskDelta = (completed: number, planned: number): number | null => {
  if (planned <= 0) return null;
  return complianceDelta(completed / planned);
};

/** Focus points earned for the day given the timer minutes accumulated so far (capped). */
export const focusPointsForMinutes = (timerMinutes: number): number =>
  Math.min(ELO.FOCUS.DAILY_CAP, Math.floor(Math.max(0, timerMinutes) / ELO.FOCUS.MINUTES_PER_POINT));
