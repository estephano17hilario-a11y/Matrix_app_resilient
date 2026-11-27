import { progressionStore } from '@/modules/progression/progressionStore';
import { carriedDailyStreak, habitStreakRecovery, missedDailyStreakDays, shiftDayKey } from '@/utils/streakRules';
import { toLocalISOString } from '@/utils/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// STREAK RECOVERY — what a lost streak costs to bring back, for how long it can
// be brought back, and which streaks are recoverable right now. Shared by the
// loss report, the HUD streak sheet, the habits banner and the store.
// ─────────────────────────────────────────────────────────────────────────────

export type RestoreCategory = 'HUD' | 'HABIT' | 'PROJECT';

export const RESTORE_PRICES: Record<RestoreCategory, number> = {
  HUD: 5000,
  HABIT: 2500,
  PROJECT: 2500,
};

/** Restoring several streaks at once ("Restablecimiento total") is discounted. */
export const BUNDLE_DISCOUNT = 0.2;

/** A lost streak can be bought back during this many days after it broke. */
export const RESTORE_WINDOW_DAYS = 3;

export interface LostStreak {
  key: string;              // stable id of this loss (seen-tracking, React key)
  category: RestoreCategory;
  targetId?: string;
  title: string;
  lost: number;             // the streak it had when it broke
  restored: number;         // what it comes back to
  price: number;
  daysLeft: number;         // days left to restore it (1 = last day)
  color?: string;
  icon?: string;
}

const todayKey = (now = new Date()) => toLocalISOString(now);

const daysLeftFrom = (lastActiveKey: string, now = new Date(), window = RESTORE_WINDOW_DAYS) => {
  // last active day D: missed D+1, broke at D+2. Restorable while today <= D+1+window.
  const deadline = shiftDayKey(lastActiveKey, 1 + window);
  const today = todayKey(now);
  if (today > deadline) return 0;
  let n = 1;
  for (let k = today; k < deadline; k = shiftDayKey(k, 1)) n++;
  return n;
};

/** Protected days: freezes bought in the store + rest shields from progression. */
export const protectedDays = (stats: any): string[] => {
  const own: string[] = Array.isArray(stats?.streakFrozenDays) ? stats.streakFrozenDays : [];
  let shields: string[] = [];
  try {
    shields = Object.keys(progressionStore.getSnapshot().engine?.shieldRequests || {});
  } catch { /* progression not ready */ }
  return shields.length ? Array.from(new Set([...own, ...shields])) : own;
};

/** The daily (HUD) streak loss, if it can still be restored. */
export const hudLoss = (stats: any, now = new Date()): LostStreak | null => {
  const previous = Number(stats?.previousStreak) || 0;
  if (previous <= 0) return null;
  const current = Number(stats?.streak) || 0;
  // The day the lost streak was last counted. Older profiles have no
  // `streakLostAt`: while no new run started, lastStreakDate still holds it.
  const lostAt: string | undefined = stats?.streakLostAt || (current <= 0 ? stats?.lastStreakDate : undefined);
  if (!lostAt) return null;
  const daysLeft = daysLeftFrom(lostAt, now);
  if (daysLeft <= 0) return null;
  const run = carriedDailyStreak({
    streak: current,
    lastStreakDate: stats?.lastStreakDate,
    frozenUntil: stats?.streakFrozenUntil,
    frozenDays: protectedDays(stats),
    now,
  }) + (stats?.lastStreakDate === todayKey(now) && current > 0 ? 1 : 0);
  return {
    key: `hud:${lostAt}`,
    category: 'HUD',
    title: 'Racha diaria',
    lost: previous,
    restored: previous + run,
    price: RESTORE_PRICES.HUD,
    daysLeft,
    color: '#f97316',
    icon: 'Flame',
  };
};

/** Habit streak losses (missed days in the last few days get forgiven). */
export const habitLosses = (habits: any[], opts: { weekStartDay?: 0 | 1; stats?: any; now?: Date } = {}): LostStreak[] => {
  const now = opts.now || new Date();
  const frozenDays = protectedDays(opts.stats);
  return (habits || [])
    .filter(h => h && !h.archived)
    .map(h => {
      const r = habitStreakRecovery(h, h.history, {
        weekStartDay: opts.weekStartDay ?? 1,
        frozenUntil: opts.stats?.streakFrozenUntil,
        frozenDays,
        now,
      });
      if (!r || r.lost < 2) return null; // a 1-day "streak" isn't worth a report
      const daysLeft = daysLeftFrom(r.lastDone, now);
      if (daysLeft <= 0) return null;
      return {
        key: `habit:${h.id}:${r.lastDone}`,
        category: 'HABIT' as const,
        targetId: h.id,
        title: h.title,
        lost: r.lost,
        restored: r.restored,
        price: RESTORE_PRICES.HABIT,
        daysLeft,
        color: h.customColor || h.color,
        icon: h.icon,
      };
    })
    .filter(Boolean) as LostStreak[];
};

/** Project streaks lost at a daily reset (projects allow one grace day). */
export const projectLosses = (projects: any[], now = new Date()): LostStreak[] =>
  (projects || [])
    .filter(p => p && !p.archived && (p.previousStreak || 0) > 1 && !((p.streak || 0) > 0) && p.lastStreakDate)
    .map(p => {
      const daysLeft = daysLeftFrom(shiftDayKey(p.lastStreakDate, 1), now); // +1 grace day
      if (daysLeft <= 0) return null;
      return {
        key: `project:${p.id}:${p.lastStreakDate}`,
        category: 'PROJECT' as const,
        targetId: p.id,
        title: p.title,
        lost: p.previousStreak,
        restored: p.previousStreak,
        price: RESTORE_PRICES.PROJECT,
        daysLeft,
        color: p.color,
        icon: p.icon,
      };
    })
    .filter(Boolean) as LostStreak[];

export const bundlePrice = (losses: LostStreak[]) => {
  const full = losses.reduce((s, l) => s + l.price, 0);
  return losses.length > 1 ? Math.round(full * (1 - BUNDLE_DISCOUNT) / 50) * 50 : full;
};

/** Days of the broken daily streak that a restore marks as protected (shown as ice). */
export const hudMissedDays = (stats: any, now = new Date()) =>
  missedDailyStreakDays({
    lastStreakDate: stats?.streakLostAt || stats?.lastStreakDate,
    frozenUntil: stats?.streakFrozenUntil,
    frozenDays: protectedDays(stats),
    now,
  });

// ── "Seen" tracking for the loss report (shown once per loss) ────────────────
const SEEN_KEY = 'lux-streak-loss-seen';

export const seenLosses = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export const markLossesSeen = (keys: string[]) => {
  try {
    const all = Array.from(new Set([...seenLosses(), ...keys])).slice(-80);
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
};

// ── Opening the recovery center from anywhere ────────────────────────────────
export const OPEN_RECOVERY_EVENT = 'lux:open-streak-recovery';

export const openStreakRecovery = (focus?: { category?: RestoreCategory; targetId?: string }) => {
  window.dispatchEvent(new CustomEvent(OPEN_RECOVERY_EVENT, { detail: focus || {} }));
};
