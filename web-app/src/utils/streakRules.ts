import { getHistoryDateKey, parseLocalDate, toLocalISOString } from './dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// STREAK RULES — the single source of truth for every streak in the app.
//
// Before this module the same rules were re-implemented in several places and
// had drifted apart (the daily streak was *activated* with 1 task + 30 min of
// focus but *displayed* with all tasks + 60 min; habit streaks ignored the
// habit's own schedule). Everything streak-related should come through here.
// ─────────────────────────────────────────────────────────────────────────────

// ── Daily (global) streak ────────────────────────────────────────────────────
// The rule shown to the user in the streak modal: finish every task due
// today, complete at least one habit and focus for one hour.

export const STREAK_FOCUS_SECONDS = 3600;
export const STREAK_MIN_HABITS = 1;

interface QuestLike {
  completed?: boolean;
  completedAt?: number | string | null;
  deadline?: string | null;
}

/** Tasks that count for today: completed today + pending ones that are due (or have no date). */
export const todayTaskCounts = (quests: QuestLike[] | undefined, now = new Date()) => {
  const today = toLocalISOString(now);
  let done = 0;
  let pending = 0;
  (quests || []).forEach(q => {
    if (q.completed) {
      if (!q.completedAt) return;
      const d = parseLocalDate(q.completedAt as any);
      if (!Number.isNaN(d.getTime()) && toLocalISOString(d) === today) done++;
      return;
    }
    if (!q.deadline) { pending++; return; }
    if (String(q.deadline).split('T')[0] <= today) pending++;
  });
  return { done, pending, total: done + pending };
};

export const isDailyStreakMet = (p: { tasksDone: number; tasksTotal: number; habitsCompleted: number; focusSeconds: number }) =>
  (p.tasksTotal === 0 || p.tasksDone >= p.tasksTotal) &&
  p.habitsCompleted >= STREAK_MIN_HABITS &&
  p.focusSeconds >= STREAK_FOCUS_SECONDS;

const shiftDay = (dateKey: string, days: number) => {
  const d = parseLocalDate(dateKey);
  d.setDate(d.getDate() + days);
  return toLocalISOString(d);
};

// Protected days (streak freeze, glacier, rest shield, phoenix feather) never
// break a streak. They are stored as a list of local date keys
// (`stats.streakFrozenDays`). The legacy `streakFrozenUntil` (24h from the
// purchase) still protects exactly one day: the day it was bought.
export interface StreakProtection {
  frozenUntil?: string | null;
  frozenDays?: string[] | null;
}

const isFrozenOn = (frozenUntil: string | null | undefined, dateKey: string, frozenDays?: string[] | null) => {
  if (frozenDays && frozenDays.includes(dateKey)) return true;
  if (!frozenUntil) return false;
  const until = parseLocalDate(frozenUntil);
  if (Number.isNaN(until.getTime())) return false;
  return dateKey === shiftDay(toLocalISOString(until), -1);
};

/** True when a day is protected by any streak power (freeze, shield, phoenix…). */
export const isDayProtected = (p: StreakProtection, dateKey: string) => isFrozenOn(p.frozenUntil, dateKey, p.frozenDays);

/** Date keys from `from` to `to` (inclusive). Empty when from > to. Capped at 60 days. */
export const dayRange = (from: string, to: string) => {
  const out: string[] = [];
  for (let k = from; k <= to && out.length < 60; k = shiftDay(k, 1)) out.push(k);
  return out;
};

export { shiftDay as shiftDayKey };

/**
 * The part of the daily streak that survives into today, *not counting today*.
 * If today was already counted it is subtracted, so the caller can add today
 * back only when today's requirements are actually met.
 */
export const carriedDailyStreak = (p: {
  streak?: number;
  lastStreakDate?: string | null;
  frozenUntil?: string | null;
  frozenDays?: string[] | null;
  now?: Date;
}) => {
  const streak = p.streak || 0;
  if (streak <= 0 || !p.lastStreakDate) return 0;
  const today = toLocalISOString(p.now || new Date());
  if (p.lastStreakDate === today) return streak - 1;
  // Walk back from yesterday over protected days: the streak survives when
  // every day between its last counted day and today was protected.
  let k = shiftDay(today, -1);
  for (let i = 0; i < 60 && k > p.lastStreakDate; i++) {
    if (!isFrozenOn(p.frozenUntil, k, p.frozenDays)) return 0;
    k = shiftDay(k, -1);
  }
  return k === p.lastStreakDate ? streak : 0;
};

/**
 * Days missed by a broken daily streak (from the day after its last counted
 * day up to yesterday), skipping days that were protected anyway.
 */
export const missedDailyStreakDays = (p: { lastStreakDate?: string | null; now?: Date } & StreakProtection) => {
  if (!p.lastStreakDate) return [];
  const today = toLocalISOString(p.now || new Date());
  return dayRange(shiftDay(p.lastStreakDate, 1), shiftDay(today, -1)).filter(k => !isFrozenOn(p.frozenUntil, k, p.frozenDays));
};

/**
 * After a daily streak is restored (redemption, recovery), anchor it to
 * yesterday so it continues today. Without a date the reset guard sees a
 * broken streak and zeroes it again right away. If today is already counted
 * it's left alone (moving it would add the day twice).
 */
export const anchorRestoredStreak = <T extends { lastStreakDate?: string | null }>(stats: T, now = new Date()): T => {
  const today = toLocalISOString(now);
  if (stats.lastStreakDate !== today) stats.lastStreakDate = shiftDay(today, -1);
  return stats;
};

/** The streak to show right now. */
export const displayDailyStreak = (carried: number, metToday: boolean) => carried + (metToday ? 1 : 0);

// ── Habit streaks ────────────────────────────────────────────────────────────

interface HabitLike {
  frequency?: string;
  frequencyDays?: number[];
  weeklyType?: string;
  weeklyFlexibleCount?: number;
  monthlyType?: string;
  monthlyFlexibleCount?: number;
  monthlyLastDay?: boolean;
  /** Missed days forgiven by a streak recovery from the store. */
  streakForgiven?: string[];
}

const isLastDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getDate() === 1;

/** Same rule the habits view uses to decide whether a habit is due on a day. */
export const isHabitScheduledOn = (habit: HabitLike, date: Date) => {
  if (!habit.frequency || habit.frequency === 'DAILY') return true;
  if (habit.frequency === 'WEEKLY') {
    if (habit.weeklyType === 'FLEXIBLE_COUNT') return true;
    return !habit.frequencyDays?.length || habit.frequencyDays.includes(date.getDay());
  }
  if (habit.frequency === 'MONTHLY') {
    if (habit.monthlyType === 'FLEXIBLE_COUNT') return true;
    return !!habit.frequencyDays?.includes(date.getDate()) || (!!habit.monthlyLastDay && isLastDayOfMonth(date));
  }
  return true;
};

const MAX_LOOKBACK_DAYS = 1100;

/**
 * Current streak of a habit, computed from its completion history and its
 * schedule:
 *  • days it isn't due never break the streak (a Mon/Wed/Fri habit is not
 *    "broken" on Tuesday)
 *  • today never breaks it while still pending
 *  • frozen days (streak freeze) never break it
 *  • "N times per week/month" habits keep their streak while every past
 *    period reached its goal; the streak counts the completions in that run.
 */
export const computeHabitStreak = (
  habit: HabitLike,
  history: string[] | undefined,
  opts: { now?: Date; weekStartDay?: 0 | 1; frozenUntil?: string | null; frozenDays?: string[] | null } = {},
) => {
  const keys = new Set((history || []).map(h => getHistoryDateKey(h)));
  if (keys.size === 0) return 0;
  const forgiven = new Set(habit.streakForgiven || []);
  const earliest = Array.from(keys).sort()[0];
  const now = opts.now || new Date();
  const today = toLocalISOString(now);

  const flexibleWeekly = habit.frequency === 'WEEKLY' && habit.weeklyType === 'FLEXIBLE_COUNT';
  const flexibleMonthly = habit.frequency === 'MONTHLY' && habit.monthlyType === 'FLEXIBLE_COUNT';

  if (flexibleWeekly || flexibleMonthly) {
    const goal = Math.max(1, (flexibleWeekly ? habit.weeklyFlexibleCount : habit.monthlyFlexibleCount) || 1);
    const weekStart = opts.weekStartDay ?? 1;
    // Start of the period containing `d`.
    const periodStart = (d: Date) => {
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (flexibleMonthly) { s.setDate(1); return s; }
      const diff = (s.getDay() - weekStart + 7) % 7;
      s.setDate(s.getDate() - diff);
      return s;
    };
    const nextPeriod = (s: Date) => {
      const n = new Date(s);
      if (flexibleMonthly) n.setMonth(n.getMonth() + 1); else n.setDate(n.getDate() + 7);
      return n;
    };
    const prevPeriod = (s: Date) => {
      const p = new Date(s);
      if (flexibleMonthly) p.setMonth(p.getMonth() - 1); else p.setDate(p.getDate() - 7);
      return p;
    };
    const countIn = (start: Date) => {
      const end = toLocalISOString(nextPeriod(start));
      const from = toLocalISOString(start);
      let c = 0;
      keys.forEach(k => { if (k >= from && k < end) c++; });
      return c;
    };

    let start = periodStart(now);
    let streak = countIn(start); // the current period is still open: it can't fail yet
    for (let i = 0; i < 200; i++) {
      start = prevPeriod(start);
      const lastDayOfPeriod = shiftDay(toLocalISOString(nextPeriod(start)), -1);
      if (lastDayOfPeriod < earliest) break;
      const c = countIn(start);
      if (c >= goal || isFrozenOn(opts.frozenUntil, lastDayOfPeriod, opts.frozenDays)) streak += c;
      else break;
    }
    return streak;
  }

  let streak = 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const key = toLocalISOString(d);
    if (key < earliest) break;
    if (keys.has(key)) {
      streak++;
    } else if (isHabitScheduledOn(habit, d) && key !== today && !isFrozenOn(opts.frozenUntil, key, opts.frozenDays) && !forgiven.has(key)) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

/**
 * Store recovery for a habit whose streak broke in the last few days: which
 * missed days would be forgiven and what the streak comes back to. Returns
 * null when there is nothing (recent) to recover. "N times per period"
 * habits aren't day-based, so they are not recoverable this way.
 */
export const habitStreakRecovery = (
  habit: HabitLike,
  history: string[] | undefined,
  opts: { now?: Date; weekStartDay?: 0 | 1; frozenUntil?: string | null; frozenDays?: string[] | null } = {},
) => {
  if (habit.weeklyType === 'FLEXIBLE_COUNT' || habit.monthlyType === 'FLEXIBLE_COUNT') return null;
  const keys = Array.from(new Set((history || []).map(h => getHistoryDateKey(h)))).sort();
  if (!keys.length) return null;
  const today = toLocalISOString(opts.now || new Date());
  const yesterday = shiftDay(today, -1);
  const last = keys[keys.length - 1];
  // Done yesterday or today: nothing is broken. Older than 3 missed days: out of the window.
  if (last >= yesterday || last < shiftDay(today, -4)) return null;

  const forgive: string[] = [];
  for (let k = shiftDay(last, 1); k <= yesterday; k = shiftDay(k, 1)) {
    if (isHabitScheduledOn(habit, parseLocalDate(k)) && !isFrozenOn(opts.frozenUntil, k, opts.frozenDays)) forgive.push(k);
  }
  if (!forgive.length) return null;

  const current = computeHabitStreak(habit, history, opts);
  const restored = computeHabitStreak(
    { ...habit, streakForgiven: [...(habit.streakForgiven || []), ...forgive] },
    history,
    opts,
  );
  // `lost` = the streak the habit had on its last completed day.
  const lost = computeHabitStreak(habit, history, { ...opts, now: parseLocalDate(last) });
  return restored > current ? { restored, forgive, lost, lastDone: last } : null;
};
