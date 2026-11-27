// ─────────────────────────────────────────────────────────────────────────────
// ELO COACH — a personalised "how do I earn ELO today" plan, built from the
// user's real habits, tasks and projects of the day. Every number comes from
// the same engine that closes the day (scenarios run through `projectDay`),
// so what the coach promises is exactly what the day close will award.
// ─────────────────────────────────────────────────────────────────────────────

import type { Habit, Project, Quest } from '@/types';
import { getHistoryDateKey, parseLocalDate } from '@/utils/dateUtils';
import { isHabitScheduledOn } from '@/utils/streakRules';
import { PROGRESSION_CONFIG, gainMultiplier, isFirstWeek, projectDay, weeklyBoostFor, type DayCloseInput, type DayKey, type EloEvent, type ProgressionState } from './engine';
import { buildDayCloseInput, focusMinutesOn } from './integration';
import type { ProgressionMeta } from './progressionStore';

const ELO = PROGRESSION_CONFIG.ELO;

const keyToDate = (key: DayKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

const isFlexible = (h: Habit) =>
  (h.frequency === 'WEEKLY' && h.weeklyType === 'FLEXIBLE_COUNT') || (h.frequency === 'MONTHLY' && h.monthlyType === 'FLEXIBLE_COUNT');

const existedOn = (createdAt: unknown, key: DayKey) => {
  if (!createdAt) return true;
  const d = parseLocalDate(createdAt as string | number);
  return Number.isNaN(d.getTime()) || getHistoryDateKey(d) <= key;
};

const sumBy = (events: EloEvent[], source: EloEvent['source']) => events.filter(e => e.source === source).reduce((s, e) => s + e.amount, 0);

export interface CoachStep {
  /** How many more items must be completed to reach this step. */
  more: number;
  /** Category ELO once reached (after boosts / loss cap). */
  amount: number;
}

export interface CoachHabits {
  scheduled: number;
  completed: number;
  goalPct: number;
  /** Count needed to meet the goal (+5). */
  needForGoal: number;
  now: number;
  steps: CoachStep[];
  pending: string[];
  flexibleOpen: number;
}

export interface CoachTasks {
  planned: number;
  completed: number;
  now: number;
  steps: CoachStep[];
  pending: string[];
}

export interface CoachProject {
  id: string;
  title: string;
  color?: string;
  goal: number;
  done: number;
  manual: number;
  missing: number;
}

export interface EloCoach {
  dayKey: DayKey;
  /** ELO the day would give if it ended right now. */
  now: number;
  /** ELO if every habit, task and project goal of today were completed (focus hours not included). */
  best: number;
  habits: CoachHabits | null;
  tasks: CoachTasks | null;
  focus: { minutes: number; earned: number; cap: number; nextIn: number | null; perPoint: number };
  projects: CoachProject[];
  projectsNow: number;
  streak: { current: number; ifMet: number; bonusToday: number; next: { days: number; bonus: number; inDays: number } | null; atRisk: number };
  multiplier: number;
  sunday: boolean;
  firstWeek: boolean;
  shieldToday: boolean;
  lossCap: number;
}

/** Steps of a compliance category: the counts at which the category ELO goes up. */
const stepsFor = (
  state: ProgressionState,
  base: DayCloseInput,
  source: 'HABITS' | 'TASKS',
  total: number,
  done: number,
): { now: number; steps: CoachStep[] } => {
  const at = (k: number) => {
    const input: DayCloseInput = source === 'HABITS'
      ? { ...base, habits: { scheduled: total, completed: k } }
      : { ...base, tasks: { planned: total, completed: k } };
    return sumBy(projectDay(state, input).events, source);
  };
  const now = at(done);
  const steps: CoachStep[] = [];
  let last = now;
  for (let k = done + 1; k <= total; k++) {
    const v = at(k);
    if (v > last) { steps.push({ more: k - done, amount: v }); last = v; }
  }
  return { now, steps };
};

export const buildEloCoach = (
  state: ProgressionState,
  data: { habits: Habit[]; quests: Quest[]; projects: Project[]; meta: ProgressionMeta; streak: number; shieldToday: boolean },
  dayKey: DayKey,
): EloCoach => {
  const base = buildDayCloseInput(dayKey, { habits: data.habits, quests: data.quests, projects: data.projects, meta: data.meta });
  const current = projectDay(state, base);
  const date = keyToDate(dayKey);

  // ── Habits ──
  let habits: CoachHabits | null = null;
  if (base.habits.scheduled > 0) {
    const goalPct = base.habitGoalPct ?? ELO.HABIT_GOAL_DEFAULT_PCT;
    const { now, steps } = stepsFor(state, base, 'HABITS', base.habits.scheduled, base.habits.completed);
    const pending: string[] = [];
    let flexibleOpen = 0;
    for (const h of data.habits) {
      if (h.archived || !existedOn(h.createdAt, dayKey)) continue;
      const done = (h.history || []).some(d => getHistoryDateKey(d) === dayKey);
      if (done) continue;
      if (isFlexible(h)) { flexibleOpen++; continue; }
      if (isHabitScheduledOn(h, date)) pending.push(h.title);
    }
    habits = {
      scheduled: base.habits.scheduled, completed: base.habits.completed, goalPct,
      needForGoal: Math.max(0, Math.ceil((goalPct * base.habits.scheduled) / 100 - 1e-9) - base.habits.completed),
      now, steps, pending, flexibleOpen,
    };
  }

  // ── Tasks ──
  let tasks: CoachTasks | null = null;
  if (base.tasks.planned > 0) {
    const { now, steps } = stepsFor(state, base, 'TASKS', base.tasks.planned, base.tasks.completed);
    const pending = (data.quests as (Quest & { deleted?: boolean })[])
      .filter(q => !q.deleted && !q.completed && q.deadline && getHistoryDateKey(q.deadline) === dayKey)
      .map(q => q.title);
    tasks = { planned: base.tasks.planned, completed: base.tasks.completed, now, steps, pending };
  }

  // ── Focus ──
  const focusMin = focusMinutesOn(data.projects, dayKey, { manual: false });
  const earned = current.earnedSoFar;
  const perPoint = ELO.FOCUS.MINUTES_PER_POINT;
  const hours = Math.floor(focusMin / perPoint);
  const nextIn = hours >= ELO.FOCUS.DAILY_CAP ? null : Math.max(1, Math.ceil((hours + 1) * perPoint - focusMin));

  // ── Projects ──
  const projects: CoachProject[] = (base.projects ?? []).map(p => {
    const proj = data.projects.find(x => x.id === p.id);
    return {
      id: p.id,
      title: proj?.title ?? '',
      color: proj?.color,
      goal: p.goalMinutes,
      done: Math.floor(p.timerMinutes),
      manual: Math.floor(p.manualMinutes ?? 0),
      missing: Math.max(0, Math.ceil(p.goalMinutes - p.timerMinutes)),
    };
  });

  // ── Best case: everything of today done ──
  const bestInput: DayCloseInput = {
    ...base,
    habits: { scheduled: base.habits.scheduled, completed: base.habits.scheduled },
    tasks: { planned: base.tasks.planned, completed: base.tasks.planned },
    projects: (base.projects ?? []).map(p => ({ ...p, timerMinutes: Math.max(p.timerMinutes, p.goalMinutes) })),
  };
  const best = projectDay(state, bestInput);

  // ── Streak ──
  const milestones = ELO.STREAK.MILESTONES;
  const ifMet = data.streak + 1;
  const bonusToday = milestones.find(m => m.days === ifMet)?.bonus ?? 0;
  const nextM = milestones.find(m => m.days > ifMet) ?? null;

  return {
    dayKey,
    now: current.projectedTotal,
    best: best.projectedTotal,
    habits,
    tasks,
    focus: { minutes: Math.floor(focusMin), earned, cap: ELO.FOCUS.DAILY_CAP, nextIn, perPoint },
    projects,
    projectsNow: sumBy(current.events, 'PROJECT_GOAL'),
    streak: {
      current: data.streak,
      ifMet,
      bonusToday,
      next: nextM ? { days: nextM.days, bonus: nextM.bonus, inDays: nextM.days - data.streak } : null,
      atRisk: data.streak >= ELO.STREAK.BREAK_MIN_LENGTH ? ELO.STREAK.BREAK_DELTA : 0,
    },
    multiplier: gainMultiplier(state, dayKey),
    sunday: weeklyBoostFor(dayKey) > 1,
    firstWeek: isFirstWeek(state, dayKey),
    shieldToday: data.shieldToday,
    lossCap: ELO.PROTECTION.DAILY_LOSS_CAP,
  };
};
