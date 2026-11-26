// ─────────────────────────────────────────────────────────────────────────────
// UNBUNCH — "tareas abultadas". Finds the blocks of the calendar that really overlap by the clock (one lasts past
// the moment the next one starts) and shortens them so each ends exactly where the next begins. Start times are
// NEVER moved: two items that start at the same minute stay bunched (nothing can be done without moving them).
//
//  - Temporary: the trimmed lengths are only used to draw the days on screen (applyTrims).
//  - Permanent: the lengths are written back to the habits / sub-habits / tasks / reminders (buildTrimPatches).
// Pure functions: no React, no storage.
// ─────────────────────────────────────────────────────────────────────────────

import type { Habit } from '../../types';
import type { EditPatch } from './routineEdits';
import { DAY_MINUTES } from './calendarLayout';
import { DEFAULT_DURATION, MIN_DURATION, type RoutineItem } from './routineEngine';

export interface DurationTrim {
  item: RoutineItem;
  dayKey: string;
  /** Current length (min) and the length that makes it end where the next block starts. */
  from: number;
  to: number;
}

export interface BunchScan {
  /** Timed items that overlap another one of the same day. */
  bunched: number;
  /** Blocks that can be shortened. */
  trims: DurationTrim[];
  /** Items that would still overlap after trimming (they start at the same time, or too close to fit 5 min). */
  stuck: number;
}

interface DayItems { key: string; items: RoutineItem[] }

const isTimed = (it: RoutineItem) => !it.overdue && it.minutes !== null;
const endOf = (it: RoutineItem, duration = it.durationMin) => Math.min(DAY_MINUTES, it.minutes! + duration);

/** How many of these timed items overlap at least one other (by the clock, not by how they are drawn). */
export const countOverlapping = (items: RoutineItem[], lengths?: Map<string, number>): number => {
  const timed = items.filter(isTimed).sort((a, b) => a.minutes! - b.minutes!);
  const len = (it: RoutineItem) => lengths?.get(it.id) ?? it.durationMin;
  const hit = new Set<number>();
  for (let i = 0; i < timed.length; i++) {
    const endI = endOf(timed[i], len(timed[i]));
    for (let j = i + 1; j < timed.length && timed[j].minutes! < endI; j++) { hit.add(i); hit.add(j); }
  }
  return hit.size;
};

export const trimKey = (dayKey: string, itemId: string) => `${dayKey}|${itemId}`;

export const scanBunches = (days: DayItems[]): BunchScan => {
  const trims: DurationTrim[] = [];
  let bunched = 0;
  let stuck = 0;
  for (const d of days) {
    const timed = d.items.filter(isTimed);
    bunched += countOverlapping(timed);
    const lengths = new Map<string, number>();
    for (const it of timed) {
      const start = it.minutes!;
      const next = timed.reduce((min, o) => (o.minutes! > start && o.minutes! < min ? o.minutes! : min), Infinity);
      if (next === Infinity || endOf(it) <= next) continue;
      const to = next - start;
      if (to < MIN_DURATION) continue;
      lengths.set(it.id, to);
      trims.push({ item: it, dayKey: d.key, from: it.durationMin, to });
    }
    stuck += countOverlapping(timed, lengths);
  }
  return { bunched, trims, stuck };
};

/** The items of one day with the trimmed lengths (temporary unbunching: only the drawing changes). */
export const applyTrims = (items: RoutineItem[], dayKey: string, trims: Map<string, number>): RoutineItem[] => {
  if (!trims.size) return items;
  let changed = false;
  const out = items.map(it => {
    const to = trims.get(trimKey(dayKey, it.id));
    if (to === undefined || to === it.durationMin) return it;
    changed = true;
    return { ...it, durationMin: to };
  });
  return changed ? out : items;
};

/** Only what has a length of its own can be changed for good (not focus sessions nor the journal habit). */
export const canTrimForGood = (item: RoutineItem): boolean =>
  ((item.kind === 'HABIT' || item.kind === 'SUBHABIT') && !!item.habit) ||
  (item.kind === 'TASK' && !!item.quest) ||
  (item.kind === 'JOURNAL' && !!item.reminderId);

/**
 * Permanent unbunching: one patch per habit / task / reminder (several sub-habits of one habit are merged in a
 * single patch, because the dashboard builds each update from the habit it had before the previous one).
 * A length that came from a one-day override only changes that day; a base length only ever gets shorter.
 */
export const buildTrimPatches = (trims: DurationTrim[]): EditPatch[] => {
  const habits = new Map<string, { habit: Habit; data: Partial<Habit> }>();
  const quests = new Map<string, number>();
  const reminders = new Map<string, number>();

  for (const t of trims) {
    const it = t.item;
    if (!canTrimForGood(it)) continue;
    if (it.kind === 'TASK') { quests.set(it.quest!.id, Math.min(quests.get(it.quest!.id) ?? Infinity, t.to)); continue; }
    if (it.kind === 'JOURNAL') { reminders.set(it.reminderId!, Math.min(reminders.get(it.reminderId!) ?? Infinity, t.to)); continue; }

    const habit = it.habit!;
    const entry = habits.get(habit.id) ?? { habit, data: { id: habit.id } };
    habits.set(habit.id, entry);
    const { data } = entry;

    if (it.kind === 'SUBHABIT' && it.subtaskId) {
      const checklist = (data.checklist ?? habit.checklist ?? []).map(sub => {
        if (sub.id !== it.subtaskId) return sub;
        const ov = sub.dayOverrides?.[t.dayKey];
        if (ov?.duration !== undefined) return { ...sub, dayOverrides: { ...sub.dayOverrides, [t.dayKey]: { ...ov, duration: Math.min(ov.duration, t.to) } } };
        return { ...sub, calendarDuration: Math.min(sub.calendarDuration ?? DEFAULT_DURATION.SUBHABIT, t.to) };
      });
      data.checklist = checklist;
      continue;
    }

    const overrides = data.dayOverrides ?? habit.dayOverrides;
    const ov = overrides?.[t.dayKey];
    if (ov?.duration !== undefined) {
      data.dayOverrides = { ...overrides, [t.dayKey]: { ...ov, duration: Math.min(ov.duration, t.to) } };
    } else {
      data.calendarDuration = Math.min(data.calendarDuration ?? habit.calendarDuration ?? DEFAULT_DURATION.HABIT, t.to);
    }
  }

  const out: EditPatch[] = [];
  for (const [habitId, { data }] of habits) out.push({ kind: 'habit', habitId, data });
  for (const [questId, to] of quests) out.push({ kind: 'quest', questId, data: { id: questId, calendarDuration: to } });
  for (const [reminderId, to] of reminders) out.push({ kind: 'reminder', reminderId, data: { duration: to } });
  return out;
};
