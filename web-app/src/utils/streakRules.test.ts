import { describe, expect, it } from 'vitest';
import { carriedDailyStreak, computeHabitStreak, habitStreakRecovery, missedDailyStreakDays } from './streakRules';

const NOW = new Date(2026, 10, 26, 12); // Thu 26 Nov 2026
const k = (day: number) => `2026-11-${String(day).padStart(2, '0')}`;

describe('daily streak with protected days', () => {
  it('survives a gap only when every missed day was protected', () => {
    expect(carriedDailyStreak({ streak: 10, lastStreakDate: k(23), frozenDays: [k(24), k(25)], now: NOW })).toBe(10);
    expect(carriedDailyStreak({ streak: 10, lastStreakDate: k(23), frozenDays: [k(25)], now: NOW })).toBe(0);
  });

  it('keeps the plain yesterday / today rules', () => {
    expect(carriedDailyStreak({ streak: 4, lastStreakDate: k(25), now: NOW })).toBe(4);
    expect(carriedDailyStreak({ streak: 4, lastStreakDate: k(26), now: NOW })).toBe(3);
    expect(carriedDailyStreak({ streak: 4, lastStreakDate: k(22), now: NOW })).toBe(0);
  });

  it('lists the missed days a phoenix feather has to cover, skipping protected ones', () => {
    expect(missedDailyStreakDays({ lastStreakDate: k(22), frozenDays: [k(24)], now: NOW })).toEqual([k(23), k(25)]);
  });
});

describe('habit streaks with protected days', () => {
  const daily = { frequency: 'DAILY' };
  it('does not break on a protected day', () => {
    const history = [k(21), k(22), k(23), k(25)];
    expect(computeHabitStreak(daily, history, { now: NOW })).toBe(1);
    expect(computeHabitStreak(daily, history, { now: NOW, frozenDays: [k(24)] })).toBe(4);
  });

  it('recovery reports the lost streak and the days to forgive', () => {
    const r = habitStreakRecovery(daily, [k(20), k(21), k(22), k(23)], { now: NOW });
    expect(r).toMatchObject({ lost: 4, restored: 4, forgive: [k(24), k(25)], lastDone: k(23) });
  });
});
