// ─────────────────────────────────────────────────────────────────────────────
// TRAIT STATS — pure maths behind "Ver progreso". A trait only keeps one history
// entry per active day ({ date, xp (inside the level), level }); every XP change
// rewrites today's entry, so the gain of a day is `total(day) − total(previous entry)`.
// Everything here is date-key based (local YYYY-MM-DD) and free of React.
// ─────────────────────────────────────────────────────────────────────────────

import { calculateAttributeMaxXp } from '@/utils/leveling';
import type { Attribute } from '@/types';

export type DayKey = string;

export const keyOf = (d: Date): DayKey =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromKey = (k: DayKey): Date => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const shiftKey = (k: DayKey, days: number): DayKey => {
  const d = fromKey(k);
  d.setDate(d.getDate() + days);
  return keyOf(d);
};

export const daysBetween = (a: DayKey, b: DayKey): number =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

/** XP needed to have reached `level` (sum of the bars of every level below it). */
export const xpToReach = (level: number): number => {
  let sum = 0;
  for (let l = 1; l < Math.max(1, level); l++) sum += calculateAttributeMaxXp(l);
  return sum;
};

/** The level a lifetime XP total corresponds to. */
export const levelAt = (total: number): number => {
  let l = 1;
  while (xpToReach(l + 1) <= total && l < 500) l++;
  return l;
};

/** Lifetime XP of a trait at a given level / in-level XP. */
export const totalXp = (level: number, xp: number): number => xpToReach(level) + Math.max(0, xp);

export interface DayPoint {
  date: DayKey;
  /** Lifetime XP at the end of that day. */
  total: number;
  /** XP won that day (negative when penalties took more than the day gave). */
  gain: number;
  level: number;
  /** The day has a history entry that won XP. */
  active: boolean;
}

interface Entry { date: DayKey; total: number; level: number; gain: number }

/** History → sorted, one entry per day, with the gain of each one. */
export const toEntries = (attr: Pick<Attribute, 'history'>): Entry[] => {
  const byDay = new Map<DayKey, { level: number; xp: number }>();
  for (const h of attr.history || []) {
    if (!h || !h.date) continue;
    byDay.set(String(h.date).slice(0, 10), { level: Math.max(1, Number(h.level) || 1), xp: Number(h.xp) || 0 });
  }
  const days = Array.from(byDay.keys()).sort();
  let prev = 0;
  return days.map((date, i) => {
    const { level, xp } = byDay.get(date)!;
    const total = totalXp(level, xp);
    // The very first entry has no earlier state: a level-1 start is a real "from zero", anything else is unknown.
    const gain = i === 0 ? (level === 1 ? total : 0) : total - prev;
    prev = total;
    return { date, total, level, gain };
  });
};

/** One point per calendar day from `start` to `end` (inclusive); days without an entry carry the previous state. */
export const buildTimeline = (attr: Attribute, start: DayKey, end: DayKey): DayPoint[] => {
  const entries = toEntries(attr);
  const span = Math.max(0, daysBetween(start, end));
  const points: DayPoint[] = [];
  let idx = -1;
  while (idx + 1 < entries.length && entries[idx + 1].date < start) idx++;
  // State before the window: last entry before `start`, or the first entry's baseline.
  let total = idx >= 0 ? entries[idx].total : entries.length ? Math.max(0, entries[0].total - entries[0].gain) : totalXp(attr.level, attr.xp);
  let level = idx >= 0 ? entries[idx].level : levelAt(total);
  const byDate = new Map(entries.map(e => [e.date, e]));
  for (let i = 0; i <= span; i++) {
    const date = shiftKey(start, i);
    const e = byDate.get(date);
    if (e) { total = e.total; level = e.level; }
    points.push({ date, total, gain: e ? e.gain : 0, level, active: !!e && e.gain > 0 });
  }
  // Nothing recorded at all: show the live state as a flat line.
  if (!entries.length) {
    const live = totalXp(attr.level, attr.xp);
    return points.map(p => ({ ...p, total: live, level: attr.level }));
  }
  return points;
};

export interface PeriodStats {
  days: number;
  gained: number;
  /** Net change of the lifetime XP over the period (gains minus penalties). */
  net: number;
  avgPerDay: number;
  avgPerActiveDay: number;
  best: { date: DayKey; xp: number } | null;
  activeDays: number;
  levelsGained: number;
  longestStreak: number;
  goalHits: number;
}

export const periodStats = (points: DayPoint[], goal = 0): PeriodStats => {
  const days = points.length;
  const gains = points.map(p => Math.max(0, p.gain));
  const gained = gains.reduce((s, g) => s + g, 0);
  const activeDays = points.filter(p => p.active).length;
  let best: PeriodStats['best'] = null;
  points.forEach(p => { if (p.gain > 0 && (!best || p.gain > best.xp)) best = { date: p.date, xp: p.gain }; });
  let run = 0;
  let longest = 0;
  for (const p of points) { run = p.active ? run + 1 : 0; longest = Math.max(longest, run); }
  const first = points[0];
  const last = points[points.length - 1];
  return {
    days,
    gained,
    net: last && first ? last.total - (first.total - first.gain) : 0,
    avgPerDay: days ? gained / days : 0,
    avgPerActiveDay: activeDays ? gained / activeDays : 0,
    best,
    activeDays,
    levelsGained: last && first ? Math.max(0, last.level - levelAt(Math.max(0, first.total - first.gain))) : 0,
    longestStreak: longest,
    goalHits: goal > 0 ? gains.filter(g => g >= goal).length : 0,
  };
};


/** Consecutive active days ending today (or yesterday while today is still empty). */
export const activeStreak = (attr: Attribute, today: DayKey): number => {
  const gains = new Map(toEntries(attr).map(e => [e.date, e.gain]));
  let k = gains.get(today) && (gains.get(today) as number) > 0 ? today : shiftKey(today, -1);
  let n = 0;
  while ((gains.get(k) || 0) > 0) { n++; k = shiftKey(k, -1); }
  return n;
};

/** Average XP per day over the last `window` days up to `today`. */
export const recentRate = (attr: Attribute, today: DayKey, window = 14): number => {
  const pts = buildTimeline(attr, shiftKey(today, -(window - 1)), today);
  return pts.reduce((s, p) => s + Math.max(0, p.gain), 0) / window;
};

/** Days until the next level at the recent pace (null: no pace). */
export const etaToNextLevel = (attr: Attribute, today: DayKey): number | null => {
  const rate = recentRate(attr, today);
  if (rate <= 0) return null;
  const left = Math.max(0, attr.maxXp - attr.xp);
  return Math.max(1, Math.ceil(left / rate));
};

/** XP won per weekday (index 0 = Monday … 6 = Sunday). */
export const weekdayTotals = (points: DayPoint[]): number[] => {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const p of points) out[(fromKey(p.date).getDay() + 6) % 7] += Math.max(0, p.gain);
  return out;
};

/** Heat level 0–4 for a gain, relative to the best days. */
export const heatLevel = (gain: number, max: number): 0 | 1 | 2 | 3 | 4 => {
  if (gain <= 0 || max <= 0) return 0;
  const r = gain / max;
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
};

/** Compare "this period" with "the one before it" in %, null when there is nothing to compare. */
export const trendPct = (current: number, previous: number): number | null => {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export const firstEntryKey = (attr: Attribute): DayKey | null => toEntries(attr)[0]?.date ?? null;
