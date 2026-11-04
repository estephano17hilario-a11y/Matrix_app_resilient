import { describe, expect, it } from 'vitest';
import {
  addOneMonth, checkExclusions, chestBelow, coinFlip, countedDays, dayResult, duelStanding, finalPrize, fnv1a,
  friendStreak, headToHead, maxExcluded, parseInvite, periodDays,
} from './engine';

describe('contract periods', () => {
  it('day, week and month spans', () => {
    expect(periodDays('DAY', '2026-10-25')).toEqual(['2026-10-25']);
    expect(periodDays('WEEK', '2026-10-25')).toHaveLength(7);
    const month = periodDays('MONTH', '2026-10-25');
    expect(month[0]).toBe('2026-10-25');
    expect(month[month.length - 1]).toBe('2026-11-24'); // up to the day before 25 Nov
    expect(month).toHaveLength(31);
  });

  it('month arithmetic clamps short months and leap years', () => {
    expect(addOneMonth('2026-01-31')).toBe('2026-02-28');
    expect(addOneMonth('2028-01-31')).toBe('2028-02-29');
    expect(periodDays('MONTH', '2026-02-10')).toHaveLength(28);
  });
});

describe('excluded days', () => {
  it('week: up to 4 days and an odd number counted', () => {
    expect(maxExcluded('WEEK', 7)).toBe(4);
    expect(checkExclusions('WEEK', '2026-10-25', [])).toBeNull();
    expect(checkExclusions('WEEK', '2026-10-25', ['2026-10-26'])).toBe('EVEN_TOTAL');
    expect(checkExclusions('WEEK', '2026-10-25', ['2026-10-26', '2026-10-27'])).toBeNull();
    expect(checkExclusions('WEEK', '2026-10-25', ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'])).toBe('TOO_MANY');
    expect(checkExclusions('WEEK', '2026-10-25', ['2026-11-05', '2026-10-27'])).toBe('OUTSIDE_PERIOD');
  });

  it('month: max 12 or 13 so the counted total stays odd', () => {
    expect(maxExcluded('MONTH', 31)).toBe(12);
    expect(maxExcluded('MONTH', 30)).toBe(13);
    // 31-day period with nothing excluded → 31 counted (odd) is valid
    expect(checkExclusions('MONTH', '2026-10-25', [])).toBeNull();
    // 30-day period needs an odd number of exclusions
    expect(checkExclusions('MONTH', '2026-11-25', [])).toBe('EVEN_TOTAL');
    expect(checkExclusions('MONTH', '2026-11-25', ['2026-11-30'])).toBeNull();
    const thirteen = periodDays('MONTH', '2026-11-25').slice(0, 13);
    expect(checkExclusions('MONTH', '2026-11-25', thirteen)).toBeNull();
    expect(checkExclusions('MONTH', '2026-11-25', periodDays('MONTH', '2026-11-25').slice(0, 15))).toBe('TOO_MANY');
  });

  it('counted days skip the excluded ones', () => {
    expect(countedDays('WEEK', '2026-10-25', ['2026-10-26', '2026-10-27'])).toHaveLength(5);
  });
});

describe('daily result', () => {
  it('higher score wins, then more focus, then the coin', () => {
    expect(dayResult('d', '2026-10-25', { score: 60, focusMinutes: 10 }, { score: 55, focusMinutes: 300 }).winner).toBe('A');
    expect(dayResult('d', '2026-10-25', { score: 60, focusMinutes: 10 }, { score: 60, focusMinutes: 30 })).toMatchObject({ winner: 'B', by: 'FOCUS' });
    const tie = dayResult('d', '2026-10-25', { score: 60, focusMinutes: 30 }, { score: 60, focusMinutes: 30 });
    expect(tie.by).toBe('COIN');
    expect(tie.winner).toBe(coinFlip('d', '2026-10-25'));
  });

  it('a missing day counts as zero', () => {
    expect(dayResult('d', '2026-10-25', undefined, { score: 1, focusMinutes: 0 }).winner).toBe('B');
  });

  it('the coin is deterministic and matches the Kotlin port (FNV-1a)', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
    expect(coinFlip('abc', '2026-10-25')).toBe(coinFlip('abc', '2026-10-25'));
  });
});

describe('duel standing and prizes', () => {
  const duel = { id: 'x', duration: 'WEEK' as const, start_day: '2026-10-25', excluded_days: ['2026-10-26', '2026-10-27'], stake: 500 };
  const a = { '2026-10-25': { score: 80, focusMinutes: 0 }, '2026-10-28': { score: 10, focusMinutes: 0 }, '2026-10-29': { score: 90, focusMinutes: 0 }, '2026-10-30': { score: 70, focusMinutes: 0 }, '2026-10-31': { score: 0, focusMinutes: 0 } };
  const b = { '2026-10-25': { score: 50, focusMinutes: 0 }, '2026-10-28': { score: 40, focusMinutes: 0 }, '2026-10-29': { score: 20, focusMinutes: 0 }, '2026-10-30': { score: 75, focusMinutes: 0 }, '2026-10-31': { score: 5, focusMinutes: 0 } };

  it('counts only finished days and finds the winner', () => {
    const mid = duelStanding(duel, { a, b }, '2026-10-29');
    expect(mid).toMatchObject({ winsA: 1, winsB: 1, finished: false, live: '2026-10-29', remaining: 3 });
    const end = duelStanding(duel, { a, b }, '2026-11-01');
    expect(end).toMatchObject({ winsA: 2, winsB: 3, finished: true, winner: 'B' });
  });

  it('clinches when a side has more than half', () => {
    const allA = { ...a, '2026-10-26': { score: 5, focusMinutes: 0 }, '2026-10-27': { score: 5, focusMinutes: 0 } };
    const s = duelStanding({ ...duel, excluded_days: [] }, { a: allA, b: {} }, '2026-10-29');
    expect(s.winsA).toBe(4);
    expect(s.clinched).toBe('A');
  });

  it('final prize: both stakes, the chest just below the pot, XP and achievement', () => {
    expect(finalPrize(duel)).toEqual({ gold: 1000, xp: 300, chests: [750], achievement: 'DUEL_WEEK_WIN' });
    expect(chestBelow(1000)).toBe(750);
    expect(chestBelow(100)).toBeNull();
    expect(finalPrize({ ...duel, stake: 0, duration: 'MONTH' })).toEqual({ gold: 0, xp: 1000, chests: [], achievement: 'DUEL_MONTH_WIN' });
  });

  it('head-to-head record across duels', () => {
    const end = duelStanding(duel, { a, b }, '2026-11-01');
    expect(headToHead([{ mineIsA: true, standing: end }, { mineIsA: false, standing: end }])).toEqual({ dayWins: 5, dayLosses: 5, duelWins: 1, duelLosses: 1 });
  });
});

describe('friend streak', () => {
  it('counts days both activated their HUD streak; today only once both did', () => {
    const mine = new Set(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28']);
    const theirs = new Set(['2026-10-25', '2026-10-27', '2026-10-28']);
    const s = friendStreak('2026-10-25', mine, theirs, '2026-10-28');
    expect(s.current).toBe(2); // 27 both; 28 both today
    expect(s.best).toBe(2);
    expect(s.brokeOn).toBe('2026-10-26');
    expect(s.days['2026-10-26']).toBe('ME');
    const pending = friendStreak('2026-10-25', mine, new Set(['2026-10-25', '2026-10-26', '2026-10-27']), '2026-10-28');
    expect(pending.current).toBe(3);
    expect(pending.today).toEqual({ me: true, friend: false });
  });
});

describe('invites', () => {
  it('parses codes from links and plain text', () => {
    expect(parseInvite('luxapp://invite?code=ABCD2345')).toBe('ABCD2345');
    expect(parseInvite('Únete: abcd2345')).toBe('ABCD2345');
    expect(parseInvite('nada')).toBeNull();
  });
});
