// Day keys with a configurable cut-off: everything done before the cut-off
// (04:00 by default) belongs to the previous day. All math is in local time
// and goes through calendar fields, so DST changes never shift a day.

import { PROGRESSION_CONFIG } from './config';

export type DayKey = string; // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0');

/** "HH:MM" → minutes after midnight. Invalid input falls back to the config default. */
export const parseCutoff = (cutoff: string = PROGRESSION_CONFIG.DAY_CUTOFF): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(cutoff.trim());
  if (!m) return parseCutoff(PROGRESSION_CONFIG.DAY_CUTOFF);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return parseCutoff(PROGRESSION_CONFIG.DAY_CUTOFF);
  return h * 60 + min;
};

const formatKey = (y: number, m: number, d: number): DayKey => {
  // Normalise overflow (e.g. day 0) through Date, still in local calendar fields.
  const date = new Date(y, m, d, 12);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Which progression day a moment belongs to. */
export const getDayKey = (at: Date | number, cutoff: string = PROGRESSION_CONFIG.DAY_CUTOFF): DayKey => {
  const date = typeof at === 'number' ? new Date(at) : at;
  const minutes = date.getHours() * 60 + date.getMinutes();
  const shift = minutes < parseCutoff(cutoff) ? -1 : 0;
  return formatKey(date.getFullYear(), date.getMonth(), date.getDate() + shift);
};

const keyToUtc = (key: DayKey): number => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: DayKey, b: DayKey): number =>
  Math.round((keyToUtc(b) - keyToUtc(a)) / 86_400_000);

/** 0 = Sunday … 6 = Saturday, for the calendar date of the key. */
export const weekdayOfKey = (key: DayKey): number => new Date(keyToUtc(key)).getUTCDay();

/** Weekly boost multiplier for a progression day (1 when it doesn't apply). */
export const weeklyBoostFor = (key: DayKey): number => {
  const b = PROGRESSION_CONFIG.WEEKLY_BOOST;
  return b.ENABLED && weekdayOfKey(key) === b.WEEKDAY ? b.MULTIPLIER : 1;
};

/** Applies the weekly boost to a reward (gold/XP), rounded to an integer. */
export const boostReward = (amount: number, key: DayKey): number =>
  amount > 0 ? Math.round(amount * weeklyBoostFor(key)) : amount;

export const addDaysToKey =(key: DayKey, days: number): DayKey => {
  const [y, m, d] = key.split('-').map(Number);
  return formatKey(y, m - 1, d + days);
};

/** The moment a progression day ends (local), i.e. the next day's cut-off. */
export const dayEndsAt = (key: DayKey, cutoff: string = PROGRESSION_CONFIG.DAY_CUTOFF): Date => {
  const [y, m, d] = key.split('-').map(Number);
  const mins = parseCutoff(cutoff);
  return new Date(y, m - 1, d + 1, Math.floor(mins / 60), mins % 60);
};
