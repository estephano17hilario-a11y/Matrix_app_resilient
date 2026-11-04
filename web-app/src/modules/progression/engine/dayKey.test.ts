import { describe, expect, it } from 'vitest';
import { addDaysToKey, dayEndsAt, daysBetween, getDayKey, parseCutoff } from './dayKey';

describe('day cut-off', () => {
  it('defaults to 04:00: earlier activity belongs to the previous day', () => {
    expect(getDayKey(new Date(2026, 9, 29, 3, 59))).toBe('2026-10-28');
    expect(getDayKey(new Date(2026, 9, 29, 4, 0))).toBe('2026-10-29');
    expect(getDayKey(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
  });

  it('crosses month and year boundaries', () => {
    expect(getDayKey(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
    expect(getDayKey(new Date(2026, 2, 1, 1, 0))).toBe('2026-02-28');
  });

  it('is configurable', () => {
    expect(getDayKey(new Date(2026, 9, 29, 0, 5), '00:00')).toBe('2026-10-29');
    expect(getDayKey(new Date(2026, 9, 29, 6, 29), '06:30')).toBe('2026-10-28');
    expect(getDayKey(new Date(2026, 9, 29, 6, 30), '06:30')).toBe('2026-10-29');
  });

  it('invalid cut-offs fall back to the default', () => {
    expect(parseCutoff('nope')).toBe(240);
    expect(parseCutoff('25:00')).toBe(240);
    expect(parseCutoff('4:15')).toBe(255);
  });

  it('accepts epoch ms', () => {
    expect(getDayKey(new Date(2026, 9, 29, 3, 0).getTime())).toBe('2026-10-28');
  });

  it('day arithmetic', () => {
    expect(daysBetween('2026-10-28', '2026-11-04')).toBe(7);
    expect(daysBetween('2026-11-04', '2026-10-28')).toBe(-7);
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(dayEndsAt('2026-10-28')).toEqual(new Date(2026, 9, 29, 4, 0));
  });
});
