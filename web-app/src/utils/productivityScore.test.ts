import { describe, expect, it } from 'vitest';
import type { Habit, Project, Quest } from '../types';
import { calculateFallbackProductivityScore, calculateLiveProductivityScore } from './productivityScore';
import { toLocalISOString } from './dateUtils';

const NOW = new Date(2026, 9, 30, 15, 0); // Friday
const TODAY = toLocalISOString(NOW);
const YESTERDAY = toLocalISOString(new Date(2026, 9, 29, 12));

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: Math.random().toString(36).slice(2), title: 'H', streak: 0, completedToday: false, attribute: 'X',
  totalCompletions: 0, frequency: 'DAILY', type: 'SIMPLE', history: [], ...over,
});

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p', title: 'P', description: '', attribute: 'X', goalTarget: 0, goalFrequency: 'DAILY',
  pomoDuration: 25, breakDuration: 5, impact: 1, totalTime: 0, sessions: [], ...over,
});

const session = (minutes: number, date = NOW) => ({ id: `s${minutes}`, type: 'POMO' as const, duration: minutes * 60, date: date.toISOString() });

describe('live productivity score', () => {
  it('a day with nothing scheduled does not jump to 100 after one action', () => {
    // Only weekly habits on other days + 30 min of focus without goals.
    const weekly = habit({ frequency: 'WEEKLY', frequencyDays: [1] });
    const score = calculateLiveProductivityScore([], [weekly], [project({ sessions: [session(30)] })], {} as never, NOW);
    expect(score).toBe(25);
  });

  it('no scheduled habits: the score comes from tasks and focus only', () => {
    const quests: Quest[] = [
      { id: 'a', title: 'A', difficulty: 'C', xpReward: 1, gold: 1, attribute: 'X', completed: true, completedAt: NOW.toISOString() },
      { id: 'b', title: 'B', difficulty: 'C', xpReward: 1, gold: 1, attribute: 'X', completed: false },
    ];
    const score = calculateLiveProductivityScore(quests, [], [project({ goalTarget: 60, sessions: [session(30)] })], {} as never, NOW);
    // tasks 1/2 × 35 + focus 30/60 × 65
    expect(score).toBe(50);
  });

  it("yesterday's completedToday flags are ignored until the daily reset", () => {
    const stale = habit({ completedToday: true, lastUpdatedDate: YESTERDAY, history: [YESTERDAY] });
    const pending = habit();
    expect(calculateLiveProductivityScore([], [stale, pending], [], {} as never, NOW)).toBe(0);
  });

  it("yesterday's dailyLimits focus is ignored", () => {
    const h = habit();
    const limits = { date: YESTERDAY, focusSeconds: 4 * 3600 } as never;
    expect(calculateLiveProductivityScore([], [h], [], limits, NOW)).toBe(0);
  });

  it('still reaches 100 when everything due is done', () => {
    const done = habit({ completedToday: true, lastUpdatedDate: TODAY, history: [TODAY] });
    expect(calculateLiveProductivityScore([], [done], [], {} as never, NOW)).toBe(100);
  });
});

describe('historical score', () => {
  it('replaces a stored 100 that the raw numbers contradict', () => {
    const entry = { tasksCompleted: 0, tasksTotal: 0, focusMinutes: 20, habitsCompleted: 1, habitsTotal: 5, subHabitsCompleted: 0, subHabitsTotal: 0, score: 100 };
    expect(calculateFallbackProductivityScore(entry)).toBeLessThan(100);
  });

  it('keeps a stored perfect score when the day really was perfect', () => {
    const entry = { tasksCompleted: 2, tasksTotal: 2, focusMinutes: 120, habitsCompleted: 5, habitsTotal: 5, subHabitsCompleted: 0, subHabitsTotal: 0, score: 100 };
    expect(calculateFallbackProductivityScore(entry)).toBe(100);
  });
});
