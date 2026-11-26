import { describe, expect, it } from 'vitest';
import type { Habit, Quest } from '../../types';
import { buildRoutineItems, colorForMode, DEFAULT_ROUTINE_CONFIG, IMPORTANCE_COLORS } from './routineEngine';
import { reminderOccursOn, type JournalReminderItem } from './reminderItems';
import { buildEditPatch } from './routineEdits';

const DAY = new Date(2026, 10, 26, 9, 0);
const rem = (over: Partial<JournalReminderItem> = {}): JournalReminderItem => ({
  id: 'r1', title: 'Escribir sobre la reunión', date: '2026-11-26', time: '16:30', repeat: 'NONE', doneDates: [], createdAt: 0, ...over,
});

const build = (extra: { habits?: Habit[]; quests?: Quest[]; reminderItems?: JournalReminderItem[] }) => buildRoutineItems({
  date: DAY, habits: extra.habits ?? [], quests: extra.quests ?? [], projects: [], journalTimes: [], journalDone: false,
  config: { ...DEFAULT_ROUTINE_CONFIG, showJournal: true }, colorForAttribute: id => (id === 'DISCIPLINA' ? '#22c55e' : ''),
  labels: { journal: 'J', journalSub: 'S', overdue: 'O', project: 'P', reminder: 'Recordatorio' }, reminderItems: extra.reminderItems,
});

describe('journal reminder items', () => {
  it('one-off reminders only land on their day', () => {
    expect(reminderOccursOn(rem(), '2026-11-26')).toBe(true);
    expect(reminderOccursOn(rem(), '2026-11-27')).toBe(false);
    expect(reminderOccursOn(rem(), '2026-11-25')).toBe(false);
  });

  it('repeating reminders follow their rule and never fire before they start', () => {
    expect(reminderOccursOn(rem({ repeat: 'DAILY' }), '2026-12-30')).toBe(true);
    expect(reminderOccursOn(rem({ repeat: 'DAILY' }), '2026-11-25')).toBe(false);
    expect(reminderOccursOn(rem({ repeat: 'WEEKLY' }), '2026-12-03')).toBe(true); // 7 days later, a Thursday again
    expect(reminderOccursOn(rem({ repeat: 'WEEKLY' }), '2026-12-04')).toBe(false);
    expect(reminderOccursOn(rem({ repeat: 'MONTHLY', date: '2026-01-31' }), '2026-02-28')).toBe(true); // clamps to the last day
    expect(reminderOccursOn(rem({ repeat: 'YEARLY' }), '2027-11-26')).toBe(true);
    expect(reminderOccursOn(rem({ repeat: 'YEARLY' }), '2027-11-27')).toBe(false);
  });

  it('become calendar blocks that can be done and moved', () => {
    const [item] = build({ reminderItems: [rem({ duration: 45, doneDates: ['2026-11-26'] })] });
    expect(item).toMatchObject({ kind: 'JOURNAL', reminderId: 'r1', title: 'Escribir sobre la reunión', time: '16:30', durationMin: 45, done: true });
    const patch = buildEditPatch({ item, dayKey: '2026-11-26', startMin: 18 * 60, duration: 30, scope: 'ALWAYS', newDayKey: '2026-11-28' }, '2026-11-26');
    expect(patch).toEqual({ kind: 'reminder', reminderId: 'r1', data: { time: '18:00', duration: 30, date: '2026-11-28' } });
  });
});

describe('calendar colour modes', () => {
  const habit = { id: 'h', title: 'Gym', streak: 0, completedToday: false, attribute: 'DISCIPLINA', totalCompletions: 0, frequency: 'DAILY', type: 'SIMPLE', history: [], reminderTime: '07:00', customColor: '#ff00aa', impact: 3 } as Habit;
  const quest = { id: 'q', title: 'T', completed: false, attribute: 'DISCIPLINA', deadline: '2026-11-26', deadlineTime: '10:00', difficulty: 'S', xpReward: 1, gold: 1 } as Quest;

  it('paints by the colour the user assigned, the trait, or how important the item is', () => {
    const items = build({ habits: [habit], quests: [quest] });
    const h = items.find(i => i.kind === 'HABIT')!;
    const q = items.find(i => i.kind === 'TASK')!;
    expect(colorForMode(h, 'OWN')).toBe('#ff00aa');
    expect(colorForMode(h, 'TRAIT')).toBe('#22c55e');
    expect(colorForMode(h, 'IMPORTANCE')).toBe(IMPORTANCE_COLORS[2]); // impact 3
    expect(colorForMode(q, 'IMPORTANCE')).toBe(IMPORTANCE_COLORS[3]); // difficulty S
  });

  it('falls back to the other colour when the preferred one is missing', () => {
    const plain = build({ habits: [{ ...habit, customColor: undefined, color: undefined } as Habit] }).find(i => i.kind === 'HABIT')!;
    expect(colorForMode(plain, 'OWN')).toBe('#22c55e');
  });
});
