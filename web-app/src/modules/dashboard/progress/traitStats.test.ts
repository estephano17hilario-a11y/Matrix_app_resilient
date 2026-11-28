import { describe, expect, it } from 'vitest';
import type { Attribute } from '@/types';
import { activeStreak, buildTimeline, etaToNextLevel, heatLevel, levelAt, periodStats, toEntries, totalXp, trendPct, weekdayTotals, xpToReach } from './traitStats';

const attr = (history: { date: string; xp: number; level: number }[], level = 1, xp = 0): Attribute => ({
  id: 'FISICO', label: 'traits.FISICO', level, xp, maxXp: 80 + (level - 1) * 18, color: '#f00', history,
});

describe('trait XP maths', () => {
  it('adds up the bars of the levels below', () => {
    expect(xpToReach(1)).toBe(0);
    expect(xpToReach(2)).toBe(80);
    expect(xpToReach(3)).toBe(80 + 98);
    expect(totalXp(3, 10)).toBe(188);
    expect(levelAt(0)).toBe(1);
    expect(levelAt(80)).toBe(2);
    expect(levelAt(177)).toBe(2);
    expect(levelAt(178)).toBe(3);
  });

  it('derives the gain of a day from consecutive entries, across a level up', () => {
    const e = toEntries(attr([
      { date: '2026-11-01', xp: 20, level: 1 },
      { date: '2026-11-03', xp: 10, level: 2 }, // 80 + 10 = 90 → +70
      { date: '2026-11-04', xp: 40, level: 2 },
    ]));
    expect(e.map(x => x.gain)).toEqual([20, 70, 30]);
  });

  it('does not invent a giant gain for the first entry of an old account', () => {
    const e = toEntries(attr([{ date: '2026-11-01', xp: 5, level: 6 }], 6, 5));
    expect(e[0].gain).toBe(0);
  });
});

describe('timeline + stats', () => {
  const a = attr([
    { date: '2026-11-02', xp: 30, level: 1 },
    { date: '2026-11-04', xp: 50, level: 1 },
    { date: '2026-11-05', xp: 60, level: 1 },
    { date: '2026-11-09', xp: 70, level: 1 },
  ], 1, 70);

  it('carries the last state over days without activity', () => {
    const pts = buildTimeline(a, '2026-11-01', '2026-11-09');
    expect(pts).toHaveLength(9);
    expect(pts[0].total).toBe(0);
    expect(pts[1].total).toBe(30);
    expect(pts[2].total).toBe(30);
    expect(pts[2].active).toBe(false);
    expect(pts[3].total).toBe(50);
    expect(pts[8].total).toBe(70);
  });

  it('summarises a period', () => {
    const pts = buildTimeline(a, '2026-11-01', '2026-11-09');
    const s = periodStats(pts, 10);
    expect(s.gained).toBe(70);
    expect(s.activeDays).toBe(4);
    expect(s.best).toEqual({ date: '2026-11-02', xp: 30 });
    expect(s.longestStreak).toBe(2); // 4th and 5th
    expect(s.goalHits).toBe(4); // 30, 20, 10 and 10 all reach a goal of 10
    expect(s.avgPerActiveDay).toBeCloseTo(17.5);
  });

  it('counts the active streak ending today or yesterday', () => {
    const b = attr([
      { date: '2026-11-06', xp: 10, level: 1 },
      { date: '2026-11-07', xp: 20, level: 1 },
      { date: '2026-11-08', xp: 30, level: 1 },
    ], 1, 30);
    expect(activeStreak(b, '2026-11-08')).toBe(3);
    expect(activeStreak(b, '2026-11-09')).toBe(3); // today still empty
    expect(activeStreak(b, '2026-11-11')).toBe(0);
  });

  it('groups XP by weekday (Monday first)', () => {
    const pts = buildTimeline(a, '2026-11-02', '2026-11-08');
    const w = weekdayTotals(pts);
    // 2026-11-02 is a Monday
    expect(w[0]).toBe(30);
    expect(w[2]).toBe(20); // Wednesday the 4th
    expect(w.reduce((x, y) => x + y, 0)).toBe(60);
  });

  it('estimates the days to the next level from the recent pace', () => {
    const b = attr([
      { date: '2026-11-07', xp: 20, level: 1 },
      { date: '2026-11-08', xp: 40, level: 1 },
    ], 1, 40);
    const eta = etaToNextLevel(b, '2026-11-08');
    expect(eta).not.toBeNull();
    expect(eta).toBeGreaterThan(0);
    expect(etaToNextLevel(attr([], 1, 0), '2026-11-08')).toBeNull();
  });
});

describe('small helpers', () => {
  it('heat levels', () => {
    expect(heatLevel(0, 50)).toBe(0);
    expect(heatLevel(5, 50)).toBe(1);
    expect(heatLevel(50, 50)).toBe(4);
  });
  it('trend percentages', () => {
    expect(trendPct(150, 100)).toBe(50);
    expect(trendPct(50, 100)).toBe(-50);
    expect(trendPct(10, 0)).toBeNull();
    expect(trendPct(0, 0)).toBe(0);
  });
});
