import { describe, it, expect } from 'vitest';
import {
  SUPER_MILESTONES, earnedMilestones, nextMilestone, lastEarnedMilestone, isMilestoneDay,
  unlockedMilestone, daysToNextMilestone, roadmapProgress, bestStreakFromHistory,
  flameTierFor, nextFlameTier, FLAME_TIERS,
} from './engine';

describe('super habit milestones', () => {
  it('uses the agreed days', () => {
    expect([...SUPER_MILESTONES]).toEqual([2, 4, 7, 14, 21, 30, 45, 60]);
  });

  it('holds badges only while the streak lasts', () => {
    expect(earnedMilestones(0)).toEqual([]);
    expect(earnedMilestones(1)).toEqual([]);
    expect(earnedMilestones(4)).toEqual([2, 4]);
    expect(earnedMilestones(20)).toEqual([2, 4, 7, 14]);
    expect(earnedMilestones(75)).toEqual([...SUPER_MILESTONES]);
    // streak broken → everything is lost again
    expect(earnedMilestones(0)).toEqual([]);
  });

  it('finds the next and last milestone', () => {
    expect(nextMilestone(0)).toBe(2);
    expect(nextMilestone(2)).toBe(4);
    expect(nextMilestone(59)).toBe(60);
    expect(nextMilestone(60)).toBeNull();
    expect(lastEarnedMilestone(13)).toBe(7);
    expect(lastEarnedMilestone(1)).toBeNull();
    expect(daysToNextMilestone(10)).toBe(4);
    expect(daysToNextMilestone(60)).toBeNull();
  });

  it('flags milestone days and unlocks', () => {
    expect(isMilestoneDay(14)).toBe(true);
    expect(isMilestoneDay(15)).toBe(false);
    expect(unlockedMilestone(13, 14)).toBe(14);
    expect(unlockedMilestone(14, 15)).toBeNull();
    expect(unlockedMilestone(14, 13)).toBeNull();
    expect(unlockedMilestone(0, 2)).toBe(2); // jumped over nothing
    expect(unlockedMilestone(3, 7)).toBe(7);
  });

  it('survives nonsense input', () => {
    expect(earnedMilestones(NaN)).toEqual([]);
    expect(earnedMilestones(-5)).toEqual([]);
    expect(roadmapProgress(30)).toBe(0.5);
    expect(roadmapProgress(500)).toBe(1);
  });

  it('computes the best streak from history', () => {
    expect(bestStreakFromHistory([])).toBe(0);
    expect(bestStreakFromHistory([], 3)).toBe(3);
    expect(bestStreakFromHistory(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-10'])).toBe(3);
    expect(bestStreakFromHistory(['2026-01-31T10:00:00', '2026-02-01', '2026-02-02'])).toBe(3);
    expect(bestStreakFromHistory(['2026-01-01', '2026-01-01'])).toBe(1);
  });
});

describe('streak flame tiers', () => {
  it('evolves with the streak', () => {
    expect(flameTierFor(0).key).toBe('ash');
    expect(flameTierFor(1).key).toBe('spark');
    expect(flameTierFor(2).key).toBe('spark');
    expect(flameTierFor(3).key).toBe('flame');
    expect(flameTierFor(7).key).toBe('fire');
    expect(flameTierFor(14).key).toBe('inferno');
    expect(flameTierFor(21).key).toBe('plasma');
    expect(flameTierFor(30).key).toBe('cosmic');
    expect(flameTierFor(45).key).toBe('platinum');
    expect(flameTierFor(60).key).toBe('mythic');
    expect(flameTierFor(900).key).toBe('mythic');
  });

  it('has strictly increasing thresholds', () => {
    for (let i = 1; i < FLAME_TIERS.length; i++) expect(FLAME_TIERS[i].min).toBeGreaterThan(FLAME_TIERS[i - 1].min);
  });

  it('reports the next tier', () => {
    expect(nextFlameTier(5)).toEqual({ tier: FLAME_TIERS[3], daysLeft: 2 });
    expect(nextFlameTier(60)).toBeNull();
  });
});

describe('world level', () => {
  it('puts every milestone on its own eighth', async () => {
    const { worldLevel, milestoneLevel } = await import('./engine');
    expect(worldLevel(0)).toBe(0);
    expect(worldLevel(2)).toBeCloseTo(1 / 8);
    expect(worldLevel(7)).toBeCloseTo(3 / 8);
    expect(worldLevel(60)).toBe(1);
    expect(worldLevel(500)).toBe(1);
    expect(worldLevel(1)).toBeCloseTo(1 / 16);
    expect(worldLevel(3)).toBeCloseTo(1 / 8 + 1 / 16);
    expect(milestoneLevel(7)).toBe(1);
    let prev = -1;
    for (let d = 0; d <= 70; d++) { const l = worldLevel(d); expect(l).toBeGreaterThanOrEqual(prev); prev = l; }
  });
});
