import type { BadHabit, ViceLedgerEntry, ViceOffer } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// VICE MARKET — buying a vice on purpose instead of falling into it.
//
// A relapse resets the streak and costs HP or gold. A pass bought in advance
// with earned gold is a *planned* indulgence: it is recorded, and it neither
// breaks the streak nor hurts HP/XP.
//   • price comes from the vice's impact (and can be set per vice)
//   • every pass of the same vice bought in a week costs 25% more
//   • one vice a day is the "deal of the day" (−30%)
//   • the impact also gives the vice a rarity, like a collectible card
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const INFLATION_STEP = 0.25;
const DEAL_DISCOUNT = 0.3;
const round10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);

/** 1 (mild) .. 5 (severe), from the wizard's impact or its gold penalty. */
export const viceImpact = (habit: BadHabit) => {
  const fromText = habit.negativeImpact?.match(/\d+/);
  if (fromText) return Math.min(5, Math.max(1, parseInt(fromText[0], 10)));
  const fromGold = Math.round((habit.penalties?.gold || 60) / 20);
  return Math.min(5, Math.max(1, fromGold));
};

export const defaultOffer = (habit: BadHabit): ViceOffer => ({ mode: 'PASS', passPrice: 120 * viceImpact(habit) });

/** The vice's offer; older saved offers (e.g. a removed membership mode) fall back to a pass. */
export const offerOf = (habit: BadHabit): ViceOffer => {
  const saved = habit.market;
  if (!saved) return defaultOffer(habit);
  return { mode: saved.mode === 'OFF' ? 'OFF' : 'PASS', passPrice: saved.passPrice || defaultOffer(habit).passPrice };
};

// ── Rarity ───────────────────────────────────────────────────────────────────

export interface Rarity {
  tier: 1 | 2 | 3 | 4 | 5;
  key: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  rgb: string;
  label: string; // Spanish default; translated with store.rarity.<key>
}

const RARITIES: Rarity[] = [
  { tier: 1, key: 'common', rgb: '161 161 170', label: 'Común' },
  { tier: 2, key: 'uncommon', rgb: '52 211 153', label: 'Poco común' },
  { tier: 3, key: 'rare', rgb: '56 189 248', label: 'Raro' },
  { tier: 4, key: 'epic', rgb: '192 132 252', label: 'Épico' },
  { tier: 5, key: 'legendary', rgb: '251 191 36', label: 'Legendario' },
];

export const rarityOfTier = (tier: number) => RARITIES[Math.min(5, Math.max(1, tier)) - 1];
export const viceRarity = (habit: BadHabit) => rarityOfTier(viceImpact(habit));

// ── Deal of the day ──────────────────────────────────────────────────────────

const dayKey = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Same vice all day, a different one tomorrow (stable for a given list). */
export const dealOfTheDay = (habits: BadHabit[], now = Date.now()) => {
  const forSale = habits.filter(h => !h.archived && offerOf(h).mode === 'PASS').sort((a, b) => a.id.localeCompare(b.id));
  if (!forSale.length) return null;
  let hash = 0;
  for (const c of dayKey(now)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return forSale[hash % forSale.length].id;
};

export const msToMidnight = (now = Date.now()) => {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime() - now;
};

// ── Quotes ───────────────────────────────────────────────────────────────────

const recentPassBuys = (habitId: string, ledger: ViceLedgerEntry[], now: number) =>
  ledger.filter(e => e.habitId === habitId && e.kind === 'PASS_BUY' && now - e.createdAt < 7 * DAY).length;

/** Price of the next pass: base × weekly inflation × deal discount. */
export const passQuote = (habit: BadHabit, ledger: ViceLedgerEntry[], dealId: string | null, now = Date.now()) => {
  const base = offerOf(habit).passPrice;
  const recent = recentPassBuys(habit.id, ledger, now);
  const deal = dealId === habit.id;
  const factor = Math.pow(1 + INFLATION_STEP, recent);
  const full = round10(base * factor);
  const price = deal ? round10(full * (1 - DEAL_DISCOUNT)) : full;
  return { base, full, price, recent, inflation: factor - 1, deal };
};

export const availableUses = (habit: BadHabit) => habit.vicePasses || 0;

/** Streak that a planned indulgence protects (what a relapse would cost). */
export const streakAtStake = (habit: BadHabit) =>
  habit.intelligentStreak ? habit.reachedDays || 0 : habit.streak || 0;

// ── Shelf info: how bad is it, when did I last do it ─────────────────────────

/** Local midnight of a stored relapse day ("2026-11-20") or timestamp. */
const toLocalTime = (value: string | number): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return new Date(+day[1], +day[2] - 1, +day[3]).getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * The last time this vice was actually done: a relapse OR a paid indulgence.
 * `null` means never (no history at all).
 */
export const lastDoneAt = (habit: BadHabit, ledger: ViceLedgerEntry[] = []): number | null => {
  const stamps: number[] = [];
  (habit.history || []).forEach(d => { const t = toLocalTime(d); if (t !== null) stamps.push(t); });
  (habit.indulgences || []).forEach(d => { const t = toLocalTime(d); if (t !== null) stamps.push(t); });
  ledger.forEach(e => { if (e.habitId === habit.id && e.kind === 'PASS_USE' && !e.deleted) stamps.push(e.createdAt); });
  return stamps.length ? Math.max(...stamps) : null;
};

/** Whole calendar days between `then` and `now` (0 = today). */
export const calendarDaysSince = (then: number, now = Date.now()) => {
  const a = new Date(now); a.setHours(0, 0, 0, 0);
  const b = new Date(then); b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / DAY));
};

/** Short, human "ago" bucket: key + count, so the UI can translate it. */
export const agoBucket = (then: number | null, now = Date.now()): { key: 'never' | 'today' | 'yesterday' | 'days' | 'weeks' | 'months'; count: number } => {
  if (then === null) return { key: 'never', count: 0 };
  const days = calendarDaysSince(then, now);
  if (days === 0) return { key: 'today', count: 0 };
  if (days === 1) return { key: 'yesterday', count: 1 };
  if (days < 14) return { key: 'days', count: days };
  if (days < 60) return { key: 'weeks', count: Math.floor(days / 7) };
  return { key: 'months', count: Math.floor(days / 30) };
};

export const SEVERITY_LABELS = ['Leve', 'Moderado', 'Dañino', 'Grave', 'Crítico'] as const;

export const formatCountdown = (ms: number) => {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / 60000);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

/** Short receipt code, e.g. "LX-7F3A-21". */
export const receiptCode = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hex = h.toString(16).toUpperCase().padStart(6, '0');
  return `LX-${hex.slice(0, 4)}-${hex.slice(4, 6)}`;
};
