export const GAMIFICATION_CONFIG = {
  LEVEL_CONSTANT: 20,
  MAX_DAILY_TASK_XP: 300,
  MAX_DAILY_TASK_TP: 350,
  MAX_DAILY_TASK_GOLD: 200,
  
  // Explicit Daily Focus Limits (Synergy with Hourly Rates)
  MAX_DAILY_FOCUS_XP: 999999,
  MAX_DAILY_FOCUS_TP: 999999,
  MAX_DAILY_FOCUS_GOLD: 999999,
  
  MAX_DAILY_FOCUS_HOURS: 24, // Hard Limit per User Request
  CRITICAL_HIT_CHANCE: 0.10,
  CRITICAL_MULTIPLIER: 1.3,
  
  // Base Rewards
  TASKS: {
    LIGHT: { XP: 3, TP: 3, COINS: 1 },
    MID: { XP: 6, TP: 6, COINS: 3 },
    EPIC: { XP: 15, TP: 15, COINS: 8 },
  },
  
  HABITS: {
    COGNITIVE_LOAD_LIMIT: 12,
    PRIMARY: { XP: 5, TP: 5, COINS: 2 },
    SECONDARY: { XP: 2, TP: 2, COINS: 1 },
  },
  
  FOCUS: {
    BASE_HOURLY: { XP: 20, TP: 25, COINS: 16 },
    IMMERSION_THRESHOLD_MINUTES: 120,
    IMMERSION_MULTIPLIER: 1.1,
  }
} as const;
