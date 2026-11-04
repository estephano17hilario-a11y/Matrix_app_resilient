import { describe, expect, it } from 'vitest';
import { levelFromXp, totalXpForLevel, xpFor, xpToNextLevel } from './xp';

describe('XP', () => {
  it('rewards per action', () => {
    expect(xpFor('FOCUS', 25)).toBe(25);
    expect(xpFor('HABIT')).toBe(10);
    expect(xpFor('TASK')).toBe(15);
    expect(xpFor('SUBTASK', 2)).toBe(10);
  });

  it('N → N+1 costs 100 + 25 × (N − 1)', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(125);
    expect(xpToNextLevel(10)).toBe(325);
  });

  it('level thresholds', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(225);
    expect(totalXpForLevel(4)).toBe(375);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toEqual({ level: 2, intoLevel: 0, levelSpan: 125, progress: 0 });
    expect(levelFromXp(224).level).toBe(2);
    expect(levelFromXp(225).level).toBe(3);
  });

  it('levelFromXp agrees with the thresholds everywhere', () => {
    for (let xp = 0; xp <= 30_000; xp += 7) {
      const { level, intoLevel, levelSpan } = levelFromXp(xp);
      expect(totalXpForLevel(level)).toBeLessThanOrEqual(xp);
      expect(totalXpForLevel(level + 1)).toBeGreaterThan(xp);
      expect(intoLevel).toBeLessThan(levelSpan);
    }
  });
});
