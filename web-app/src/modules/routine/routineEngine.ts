// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE ENGINE — turns habits, tasks, projects and journaling reminders into one
// chronological list for a day. Pure functions: no React, no storage, easy to test.
// ─────────────────────────────────────────────────────────────────────────────

import { isLastDayOfMonth } from 'date-fns';
import type { Habit, Project, Quest } from '../../types';
import { getHistoryDateKey, timeToMinutes, toLocalISOString } from '../../utils/dateUtils';
import { isHabitDoneOn, isProjectActive } from '../../utils/productivityScore';

export type RoutineKind = 'HABIT' | 'SUBHABIT' | 'TASK' | 'PROJECT' | 'JOURNAL';
export type DayPart = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type DayPartFilter = 'ALL' | DayPart;

export interface RoutineItem {
  id: string;
  kind: RoutineKind;
  title: string;
  subtitle?: string;
  /** "HH:mm", or null when the item has no time of day. */
  time: string | null;
  /** Minutes since midnight (null when untimed). */
  minutes: number | null;
  done: boolean;
  color: string;
  /** Task past its day, still pending (only listed when viewing today). */
  overdue?: boolean;
  habit?: Habit;
  subtaskId?: string;
  quest?: Quest;
  project?: Project;
  /** Habit with a quantity target: tapping opens the quantity sheet instead of toggling. */
  isQuantity?: boolean;
  /** 0..1 when the item has measurable progress (quantity habit, project goal). */
  progress?: number;
}

export interface RoutineConfig {
  showHabits: boolean;
  showTasks: boolean;
  /** Optional: projects that have a reminder time. */
  showProjects: boolean;
  showJournal: boolean;
  showCompleted: boolean;
  /** Items with no time of day, listed after the timed ones. */
  showUntimed: boolean;
  showOverdue: boolean;
  /** Without hour blocks, "Todo" can still draw Mañana / Tarde / Noche dividers (still chronological). */
  groupByPart: boolean;
  /** Divide the day into blocks of `hourBlock` hours (08:00 – 10:00 …). Off = no hour division. */
  divideByHour: boolean;
  /** Block length in hours when dividing by hour: 1–6. */
  hourBlock: number;
  /** Put each item's exact scheduled time inside its card. */
  exactTime: boolean;
  /** Show each item's time in a column on the left, beside the timeline. */
  timeLeft: boolean;
  /** 24h clock instead of AM/PM. */
  use24h: boolean;
}

export const DEFAULT_ROUTINE_CONFIG: RoutineConfig = {
  showHabits: true,
  showTasks: true,
  showProjects: false,
  showJournal: true,
  showCompleted: true,
  showUntimed: true,
  showOverdue: true,
  groupByPart: true,
  divideByHour: false,
  hourBlock: 2,
  exactTime: false,
  timeLeft: true,
  use24h: false,
};

const configKey = (uid?: string | null) => `routine_config_v1_${uid || 'anon'}`;

export const loadRoutineConfig = (uid?: string | null): RoutineConfig => {
  try {
    const raw = localStorage.getItem(configKey(uid));
    if (raw) {
      const merged = { ...DEFAULT_ROUTINE_CONFIG, ...JSON.parse(raw) } as RoutineConfig;
      merged.hourBlock = Math.min(6, Math.max(1, Math.round(Number(merged.hourBlock)) || DEFAULT_ROUTINE_CONFIG.hourBlock));
      return merged;
    }
  } catch { /* unreadable: defaults */ }
  return { ...DEFAULT_ROUTINE_CONFIG };
};

export const saveRoutineConfig = (uid: string | null | undefined, config: RoutineConfig) => {
  try {
    localStorage.setItem(configKey(uid), JSON.stringify(config));
  } catch { /* storage unavailable: change still applies for this session */ }
};

// ── Day parts ───────────────────────────────────────────────────────────────

/** Mañana < 12:00 · Tarde 12:00–18:59 · Noche ≥ 19:00. */
export const MORNING_END = 12 * 60;
export const AFTERNOON_END = 19 * 60;

export const dayPartOf = (minutes: number): DayPart =>
  minutes < MORNING_END ? 'MORNING' : minutes < AFTERNOON_END ? 'AFTERNOON' : 'NIGHT';

// ── Item builders ───────────────────────────────────────────────────────────

const KIND_RANK: Record<RoutineKind, number> = { HABIT: 0, SUBHABIT: 0, TASK: 1, PROJECT: 2, JOURNAL: 3 };

const makeItem = (partial: Omit<RoutineItem, 'minutes'>): RoutineItem => ({
  ...partial,
  time: timeToMinutes(partial.time) === null ? null : partial.time,
  minutes: timeToMinutes(partial.time),
});

/** Frequency rule shared with the habits view: is this habit expected on `date`? */
export const isHabitDueOn = (habit: Habit, date: Date): boolean => {
  const dow = date.getDay();
  const dom = date.getDate();
  if (habit.frequency === 'DAILY') return true;
  if (habit.frequency === 'WEEKLY') {
    return habit.weeklyType === 'FLEXIBLE_COUNT' || !habit.frequencyDays || habit.frequencyDays.length === 0 || habit.frequencyDays.includes(dow);
  }
  if (habit.frequency === 'MONTHLY') {
    if (habit.monthlyType === 'FLEXIBLE_COUNT') return true;
    if (habit.monthlyType === 'SPECIFIC_DATES' || !habit.monthlyType) {
      return !!(habit.frequencyDays && habit.frequencyDays.includes(dom)) || !!(habit.monthlyLastDay && isLastDayOfMonth(date));
    }
  }
  return false;
};

export interface BuildRoutineInput {
  date: Date;
  habits: Habit[];
  quests: Quest[];
  projects: Project[];
  journalTimes: string[];
  /** A journal entry already exists for `date`. */
  journalDone: boolean;
  config: RoutineConfig;
  colorForAttribute: (attributeId: string) => string;
  labels: { journal: string; journalSub: string; overdue: string; project: string };
}

export const buildRoutineItems = (input: BuildRoutineInput): RoutineItem[] => {
  const { date, habits, quests, projects, journalTimes, journalDone, config, colorForAttribute, labels } = input;
  const key = toLocalISOString(date);
  const isToday = key === toLocalISOString(new Date());
  const items: RoutineItem[] = [];

  // Habits ───────────────────────────────────────────────────────────────
  if (config.showHabits) {
    for (const habit of habits) {
      if (habit.archived || !isHabitDueOn(habit, date)) continue;
      const color = habit.customColor || habit.color || colorForAttribute(habit.attribute);
      const habitDone = isHabitDoneOn(habit, key);

      if (habit.type === 'CHECKLIST' && habit.checklist && habit.checklist.length > 0) {
        for (const sub of habit.checklist) {
          if (sub.deleted) continue;
          if (sub.days && sub.days.length > 0 && !sub.days.includes(date.getDay())) continue;
          const subDone = isToday ? !!sub.completed : (sub.history || []).some(d => getHistoryDateKey(d) === key);
          items.push(makeItem({
            id: `${habit.id}-sub-${sub.id}`,
            kind: 'SUBHABIT',
            title: sub.text,
            subtitle: habit.title,
            time: sub.reminderTime || habit.reminderTime || null,
            done: subDone,
            color: sub.color || color,
            habit,
            subtaskId: sub.id,
          }));
        }
      } else if (habit.type === 'QUANTITY' && habit.isDivided && habit.dividedMode === 'FIXED' && habit.dividedTimes && habit.dividedTimes.length > 0) {
        const slots = [...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time));
        let accumulated = 0;
        slots.forEach((slot, i) => {
          const slotDone = habitDone || (isToday && (habit.currentValue || 0) >= accumulated + slot.amount);
          items.push(makeItem({
            id: `${habit.id}-time-${i}`,
            kind: 'HABIT',
            title: habit.title,
            subtitle: `${slot.amount} ${habit.unit || ''}`.trim(),
            time: slot.time,
            done: slotDone,
            color,
            habit,
            isQuantity: true,
          }));
          accumulated += slot.amount;
        });
      } else {
        let time = habit.reminderTime || null;
        if (isToday && habit.type === 'QUANTITY' && habit.isDivided && habit.nextInstanceTime) {
          const next = new Date(habit.nextInstanceTime);
          if (!isNaN(next.getTime()) && toLocalISOString(next) === key) {
            time = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
          }
        }
        const isQuantity = habit.type === 'QUANTITY';
        items.push(makeItem({
          id: habit.id,
          kind: 'HABIT',
          title: habit.title,
          subtitle: isQuantity ? `${isToday ? (habit.currentValue || 0) : (habitDone ? habit.targetValue || 0 : 0)} / ${habit.targetValue || 0} ${habit.unit || ''}`.trim() : undefined,
          time,
          done: habitDone,
          color,
          habit,
          isQuantity,
          progress: isQuantity && habit.targetValue
            ? Math.max(0, Math.min(1, (habitDone && !isToday ? habit.targetValue : (isToday ? habit.currentValue || 0 : 0)) / habit.targetValue))
            : undefined,
        }));
      }
    }
  }

  // Tasks ────────────────────────────────────────────────────────────────
  if (config.showTasks) {
    for (const quest of quests) {
      if ((quest as any).deleted || !quest.deadline) continue;
      const dueKey = getHistoryDateKey(quest.deadline);
      const sameDay = dueKey === key;
      const overdue = isToday && !quest.completed && dueKey < key;
      if (!sameDay && !overdue) continue;
      if (overdue && !config.showOverdue) continue;
      items.push(makeItem({
        id: `task-${quest.id}`,
        kind: 'TASK',
        title: quest.title,
        subtitle: overdue ? labels.overdue : undefined,
        time: sameDay ? (quest.deadlineTime || null) : null,
        done: !!quest.completed,
        color: quest.color || colorForAttribute(quest.attribute),
        overdue,
        quest,
      }));
    }
  }

  // Projects (only those with a reminder time) ─────────────────────────
  if (config.showProjects) {
    for (const project of projects) {
      if (project.completed || !project.reminder || !isProjectActive(project, date)) continue;
      const reminderDays = (project as any).reminderDays as number[] | undefined;
      if (reminderDays && reminderDays.length > 0 && !reminderDays.includes(date.getDay())) continue;
      const seconds = (project.sessions || [])
        .filter(s => s.date && getHistoryDateKey(s.date) === key)
        .reduce((a, s) => a + (s.duration || 0), 0);
      const minutes = Math.round(seconds / 60);
      const target = project.dailyFocusGoalMinutes || 0;
      items.push(makeItem({
        id: `project-${project.id}`,
        kind: 'PROJECT',
        title: project.title,
        subtitle: target > 0 ? `${minutes}/${target} min` : (minutes > 0 ? `${minutes} min` : labels.project),
        time: project.reminder,
        done: minutes >= Math.max(1, target),
        color: project.color || '#8b5cf6',
        project,
        progress: target > 0 ? Math.max(0, Math.min(1, minutes / target)) : undefined,
      }));
    }
  }

  // Journaling reminders ─────────────────────────────────────────────────
  if (config.showJournal) {
    journalTimes.forEach((time, i) => {
      items.push(makeItem({
        id: `journal-${i}`,
        kind: 'JOURNAL',
        title: labels.journal,
        subtitle: labels.journalSub,
        time,
        done: journalDone,
        color: '#818cf8',
      }));
    });
  }

  return sortRoutineItems(items.filter(it => (config.showCompleted || !it.done) && (config.showUntimed || it.minutes !== null || it.overdue)));
};

/** Chronological: timed items by clock time, then untimed; ties by kind, then title. */
export const sortRoutineItems = (items: RoutineItem[]): RoutineItem[] =>
  [...items].sort((a, b) => {
    // Overdue tasks lead the day: they are the oldest commitments.
    if (!!a.overdue !== !!b.overdue) return a.overdue ? -1 : 1;
    const am = a.minutes ?? Number.POSITIVE_INFINITY;
    const bm = b.minutes ?? Number.POSITIVE_INFINITY;
    if (am !== bm) return am < bm ? -1 : 1;
    if (KIND_RANK[a.kind] !== KIND_RANK[b.kind]) return KIND_RANK[a.kind] - KIND_RANK[b.kind];
    return a.title.localeCompare(b.title);
  });

export type SectionKind = 'OVERDUE' | 'PART' | 'HOUR' | 'ANYTIME' | 'ALL';

export interface RoutineSection {
  /** Stable key for React and animations. */
  id: string;
  kind: SectionKind;
  /** Set for PART sections (and the day part an HOUR block starts in, for its icon). */
  part?: DayPart;
  /** First hour (0–23) of an HOUR block, and the hour it ends at (up to 24). */
  startHour?: number;
  endHour?: number;
  items: RoutineItem[];
}

const HOURS_IN_DAY = 24;

/** Block that contains `minutes` when the day is cut every `block` hours from midnight. */
export const hourBlockOf = (minutes: number, block: number): { startHour: number; endHour: number } => {
  const size = Math.min(6, Math.max(1, Math.round(block)));
  const startHour = Math.floor(minutes / 60 / size) * size;
  return { startHour, endHour: Math.min(HOURS_IN_DAY, startHour + size) };
};

/** "8 AM – 10 AM" / "08:00 – 10:00" (24:00 is shown as 00:00). */
export const formatHourRange = (startHour: number, endHour: number, use24h: boolean): string => {
  const f = (h: number) => {
    const hh = h % HOURS_IN_DAY;
    if (use24h) return `${String(hh).padStart(2, '0')}:00`;
    return `${hh % 12 || 12} ${hh >= 12 ? 'PM' : 'AM'}`;
  };
  return endHour - startHour === 1 ? f(startHour) : `${f(startHour)} – ${f(endHour)}`;
};

/**
 * Splits an already-sorted list into sections, always keeping chronological order:
 *  - overdue tasks first, untimed items last;
 *  - between them either hour blocks (divideByHour), Mañana/Tarde/Noche (groupByPart) or one flat run.
 */
export const sectionize = (items: RoutineItem[], config: Pick<RoutineConfig, 'divideByHour' | 'hourBlock' | 'groupByPart'>): RoutineSection[] => {
  const overdue = items.filter(i => i.overdue);
  const timed = items.filter(i => !i.overdue && i.minutes !== null);
  const anytime = items.filter(i => !i.overdue && i.minutes === null);

  const out: RoutineSection[] = [];
  if (overdue.length) out.push({ id: 'overdue', kind: 'OVERDUE', items: overdue });

  if (config.divideByHour) {
    const byBlock = new Map<number, RoutineSection>();
    for (const it of timed) {
      const { startHour, endHour } = hourBlockOf(it.minutes!, config.hourBlock);
      let sec = byBlock.get(startHour);
      if (!sec) {
        sec = { id: `hour-${startHour}-${endHour}`, kind: 'HOUR', part: dayPartOf(startHour * 60), startHour, endHour, items: [] };
        byBlock.set(startHour, sec);
        out.push(sec);
      }
      sec.items.push(it);
    }
  } else if (config.groupByPart) {
    const parts: DayPart[] = ['MORNING', 'AFTERNOON', 'NIGHT'];
    for (const part of parts) {
      const inPart = timed.filter(i => dayPartOf(i.minutes!) === part);
      if (inPart.length) out.push({ id: `part-${part}`, kind: 'PART', part, items: inPart });
    }
  } else if (timed.length) {
    out.push({ id: 'all', kind: 'ALL', items: timed });
  }

  if (anytime.length) out.push({ id: 'anytime', kind: 'ANYTIME', items: anytime });
  return out;
};

export const countByPart = (items: RoutineItem[]): Record<DayPartFilter, number> => {
  const out: Record<DayPartFilter, number> = { ALL: items.length, MORNING: 0, AFTERNOON: 0, NIGHT: 0 };
  for (const it of items) if (it.minutes !== null) out[dayPartOf(it.minutes)] += 1;
  return out;
};
