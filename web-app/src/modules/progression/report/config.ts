import type { InsightType } from './types';

/** All thresholds used by the report writer. */
export const REPORT_CONFIG = {
  MIN_HISTORY: 3,
  MAX_INSIGHTS: 3,
  ABOVE_AVG_RATIO: 1.1,
  LOW_SESSION_RATIO: 0.7,
  RAISE_GOAL_DAYS: 5,
  RAISE_GOAL_PCT: 10,
  SLOT_MIN_RECORDS: 5,
  LOW_FOCUS_AVG: 2.5,
  BREAK_AFTER_MINUTES: 150,
  BREAK_MIN_MINUTES: 15,
  SAME_WEEKDAY_MIN_PCT: 15,
  CONSISTENCY_WINDOW: 7,
  CONSISTENCY_DROP: 0.25,
  TREND_DAYS: 14,
  TREND_MIN_CHANGE: 0.3,
  TREND_MIN_R2: 0.3,
  NOTE_RECALL_DAYS: 60,
  PREDICTION_MAX_DAYS: 30,
  STREAK_MILESTONES: [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365],
  /** Variants are not reused within this many previous reports. */
  NO_REPEAT_REPORTS: 10,
  /** Rarity = 1 / (1 + decay × times shown). */
  RARITY_DECAY: 0.08,
  /** Probability of addressing the user by name in a report. */
  NAME_PROBABILITY: 0.3,
  TYPEWRITER_CPS: 35,

  /** Priority weight per insight (spec order: rules first, deeper analysis after). */
  WEIGHTS: {
    RECORD: 1.3,
    STREAK_MILESTONE: 1.25,
    TAKE_BREAK: 1.2,
    ABOVE_AVERAGE: 1.1,
    LOWER_GOAL: 1.0,
    RAISE_GOAL: 1.0,
    LOW_FOCUS: 1.0,
    BEST_SLOT: 0.8,
    BUILDING_HISTORY: 0.75,
    NOTE_RECALL: 0.9,
    BEST_SINCE: 0.95,
    TREND: 0.85,
    CONSISTENCY: 0.8,
    PREDICTION: 0.85,
    SAME_WEEKDAY: 0.7,
    BEST_WEEKDAY: 0.65,
    TASK_ESTIMATE: 0.75,
    HABIT_RATE: 0.7,
    PROJECT_GOAL: 0.6,
    DAY_PROGRESS: 0.5,
  } satisfies Record<InsightType, number>,
} as const;
