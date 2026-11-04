import { describe, expect, it } from 'vitest';
import { clampHabitGoal, complianceDelta, complianceZone, focusPointsForMinutes, habitDelta, taskDelta } from './elo';

describe('compliance zones', () => {
  it('goal 80% with 20% done → r = 0.25 → −3', () => {
    expect(complianceDelta(20 / 80)).toBe(-3);
    expect(habitDelta(1, 5, 80)).toBe(-3);
  });

  it.each([
    [1.5, 6], [1.2, 6],
    [1.19, 5], [1.0, 5],
    [0.99, 5], [0.9, 4], [0.8, 3], [0.75, 3], [0.7, 2],
    [0.69, 0], [0.5, 0], [0.4, 0],
    [0.39, -3], [0, -3],
  ])('r = %s → %s', (r, expected) => {
    expect(complianceDelta(r)).toBe(expected);
  });

  it('classifies the boundaries into the right zone', () => {
    expect(complianceZone(1.2)).toBe('EXCELLENT');
    expect(complianceZone(1)).toBe('MET');
    expect(complianceZone(0.7)).toBe('PARTIAL');
    expect(complianceZone(0.4)).toBe('NEUTRAL');
    expect(complianceZone(0.3999)).toBe('FAIL');
  });

  it('survives float noise on the 0.7 boundary', () => {
    // 7/10 of a 100% goal computed through percentages
    expect(complianceDelta((100 * 7) / 10 / 100)).toBe(2);
    expect(complianceDelta(0.6999999999)).toBe(2);
  });

  it('habit goal is clamped to [40, 100] and defaults to 80', () => {
    expect(clampHabitGoal(undefined)).toBe(80);
    expect(clampHabitGoal(30)).toBe(40);
    expect(clampHabitGoal(120)).toBe(100);
    expect(habitDelta(2, 5, 30)).toBe(5); // 40% done vs clamped 40% goal → r = 1
  });

  it('habits at exactly the goal give +5, above 120% give +6', () => {
    expect(habitDelta(4, 5, 80)).toBe(5);
    expect(habitDelta(5, 5, 80)).toBe(6);
  });

  it('nothing scheduled / planned → not evaluated', () => {
    expect(habitDelta(0, 0)).toBeNull();
    expect(taskDelta(0, 0)).toBeNull();
    expect(taskDelta(3, 4)).toBe(3); // r = 0.75
  });
});

describe('focus points', () => {
  it('+1 per full hour, capped at 8', () => {
    expect(focusPointsForMinutes(59)).toBe(0);
    expect(focusPointsForMinutes(60)).toBe(1);
    expect(focusPointsForMinutes(179)).toBe(2);
    expect(focusPointsForMinutes(480)).toBe(8);
    expect(focusPointsForMinutes(1000)).toBe(8);
    expect(focusPointsForMinutes(-5)).toBe(0);
  });
});
