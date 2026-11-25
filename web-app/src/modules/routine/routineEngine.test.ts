import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Habit } from '../../types';
import { toLocalISOString } from '../../utils/dateUtils';
import { hasStaleDailyState } from '../../utils/productivityScore';
import { buildRoutineItems, DEFAULT_ROUTINE_CONFIG, hideCompleted, type RoutineConfig } from './routineEngine';

const NOW = new Date(2026, 10, 25, 9, 0); // Wednesday
const TODAY = toLocalISOString(NOW);
const YESTERDAY = toLocalISOString(new Date(2026, 10, 24, 12));

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: Math.random().toString(36).slice(2), title: 'H', streak: 0, completedToday: false, attribute: 'X',
  totalCompletions: 0, frequency: 'DAILY', type: 'SIMPLE', history: [], reminderTime: '08:00', ...over,
});

const build = (habits: Habit[], config: Partial<RoutineConfig> = {}) => buildRoutineItems({
  date: NOW, habits, quests: [], projects: [], journalTimes: [], journalDone: false,
  config: { ...DEFAULT_ROUTINE_CONFIG, showJournal: false, ...config }, colorForAttribute: () => '',
  labels: { journal: 'J', journalSub: 'S', overdue: 'O', project: 'P' },
});

describe('routine engine', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it("yesterday's done flag does not show a habit as done today", () => {
    const stale = habit({ completedToday: true, lastUpdatedDate: YESTERDAY, history: [YESTERDAY] });
    expect(build([stale])[0].done).toBe(false);
  });

  it("yesterday's ticked sub-habits and quantity do not count today", () => {
    const list = habit({
      type: 'CHECKLIST', lastUpdatedDate: YESTERDAY,
      checklist: [{ id: 's1', text: 'a', completed: true }, { id: 's2', text: 'b', completed: true }] as Habit['checklist'],
    });
    const qty = habit({ type: 'QUANTITY', targetValue: 8, currentValue: 5, lastUpdatedDate: YESTERDAY });
    const items = build([list, qty]);
    expect(items.every(i => !i.done)).toBe(true);
    expect(items.find(i => i.isQuantity)?.subtitle).toBe('0 / 8');
  });

  it('progress recorded today still counts', () => {
    const done = habit({ completedToday: true, lastUpdatedDate: TODAY, history: [TODAY] });
    const list = habit({ type: 'CHECKLIST', lastUpdatedDate: TODAY, checklist: [{ id: 's1', text: 'a', completed: true }] as Habit['checklist'] });
    expect(build([done, list]).every(i => i.done)).toBe(true);
  });

  it('"show completed" off hides done items from the list but not from the counters', () => {
    const done = habit({ title: 'Done', completedToday: true, lastUpdatedDate: TODAY, history: [TODAY] });
    const pending = habit({ title: 'Pending', reminderTime: '10:00' });
    const config = { showCompleted: false };

    const all = build([done, pending], config);
    expect(all).toHaveLength(2);
    expect(all.filter(i => i.done)).toHaveLength(1); // still counted as "hecha"
    expect(hideCompleted(all, { showCompleted: false }).map(i => i.title)).toEqual(['Pending']);
    expect(hideCompleted(all, { showCompleted: true })).toHaveLength(2);
  });
});

describe('hasStaleDailyState', () => {
  it('flags leftover progress from an earlier day and nothing else', () => {
    expect(hasStaleDailyState(habit({ completedToday: true, lastUpdatedDate: YESTERDAY }), TODAY)).toBe(true);
    expect(hasStaleDailyState(habit({ type: 'QUANTITY', currentValue: 3, lastUpdatedDate: YESTERDAY }), TODAY)).toBe(true);
    expect(hasStaleDailyState(habit({ completedToday: true, lastUpdatedDate: TODAY }), TODAY)).toBe(false);
    expect(hasStaleDailyState(habit({ completedToday: false, lastUpdatedDate: YESTERDAY }), TODAY)).toBe(false);
    expect(hasStaleDailyState(habit({ completedToday: true }), TODAY)).toBe(false);
  });
});
