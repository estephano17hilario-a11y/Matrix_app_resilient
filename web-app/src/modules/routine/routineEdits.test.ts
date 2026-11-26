import { describe, expect, it } from 'vitest';
import type { Habit, Quest } from '../../types';
import { buildRoutineItems, DEFAULT_ROUTINE_CONFIG, type RoutineItem } from './routineEngine';
import { buildEditPatch, buildPostponePatch, buildResetPatch, isEditable } from './routineEdits';

const DAY = new Date(2026, 10, 25, 9, 0);
const KEY = '2026-11-25';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1', title: 'Gym', streak: 0, completedToday: false, attribute: 'X', totalCompletions: 0, frequency: 'DAILY', type: 'SIMPLE', history: [], reminderTime: '07:00', ...over,
});
const build = (habits: Habit[], quests: Quest[] = [], date = DAY): RoutineItem[] => buildRoutineItems({
  date, habits, quests, projects: [], journalTimes: [], journalDone: false,
  config: { ...DEFAULT_ROUTINE_CONFIG, showJournal: false }, colorForAttribute: () => '',
  labels: { journal: 'J', journalSub: 'S', overdue: 'O', project: 'P' },
});
const apply = (h: Habit, data: Partial<Habit>): Habit => ({ ...h, ...data });

describe('routine edits', () => {
  it('"always" moves the habit for every day and clears that day override', () => {
    const h = habit({ dayOverrides: { [KEY]: { time: '10:00' } } });
    const item = build([h])[0];
    expect(item.time).toBe('10:00');
    expect(item.overridden).toBe(true);
    const patch = buildEditPatch({ item, dayKey: KEY, startMin: 8 * 60, duration: 45, scope: 'ALWAYS' }, KEY)!;
    const next = apply(h, patch.data as Partial<Habit>);
    expect(next.reminderTime).toBe('08:00');
    expect(next.calendarDuration).toBe(45);
    const again = build([next])[0];
    expect([again.time, again.durationMin, again.overridden]).toEqual(['08:00', 45, false]);
  });

  it('"only this day" leaves the habit alone and only affects that date', () => {
    const h = habit();
    const item = build([h])[0];
    const patch = buildEditPatch({ item, dayKey: KEY, startMin: 9 * 60 + 15, duration: 30, scope: 'DAY' }, KEY)!;
    const next = apply(h, patch.data as Partial<Habit>);
    expect(next.reminderTime).toBe('07:00');
    expect(build([next])[0]).toMatchObject({ time: '09:15', baseTime: '07:00', overridden: true });
    // the next day is untouched
    expect(build([next], [], new Date(2026, 10, 26, 9, 0))[0].time).toBe('07:00');
  });

  it('moving a day override back to the usual hour removes it', () => {
    const h = habit({ dayOverrides: { [KEY]: { time: '10:00' } } });
    const item = build([h])[0];
    const patch = buildEditPatch({ item, dayKey: KEY, startMin: 7 * 60, duration: 30, scope: 'DAY' }, KEY)!;
    expect((patch.data as Partial<Habit>).dayOverrides).toEqual({});
  });

  it('a sub-habit can move alone (always / one day) or take the whole habit with it', () => {
    const h = habit({
      type: 'CHECKLIST', reminderTime: '07:00',
      checklist: [{ id: 's1', text: 'Estirar', completed: false }, { id: 's2', text: 'Pesas', completed: false, reminderTime: '07:30' }] as Habit['checklist'],
    });
    const sub = build([h]).find(i => i.subtaskId === 's2')!;
    const always = apply(h, buildEditPatch({ item: sub, dayKey: KEY, startMin: 18 * 60, duration: 20, scope: 'ALWAYS' }, KEY)!.data as Partial<Habit>);
    expect(always.checklist![1].reminderTime).toBe('18:00');
    expect(always.checklist![0].reminderTime).toBeUndefined();
    expect(always.reminderTime).toBe('07:00');

    const day = apply(h, buildEditPatch({ item: sub, dayKey: KEY, startMin: 19 * 60, duration: 15, scope: 'DAY' }, KEY)!.data as Partial<Habit>);
    expect(build([day]).find(i => i.subtaskId === 's2')).toMatchObject({ time: '19:00', overridden: true });
    expect(build([day]).find(i => i.subtaskId === 's1')!.time).toBe('07:00');

    const whole = apply(h, buildEditPatch({ item: sub, dayKey: KEY, startMin: 6 * 60, duration: 30, scope: 'HABIT' }, KEY)!.data as Partial<Habit>);
    expect(whole.reminderTime).toBe('06:00');
  });

  it('a fixed-time slot moves on its own', () => {
    const h = habit({
      type: 'QUANTITY', isDivided: true, dividedMode: 'FIXED', unit: 'ml', targetValue: 500,
      dividedTimes: [{ id: 'a', time: '08:00', amount: 250 }, { id: 'b', time: '16:00', amount: 250 }],
    });
    const slot = build([h]).find(i => i.slotId === 'b')!;
    const day = apply(h, buildEditPatch({ item: slot, dayKey: KEY, startMin: 17 * 60, duration: 30, scope: 'DAY' }, KEY)!.data as Partial<Habit>);
    expect(build([day]).map(i => i.time)).toEqual(['08:00', '17:00']);
    const always = apply(h, buildEditPatch({ item: slot, dayKey: KEY, startMin: 17 * 60, duration: 30, scope: 'ALWAYS' }, KEY)!.data as Partial<Habit>);
    expect(always.dividedTimes!.map(s => s.time)).toEqual(['08:00', '17:00']);
  });

  it('a task moves its deadline day and hour', () => {
    const q = { id: 'q1', title: 'T', completed: false, attribute: 'X', deadline: KEY, deadlineTime: '09:00', difficulty: 'C', xpReward: 1, gold: 1 } as Quest;
    const item = build([], [q])[0];
    expect(isEditable(item)).toBe(true);
    const patch = buildEditPatch({ item, dayKey: KEY, startMin: 14 * 60, duration: 60, scope: 'ALWAYS', newDayKey: '2026-11-27' }, KEY)!;
    expect(patch).toEqual({ kind: 'quest', questId: 'q1', data: { id: 'q1', deadline: '2026-11-27', deadlineTime: '14:00', calendarDuration: 60 } });
    expect(buildPostponePatch(q, KEY).data).toEqual({ id: 'q1', deadline: '2026-11-26' });
  });

  it('reset puts a moved habit back', () => {
    const h = habit({ dayOverrides: { [KEY]: { time: '10:00', duration: 90 } } });
    const item = build([h])[0];
    const next = apply(h, buildResetPatch(item, KEY)!.data as Partial<Habit>);
    expect(build([next])[0]).toMatchObject({ time: '07:00', overridden: false });
  });

  it('projects and journal reminders are not editable here', () => {
    expect(isEditable({ id: 'p', kind: 'PROJECT', title: 'p', time: '10:00', minutes: 600, done: false, color: '#fff', durationMin: 30 })).toBe(false);
  });
});
