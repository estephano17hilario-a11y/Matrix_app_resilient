import { describe, expect, it } from 'vitest';
import { boostReward, weekdayOfKey, weeklyBoostFor } from './dayKey';
import {
  availableEarnedShields, awardFocus, awardXp, closeDay, createProgressionState, dayTotal,
  pendingDays, replay, requestShield, totalXp, type DayCloseInput, type ProgressionState,
} from './progression';

const REG = '2026-01-01'; // Thursday
const SUNDAY = '2026-01-11';
const AT = 0;

const input = (dayKey: string, over: Partial<DayCloseInput> = {}): DayCloseInput => ({
  dayKey, habits: { scheduled: 0, completed: 0 }, tasks: { planned: 0, completed: 0 }, closedAt: AT, ...over,
});
const close = (s: ProgressionState, i: DayCloseInput) => {
  const r = closeDay(s, i);
  if (r.status === 'OUT_OF_ORDER') throw new Error(r.missing);
  return r.state;
};
const upTo = (s: ProgressionState, until: string) =>
  pendingDays(s, until).reduce((acc, d) => close(acc, input(d)), s);
const MET = { habits: { scheduled: 5, completed: 4 }, habitGoalPct: 80 };
const FAILED = { habits: { scheduled: 5, completed: 0 }, habitGoalPct: 80 };

describe('Sunday boost (+25%)', () => {
  it('knows which keys are Sundays', () => {
    expect(weekdayOfKey(SUNDAY)).toBe(0);
    expect(weeklyBoostFor(SUNDAY)).toBe(1.25);
    expect(weeklyBoostFor('2026-01-12')).toBe(1);
  });

  it('boosts gold/XP rewards with rounding, never losses', () => {
    expect(boostReward(100, SUNDAY)).toBe(125);
    expect(boostReward(10, SUNDAY)).toBe(13);
    expect(boostReward(-10, SUNDAY)).toBe(-10);
    expect(boostReward(10, '2026-01-12')).toBe(10);
  });

  it('boosts close gains but not losses', () => {
    const s = upTo(createProgressionState(REG), SUNDAY);
    expect(dayTotal(close(s, input(SUNDAY, { habits: { scheduled: 5, completed: 5 }, habitGoalPct: 80 })), SUNDAY)).toBe(8); // 6 × 1.25 = 7.5
    expect(dayTotal(close(s, input(SUNDAY, FAILED)), SUNDAY)).toBe(-3);
  });

  it('focus on Sunday: 8 hours give 10 thanks to cumulative rounding', () => {
    const s = upTo(createProgressionState(REG), SUNDAY);
    expect(dayTotal(awardFocus(s, SUNDAY, 600, AT).state, SUNDAY)).toBe(10);
  });

  it('stacks with the first week (×2 × 1.25)', () => {
    const s = upTo(createProgressionState(REG), '2026-01-04'); // Sunday inside the first week
    expect(dayTotal(close(s, input('2026-01-04', MET)), '2026-01-04')).toBe(13); // 5 × 2.5 = 12.5
  });
});

describe('purchased shields', () => {
  const base = () => upTo(createProgressionState(REG), '2026-01-08');

  it('a purchased shield protects a day even with no earned shields', () => {
    const req = requestShield(base(), '2026-01-08', 'PURCHASED');
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const s = close(req.state, input('2026-01-08', FAILED));
    expect(dayTotal(s, '2026-01-08')).toBe(0);
    expect(s.dayCloses['2026-01-08'].shieldSource).toBe('PURCHASED');
    expect(s.shieldRequests['2026-01-08']).toBeUndefined();
  });

  it('earned shields can only be requested when available', () => {
    expect(requestShield(base(), '2026-01-08', 'EARNED')).toEqual({ ok: false, reason: 'NO_SHIELDS' });
  });

  it('a purchased shield does not consume earned ones', () => {
    let s = base();
    for (let i = 0; i < 7; i++) s = close(s, input(`2026-01-${String(8 + i).padStart(2, '0')}`, MET));
    expect(availableEarnedShields(s)).toBe(1);
    const req = requestShield(s, '2026-01-15', 'PURCHASED');
    if (!req.ok) throw new Error('expected ok');
    s = close(req.state, input('2026-01-15', FAILED));
    expect(replay(s).shields).toBe(1);
    expect(replay(s).streak).toBe(7);
  });

  it('cannot stack two shields on a day or shield a closed day', () => {
    const r1 = requestShield(base(), '2026-01-08', 'PURCHASED');
    if (!r1.ok) throw new Error('expected ok');
    expect(requestShield(r1.state, '2026-01-08', 'PURCHASED')).toEqual({ ok: false, reason: 'ALREADY_ACTIVE' });
    expect(requestShield(base(), '2026-01-07', 'PURCHASED')).toEqual({ ok: false, reason: 'DAY_CLOSED' });
  });
});

describe('XP grants', () => {
  it('are granted once per id and boosted on Sunday', () => {
    let s = createProgressionState(REG);
    s = awardXp(s, { id: 'habit:h1:2026-01-11', dayKey: SUNDAY, at: AT, source: 'HABIT', base: 10 }).state;
    s = awardXp(s, { id: 'habit:h1:2026-01-11', dayKey: SUNDAY, at: AT, source: 'HABIT', base: 10 }).state;
    s = awardXp(s, { id: 'task:t1', dayKey: '2026-01-12', at: AT, source: 'TASK', base: 15 }).state;
    expect(totalXp(s)).toBe(13 + 15);
  });
});
