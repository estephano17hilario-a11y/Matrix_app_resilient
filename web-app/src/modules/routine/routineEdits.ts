// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE EDITS — what happens to the data when a block of the calendar is moved or resized.
// Pure functions: they only build the patch; the screen applies it (handleHabitConfirm / handleQuestConfirm).
//
//  - Task: its deadline day and hour move (and its calendar length).
//  - Habit / divided slot / sub-habit: asked whether the change is for EVERY day ('ALWAYS'), for this ONE day
//    only ('DAY', kept as an override on the habit) or — for a sub-habit — for the whole habit ('HABIT').
// ─────────────────────────────────────────────────────────────────────────────

import type { DayOverride, Habit, Quest } from '../../types';
import type { JournalReminderItem } from './reminderItems';
import { clampDuration, DEFAULT_DURATION, type RoutineItem } from './routineEngine';
import { minutesToTime } from './calendarLayout';

export type EditScope = 'ALWAYS' | 'DAY' | 'HABIT';

export type EditPatch =
  | { kind: 'habit'; habitId: string; data: Partial<Habit> }
  | { kind: 'quest'; questId: string; data: Partial<Quest> }
  | { kind: 'reminder'; reminderId: string; data: Partial<JournalReminderItem>; remove?: boolean };

export interface EditRequest {
  item: RoutineItem;
  /** The day the block was on (date key). */
  dayKey: string;
  startMin: number;
  duration: number;
  scope: EditScope;
  /** Tasks can also change day. */
  newDayKey?: string;
}

/** Only habits, sub-habits and tasks have an hour the calendar can change. */
export const isEditable = (item: RoutineItem): boolean =>
  (item.kind === 'HABIT' || item.kind === 'SUBHABIT') ? !!item.habit : item.kind === 'TASK' ? !!item.quest && !item.overdue : item.kind === 'JOURNAL' ? !!item.reminderId : false;

export const needsScope = (item: RoutineItem): boolean => item.kind === 'HABIT' || item.kind === 'SUBHABIT';

/** Day overrides older than this are dropped the next time the habit is edited. */
const KEEP_DAYS = 60;

const pruneOverrides = (map: Record<string, DayOverride> | undefined, todayKey: string): Record<string, DayOverride> => {
  const out: Record<string, DayOverride> = {};
  if (!map) return out;
  const limit = new Date(`${todayKey}T00:00:00`);
  limit.setDate(limit.getDate() - KEEP_DAYS);
  const min = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`;
  for (const [k, v] of Object.entries(map)) if (k >= min) out[k] = v;
  return out;
};

const isEmptyOverride = (o: DayOverride) => !o.time && o.duration === undefined && !(o.slots && Object.keys(o.slots).length);

/** Applies a new override for one day onto the map (dropping fields that equal what the item already has). */
const withDayOverride = (
  map: Record<string, DayOverride> | undefined, dayKey: string, todayKey: string,
  change: { time?: string; baseTime?: string | null; duration: number; baseDuration: number; slotId?: string },
): Record<string, DayOverride> => {
  const out = pruneOverrides(map, todayKey);
  const cur: DayOverride = { ...(out[dayKey] || {}) };
  if (change.slotId) {
    const slots = { ...(cur.slots || {}) };
    if (change.time && change.time !== change.baseTime) slots[change.slotId] = change.time; else delete slots[change.slotId];
    cur.slots = slots;
  } else if (change.time && change.time !== change.baseTime) cur.time = change.time;
  else delete cur.time;
  if (change.duration !== change.baseDuration) cur.duration = change.duration; else delete cur.duration;
  if (isEmptyOverride(cur)) delete out[dayKey]; else out[dayKey] = cur;
  return out;
};

const withoutDay = (map: Record<string, DayOverride> | undefined, dayKey: string, slotId?: string): Record<string, DayOverride> => {
  const out = { ...(map || {}) };
  const cur = out[dayKey];
  if (!cur) return out;
  const next: DayOverride = { ...cur };
  if (slotId) { const s = { ...(next.slots || {}) }; delete s[slotId]; next.slots = s; } else delete next.time;
  delete next.duration;
  if (isEmptyOverride(next)) delete out[dayKey]; else out[dayKey] = next;
  return out;
};

export const buildEditPatch = (req: EditRequest, todayKey: string): EditPatch | null => {
  const { item, dayKey, scope } = req;
  const time = minutesToTime(req.startMin);
  const duration = clampDuration(req.duration);

  if (item.kind === 'JOURNAL' && item.reminderId) {
    // A one-off reminder can change day; a repeating one only changes its hour.
    return { kind: 'reminder', reminderId: item.reminderId, data: { time, duration, ...(req.newDayKey && scope === 'ALWAYS' ? { date: req.newDayKey } : {}) } };
  }

  if (item.kind === 'TASK' && item.quest) {
    return { kind: 'quest', questId: item.quest.id, data: { id: item.quest.id, deadline: req.newDayKey || dayKey, deadlineTime: time, calendarDuration: duration } };
  }

  const habit = item.habit;
  if (!habit || (item.kind !== 'HABIT' && item.kind !== 'SUBHABIT')) return null;

  // ── Sub-habit ─────────────────────────────────────────────────────────────
  if (item.kind === 'SUBHABIT' && item.subtaskId) {
    if (scope === 'HABIT') {
      return { kind: 'habit', habitId: habit.id, data: { id: habit.id, reminderTime: time, calendarDuration: duration } };
    }
    const checklist = (habit.checklist || []).map(sub => {
      if (sub.id !== item.subtaskId) return sub;
      if (scope === 'ALWAYS') {
        return { ...sub, reminderTime: time, calendarDuration: duration, dayOverrides: withoutDay(sub.dayOverrides, dayKey) };
      }
      const baseDuration = sub.calendarDuration ?? DEFAULT_DURATION.SUBHABIT;
      return { ...sub, dayOverrides: withDayOverride(sub.dayOverrides, dayKey, todayKey, { time, baseTime: item.baseTime, duration, baseDuration }) };
    });
    return { kind: 'habit', habitId: habit.id, data: { id: habit.id, checklist } };
  }

  // ── Divided habit with fixed times: one slot ──────────────────────────────
  if (item.slotId) {
    if (scope === 'ALWAYS') {
      const dividedTimes = (habit.dividedTimes || []).map(s => (s.id === item.slotId ? { ...s, time } : s));
      return { kind: 'habit', habitId: habit.id, data: { id: habit.id, dividedTimes, calendarDuration: duration, dayOverrides: withoutDay(habit.dayOverrides, dayKey, item.slotId) } };
    }
    const baseDuration = habit.calendarDuration ?? DEFAULT_DURATION.HABIT;
    return { kind: 'habit', habitId: habit.id, data: { id: habit.id, dayOverrides: withDayOverride(habit.dayOverrides, dayKey, todayKey, { time, baseTime: item.baseTime, duration, baseDuration, slotId: item.slotId }) } };
  }

  // ── Plain habit ───────────────────────────────────────────────────────────
  if (scope === 'ALWAYS') {
    return { kind: 'habit', habitId: habit.id, data: { id: habit.id, reminderTime: time, calendarDuration: duration, dayOverrides: withoutDay(habit.dayOverrides, dayKey) } };
  }
  const baseDuration = habit.calendarDuration ?? DEFAULT_DURATION.HABIT;
  return { kind: 'habit', habitId: habit.id, data: { id: habit.id, dayOverrides: withDayOverride(habit.dayOverrides, dayKey, todayKey, { time, baseTime: item.baseTime, duration, baseDuration }) } };
};

/** Undo a one-day move: the item goes back to the hour and length it normally has. */
export const buildResetPatch = (item: RoutineItem, dayKey: string): EditPatch | null => {
  const habit = item.habit;
  if (!habit) return null;
  if (item.kind === 'SUBHABIT' && item.subtaskId) {
    const checklist = (habit.checklist || []).map(sub => (sub.id === item.subtaskId ? { ...sub, dayOverrides: withoutDay(sub.dayOverrides, dayKey) } : sub));
    return { kind: 'habit', habitId: habit.id, data: { id: habit.id, checklist } };
  }
  return { kind: 'habit', habitId: habit.id, data: { id: habit.id, dayOverrides: withoutDay(habit.dayOverrides, dayKey, item.slotId) } };
};

/** Moves a task to tomorrow keeping its hour. */
export const buildPostponePatch = (quest: Quest, dayKey: string, days = 1): EditPatch => {
  const d = new Date(`${dayKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { kind: 'quest', questId: quest.id, data: { id: quest.id, deadline: next } };
};
