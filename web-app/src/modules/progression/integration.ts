// Adapters from the app's data (habits, quests, projects) to the pure engine
// and report inputs. Kept free of React so they can be tested and reused.

import type { Habit, Project, Quest, Session } from '@/types';
import { getHistoryDateKey, parseLocalDate } from '@/utils/dateUtils';
import { isHabitScheduledOn, todayTaskCounts } from '@/utils/streakRules';
import {
  addDaysToKey, daysBetween, dayTotal, getStanding, type DayCloseInput, type DayKey, type ProgressionState,
} from './engine';
import { emptyMemory, type CompletionKind, type FocusRecord, type ReportInput } from './report';
import type { CompletionLog, ProgressionMeta } from './progressionStore';

const keyToDate = (key: DayKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

const historyKeys = (h: Habit) => new Set((h.history || []).map(d => getHistoryDateKey(d)));

const isFlexible = (h: Habit) =>
  (h.frequency === 'WEEKLY' && h.weeklyType === 'FLEXIBLE_COUNT') || (h.frequency === 'MONTHLY' && h.monthlyType === 'FLEXIBLE_COUNT');

const existedOn = (createdAt: unknown, key: DayKey) => {
  if (!createdAt) return true;
  const d = parseLocalDate(createdAt as string | number);
  return Number.isNaN(d.getTime()) || getHistoryDateKey(d) <= key;
};

export const isManualSession = (s: Session) => !!s.isManual || s.type === 'MANUAL';
export const sessionKey = (s: Session) => getHistoryDateKey(s.date);
export const sessionMinutes = (s: Session) => (s.duration || 0) / 60;

/** Habits due on a day (flexible "N per week" habits only count when done) and how many were done. */
export const habitsForDay = (habits: Habit[], key: DayKey) => {
  const date = keyToDate(key);
  let scheduled = 0;
  let completed = 0;
  for (const h of habits) {
    if (h.archived || !existedOn(h.createdAt, key)) continue;
    const done = historyKeys(h).has(key);
    if (isFlexible(h) ? !done : !isHabitScheduledOn(h, date)) continue;
    scheduled++;
    if (done) completed++;
  }
  return { scheduled, completed };
};

/** Tasks planned for a day = tasks whose deadline is that day. */
export const tasksForDay = (quests: Quest[], key: DayKey) => {
  let planned = 0;
  let completed = 0;
  for (const q of quests as (Quest & { deleted?: boolean })[]) {
    if (q.deleted || !q.deadline || getHistoryDateKey(q.deadline) !== key) continue;
    planned++;
    if (q.completed && (!q.completedAt || getHistoryDateKey(q.completedAt) <= key)) completed++;
  }
  return { planned, completed };
};

export const focusMinutesOn = (projects: Project[], key: DayKey, opts: { manual?: boolean; projectId?: string } = {}) =>
  projects
    .filter(p => !opts.projectId || p.id === opts.projectId)
    .flatMap(p => p.sessions || [])
    .filter(s => sessionKey(s) === key && (opts.manual === undefined || isManualSession(s) === opts.manual))
    .reduce((sum, s) => sum + sessionMinutes(s), 0);

// Same rule as the habit streak roadmap (StreakRoadmapView): the daily goal
// grows with the streak — 40 % on days 1-6 up to 85 % from day 80.
export const habitTargetPct = (streakDay: number) =>
  streakDay <= 6 ? 40 : streakDay <= 13 ? 50 : streakDay <= 29 ? 60 : streakDay <= 49 ? 72 : streakDay <= 79 ? 80 : 85;

/** The habits' own goal % for a day, from the roadmap streak reached before it. */
export const habitGoalPctFor = (habits: Habit[], key: DayKey) => {
  const active = habits.filter(h => !h.archived);
  const done = new Map<string, number>();
  active.forEach(h => (h.history || []).forEach(d => {
    const k = getHistoryDateKey(d);
    done.set(k, (done.get(k) || 0) + 1);
  }));
  let streak = 0;
  for (let i = 365; i >= 1; i--) {
    const k = addDaysToKey(key, -i);
    const wd = keyToDate(k).getDay();
    const due = active.filter(h => h.frequency === 'DAILY' || (h.frequency === 'WEEKLY' && (!h.frequencyDays?.length || h.frequencyDays.includes(wd)))).length;
    if (!due) continue;
    streak = Math.round((100 * (done.get(k) || 0)) / due) >= habitTargetPct(streak + 1) ? streak + 1 : 0;
  }
  return habitTargetPct(streak + 1);
};

const activeProjects = (projects: Project[]) => projects.filter(p => !p.archived && !p.deleted && !p.completed);

export const buildDayCloseInput = (
  key: DayKey,
  data: { habits: Habit[]; quests: Quest[]; projects: Project[]; meta: ProgressionMeta },
): DayCloseInput => {
  const weekday = keyToDate(key).getDay();
  return {
    dayKey: key,
    habits: habitsForDay(data.habits, key),
    habitGoalPct: habitGoalPctFor(data.habits, key),
    tasks: tasksForDay(data.quests, key),
    projects: activeProjects(data.projects)
      .filter(p => (p.dailyFocusGoalMinutes ?? 0) > 0 && existedOn(p.createdAt, key) && (!p.workingDays?.length || p.workingDays.includes(weekday)))
      .map(p => ({
        id: p.id,
        goalMinutes: p.dailyFocusGoalMinutes as number,
        timerMinutes: focusMinutesOn([p], key, { manual: false }),
        manualMinutes: focusMinutesOn([p], key, { manual: true }),
      })),
    closedAt: Date.now(),
  };
};

// ── Report input ────────────────────────────────────────────────────────────

export interface CompletionEvent {
  kind: CompletionKind;
  itemId: string;
  itemName: string;
  at: number;
  dayKey: DayKey;
  /** Focus */
  session?: Session;
  project?: Project;
  plannedMinutes?: number | null;
  pauses?: number;
  /** Task / subtask */
  quest?: Quest;
  habit?: Habit;
}

const rateOver = (h: Habit, todayKey: DayKey, days: number) => {
  const done = historyKeys(h);
  let due = 0;
  let hit = 0;
  for (let i = 0; i < days; i++) {
    const k = addDaysToKey(todayKey, -i);
    if (!existedOn(h.createdAt, k)) break;
    const sched = isFlexible(h) ? done.has(k) : isHabitScheduledOn(h, keyToDate(k));
    if (!sched) continue;
    due++;
    if (done.has(k)) hit++;
  }
  return due ? hit / due : 0;
};

export const buildReportInput = (
  ev: CompletionEvent,
  ctx: {
    habits: Habit[];
    quests: Quest[];
    projects: Project[];
    engine: ProgressionState;
    meta: ProgressionMeta;
    logs: CompletionLog[];
    eloInstant: number;
    projectedDay: number;
    elo: number;
    rankIndex: number;
    xp: number;
    userName?: string | null;
  },
): ReportInput => {
  const { dayKey } = ev;
  const logById = new Map(ctx.logs.map(l => [l.itemId, l]));

  const allSessions: FocusRecord[] = ctx.projects.flatMap(p => (p.sessions || [])
    .filter(s => s.id !== ev.session?.id)
    .map(s => {
      const log = logById.get(s.id);
      return {
        id: s.id,
        projectId: p.id,
        endedAt: parseLocalDate(s.date).getTime(),
        minutes: sessionMinutes(s),
        plannedMinutes: log?.plannedMinutes ?? null,
        pauses: log?.pauses ?? null,
        rating: log?.rating ?? null,
        manual: isManualSession(s),
      };
    }));

  const dailyFocusMinutes = Array.from({ length: 14 }, (_, i) => {
    const k = addDaysToKey(dayKey, i - 13);
    return { dayKey: k, minutes: focusMinutesOn(ctx.projects, k) };
  });

  const habitGoalDays = Object.values(ctx.engine.dayCloses)
    .filter(c => c.habitRatio !== null)
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    .map(c => ({ dayKey: c.dayKey, ratio: c.habitRatio as number }));

  const goal = ev.project?.dailyFocusGoalMinutes ?? null;
  const projectGoalDays = goal && ev.project
    ? Array.from({ length: 5 }, (_, i) => {
      const k = addDaysToKey(dayKey, i - 4);
      return { dayKey: k, met: focusMinutesOn([ev.project as Project], k) >= goal };
    })
    : [];

  const dailyElo = Array.from({ length: 7 }, (_, i) => addDaysToKey(dayKey, i - 7))
    .filter(k => daysBetween(ctx.engine.startDayKey ?? ctx.engine.registeredDayKey, k) >= 0)
    .map(k => dayTotal(ctx.engine, k));

  const input: ReportInput = {
    kind: ev.kind,
    itemId: ev.itemId,
    itemName: ev.itemName,
    at: ev.at,
    dayKey,
    userName: ctx.userName,
    priorRecords: 0,
    history: {
      focus: allSessions,
      ratings: ctx.logs.filter(l => l.rating).map(l => ({ at: l.at, rating: l.rating as number, kind: l.kind })),
      notes: ctx.logs.filter(l => l.note).map(l => ({
        at: l.at, note: l.note as string, kind: l.kind, itemId: l.itemId, projectId: l.projectId ?? null, minutes: l.minutes ?? null, pauses: l.pauses ?? null,
      })),
      dailyFocusMinutes,
      habitGoalDays,
      projectGoalDays,
      dailyElo,
    },
    elo: { instant: ctx.eloInstant, projectedDay: ctx.projectedDay, standing: getStanding(ctx.elo, ctx.rankIndex) },
    xp: ctx.xp,
    memory: ctx.meta.memory ?? emptyMemory(),
  };

  if (ev.kind === 'FOCUS' && ev.session) {
    const projectId = ev.project?.id ?? null;
    input.priorRecords = allSessions.filter(s => s.projectId === projectId).length;
    input.focus = {
      sessionId: ev.session.id,
      projectId,
      projectName: ev.project?.title ?? null,
      minutes: sessionMinutes(ev.session),
      plannedMinutes: ev.plannedMinutes ?? null,
      pauses: ev.pauses ?? 0,
      projectGoalMinutes: goal,
      projectMinutesToday: ev.project ? focusMinutesOn([ev.project], getHistoryDateKey(ev.session.date)) + (ev.project.sessions?.some(s => s.id === ev.session?.id) ? 0 : sessionMinutes(ev.session)) : sessionMinutes(ev.session),
    };
  }

  if (ev.kind === 'HABIT' && ev.habit) {
    const today = habitsForDay(ctx.habits, getHistoryDateKey(new Date(ev.at)));
    input.priorRecords = Math.max(0, (ev.habit.history?.length ?? 1) - 1);
    input.habit = {
      streak: ev.habit.streak || 0,
      rate7: rateOver(ev.habit, getHistoryDateKey(new Date(ev.at)), 7),
      rate30: rateOver(ev.habit, getHistoryDateKey(new Date(ev.at)), 30),
      doneToday: today.completed,
      scheduledToday: today.scheduled,
      goalPct: habitGoalPctFor(ctx.habits, getHistoryDateKey(new Date(ev.at))),
    };
  }

  if ((ev.kind === 'TASK' || ev.kind === 'SUBTASK') && ev.quest) {
    input.priorRecords = ctx.logs.filter(l => l.kind === ev.kind).length;
    if (ev.kind === 'TASK') {
      const counts = todayTaskCounts(ctx.quests, new Date(ev.at));
      const project = ctx.projects.find(p => p.id === ev.quest?.projectId);
      const actual = ev.quest.pomodoroCompleted ? ev.quest.pomodoroCompleted * (project?.pomoDuration || 25) : null;
      input.task = { doneToday: counts.done, totalToday: counts.total, actualMinutes: actual, estimatedMinutes: ev.quest.estimatedTime || null };
    } else {
      const subs = ev.quest.subtasks || [];
      input.task = { doneToday: subs.filter(s => s.isCompleted).length, totalToday: subs.length, actualMinutes: null, estimatedMinutes: null, parentName: ev.quest.title };
    }
  }

  return input;
};
