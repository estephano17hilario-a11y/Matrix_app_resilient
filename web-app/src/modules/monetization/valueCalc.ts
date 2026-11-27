// "How much is your time worth?" — the Deluxe funnel calculator. Pure maths + persistence so the
// result can be shown later (funnel header, settings CTA).
//
// Assumptions are stated to the user in the UI (they are estimates, not promises):
//  · Lux Deluxe helps recover RECOVERY_RATE of the time the user says they lose daily.
//  · Life gained is expressed in waking time (16 h per day).

import { homeCurrency } from '../geo/countries';

export const RECOVERY_RATE = 0.4;
export const MAX_RECOVERED_HOURS = 4;
export const WAKING_HOURS = 16;
export const STORAGE_KEY = 'lux_deluxe_value_v1';
export const VALUE_EVENT = 'lux:deluxe-value';

export type Activity = 'study' | 'business';
export type Distraction = 'social' | 'games' | 'series' | 'other';

export interface ValueAnswers {
  works: boolean;
  /** Net monthly income (works = true). */
  monthlyIncome: number;
  currency: string;
  /** Paid hours per day and days per month (works = true). */
  workHoursPerDay: number;
  workDaysPerMonth: number;
  /** works = false */
  activities: Activity[];
  studyHoursPerDay: number;
  businessHoursPerDay: number;
  procrastinationHoursPerDay: number;
  distractions: Distraction[];
}

export interface ValueResult {
  /** Value of one hour of the user's time (money); null when not working. */
  hourValue: number | null;
  recoveredHoursPerDay: number;
  /** Money recovered (null when not working). */
  moneyPerDay: number | null;
  moneyPerMonth: number | null;
  moneyPerYear: number | null;
  hoursPerMonth: number;
  hoursPerYear: number;
  /** Waking days recovered per year and months in 10 years. */
  wakingDaysPerYear: number;
  wakingMonthsIn10Years: number;
  /** What procrastination costs today (before Lux). */
  lostHoursPerYear: number;
  lostMoneyPerDay: number | null;
  /** Hours per day spent on the user's main activities (work / study / business). */
  productiveHoursPerDay: number;
}

export interface SavedValue { answers: ValueAnswers; result: ValueResult; at: number }

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const clampNum = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo);

export const computeValue = (a: ValueAnswers): ValueResult => {
  const proc = clampNum(a.procrastinationHoursPerDay, 0, 16);
  const recovered = round(Math.min(MAX_RECOVERED_HOURS, proc * RECOVERY_RATE), 2);
  const hoursPerMonth = round(recovered * 30, 1);
  const hoursPerYear = round(recovered * 365, 0);
  const wakingDaysPerYear = round(hoursPerYear / WAKING_HOURS, 1);
  const wakingMonthsIn10Years = round((wakingDaysPerYear * 10) / 30, 1);

  let hourValue: number | null = null;
  let productive = 0;
  if (a.works) {
    const paidHours = clampNum(a.workHoursPerDay, 1, 16) * clampNum(a.workDaysPerMonth, 1, 31);
    hourValue = a.monthlyIncome > 0 ? a.monthlyIncome / paidHours : 0;
    productive = clampNum(a.workHoursPerDay, 0, 16);
  } else {
    productive = (a.activities.includes('study') ? clampNum(a.studyHoursPerDay, 0, 16) : 0)
      + (a.activities.includes('business') ? clampNum(a.businessHoursPerDay, 0, 16) : 0);
  }

  const money = (h: number) => (hourValue == null ? null : round(h * hourValue, 2));
  return {
    hourValue: hourValue == null ? null : round(hourValue, 2),
    recoveredHoursPerDay: recovered,
    moneyPerDay: money(recovered),
    moneyPerMonth: money(recovered * 30),
    moneyPerYear: money(recovered * 365),
    hoursPerMonth,
    hoursPerYear,
    wakingDaysPerYear,
    wakingMonthsIn10Years,
    lostHoursPerYear: round(proc * 365, 0),
    lostMoneyPerDay: money(proc),
    productiveHoursPerDay: round(productive, 1),
  };
};

// ── Formatting ──

export const CURRENCIES = ['USD', 'EUR', 'MXN', 'COP', 'PEN', 'ARS', 'CLP', 'BOB', 'GTQ', 'DOP'] as const;

export const guessCurrency = (lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US'): string => {
  const region = (lang.split('-')[1] || '').toUpperCase();
  const map: Record<string, string> = { MX: 'MXN', CO: 'COP', PE: 'PEN', AR: 'ARS', CL: 'CLP', ES: 'EUR', BO: 'BOB', GT: 'GTQ', DO: 'DOP' };
  return map[region] || 'USD';
};

export const formatMoney = (n: number | null | undefined, currency: string, lang = 'es') => {
  if (n == null || !Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(n >= 100 ? 0 : 2)}`;
  }
};

export const formatHours = (h: number) => {
  const total = Math.round(h * 60);
  if (total < 60) return `${total} min`;
  const whole = Math.floor(total / 60);
  const mins = total % 60;
  return mins ? `${whole} h ${mins} min` : `${whole} h`;
};

// ── Persistence ──

export const loadSavedValue = (): SavedValue | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SavedValue;
    return v?.answers && v?.result ? { ...v, result: computeValue(v.answers) } : null;
  } catch {
    return null;
  }
};

export const saveValue = (answers: ValueAnswers): SavedValue => {
  const saved: SavedValue = { answers, result: computeValue(answers), at: Date.now() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* storage full */ }
  try { window.dispatchEvent(new CustomEvent(VALUE_EVENT, { detail: saved })); } catch { /* no window */ }
  return saved;
};

export const defaultAnswers = (): ValueAnswers => ({
  works: true,
  monthlyIncome: 0,
  currency: homeCurrency(),
  workHoursPerDay: 8,
  workDaysPerMonth: 22,
  activities: [],
  studyHoursPerDay: 4,
  businessHoursPerDay: 3,
  procrastinationHoursPerDay: 3,
  distractions: [],
});

/** End of the current Deluxe offer: 31 Dec of this year, 23:59:59 local time. */
export const offerEndsAt = (now = new Date()) => new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime();
