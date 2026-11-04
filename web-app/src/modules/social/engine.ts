// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL ENGINE — pure rules for friend duels and friend streaks.
// No I/O: the store feeds it rows from Supabase and applies the results.
// The Android widget (DuelWidgetProvider.kt) mirrors dayResult/coinFlip, keep
// both in sync.
// ─────────────────────────────────────────────────────────────────────────────

export type DayKey = string; // YYYY-MM-DD (calendar date)
export type DuelDuration = 'DAY' | 'WEEK' | 'MONTH';
export type Side = 'A' | 'B'; // A = challenger, B = opponent

export const SOCIAL_CONFIG = {
  /** Prize for winning a counted day. */
  DAY_WIN: { gold: 120, chestValue: 100, xp: 40 },
  /** XP for winning the whole duel, by duration. */
  FINAL_XP: { DAY: 100, WEEK: 300, MONTH: 1000 } as Record<DuelDuration, number>,
  /** Max days that can be left out of the count. Month depends on parity (see maxExcluded). */
  MAX_EXCLUDED_WEEK: 4,
  /** Chest tiers by gold value; the final prize chest is the largest tier strictly below the pot. */
  CHEST_TIERS: [100, 250, 500, 750, 1000, 1500, 2500, 4000, 6000, 10000],
  MAX_STAKE: 100000,
  MESSAGE_MAX: 200,
} as const;

// ── Dates (calendar keys, timezone-free arithmetic) ─────────────────────────

const toUtc = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number): DayKey => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
export const addDays = (k: DayKey, n: number): DayKey => fromUtc(toUtc(k) + n * 86_400_000);
export const diffDays = (a: DayKey, b: DayKey) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
export const localDayKey = (d: Date = new Date()): DayKey =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Same day next month, clamped (Jan 31 → Feb 28/29). */
export const addOneMonth = (k: DayKey): DayKey => {
  const [y, m, d] = k.split('-').map(Number);
  const lastOfNext = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(y, m, Math.min(d, lastOfNext)));
};

/** Every day of a contract starting on `start`. A month runs until the day before the same date next month. */
export const periodDays = (duration: DuelDuration, start: DayKey): DayKey[] => {
  const end = duration === 'DAY' ? start : duration === 'WEEK' ? addDays(start, 6) : addDays(addOneMonth(start), -1);
  const out: DayKey[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
};

// ── Excluded days ───────────────────────────────────────────────────────────

/** Week: up to 4. Month: 12 or 13, whichever keeps the counted total odd. */
export const maxExcluded = (duration: DuelDuration, totalDays: number) => {
  if (duration === 'DAY') return 0;
  if (duration === 'WEEK') return SOCIAL_CONFIG.MAX_EXCLUDED_WEEK;
  return totalDays % 2 === 1 ? 12 : 13;
};

export type ExclusionProblem = null | 'TOO_MANY' | 'EVEN_TOTAL' | 'OUTSIDE_PERIOD';

/** The counted days must be odd so a duel always has a winner. */
export const checkExclusions = (duration: DuelDuration, start: DayKey, excluded: DayKey[]): ExclusionProblem => {
  const days = periodDays(duration, start);
  const set = new Set(days);
  if (excluded.some(d => !set.has(d))) return 'OUTSIDE_PERIOD';
  const unique = new Set(excluded).size;
  if (unique > maxExcluded(duration, days.length)) return 'TOO_MANY';
  if ((days.length - unique) % 2 === 0) return 'EVEN_TOTAL';
  return null;
};

export const countedDays = (duration: DuelDuration, start: DayKey, excluded: DayKey[]) => {
  const ex = new Set(excluded);
  return periodDays(duration, start).filter(d => !ex.has(d));
};

// ── Daily result ────────────────────────────────────────────────────────────

/** FNV-1a 32-bit over UTF-16 code units (ASCII input). Mirrored in Kotlin. */
export const fnv1a = (text: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** Deterministic coin: both players (and the widget) get the same side. */
export const coinFlip = (duelId: string, day: DayKey): Side => (fnv1a(`${duelId}:${day}`) & 1 ? 'B' : 'A');

export interface DayStats { score: number; focusMinutes: number }
export type TieBreak = 'SCORE' | 'FOCUS' | 'COIN';
export interface DayResult { day: DayKey; winner: Side; by: TieBreak; a: DayStats; b: DayStats }

const ZERO: DayStats = { score: 0, focusMinutes: 0 };

/** Higher daily score wins; tie → more focus minutes; tie → coin flip. */
export const dayResult = (duelId: string, day: DayKey, a: DayStats | undefined, b: DayStats | undefined): DayResult => {
  const sa = a ?? ZERO;
  const sb = b ?? ZERO;
  const scoreA = Math.round(sa.score * 10);
  const scoreB = Math.round(sb.score * 10);
  if (scoreA !== scoreB) return { day, winner: scoreA > scoreB ? 'A' : 'B', by: 'SCORE', a: sa, b: sb };
  const fa = Math.round(sa.focusMinutes);
  const fb = Math.round(sb.focusMinutes);
  if (fa !== fb) return { day, winner: fa > fb ? 'A' : 'B', by: 'FOCUS', a: sa, b: sb };
  return { day, winner: coinFlip(duelId, day), by: 'COIN', a: sa, b: sb };
};

// ── Duel standing ───────────────────────────────────────────────────────────

export interface DuelLike {
  id: string;
  duration: DuelDuration;
  start_day: DayKey;
  excluded_days: DayKey[];
  stake: number;
}

export interface DuelStanding {
  counted: DayKey[];
  results: DayResult[];
  winsA: number;
  winsB: number;
  remaining: number;
  /** Day currently being played (if it counts). */
  live: DayKey | null;
  finished: boolean;
  winner: Side | null;
  /** A side already has more than half of the counted days. */
  clinched: Side | null;
}

/** Days count once they are over (`day < today`). */
export const duelStanding = (
  duel: DuelLike,
  stats: { a: Record<DayKey, DayStats>; b: Record<DayKey, DayStats> },
  today: DayKey,
): DuelStanding => {
  const counted = countedDays(duel.duration, duel.start_day, duel.excluded_days);
  const results = counted.filter(d => d < today).map(d => dayResult(duel.id, d, stats.a[d], stats.b[d]));
  const winsA = results.filter(r => r.winner === 'A').length;
  const winsB = results.length - winsA;
  const half = Math.floor(counted.length / 2);
  const finished = results.length === counted.length;
  return {
    counted,
    results,
    winsA,
    winsB,
    remaining: counted.length - results.length,
    live: counted.includes(today) ? today : null,
    finished,
    winner: finished ? (winsA > winsB ? 'A' : 'B') : null,
    clinched: winsA > half ? 'A' : winsB > half ? 'B' : null,
  };
};

// ── Prizes ──────────────────────────────────────────────────────────────────

/** Largest chest strictly below the pot (pot 1000 → 750). Null when the pot is too small. */
export const chestBelow = (pot: number): number | null => {
  const tiers = SOCIAL_CONFIG.CHEST_TIERS.filter(v => v < pot);
  return tiers.length ? tiers[tiers.length - 1] : null;
};

export const chestItemId = (value: number) => `chest_${value}`;

export interface Prize { gold: number; xp: number; chests: number[]; achievement?: string }

export const dayPrize = (): Prize => ({ gold: SOCIAL_CONFIG.DAY_WIN.gold, xp: SOCIAL_CONFIG.DAY_WIN.xp, chests: [SOCIAL_CONFIG.DAY_WIN.chestValue] });

/** Winner takes both stakes, a chest worth just under that pot, XP and an achievement. */
export const finalPrize = (duel: DuelLike): Prize => {
  const pot = duel.stake * 2;
  const chest = chestBelow(pot);
  return {
    gold: pot,
    xp: SOCIAL_CONFIG.FINAL_XP[duel.duration],
    chests: chest ? [chest] : [],
    achievement: `DUEL_${duel.duration}_WIN`,
  };
};

export const addPrizes = (a: Prize, b: Prize): Prize => ({
  gold: a.gold + b.gold,
  xp: a.xp + b.xp,
  chests: [...a.chests, ...b.chests],
  achievement: a.achievement ?? b.achievement,
});

export const EMPTY_PRIZE: Prize = { gold: 0, xp: 0, chests: [] };

// ── Head-to-head record ─────────────────────────────────────────────────────

export interface Record2 { dayWins: number; dayLosses: number; duelWins: number; duelLosses: number }

/** Cumulative record of `me` against one friend across all their duels. */
export const headToHead = (standings: { mineIsA: boolean; standing: DuelStanding }[]): Record2 => {
  const rec: Record2 = { dayWins: 0, dayLosses: 0, duelWins: 0, duelLosses: 0 };
  for (const { mineIsA, standing } of standings) {
    const mine = mineIsA ? standing.winsA : standing.winsB;
    const theirs = mineIsA ? standing.winsB : standing.winsA;
    rec.dayWins += mine;
    rec.dayLosses += theirs;
    if (standing.winner) {
      if ((standing.winner === 'A') === mineIsA) rec.duelWins++;
      else rec.duelLosses++;
    }
  }
  return rec;
};

// ── Friend streak ───────────────────────────────────────────────────────────

export type StreakDay = 'BOTH' | 'ME' | 'FRIEND' | 'NONE';

export interface FriendStreak {
  /** Consecutive days both activated their HUD streak, counting today only once both did. */
  current: number;
  best: number;
  /** Today: both done, waiting on someone, or not started. */
  today: { me: boolean; friend: boolean };
  /** Broken on a past day (current restarted). */
  brokeOn: DayKey | null;
  days: Record<DayKey, StreakDay>;
}

export const friendStreak = (startedOn: DayKey, mine: Set<DayKey>, theirs: Set<DayKey>, today: DayKey): FriendStreak => {
  const days: Record<DayKey, StreakDay> = {};
  let run = 0;
  let best = 0;
  let brokeOn: DayKey | null = null;
  for (let k = startedOn; k < today; k = addDays(k, 1)) {
    const m = mine.has(k);
    const f = theirs.has(k);
    days[k] = m && f ? 'BOTH' : m ? 'ME' : f ? 'FRIEND' : 'NONE';
    if (m && f) {
      run++;
      best = Math.max(best, run);
    } else {
      if (run > 0) brokeOn = k;
      run = 0;
    }
  }
  const tm = mine.has(today);
  const tf = theirs.has(today);
  days[today] = tm && tf ? 'BOTH' : tm ? 'ME' : tf ? 'FRIEND' : 'NONE';
  const current = run + (tm && tf ? 1 : 0);
  return { current, best: Math.max(best, current), today: { me: tm, friend: tf }, brokeOn, days };
};

// ── Invite codes ────────────────────────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const makeInviteCode = (random: () => number = Math.random) =>
  Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('');

export const normalizeInviteCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

/** Accepts a bare code, `luxapp://invite?code=…` or any URL with ?code=. */
export const parseInvite = (text: string): string | null => {
  const m = /[?&]code=([A-Za-z0-9]{6,12})/.exec(text) ?? /\b([A-HJ-NP-Z2-9]{8})\b/.exec(text.toUpperCase());
  return m ? normalizeInviteCode(m[1]) : null;
};
