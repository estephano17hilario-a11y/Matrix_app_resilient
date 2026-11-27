import { describe, expect, it } from 'vitest';
import { computeValue, defaultAnswers, guessCurrency, offerEndsAt } from './valueCalc';

describe('computeValue', () => {
  it('values the time of someone who works', () => {
    const r = computeValue({ ...defaultAnswers(), works: true, monthlyIncome: 1760, workHoursPerDay: 8, workDaysPerMonth: 22, procrastinationHoursPerDay: 3 });
    expect(r.hourValue).toBe(10);
    expect(r.recoveredHoursPerDay).toBe(1.2);
    expect(r.moneyPerDay).toBe(12);
    expect(r.moneyPerMonth).toBe(360);
    expect(r.moneyPerYear).toBe(4380);
    expect(r.hoursPerYear).toBe(438);
    expect(r.wakingDaysPerYear).toBe(27.4);
    expect(r.lostMoneyPerDay).toBe(30);
  });

  it('counts only time when the user does not work', () => {
    const r = computeValue({ ...defaultAnswers(), works: false, activities: ['study', 'business'], studyHoursPerDay: 4, businessHoursPerDay: 2, procrastinationHoursPerDay: 5 });
    expect(r.hourValue).toBeNull();
    expect(r.moneyPerDay).toBeNull();
    expect(r.recoveredHoursPerDay).toBe(2);
    expect(r.productiveHoursPerDay).toBe(6);
    expect(r.wakingMonthsIn10Years).toBeGreaterThan(5);
  });

  it('caps recovered time and survives bad input', () => {
    const r = computeValue({ ...defaultAnswers(), procrastinationHoursPerDay: 40, monthlyIncome: NaN });
    expect(r.recoveredHoursPerDay).toBe(4);
    expect(Number.isFinite(r.moneyPerDay ?? 0)).toBe(true);
  });
});

describe('helpers', () => {
  it('guesses currency from locale', () => {
    expect(guessCurrency('es-MX')).toBe('MXN');
    expect(guessCurrency('es-PE')).toBe('PEN');
    expect(guessCurrency('en')).toBe('USD');
  });
  it('ends the offer on Dec 31', () => {
    const d = new Date(offerEndsAt(new Date(2026, 10, 26)));
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(31);
  });
});
