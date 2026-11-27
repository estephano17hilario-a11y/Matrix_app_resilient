import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import { getProjectDailyGoalOn } from './projectUtils';

// Week start (Monday) is read from localStorage, absent in Node.
const store: Record<string, string> = {};
(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
};

const base = (over: Partial<Project>): Project => ({
  id: 'p', title: 'P', description: '', attribute: 'X', goalTarget: 60, goalFrequency: 'DAILY',
  pomoDuration: 25, breakDuration: 5, impact: 1, totalTime: 0, sessions: [], ...over,
});

// Wednesday 2026-11-25, noon.
const WED = new Date(2026, 10, 25, 12);
const SAT = new Date(2026, 10, 28, 12);

describe('getProjectDailyGoalOn', () => {
  it('daily goal is the project target on working days only', () => {
    const p = base({ goalTarget: 45, workingDays: [1, 2, 3, 4, 5] });
    expect(getProjectDailyGoalOn(p, WED)).toBe(45);
    expect(getProjectDailyGoalOn(p, SAT)).toBe(0);
  });

  it('weekly goal is split across the remaining days, same as the project card', () => {
    // 10 h a week, Mon–Fri, nothing done by Wednesday: 600 / 3 = 200 is >10 % over the ideal
    // 120/day, so the card's catch-up mode also uses the weekend: 600 / 5 days (Wed–Sun) = 120.
    const p = base({ goalFrequency: 'WEEKLY', uiFrequency: 'WEEKLY', uiTarget: 10, goalTarget: 600, workingDays: [1, 2, 3, 4, 5] });
    expect(getProjectDailyGoalOn(p, WED)).toBe(120);
  });

  it('weekly goal ignores sessions from the evaluated day and later', () => {
    const p = base({
      goalFrequency: 'WEEKLY', uiFrequency: 'WEEKLY', uiTarget: 10, goalTarget: 600, workingDays: [1, 2, 3, 4, 5],
      sessions: [
        { id: 'a', type: 'POMO', duration: 300 * 60, date: '2026-11-24T10:00:00' }, // Tuesday: counts
        { id: 'b', type: 'POMO', duration: 60 * 60, date: '2026-11-25T10:00:00' },  // the day itself: ignored
      ],
    });
    expect(getProjectDailyGoalOn(p, WED)).toBe(100); // (600 − 300) / 3
  });

  it('quick focus never has a goal', () => {
    expect(getProjectDailyGoalOn(base({ id: 'QUICK_FOCUS' }), WED)).toBe(0);
  });
});
