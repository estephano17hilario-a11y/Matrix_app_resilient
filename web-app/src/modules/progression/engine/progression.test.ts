import { describe, expect, it } from 'vitest';
import { PROGRESSION_CONFIG } from './config';
import { addDaysToKey } from './dayKey';
import {
  awardFocus, closeDay, createProgressionState, dayTotal, pendingDays, projectDay, replay,
  type DayCloseInput, type EloEvent, type ProgressionState,
} from './progression';

const START = PROGRESSION_CONFIG.ELO.START;
const REG = '2026-01-01';
const AT = Date.UTC(2026, 0, 1);

const input = (dayKey: string, over: Partial<DayCloseInput> = {}): DayCloseInput => ({
  dayKey,
  habits: { scheduled: 0, completed: 0 },
  tasks: { planned: 0, completed: 0 },
  closedAt: AT,
  ...over,
});

const MET = { habits: { scheduled: 5, completed: 4 }, habitGoalPct: 80 }; // r = 1 → +5
const FAILED = { habits: { scheduled: 5, completed: 0 }, habitGoalPct: 80 }; // r = 0 → −3

const close = (s: ProgressionState, i: DayCloseInput) => {
  const res = closeDay(s, i);
  if (res.status === 'OUT_OF_ORDER') throw new Error(`out of order, missing ${res.missing}`);
  return res.state;
};

/** Closes every pending day before `untilKey` with empty input (no events). */
const fastForward = (s: ProgressionState, untilKey: string) =>
  pendingDays(s, untilKey).reduce((acc, d) => close(acc, input(d)), s);

/** State registered on REG with the first week already behind it. */
const veteran = () => fastForward(createProgressionState(REG), '2026-01-08');

const closeStreak = (s: ProgressionState, from: string, days: number) => {
  let st = s;
  for (let i = 0; i < days; i++) st = close(st, input(addDaysToKey(from, i), MET));
  return st;
};

describe('day close idempotency', () => {
  it('closing the same day twice applies nothing the second time', () => {
    const s0 = veteran();
    const first = closeDay(s0, input('2026-01-08', MET));
    expect(first.status).toBe('CLOSED');
    const second = closeDay(first.state, input('2026-01-08', FAILED));
    expect(second.status).toBe('ALREADY_CLOSED');
    expect(second.state).toBe(first.state);
    expect(replay(second.state).elo).toBe(START + 5);
  });

  it('event ids are deterministic, so merging the same close twice dedupes', () => {
    const s0 = veteran();
    const a = closeDay(s0, input('2026-01-08', MET));
    const b = closeDay(s0, input('2026-01-08', MET));
    if (a.status !== 'CLOSED' || b.status !== 'CLOSED') throw new Error('expected both to close');
    expect(a.events.map(e => e.id)).toEqual(b.events.map(e => e.id));
    // Merging b's events into a's state adds nothing new.
    const merged = new Set([...a.state.events, ...b.events].map(e => e.id));
    expect(merged.size).toBe(a.state.events.length);
  });

  it('days must be closed in order', () => {
    const res = closeDay(veteran(), input('2026-01-10', MET));
    expect(res.status).toBe('OUT_OF_ORDER');
    if (res.status === 'OUT_OF_ORDER') expect(res.missing).toBe('2026-01-08');
  });

  it('pendingDays starts on the registration day and excludes today', () => {
    expect(pendingDays(createProgressionState(REG), '2026-01-03')).toEqual(['2026-01-01', '2026-01-02']);
  });

  it('existing users start closing on their start day, not on registration', () => {
    const s = { ...createProgressionState('2025-03-01'), startDayKey: '2026-01-02' };
    expect(pendingDays(s, '2026-01-03')).toEqual(['2026-01-02']);
  });
});

describe('daily caps', () => {
  it('total loss per day is capped at −8', () => {
    const s = close(veteran(), input('2026-01-08', {
      ...FAILED,
      tasks: { planned: 4, completed: 0 },
      projects: [
        { id: 'a', goalMinutes: 60, timerMinutes: 0 },
        { id: 'b', goalMinutes: 60, timerMinutes: 10 },
        { id: 'c', goalMinutes: 30, timerMinutes: 0 },
      ],
    }));
    expect(dayTotal(s, '2026-01-08')).toBe(-8); // raw −3 −3 −2 −2 −2 = −12
    expect(s.events.map(e => [e.source, e.amount])).toEqual([
      ['HABITS', -3], ['TASKS', -3], ['PROJECT_GOAL', -2],
    ]);
  });

  it('gains are not limited by the loss cap', () => {
    const s = close(veteran(), input('2026-01-08', {
      habits: { scheduled: 5, completed: 5 }, habitGoalPct: 80, // +6
      tasks: { planned: 2, completed: 2 },                      // +5
      projects: [{ id: 'a', goalMinutes: 60, timerMinutes: 20 }], // −2
    }));
    expect(dayTotal(s, '2026-01-08')).toBe(9);
  });

  it('project goals count only timer minutes', () => {
    const s = close(veteran(), input('2026-01-08', {
      projects: [{ id: 'a', goalMinutes: 60, timerMinutes: 30, manualMinutes: 60 }],
    }));
    expect(dayTotal(s, '2026-01-08')).toBe(-2);
  });

  it('focus gives +1 per hour as it is crossed, capped at +8, idempotent', () => {
    let s = veteran();
    const day = '2026-01-08';
    expect(awardFocus(s, day, 59, AT).awarded).toHaveLength(0);
    s = awardFocus(s, day, 60, AT).state;
    s = awardFocus(s, day, 125, AT).state;
    expect(dayTotal(s, day)).toBe(2);
    expect(awardFocus(s, day, 125, AT).awarded).toHaveLength(0);
    s = awardFocus(s, day, 900, AT).state;
    expect(dayTotal(s, day)).toBe(8);
    expect(awardFocus(s, day, 2000, AT).awarded).toHaveLength(0);
  });

  it('every account starts with 50 ELO', () => {
    expect(START).toBe(50);
    expect(replay(createProgressionState(REG)).elo).toBe(50);
    expect(replay(close(veteran(), input('2026-01-08', FAILED))).elo).toBe(START - 3);
  });

  it('ELO never goes below 0', () => {
    const big: EloEvent = { id: 'x', dayKey: '2026-01-08', at: AT, source: 'HABITS', amount: -500, reason: 'TEST' };
    const s = { ...veteran(), events: [big] };
    expect(replay(s).elo).toBe(0);
    expect(replay({ ...s, events: [big, { ...big, id: 'y', amount: 4 }] }).elo).toBe(4);
  });
});

describe('first-week bonus', () => {
  it('gains count double during the first 7 days', () => {
    const s = close(createProgressionState(REG), input(REG, { habits: { scheduled: 5, completed: 5 }, habitGoalPct: 80 }));
    expect(dayTotal(s, REG)).toBe(12);
  });

  it('losses are not doubled', () => {
    let s = close(createProgressionState(REG), input(REG, { habits: { scheduled: 5, completed: 5 }, habitGoalPct: 80 })); // +12
    s = close(s, input('2026-01-02', FAILED));
    expect(dayTotal(s, '2026-01-02')).toBe(-3);
    expect(replay(s).elo).toBe(START + 9);
  });

  it('applies to focus too, and ends after day 7', () => {
    const s = fastForward(createProgressionState(REG), '2026-01-07');
    expect(awardFocus(s, '2026-01-07', 60, AT).awarded[0].amount).toBe(2); // day index 6
    expect(awardFocus(s, '2026-01-08', 60, AT).awarded[0].amount).toBe(1); // day index 7
  });
});

describe('streaks & shields', () => {
  it('milestone bonuses at 3 and 7 days, a shield every 7', () => {
    const s = closeStreak(veteran(), '2026-01-08', 7);
    const sum = replay(s);
    expect(sum.streak).toBe(7);
    expect(sum.shields).toBe(1);
    // 2026-01-11 is a Sunday: +5 x 1.25 -> +6
    expect(sum.elo).toBe(START + 7 * 5 + 1 + 1 + 3);
  });

  it('breaking a 7+ day streak costs −2 extra', () => {
    let s = closeStreak(veteran(), '2026-01-08', 7);
    s = close(s, input('2026-01-15', FAILED));
    expect(dayTotal(s, '2026-01-15')).toBe(-5);
    expect(replay(s).streak).toBe(0);
  });

  it('breaking a short streak has no extra penalty', () => {
    let s = closeStreak(veteran(), '2026-01-08', 3);
    s = close(s, input('2026-01-11', FAILED));
    expect(dayTotal(s, '2026-01-11')).toBe(-3);
  });

  it('a shield day: no losses, streak kept, no habit/task gains, focus still counts', () => {
    let s = closeStreak(veteran(), '2026-01-08', 7);
    s = awardFocus(s, '2026-01-15', 60, AT).state;
    s = close(s, input('2026-01-15', { ...FAILED, tasks: { planned: 3, completed: 3 }, shield: 'EARNED' }));
    expect(dayTotal(s, '2026-01-15')).toBe(1);
    const sum = replay(s);
    expect(sum.streak).toBe(7);
    expect(sum.shields).toBe(0);
    s = close(s, input('2026-01-16', MET));
    expect(replay(s).streak).toBe(8);
  });

  it('asking for a shield without having one does nothing', () => {
    const s = close(veteran(), input('2026-01-08', { ...FAILED, shield: 'EARNED' }));
    expect(s.dayCloses['2026-01-08'].shieldUsed).toBe(false);
    expect(dayTotal(s, '2026-01-08')).toBe(-3);
  });

  it('shields cap at 2', () => {
    const s = closeStreak(veteran(), '2026-01-08', 21);
    expect(replay(s).shields).toBe(2);
  });

  it('a day with no habits scheduled leaves the streak untouched', () => {
    let s = closeStreak(veteran(), '2026-01-08', 2);
    s = close(s, input('2026-01-10'));
    expect(replay(s).streak).toBe(2);
  });
});

describe('history replay', () => {
  it('ELO is recomputable from the events in any stored order', () => {
    let s = closeStreak(veteran(), '2026-01-08', 10);
    s = awardFocus(s, '2026-01-12', 200, AT).state;
    s = close(s, input('2026-01-18', FAILED));
    const shuffled = { ...s, events: [...s.events].reverse() };
    expect(replay(shuffled).elo).toBe(replay(s).elo);
  });

  it('applies rank protection along the timeline', () => {
    const ev = (id: string, dayKey: string, amount: number): EloEvent =>
      ({ id, dayKey, at: AT, source: 'HABITS', amount, reason: 'TEST' });
    const s: ProgressionState = {
      ...createProgressionState(REG),
      events: [ev('a', '2026-01-01', 235 - START), ev('b', '2026-01-02', -8), ev('c', '2026-01-03', -8)],
    };
    const { steps } = replay(s);
    expect(steps.map(x => [x.eloAfter, x.rankIndexAfter])).toEqual([[235, 2], [227, 2], [219, 1]]);
  });
});

describe('projected ELO of the day', () => {
  it('adds focus already earned to what the close would give now', () => {
    let s = veteran();
    s = awardFocus(s, '2026-01-08', 130, AT).state;
    const p = projectDay(s, input('2026-01-08', MET));
    expect(p).toMatchObject({ earnedSoFar: 2, projectedClose: 5, projectedTotal: 7 });
  });
});
