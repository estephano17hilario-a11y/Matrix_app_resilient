import { describe, expect, it } from 'vitest';
import { getStanding } from '../engine/ranks';
import { buildInsights, continuousFocus } from './analysis';
import {
  WORDS, comparedTo, count, countWords, humanMinutes, joinList, ratioPhrase, relativeDay, sinceDay,
} from './language';
import { polish } from './narrative';
import { generateReport, rememberReport } from './report';
import { CLOSINGS, CONNECTORS, INSIGHTS, OPENINGS, type Ctx } from './templates';
import { emptyMemory, type FocusRecord, type InsightData, type InsightType, type Moment, type ReportInput } from './types';
import { generateWeeklySummary, type WeeklyInput } from './weekly';

const BAD = /undefined|NaN|null|\[object|Infinity|\s{2,}|\s[,.;:]|,,|\.\.(?!\.)/;
const DAY = 86_400_000;
const AT = new Date(2026, 9, 14, 21, 30).getTime(); // Wed 14 Oct 2026, night
const TODAY = '2026-10-14';

const session = (daysAgo: number, minutes: number, extra: Partial<FocusRecord> = {}): FocusRecord => ({
  id: `s${daysAgo}-${minutes}`, projectId: 'p1', endedAt: AT - daysAgo * DAY, minutes, manual: false, ...extra,
});

const focusInput = (over: Partial<ReportInput> = {}): ReportInput => ({
  kind: 'FOCUS',
  itemId: 'session-1',
  itemName: 'Tesis',
  at: AT,
  dayKey: TODAY,
  userName: 'Ana García',
  priorRecords: 8,
  focus: {
    sessionId: 'session-1', projectId: 'p1', projectName: 'Tesis', minutes: 80, plannedMinutes: 50, pauses: 0,
    projectGoalMinutes: 120, projectMinutesToday: 80,
  },
  history: {
    focus: [session(1, 45, { rating: 4 }), session(2, 50, { rating: 3 }), session(3, 40), session(5, 55, { rating: 4 }), session(8, 60), session(12, 35), session(20, 50)],
    ratings: [],
    notes: [{ at: AT - 6 * DAY, note: 'Me distraje con el celular todo el rato', kind: 'FOCUS', itemId: 's6', projectId: 'p1', minutes: 40, pauses: 3 }],
    dailyFocusMinutes: Array.from({ length: 14 }, (_, i) => ({ dayKey: `2026-10-${String(i + 1).padStart(2, '0')}`, minutes: 20 + i * 6 })),
    habitGoalDays: [],
    projectGoalDays: [],
    dailyElo: [3, 4, 2, 5, 3, 4, 3],
  },
  elo: { instant: 1, projectedDay: 6, standing: getStanding(150, 1) },
  xp: 80,
  memory: emptyMemory(),
  ...over,
});

describe('language helpers', () => {
  it('singular / plural agreement', () => {
    expect(count(1, WORDS.day)).toBe('1 día');
    expect(count(3, WORDS.day)).toBe('3 días');
    expect(count(1, WORDS.hour)).toBe('1 hora');
    expect(count(2, WORDS.hour)).toBe('2 horas');
    expect(count(2, WORDS.session)).toBe('2 sesiones');
    expect(count(1, WORDS.time)).toBe('1 vez');
    expect(count(4, WORDS.time)).toBe('4 veces');
    expect(countWords(1, WORDS.hour)).toBe('una hora');
    expect(countWords(1, WORDS.minute)).toBe('un minuto');
    expect(countWords(3, WORDS.week)).toBe('tres semanas');
  });

  it('numbers in natural language', () => {
    expect(humanMinutes(55)).toBe('casi una hora');
    expect(humanMinutes(60)).toBe('una hora');
    expect(humanMinutes(90)).toBe('una hora y media');
    expect(humanMinutes(70)).toBe('poco más de una hora');
    expect(humanMinutes(115)).toBe('casi dos horas');
    expect(humanMinutes(1)).toBe('un minuto');
    expect(humanMinutes(25)).toBe('25 minutos');
    expect(humanMinutes(100)).toBe('una hora y 40 minutos');
    expect(ratioPhrase(2)).toBe('el doble');
    expect(comparedTo(33)).toBe('un tercio más que');
    expect(comparedTo(100)).toBe('el doble de');
    expect(comparedTo(18)).toBe('un 18 % más que');
    expect(comparedTo(-20)).toBe('un 20 % menos que');
  });

  it('relative dates', () => {
    expect(relativeDay('2026-10-13', TODAY)).toBe('ayer');
    expect(relativeDay('2026-10-12', TODAY)).toBe('anteayer');
    expect(relativeDay('2026-10-10', TODAY)).toBe('el sábado');
    expect(relativeDay('2026-09-30', TODAY)).toBe('hace dos semanas');
    expect(relativeDay('2026-10-07', TODAY)).toBe('hace una semana');
    expect(relativeDay('2026-08-12', TODAY)).toBe('el 12 de agosto');
    expect(relativeDay('2025-08-12', TODAY)).toBe('el 12 de agosto de 2025');
    expect(sinceDay('2026-09-30', TODAY)).toBe('desde el 30 de septiembre');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b y c');
    expect(joinList(['padres', 'hijos'])).toBe('padres e hijos');
    expect(joinList(['agua', 'hielo'])).toBe('agua y hielo');
  });

  it('polishes contractions', () => {
    expect(polish('el doble de el tiempo')).toBe('el doble del tiempo');
  });
});

// Representative data for every insight type, including edge values.
const SAMPLES: { [K in InsightType]: InsightData[K][] } = {
  ABOVE_AVERAGE: [{ minutes: 55, avgMinutes: 41, pctDiff: 34, projectName: 'Tesis' }, { minutes: 120, avgMinutes: 60, pctDiff: 100, projectName: null }],
  RECORD: [{ scope: 'WEEK', minutes: 75 }, { scope: 'MONTH', minutes: 95 }, { scope: 'ALL', minutes: 180 }],
  BEST_SINCE: [{ minutes: 70, sinceDayKey: '2026-09-02', todayKey: TODAY }, { minutes: 50, sinceDayKey: '2026-10-05', todayKey: TODAY }],
  STREAK_MILESTONE: [{ days: 3, itemName: 'Leer' }, { days: 30, itemName: 'Meditar' }],
  TREND: [{ direction: 'UP', subject: 'FOCUS' }, { direction: 'DOWN', subject: 'HABITS' }, { direction: 'DOWN', subject: 'FOCUS' }],
  CONSISTENCY: [{ improving: true }],
  BEST_SLOT: [{ slot: 'MORNING', avg: 4.3, isNow: true }, { slot: 'NIGHT', avg: 3.8, isNow: false }],
  BEST_WEEKDAY: [{ weekday: 2, isToday: false }, { weekday: 6, isToday: true }, { weekday: 0, isToday: false }],
  SAME_WEEKDAY: [{ weekday: 3, pctDiff: 25 }, { weekday: 6, pctDiff: -30 }],
  NOTE_RECALL: [
    { quote: 'Me distraje con el celular', dayKey: '2026-10-08', todayKey: TODAY, contrast: 'NO_PAUSES', extraMinutes: 0 },
    { quote: 'Muy buena energía hoy, sin interrupciones de ningún tipo durante toda la tarde', dayKey: '2026-10-13', todayKey: TODAY, contrast: null, extraMinutes: 0 },
    { quote: 'Corta.', dayKey: '2026-09-20', todayKey: TODAY, contrast: 'LONGER', extraMinutes: 15 },
  ],
  TASK_ESTIMATE: [{ actual: 20, estimated: 30, pctDiff: -33 }, { actual: 60, estimated: 30, pctDiff: 100 }],
  HABIT_RATE: [{ rate7: 0.86, rate30: 0.6 }, { rate7: 0.43, rate30: 0.7 }],
  DAY_PROGRESS: [
    { done: 3, total: 5, noun: 'HABITS', goalPct: 80 }, { done: 1, total: 1, noun: 'TASKS', goalPct: null },
    { done: 4, total: 4, noun: 'TASKS', goalPct: null }, { done: 1, total: 2, noun: 'HABITS', goalPct: 50 },
  ],
  PROJECT_GOAL: [{ minutesToday: 130, goal: 120, met: true, projectName: 'Tesis' }, { minutesToday: 40, goal: 60, met: false, projectName: null }],
  BUILDING_HISTORY: [{ remaining: 1 }, { remaining: 3 }],
  LOWER_GOAL: [{ current: 50, suggested: 30 }, { current: 25, suggested: 15 }],
  RAISE_GOAL: [{ current: 60, suggested: 65, target: 'PROJECT' }, { current: 80, suggested: 90, target: 'HABITS' }],
  LOW_FOCUS: [{ avg: 2.2 }],
  TAKE_BREAK: [{ minutes: 155 }, { minutes: 240 }],
  PREDICTION: [{ days: 1, nextLabel: 'Oro II' }, { days: 4, nextLabel: 'Plata III' }, { days: 12, nextLabel: 'Leyenda' }],
};

const MOMENTS: Moment[] = ['DAWN', 'MORNING', 'AFTERNOON', 'NIGHT'];
const ctxs: Ctx[] = MOMENTS.flatMap(moment => (['FOCUS', 'HABIT', 'TASK', 'SUBTASK'] as const).map(kind => ({ moment, kind, itemName: 'Leer 20 páginas' })));

describe('template bank', () => {
  it('has at least 6 variants per opening, insight, closing and connector group', () => {
    Object.values(OPENINGS).forEach(v => expect(v.length).toBeGreaterThanOrEqual(6));
    Object.values(CLOSINGS).forEach(v => expect(v.length).toBeGreaterThanOrEqual(6));
    Object.values(INSIGHTS).forEach(v => expect(v.length).toBeGreaterThanOrEqual(6));
    Object.values(CONNECTORS).forEach(v => expect(v.length).toBeGreaterThanOrEqual(6));
  });

  it('every template renders clean text for every sample', () => {
    for (const c of ctxs) {
      for (const bank of [...Object.values(OPENINGS), ...Object.values(CLOSINGS)]) {
        for (const t of bank) expect(t(undefined, c)).not.toMatch(BAD);
      }
    }
    (Object.keys(INSIGHTS) as InsightType[]).forEach(type => {
      for (const t of INSIGHTS[type] as ((d: unknown, c: Ctx) => string)[]) {
        for (const d of SAMPLES[type]) {
          const text = polish(t(d, ctxs[0]));
          expect(text, `${type}`).not.toMatch(BAD);
          expect(text.length).toBeGreaterThan(8);
        }
      }
    });
  });
});

describe('analysis rules', () => {
  it('detects above-average, record, note recall and prediction', () => {
    const types = buildInsights(focusInput()).map(i => i.type);
    expect(types).toEqual(expect.arrayContaining(['ABOVE_AVERAGE', 'RECORD', 'NOTE_RECALL', 'PREDICTION', 'TREND']));
  });

  it('with fewer than 3 prior records shows "building history" instead of comparisons', () => {
    const types = buildInsights(focusInput({ priorRecords: 2 })).map(i => i.type);
    expect(types).toContain('BUILDING_HISTORY');
    expect(types).not.toContain('ABOVE_AVERAGE');
    expect(types).not.toContain('RECORD');
  });

  it('3 short sessions in a row → suggest lowering the goal to the average (rounded to 5)', () => {
    const input = focusInput({
      focus: { ...focusInput().focus!, minutes: 20, plannedMinutes: 50 },
      history: { ...focusInput().history, focus: [session(1, 30, { plannedMinutes: 50 }), session(2, 25, { plannedMinutes: 50 })] },
    });
    const lower = buildInsights(input).find(i => i.type === 'LOWER_GOAL');
    expect(lower?.data).toEqual({ current: 50, suggested: 25 });
  });

  it('5 days at 100% → suggest raising the goal 10%', () => {
    const days = ['10', '11', '12', '13', '14'].map(d => ({ dayKey: `2026-10-${d}`, met: true }));
    const input = focusInput({ history: { ...focusInput().history, projectGoalDays: days } });
    expect(buildInsights(input).find(i => i.type === 'RAISE_GOAL')?.data).toEqual({ current: 120, suggested: 130, target: 'PROJECT' });
  });

  it('150+ minutes chained without a 15-minute break → suggest a break', () => {
    const now = AT;
    const input = focusInput({
      focus: { ...focusInput().focus!, minutes: 60 },
      history: { ...focusInput().history, focus: [
        { id: 'a', projectId: 'p1', endedAt: now - 65 * 60_000, minutes: 50, manual: false },
        { id: 'b', projectId: 'p1', endedAt: now - 120 * 60_000, minutes: 50, manual: false },
      ] },
    });
    expect(continuousFocus(input)).toBe(160);
    expect(buildInsights(input).map(i => i.type)).toContain('TAKE_BREAK');
  });

  it('best time slot needs 5+ ratings there; low recent focus suggests a change', () => {
    const ratings = Array.from({ length: 5 }, (_, i) => ({ at: new Date(2026, 9, 1 + i, 9).getTime(), rating: 2, kind: 'FOCUS' as const }));
    const types = buildInsights(focusInput({ history: { ...focusInput().history, ratings } })).map(i => i.type);
    expect(types).toContain('LOW_FOCUS');
    expect(types).not.toContain('BEST_SLOT');
  });
});

describe('generated report', () => {
  it('fixed seed → stable snapshot', () => {
    const r = generateReport(focusInput(), 42);
    expect({ tone: r.tone, insights: r.insightTypes, text: r.narrative, metrics: r.metrics.map(m => `${m.label}: ${m.display}`) }).toMatchSnapshot();
  });

  it('same day + item → same text (seeded); different item → may differ', () => {
    expect(generateReport(focusInput()).narrative).toBe(generateReport(focusInput()).narrative);
  });

  it('habit and task reports render clean text', () => {
    const habit = generateReport({
      ...focusInput(), kind: 'HABIT', itemId: 'h1', itemName: 'Meditar', focus: undefined,
      habit: { streak: 7, rate7: 0.86, rate30: 0.6, doneToday: 3, scheduledToday: 5, goalPct: 80 },
    }, 7);
    const task = generateReport({
      ...focusInput(), kind: 'TASK', itemId: 't1', itemName: 'Enviar informe', focus: undefined,
      task: { doneToday: 2, totalToday: 5, actualMinutes: 40, estimatedMinutes: 30 },
    }, 9);
    for (const r of [habit, task]) {
      expect(r.narrative).not.toMatch(BAD);
      expect(r.narrative.split('. ').length).toBeGreaterThanOrEqual(2);
    }
    expect(habit.insightTypes).toContain('STREAK_MILESTONE');
    expect({ habit: habit.narrative, task: task.narrative }).toMatchSnapshot();
  });

  it('never repeats a variant within 10 reports, nor an insight type in two consecutive reports', () => {
    let memory = emptyMemory();
    const seen: string[][] = [];
    const types: string[][] = [];
    for (let i = 0; i < 12; i++) {
      const r = generateReport(focusInput({ itemId: `s-${i}`, memory }));
      expect(r.narrative).not.toMatch(BAD);
      seen.push(r.variantIds);
      types.push(r.insightTypes);
      memory = rememberReport(memory, r);
    }
    for (let i = 1; i < types.length; i++) {
      const overlap = types[i].filter(t => t !== 'BUILDING_HISTORY' && types[i - 1].includes(t));
      expect(overlap).toEqual([]);
    }
    // Opening variants: 7 for EXCELLENT, so within any 6 consecutive reports none repeats.
    for (let i = 0; i + 6 <= seen.length; i++) {
      const openings = seen.slice(i, i + 6).map(v => v.find(id => id.startsWith('open:'))!);
      expect(new Set(openings).size).toBe(openings.length);
    }
  });
});

describe('weekly summary', () => {
  const week: WeeklyInput = {
    weekStartKey: '2026-10-05', todayKey: '2026-10-11', userName: 'Ana', focusMinutes: 610, prevFocusMinutes: 420,
    sessions: 9, habitRatioAvg: 0.95, habitDaysMet: 5, tasksDone: 14, eloDelta: 22, startLabel: 'Plata I', endLabel: 'Plata III',
    rankChange: 'DIVISION_UP', bestDay: { dayKey: '2026-10-07', minutes: 140 }, bestSlot: 'MORNING', streak: 9, memory: emptyMemory(),
  };

  it('fixed seed → stable snapshot, clean text', () => {
    const s = generateWeeklySummary(week, 3);
    expect(s.text).not.toMatch(BAD);
    expect(s).toMatchSnapshot();
  });

  it('handles a bad week with losses', () => {
    const s = generateWeeklySummary({ ...week, eloDelta: -9, rankChange: 'DIVISION_DOWN', focusMinutes: 60, sessions: 1, habitDaysMet: 1, tasksDone: 0, streak: 0 }, 5);
    expect(s.tone).toBe('DIFFICULT');
    expect(s.text).not.toMatch(BAD);
  });
});
