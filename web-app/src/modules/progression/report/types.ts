import type { DayKey } from '../engine/dayKey';
import type { Standing } from '../engine/ranks';

export type CompletionKind = 'FOCUS' | 'HABIT' | 'TASK' | 'SUBTASK';

export interface FocusRecord {
  id: string;
  projectId: string | null;
  /** Epoch ms when the session ended. */
  endedAt: number;
  minutes: number;
  plannedMinutes?: number | null;
  pauses?: number | null;
  rating?: number | null;
  manual: boolean;
}

export interface RatedRecord { at: number; rating: number; kind: CompletionKind }

export interface NoteRecord {
  at: number;
  note: string;
  kind: CompletionKind;
  itemId: string;
  projectId?: string | null;
  minutes?: number | null;
  pauses?: number | null;
}

/** What the writer remembers between reports (anti-repetition + rarity). */
export interface ReportMemory {
  /** Variant ids used, most recent first (only the last 10 reports matter). */
  recentVariants: string[][];
  /** Insight types per report, most recent first. */
  recentInsightTypes: string[][];
  /** How many times each insight type has been shown overall. */
  shownCounts: Record<string, number>;
}

export const emptyMemory = (): ReportMemory => ({ recentVariants: [], recentInsightTypes: [], shownCounts: {} });

export interface ReportInput {
  kind: CompletionKind;
  itemId: string;
  itemName: string;
  /** Epoch ms of the completion. */
  at: number;
  dayKey: DayKey;
  userName?: string | null;
  /** Earlier records of the same kind (sessions of this project, completions of this habit…). */
  priorRecords: number;

  focus?: {
    sessionId: string;
    projectId: string | null;
    projectName?: string | null;
    minutes: number;
    plannedMinutes: number | null;
    pauses: number;
    projectGoalMinutes: number | null;
    /** Minutes in this project today, including this session. */
    projectMinutesToday: number;
  };
  habit?: {
    streak: number;
    rate7: number; // 0..1
    rate30: number; // 0..1
    doneToday: number;
    scheduledToday: number;
    goalPct: number;
  };
  task?: {
    doneToday: number;
    totalToday: number;
    actualMinutes: number | null;
    estimatedMinutes: number | null;
    parentName?: string | null;
  };

  history: {
    /** Previous focus sessions, any project, excluding this one. */
    focus: FocusRecord[];
    ratings: RatedRecord[];
    notes: NoteRecord[];
    /** Focus minutes per day, oldest first, ending today (≥ 14 entries ideally). */
    dailyFocusMinutes: { dayKey: DayKey; minutes: number }[];
    /** Habit compliance ratio r per closed day, oldest first. */
    habitGoalDays: { dayKey: DayKey; ratio: number }[];
    /** Whether this project's daily goal was met, oldest first, ending today. */
    projectGoalDays: { dayKey: DayKey; met: boolean }[];
    /** Daily ELO totals of the last 7 days. */
    dailyElo: number[];
  };

  elo: { instant: number; projectedDay: number; standing: Standing };
  xp: number;
  memory: ReportMemory;
}

export type InsightRole = 'body' | 'suggestion';
export type Polarity = 'positive' | 'neutral' | 'negative';

export interface Insight<T extends InsightType = InsightType> {
  type: T;
  role: InsightRole;
  polarity: Polarity;
  /** 0..1 — how big the change is. */
  magnitude: number;
  data: InsightData[T];
  /** Filled by the scorer. */
  score?: number;
}

export interface InsightData {
  ABOVE_AVERAGE: { minutes: number; avgMinutes: number; pctDiff: number; projectName: string | null };
  RECORD: { scope: 'WEEK' | 'MONTH' | 'ALL'; minutes: number };
  BEST_SINCE: { minutes: number; sinceDayKey: DayKey; todayKey: DayKey };
  STREAK_MILESTONE: { days: number; itemName: string };
  TREND: { direction: 'UP' | 'DOWN'; subject: 'FOCUS' | 'HABITS' };
  CONSISTENCY: { improving: boolean };
  BEST_SLOT: { slot: 'MORNING' | 'AFTERNOON' | 'NIGHT'; avg: number; isNow: boolean };
  BEST_WEEKDAY: { weekday: number; isToday: boolean };
  SAME_WEEKDAY: { weekday: number; pctDiff: number };
  NOTE_RECALL: { quote: string; dayKey: DayKey; todayKey: DayKey; contrast: 'NO_PAUSES' | 'LONGER' | null; extraMinutes: number };
  TASK_ESTIMATE: { actual: number; estimated: number; pctDiff: number };
  HABIT_RATE: { rate7: number; rate30: number };
  DAY_PROGRESS: { done: number; total: number; noun: 'HABITS' | 'TASKS'; goalPct: number | null };
  PROJECT_GOAL: { minutesToday: number; goal: number; met: boolean; projectName: string | null };
  BUILDING_HISTORY: { remaining: number };
  LOWER_GOAL: { current: number; suggested: number };
  RAISE_GOAL: { current: number; suggested: number; target: 'PROJECT' | 'HABITS' };
  LOW_FOCUS: { avg: number };
  TAKE_BREAK: { minutes: number };
  PREDICTION: { days: number; nextLabel: string };
}

export type InsightType = keyof InsightData;

export type Tone = 'EXCELLENT' | 'GOOD' | 'REGULAR' | 'DIFFICULT';
export type Moment = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'NIGHT';

export interface ReportMetric {
  id: string;
  label: string;
  value: number;
  /** Rendered value ("52 min", "104 %"); the number above drives the count-up. */
  display: string;
  hint?: string;
}

export interface CompletionReport {
  kind: CompletionKind;
  itemName: string;
  at: number;
  tone: Tone;
  metrics: ReportMetric[];
  insights: Insight[];
  narrative: string;
  variantIds: string[];
  insightTypes: InsightType[];
}
