// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION CONFIG — every number used by the ELO / rank / XP engine.
//
// The engine never hard-codes a constant: tweak balance here only.
// ─────────────────────────────────────────────────────────────────────────────

export const PROGRESSION_CONFIG = {
  // ── Day boundary ──────────────────────────────────────────────────────────
  /** Local time at which a "day" ends. Activity before it counts for the previous day. */
  DAY_CUTOFF: '04:00',

  // ── Weekly boost (gold, XP and ELO gains) ─────────────────────────────────
  /** Gains on this progression weekday (0 = Sunday) are multiplied. Losses never are. */
  WEEKLY_BOOST: {
    ENABLED: true,
    WEEKDAY: 0,
    MULTIPLIER: 1.25,
  },

  // ── Store ─────────────────────────────────────────────────────────────────
  /** Rest shield sold in the store: protects one day. */
  SHIELD_ITEM_ID: 'rest_shield',
  SHIELD_PRICE_GOLD: 3000,

  // ── XP (never decreases) ──────────────────────────────────────────────────
  XP: {
    PER_FOCUS_MINUTE: 1,
    PER_HABIT: 10,
    PER_TASK: 15,
    PER_SUBTASK: 5,
    /** XP needed to go from level N to N+1 = BASE + STEP × (N − 1). */
    LEVEL_BASE: 100,
    LEVEL_STEP: 25,
  },

  // ── ELO ───────────────────────────────────────────────────────────────────
  ELO: {
    MIN: 0,
    /** Every account starts here (new and existing): the replay begins at this value. */
    START: 50,

    /** Daily habit goal (% of scheduled habits completed). */
    HABIT_GOAL_DEFAULT_PCT: 80,
    HABIT_GOAL_MIN_PCT: 40,
    HABIT_GOAL_MAX_PCT: 100,

    /** Compliance zones, r = achieved / goal. Evaluated top-down. */
    COMPLIANCE: {
      EXCELLENT_R: 1.2,
      EXCELLENT_DELTA: 6,
      MET_R: 1.0,
      MET_DELTA: 5,
      PARTIAL_R: 0.7,      // 0.7 ≤ r < 1.0 → max(PARTIAL_MIN, round(MET_DELTA × (r − PARTIAL_PIVOT) / PARTIAL_PIVOT))
      PARTIAL_PIVOT: 0.5,
      PARTIAL_MIN: 1,
      NEUTRAL_R: 0.4,      // 0.4 ≤ r < 0.7 → 0
      FAIL_DELTA: -3,      // r < 0.4
    },

    FOCUS: {
      MINUTES_PER_POINT: 60,
      DAILY_CAP: 8,
    },

    PROJECT_GOAL_MISS_DELTA: -2,
    /** Manual sessions give XP and stats but never ELO, nor do they save a project goal. */
    PROJECT_GOAL_COUNTS_MANUAL: false,

    STREAK: {
      /** One-off bonuses, granted once each time the streak reaches the length. */
      MILESTONES: [
        { days: 3, bonus: 1 },
        { days: 7, bonus: 3 },
        { days: 14, bonus: 5 },
        { days: 30, bonus: 10 },
      ],
      BREAK_MIN_LENGTH: 7,
      BREAK_DELTA: -2,
    },

    PROTECTION: {
      /** Most ELO a day can cost, by rank (index = rank): Bronze -2 … Champion -7, Grand Champion -8, Legend -10. A day with nothing done costs exactly this. */
      DAILY_LOSS_CAP_BY_RANK: [2, 3, 4, 5, 6, 7, 8, 10],
      FIRST_WEEK_DAYS: 7,
      FIRST_WEEK_GAIN_MULTIPLIER: 2,
      /** A shield is earned every N days of streak. */
      SHIELD_EVERY_STREAK_DAYS: 7,
      SHIELD_MAX: 2,
      /** You only drop a rank once ELO is this far below the current rank's entry. */
      RANK_DEMOTION_BUFFER: 10,
    },
  },

  // ── Ranks ─────────────────────────────────────────────────────────────────
  DIVISIONS_PER_RANK: 3,
  /** `cost: null` means the rank has no divisions (top rank). Every threshold is the original table ×1.5 (×1.25, then ×1.2, rounded): entry(n+1) = entry(n) + cost(n). */
  RANKS: [
    { id: 'BRONZE', name: 'Bronce', entry: 0, cost: 150, color: '#C98A5B', gradient: ['#7A4A2A', '#E0A577'] },
    { id: 'SILVER', name: 'Plata', entry: 150, cost: 196, color: '#B8C4D0', gradient: ['#6B7785', '#E3EAF1'] },
    { id: 'GOLD', name: 'Oro', entry: 346, cost: 254, color: '#F2C14E', gradient: ['#A8761C', '#FFE08A'] },
    { id: 'PLATINUM', name: 'Platino', entry: 600, cost: 330, color: '#4FD1C5', gradient: ['#1E7A72', '#9AF2E8'] },
    { id: 'DIAMOND', name: 'Diamante', entry: 930, cost: 420, color: '#6EA8FE', gradient: ['#2A4FBF', '#B5D3FF'] },
    { id: 'CHAMPION', name: 'Campeón', entry: 1350, cost: 600, color: '#C084FC', gradient: ['#6B21A8', '#E9C6FF'] },
    { id: 'GRAND_CHAMPION', name: 'Gran Campeón', entry: 1950, cost: 750, color: '#F87171', gradient: ['#991B1B', '#FECACA'] },
    { id: 'LEGEND', name: 'Leyenda', entry: 2700, cost: null, color: '#FDE68A', gradient: ['#F59E0B', '#FFFBEB'] },
  ],
} as const;

export type ProgressionConfig = typeof PROGRESSION_CONFIG;
export type RankId = ProgressionConfig['RANKS'][number]['id'];
