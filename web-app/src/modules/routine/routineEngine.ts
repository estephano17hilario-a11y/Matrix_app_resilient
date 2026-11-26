// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE ENGINE (Kotlin twin: android/.../widget/RoutineEngine.kt) — turns habits, tasks, projects and journaling reminders into one
// chronological list for a day. Pure functions: no React, no storage, easy to test.
// ─────────────────────────────────────────────────────────────────────────────

import { isLastDayOfMonth } from 'date-fns';
import type { Habit, Project, Quest } from '../../types';
import { getHistoryDateKey, timeToMinutes, toLocalISOString } from '../../utils/dateUtils';
import { isFreshOn, isHabitDoneOn, isProjectActive } from '../../utils/productivityScore';
import { reminderOccursOn, type JournalReminderItem } from './reminderItems';

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
  /** Length of its block in the calendar, in minutes (override > the item's own setting > a default by kind). */
  durationMin: number;
  /** The hour it has when no day override applies ("HH:mm" or null). */
  baseTime?: string | null;
  /** Moved to another hour for this day only. */
  overridden?: boolean;
  /** Fixed-time divided habit: id of the slot this item stands for. */
  slotId?: string;
  /** The colour the user assigned (custom colour / task colour / project colour), '' when none. */
  colorOwn: string;
  /** The colour of the trait it trains, '' when none. */
  colorTrait: string;
  /** 0 = not rated, 1..4 = how important (habit / project impact, task difficulty C B A S). */
  importance: number;
  /** A reminder pinned on the Journal calendar (kind JOURNAL). */
  reminderId?: string;
}

/** How the calendar paints its blocks. */
export type CalendarColorMode = 'OWN' | 'TRAIT' | 'IMPORTANCE';
export const IMPORTANCE_COLORS = ['#30d158', '#0a84ff', '#ff9f0a', '#ff453a'];
export const IMPORTANCE_LABELS = { es: ['Leve', 'Normal', 'Alta', 'Crítica'], en: ['Low', 'Normal', 'High', 'Critical'] };

export const colorForMode = (item: Pick<RoutineItem, 'color' | 'colorOwn' | 'colorTrait' | 'importance'>, mode: CalendarColorMode): string => {
  if (mode === 'IMPORTANCE' && item.importance >= 1) return IMPORTANCE_COLORS[Math.min(4, item.importance) - 1];
  if (mode === 'TRAIT') return item.colorTrait || item.colorOwn || item.color;
  if (mode === 'OWN') return item.colorOwn || item.colorTrait || item.color;
  return item.color;
};

const DIFFICULTY_IMPORTANCE: Record<string, number> = { C: 1, B: 2, A: 3, S: 4 };
const clampImportance = (n: unknown) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.min(4, Math.max(1, v)) : 1; };

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
  /** Habits show their own icon (like the habits chronological view); tasks keep the task icon in their trait colour. */
  habitIcons: boolean;
  /** 24h clock instead of AM/PM. */
  use24h: boolean;
  /** Calendar block colours: the colour assigned, the trait colour, or how important the item is. */
  calendarColor: CalendarColorMode;
  /** Routine screen layout: the chronological list or the calendar grid. */
  view: 'LIST' | 'CALENDAR';
  /** Days the calendar shows at once: 1 (day), 3 or 7 (week). */
  calendarSpan: 1 | 3 | 7;
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
  habitIcons: true,
  use24h: false,
  calendarColor: 'OWN',
  view: 'LIST',
  calendarSpan: 1,
};

const configKey = (uid?: string | null) => `routine_config_v1_${uid || 'anon'}`;

export const loadRoutineConfig = (uid?: string | null): RoutineConfig => {
  try {
    const raw = localStorage.getItem(configKey(uid));
    if (raw) {
      const merged = { ...DEFAULT_ROUTINE_CONFIG, ...JSON.parse(raw) } as RoutineConfig;
      merged.hourBlock = Math.min(6, Math.max(1, Math.round(Number(merged.hourBlock)) || DEFAULT_ROUTINE_CONFIG.hourBlock));
      if (merged.view !== 'CALENDAR') merged.view = 'LIST';
      if (![1, 3, 7].includes(Number(merged.calendarSpan))) merged.calendarSpan = 1;
      if (!['OWN', 'TRAIT', 'IMPORTANCE'].includes(merged.calendarColor)) merged.calendarColor = 'OWN';
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

/** Calendar block length when nothing says otherwise. */
export const DEFAULT_DURATION: Record<RoutineKind, number> = { HABIT: 30, SUBHABIT: 15, TASK: 30, PROJECT: 45, JOURNAL: 20 };
export const MIN_DURATION = 5;
export const MAX_DURATION = 12 * 60;
export const clampDuration = (n: number) => Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(n)));

type ItemInput = Omit<RoutineItem, 'minutes' | 'durationMin' | 'colorOwn' | 'colorTrait' | 'importance'> &
  Partial<Pick<RoutineItem, 'colorOwn' | 'colorTrait' | 'importance'>> & { durationMin?: number };

const makeItem = (partial: ItemInput): RoutineItem => ({
  ...partial,
  colorOwn: partial.colorOwn ?? partial.color,
  colorTrait: partial.colorTrait ?? partial.color,
  importance: partial.importance ?? 0,
  time: timeToMinutes(partial.time) === null ? null : partial.time,
  minutes: timeToMinutes(partial.time),
  durationMin: clampDuration(partial.durationMin ?? DEFAULT_DURATION[partial.kind]),
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
  /** Reminders pinned on the Journal calendar. */
  reminderItems?: JournalReminderItem[];
  /** A journal entry already exists for `date`. */
  journalDone: boolean;
  config: RoutineConfig;
  /** Colour of a trait, or '' when unknown. */
  colorForAttribute: (attributeId: string) => string;
  labels: { journal: string; journalSub: string; overdue: string; project: string; reminder?: string };
}

export const buildRoutineItems = (input: BuildRoutineInput): RoutineItem[] => {
  const { date, habits, quests, projects, journalTimes, journalDone, config, colorForAttribute, labels, reminderItems = [] } = input;
  const key = toLocalISOString(date);
  const isToday = key === toLocalISOString(new Date());
  const items: RoutineItem[] = [];

  // Habits ───────────────────────────────────────────────────────────────
  if (config.showHabits) {
    for (const habit of habits) {
      if (habit.archived || !isHabitDueOn(habit, date)) continue;
      const color = habit.customColor || colorForAttribute(habit.attribute) || habit.color || '#6366f1';
      const colorOwn = habit.customColor || habit.color || '';
      const colorTrait = colorForAttribute(habit.attribute);
      const importance = clampImportance(habit.impact);
      const habitDone = isHabitDoneOn(habit, key);
      // Today's live progress (quantity, ticked sub-habits) is only real if it was recorded today:
      // until the daily reset runs it still describes the previous day.
      const live = isToday && isFreshOn(habit, key);
      const liveValue = live ? habit.currentValue || 0 : 0;

      if (habit.type === 'CHECKLIST' && habit.checklist && habit.checklist.length > 0) {
        for (const sub of habit.checklist) {
          if (sub.deleted) continue;
          if (sub.days && sub.days.length > 0 && !sub.days.includes(date.getDay())) continue;
          const subOv = sub.dayOverrides?.[key];
          const subBase = sub.reminderTime || habit.reminderTime || null;
          const subDone = isToday ? (!!sub.completed && live) : (sub.history || []).some(d => getHistoryDateKey(d) === key);
          items.push(makeItem({
            id: `${habit.id}-sub-${sub.id}`,
            kind: 'SUBHABIT',
            title: sub.text,
            subtitle: habit.title,
            time: subOv?.time || subBase,
            baseTime: subBase,
            overridden: !!subOv?.time && subOv.time !== subBase,
            durationMin: subOv?.duration ?? sub.calendarDuration,
            done: subDone,
            color: sub.color || color,
            colorOwn: sub.color || colorOwn,
            colorTrait,
            importance,
            habit,
            subtaskId: sub.id,
          }));
        }
      } else if (habit.type === 'QUANTITY' && habit.isDivided && habit.dividedMode === 'FIXED' && habit.dividedTimes && habit.dividedTimes.length > 0) {
        const slots = [...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time));
        let accumulated = 0;
        const dayOv = habit.dayOverrides?.[key];
        slots.forEach((slot, i) => {
          const slotDone = habitDone || (live && liveValue >= accumulated + slot.amount);
          const slotTime = dayOv?.slots?.[slot.id] || slot.time;
          items.push(makeItem({
            id: `${habit.id}-time-${i}`,
            kind: 'HABIT',
            title: habit.title,
            subtitle: `${slot.amount} ${habit.unit || ''}`.trim(),
            time: slotTime,
            baseTime: slot.time,
            overridden: slotTime !== slot.time,
            slotId: slot.id,
            durationMin: dayOv?.duration ?? habit.calendarDuration,
            done: slotDone,
            color, colorOwn, colorTrait, importance,
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
        const baseTime = time;
        const habitOv = habit.dayOverrides?.[key];
        if (habitOv?.time) time = habitOv.time;
        items.push(makeItem({
          id: habit.id,
          kind: 'HABIT',
          baseTime,
          overridden: !!habitOv?.time && habitOv.time !== baseTime,
          durationMin: habitOv?.duration ?? habit.calendarDuration,
          title: habit.title,
          subtitle: isQuantity ? `${isToday ? liveValue : (habitDone ? habit.targetValue || 0 : 0)} / ${habit.targetValue || 0} ${habit.unit || ''}`.trim() : undefined,
          time,
          done: habitDone,
          color, colorOwn, colorTrait, importance,
          habit,
          isQuantity,
          progress: isQuantity && habit.targetValue
            ? Math.max(0, Math.min(1, (habitDone && !isToday ? habit.targetValue : (isToday ? liveValue : 0)) / habit.targetValue))
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
        baseTime: sameDay ? (quest.deadlineTime || null) : null,
        durationMin: quest.calendarDuration,
        // Tasks wear the colour of the trait they belong to.
        color: colorForAttribute(quest.attribute) || quest.color || '#6366f1',
        colorOwn: quest.color || '',
        colorTrait: colorForAttribute(quest.attribute),
        importance: DIFFICULTY_IMPORTANCE[quest.difficulty] ?? 1,
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
        baseTime: project.reminder,
        durationMin: target > 0 ? Math.min(target, 180) : undefined,
        done: minutes >= Math.max(1, target),
        color: project.color || '#8b5cf6',
        colorOwn: project.color || '',
        colorTrait: '',
        importance: clampImportance(project.impact),
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
        importance: 0,
      }));
    });
    // Reminders pinned on a day of the Journal calendar.
    for (const r of reminderItems) {
      if (!reminderOccursOn(r, key)) continue;
      items.push(makeItem({
        id: `reminder-${r.id}`,
        kind: 'JOURNAL',
        reminderId: r.id,
        title: r.title,
        subtitle: labels.reminder || labels.journalSub,
        time: r.time || null,
        baseTime: r.time || null,
        durationMin: r.duration,
        done: r.doneDates.includes(key),
        color: r.color || '#818cf8',
        importance: 0,
      }));
    }
  }

  // `showCompleted` is purely visual and is NOT applied here: the day's counters (hechas / pendientes /
  // atrasadas, progress ring) must count completed items even while they are hidden from the list.
  // Callers hide them with `hideCompleted` just before drawing.
  return sortRoutineItems(items.filter(it => config.showUntimed || it.minutes !== null || it.overdue));
};

/** Visual filter: drops completed items from the list when the user chose not to show them. */
export const hideCompleted = (items: RoutineItem[], config: Pick<RoutineConfig, 'showCompleted'>): RoutineItem[] =>
  config.showCompleted ? items : items.filter(it => !it.done);

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
