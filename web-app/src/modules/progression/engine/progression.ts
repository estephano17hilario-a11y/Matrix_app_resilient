// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION ENGINE — event-sourced ELO.
//
// The only stored truth is:
//   · events     — every ELO change (day, source, amount, reason)
//   · dayCloses  — one record per closed day (streak / shield bookkeeping)
// Current ELO, rank, streak and shields are always re-derived with `replay`.
//
// Every event id is deterministic (`close:<day>:<source>`, `focus:<day>:<hour>`),
// which is what makes closing a day or re-awarding focus idempotent.
// Pure functions only: no I/O, no clock reads (callers pass `at`).
// ─────────────────────────────────────────────────────────────────────────────

import { PROGRESSION_CONFIG } from './config';
import { addDaysToKey, boostReward, daysBetween, weeklyBoostFor, type DayKey } from './dayKey';
import { complianceRatio, clampHabitGoal, complianceDelta, focusPointsForMinutes } from './elo';
import { dailyLossCap, nextRankIndex } from './ranks';
import type { XpSource } from './xp';

const { ELO } = PROGRESSION_CONFIG;
const P = ELO.PROTECTION;

export type EloSource = 'HABITS' | 'TASKS' | 'FOCUS' | 'PROJECT_GOAL' | 'STREAK_BONUS' | 'STREAK_BREAK';
/** EARNED = from the streak (max 2), PURCHASED = bought in the store (already paid). */
export type ShieldSource = 'EARNED' | 'PURCHASED';

export interface EloEvent {
  id: string;
  dayKey: DayKey;
  /** Epoch ms when the event was produced. */
  at: number;
  source: EloSource;
  /** Final amount after multipliers and caps. */
  amount: number;
  /** Stable reason code (translated by the UI). */
  reason: string;
  ref?: string;
  meta?: Record<string, number | string | boolean | null>;
}

export interface DayCloseRecord {
  dayKey: DayKey;
  closedAt: number;
  streakBefore: number;
  streakAfter: number;
  shieldsBefore: number;
  shieldsAfter: number;
  shieldUsed: boolean;
  shieldSource: ShieldSource | null;
  habitRatio: number | null;
  taskRatio: number | null;
  eventIds: string[];
}

export interface ProgressionState {
  /** Progression day the user registered on (start of the first-week bonus). */
  registeredDayKey: DayKey;
  /** First day that gets closed. Existing users start the day the system is enabled. */
  startDayKey?: DayKey;
  events: EloEvent[];
  dayCloses: Record<DayKey, DayCloseRecord>;
  /** Shields the user activated for a day that is not closed yet. */
  shieldRequests: Record<DayKey, ShieldSource>;
  xpEvents: XpEvent[];
}

/** XP never goes down: there are only positive, deduplicated grants. */
export interface XpEvent {
  /** Deterministic: `habit:<id>:<day>`, `task:<id>`, `subtask:<id>`, `focus:<sessionId>`. */
  id: string;
  dayKey: DayKey;
  at: number;
  source: XpSource;
  amount: number;
  ref?: string;
}

export const createProgressionState = (registeredDayKey: DayKey): ProgressionState => ({
  registeredDayKey,
  events: [],
  dayCloses: {},
  shieldRequests: {},
  xpEvents: [],
});

// ── Helpers ─────────────────────────────────────────────────────────────────

export const isFirstWeek = (state: ProgressionState, dayKey: DayKey): boolean => {
  const d = daysBetween(state.registeredDayKey, dayKey);
  return d >= 0 && d < P.FIRST_WEEK_DAYS;
};

/** Multiplier for ELO gains on a day: first week × weekly boost. Losses are never multiplied. */
export const gainMultiplier = (state: ProgressionState, dayKey: DayKey): number =>
  (isFirstWeek(state, dayKey) ? P.FIRST_WEEK_GAIN_MULTIPLIER : 1) * weeklyBoostFor(dayKey);

const boostGain = (state: ProgressionState, dayKey: DayKey, amount: number) =>
  amount > 0 ? Math.round(amount * gainMultiplier(state, dayKey)) : amount;

// Focus happens during the day, close events at its end.
const PHASE: Record<EloSource, number> = {
  FOCUS: 0, HABITS: 1, TASKS: 1, PROJECT_GOAL: 1, STREAK_BONUS: 1, STREAK_BREAK: 1,
};

const byTimeline = (a: EloEvent, b: EloEvent) =>
  a.dayKey.localeCompare(b.dayKey) || PHASE[a.source] - PHASE[b.source] || a.at - b.at || a.id.localeCompare(b.id);

// ── Replay ──────────────────────────────────────────────────────────────────

export interface ReplayStep { eventId: string; applied: number; eloAfter: number; rankIndexAfter: number }

export interface ProgressionSummary {
  elo: number;
  rankIndex: number;
  streak: number;
  shields: number;
  lastClosedDay: DayKey | null;
  steps: ReplayStep[];
}

/** Recomputes everything from the history. ELO never goes below ELO.MIN. */
export const replay = (state: ProgressionState): ProgressionSummary => {
  let elo: number = ELO.START;
  let rankIndex = nextRankIndex(0, elo);
  const steps: ReplayStep[] = [];

  for (const e of [...state.events].sort(byTimeline)) {
    const next = Math.max(ELO.MIN, elo + e.amount);
    const applied = next - elo;
    elo = next;
    rankIndex = nextRankIndex(rankIndex, elo);
    steps.push({ eventId: e.id, applied, eloAfter: elo, rankIndexAfter: rankIndex });
  }

  const last = lastClose(state);
  return {
    elo,
    rankIndex,
    streak: last?.streakAfter ?? 0,
    shields: last?.shieldsAfter ?? 0,
    lastClosedDay: last?.dayKey ?? null,
    steps,
  };
};

const lastClose = (state: ProgressionState): DayCloseRecord | null => {
  const keys = Object.keys(state.dayCloses).sort();
  return keys.length ? state.dayCloses[keys[keys.length - 1]] : null;
};

/** Sum of event amounts for a day (nominal, before the ELO floor). */
export const dayTotal = (state: ProgressionState, dayKey: DayKey): number =>
  state.events.filter(e => e.dayKey === dayKey).reduce((s, e) => s + e.amount, 0);

const withEvents = (state: ProgressionState, events: EloEvent[]): ProgressionState => {
  const known = new Set(state.events.map(e => e.id));
  const fresh = events.filter(e => !known.has(e.id));
  return fresh.length ? { ...state, events: [...state.events, ...fresh] } : state;
};

// ── Focus (immediate) ───────────────────────────────────────────────────────

export interface FocusAwardResult { state: ProgressionState; awarded: EloEvent[] }

/**
 * Awards +1 per full hour of *timer* focus accumulated in the day (capped).
 * Pass the day's total timer minutes; manual minutes must not be included.
 * Calling it again with the same or smaller total awards nothing.
 */
export const awardFocus = (
  state: ProgressionState,
  dayKey: DayKey,
  timerMinutesToday: number,
  at: number,
): FocusAwardResult => {
  const target = focusPointsForMinutes(timerMinutesToday);
  const m = gainMultiplier(state, dayKey);
  const awarded: EloEvent[] = [];
  for (let hour = 1; hour <= target; hour++) {
    const id = `focus:${dayKey}:${hour}`;
    if (state.events.some(e => e.id === id)) continue;
    // Cumulative rounding so fractional multipliers add up over the day (8 h x 1.25 = 10).
    const amount = Math.round(hour * m) - Math.round((hour - 1) * m);
    if (amount <= 0) continue;
    awarded.push({
      id, dayKey, at, source: 'FOCUS',
      amount,
      reason: 'FOCUS_HOUR',
      meta: { hour, multiplier: m },
    });
  }
  return { state: withEvents(state, awarded), awarded };
};

// ── Day close ───────────────────────────────────────────────────────────────

export interface ProjectGoalInput {
  id: string;
  goalMinutes: number;
  timerMinutes: number;
  manualMinutes?: number;
}

export interface DayCloseInput {
  dayKey: DayKey;
  habits: { scheduled: number; completed: number };
  habitGoalPct?: number;
  tasks: { planned: number; completed: number };
  projects?: ProjectGoalInput[];
  /** Overrides `state.shieldRequests[dayKey]`. */
  shield?: ShieldSource | null;
  closedAt: number;
}

export interface DayCloseComputation {
  record: DayCloseRecord;
  events: EloEvent[];
}

export type DayCloseResult =
  | { status: 'CLOSED'; state: ProgressionState; record: DayCloseRecord; events: EloEvent[] }
  | { status: 'ALREADY_CLOSED'; state: ProgressionState; record: DayCloseRecord; events: [] }
  | { status: 'OUT_OF_ORDER'; state: ProgressionState; missing: DayKey };

/** Days that still need closing, oldest first, up to (but excluding) `todayKey`. */
export const pendingDays = (state: ProgressionState, todayKey: DayKey): DayKey[] => {
  const last = lastClose(state);
  let cursor = last ? addDaysToKey(last.dayKey, 1) : state.startDayKey ?? state.registeredDayKey;
  const out: DayKey[] = [];
  while (cursor < todayKey) {
    out.push(cursor);
    cursor = addDaysToKey(cursor, 1);
  }
  return out;
};

/**
 * Pure evaluation of a day. Used both to actually close it and to show the
 * "projected ELO of the day" while it is still running.
 */
export const computeDayClose = (state: ProgressionState, input: DayCloseInput): DayCloseComputation => {
  const { dayKey, closedAt } = input;
  const prev = state.dayCloses[addDaysToKey(dayKey, -1)];
  const streakBefore = prev?.streakAfter ?? 0;
  const shieldsBefore = prev?.shieldsAfter ?? 0;
  const requested = input.shield !== undefined ? input.shield : state.shieldRequests?.[dayKey] ?? null;
  const shieldSource: ShieldSource | null =
    requested === 'PURCHASED' || (requested === 'EARNED' && shieldsBefore > 0) ? requested : null;
  const shieldUsed = shieldSource !== null;
  const raw: { source: EloSource; amount: number; reason: string; ref?: string; meta?: EloEvent['meta'] }[] = [];

  // Habits
  const { scheduled, completed } = input.habits;
  const goal = clampHabitGoal(input.habitGoalPct);
  const habitRatio = scheduled > 0 ? complianceRatio((100 * completed) / scheduled, goal) : null;
  if (habitRatio !== null) {
    raw.push({ source: 'HABITS', amount: complianceDelta(habitRatio), reason: 'HABITS_COMPLIANCE', meta: { r: round3(habitRatio), goal, completed, scheduled } });
  }

  // Tasks
  const taskRatio = input.tasks.planned > 0 ? input.tasks.completed / input.tasks.planned : null;
  if (taskRatio !== null) {
    raw.push({ source: 'TASKS', amount: complianceDelta(taskRatio), reason: 'TASKS_COMPLIANCE', meta: { r: round3(taskRatio), completed: input.tasks.completed, planned: input.tasks.planned } });
  }

  // Project focus goals
  for (const p of input.projects ?? []) {
    if (!(p.goalMinutes > 0)) continue;
    const minutes = p.timerMinutes + (ELO.PROJECT_GOAL_COUNTS_MANUAL ? p.manualMinutes ?? 0 : 0);
    if (minutes < p.goalMinutes) {
      raw.push({ source: 'PROJECT_GOAL', amount: ELO.PROJECT_GOAL_MISS_DELTA, reason: 'PROJECT_GOAL_MISSED', ref: p.id, meta: { minutes, goal: p.goalMinutes } });
    }
  }

  // The rank you wake up in sets how much a bad day can cost (Bronze −2 … Legend −9).
  const rankAtDawn = replay({ ...state, events: state.events.filter(e => e.dayKey < dayKey) }).rankIndex;
  const lossCap = dailyLossCap(rankAtDawn);

  // A day with something due and NOTHING done (no habit, no task, no focus) costs exactly the rank's cap.
  const focusToday = state.events.some(e => e.dayKey === dayKey && e.source === 'FOCUS')
    || (input.projects ?? []).some(p => p.timerMinutes > 0);
  const nothingDone = completed === 0 && input.tasks.completed === 0 && !focusToday;
  if (nothingDone) {
    const first = raw.find(r => r.source === 'HABITS' && r.amount < 0) ?? raw.find(r => r.source === 'TASKS' && r.amount < 0) ?? raw.find(r => r.source === 'PROJECT_GOAL' && r.amount < 0);
    if (first) { first.amount = -lossCap; first.meta = { ...first.meta, idle: true }; }
  }

  // Streak
  let streakAfter = streakBefore;
  let shieldsEarned = 0;
  if (!shieldUsed && habitRatio !== null) {
    if (habitRatio >= 1 - 1e-9) {
      streakAfter = streakBefore + 1;
      const milestone = ELO.STREAK.MILESTONES.find(m => m.days === streakAfter);
      if (milestone) raw.push({ source: 'STREAK_BONUS', amount: milestone.bonus, reason: 'STREAK_MILESTONE', meta: { days: milestone.days } });
      if (streakAfter % P.SHIELD_EVERY_STREAK_DAYS === 0) shieldsEarned = 1;
    } else {
      streakAfter = 0;
      if (streakBefore >= ELO.STREAK.BREAK_MIN_LENGTH) {
        raw.push({ source: 'STREAK_BREAK', amount: ELO.STREAK.BREAK_DELTA, reason: 'STREAK_BROKEN', meta: { days: streakBefore } });
      }
    }
  }
  const shieldsAfter = Math.min(P.SHIELD_MAX, shieldsBefore - (shieldSource === 'EARNED' ? 1 : 0) + shieldsEarned);

  // Shield day: no losses, no habit/task gains (focus is awarded elsewhere and still counts).
  const kept = shieldUsed ? [] : raw;

  // First-week boost on gains, then the daily loss cap (losses in listed order).
  let lossBudget = lossCap;
  const events: EloEvent[] = [];
  for (const r of kept) {
    let amount = boostGain(state, dayKey, r.amount);
    if (amount < 0) {
      const allowed = Math.min(-amount, lossBudget);
      lossBudget -= allowed;
      amount = -allowed;
    }
    if (amount === 0) continue;
    events.push({
      id: `close:${dayKey}:${r.source}${r.ref ? `:${r.ref}` : ''}`,
      dayKey,
      at: closedAt,
      source: r.source,
      amount,
      reason: r.reason,
      ...(r.ref ? { ref: r.ref } : {}),
      meta: { ...r.meta, raw: r.amount, ...(amount > 0 ? { multiplier: gainMultiplier(state, dayKey) } : {}) },
    });
  }

  const record: DayCloseRecord = {
    dayKey, closedAt, streakBefore, streakAfter, shieldsBefore, shieldsAfter, shieldUsed, shieldSource,
    habitRatio: habitRatio === null ? null : round3(habitRatio),
    taskRatio: taskRatio === null ? null : round3(taskRatio),
    eventIds: events.map(e => e.id),
  };
  return { record, events };
};

/**
 * Closes a day. Idempotent: closing an already-closed day changes nothing.
 * Days must be closed in order (use `pendingDays`) so streaks stay correct.
 */
export const closeDay = (state: ProgressionState, input: DayCloseInput): DayCloseResult => {
  const existing = state.dayCloses[input.dayKey];
  if (existing) return { status: 'ALREADY_CLOSED', state, record: existing, events: [] };

  const missing = pendingDays(state, input.dayKey)[0];
  if (missing && missing < input.dayKey) return { status: 'OUT_OF_ORDER', state, missing };

  const { record, events } = computeDayClose(state, input);
  const shieldRequests = { ...state.shieldRequests };
  delete shieldRequests[input.dayKey];
  const next = withEvents({ ...state, shieldRequests, dayCloses: { ...state.dayCloses, [input.dayKey]: record } }, events);
  return { status: 'CLOSED', state: next, record, events };
};

export interface DayProjection {
  /** ELO already earned today (focus). */
  earnedSoFar: number;
  /** What the close would add if the day ended now. */
  projectedClose: number;
  projectedTotal: number;
  events: EloEvent[];
}

/** "Projected ELO of the day" given how habits/tasks/projects are going right now. */
export const projectDay = (state: ProgressionState, input: DayCloseInput): DayProjection => {
  const earnedSoFar = state.events
    .filter(e => e.dayKey === input.dayKey && e.source === 'FOCUS')
    .reduce((s, e) => s + e.amount, 0);
  const { events } = computeDayClose(state, input);
  const projectedClose = events.reduce((s, e) => s + e.amount, 0);
  return { earnedSoFar, projectedClose, projectedTotal: earnedSoFar + projectedClose, events };
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// ── Shields ─────────────────────────────────────────────────────────────────

/** Earned shields still free to use (last close balance minus pending EARNED requests). */
export const availableEarnedShields = (state: ProgressionState): number => {
  const pending = Object.values(state.shieldRequests ?? {}).filter(s => s === 'EARNED').length;
  return Math.max(0, (lastClose(state)?.shieldsAfter ?? 0) - pending);
};

export type ShieldRequestResult =
  | { ok: true; state: ProgressionState }
  | { ok: false; reason: 'DAY_CLOSED' | 'ALREADY_ACTIVE' | 'NO_SHIELDS' };

/** Marks a not-yet-closed day as a rest day. PURCHASED shields must be paid for by the caller. */
export const requestShield = (state: ProgressionState, dayKey: DayKey, source: ShieldSource): ShieldRequestResult => {
  if (state.dayCloses[dayKey]) return { ok: false, reason: 'DAY_CLOSED' };
  if (state.shieldRequests?.[dayKey]) return { ok: false, reason: 'ALREADY_ACTIVE' };
  if (source === 'EARNED' && availableEarnedShields(state) <= 0) return { ok: false, reason: 'NO_SHIELDS' };
  return { ok: true, state: { ...state, shieldRequests: { ...state.shieldRequests, [dayKey]: source } } };
};

// ── XP ──────────────────────────────────────────────────────────────────────

export interface XpGrant { id: string; dayKey: DayKey; at: number; source: XpSource; base: number; ref?: string }

/** Grants XP once per id (re-completing an item never farms XP). Weekly boost applies. */
export const awardXp = (state: ProgressionState, grant: XpGrant): { state: ProgressionState; event: XpEvent | null } => {
  if (grant.base <= 0 || state.xpEvents.some(e => e.id === grant.id)) return { state, event: null };
  const event: XpEvent = {
    id: grant.id, dayKey: grant.dayKey, at: grant.at, source: grant.source,
    amount: boostReward(grant.base, grant.dayKey),
    ...(grant.ref ? { ref: grant.ref } : {}),
  };
  return { state: { ...state, xpEvents: [...state.xpEvents, event] }, event };
};

export const totalXp = (state: ProgressionState): number =>
  state.xpEvents.reduce((s, e) => s + e.amount, 0);
