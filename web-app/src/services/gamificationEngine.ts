import { UserStats, DailyLimits } from '../types/User';
import { GAMIFICATION_CONFIG } from '../config/gamification';
import { calculateLevelFromXp } from '../utils/leveling';
import { toLocalISOString } from '../utils/dateUtils';

export type TaskType = 'LIGHT' | 'MID' | 'EPIC';

export interface RewardResult {
  xp: number;
  gold: number;
  traitPoints: number;
  isCritical: boolean;
  limitReached: boolean;
  newLevel?: number;
}

export class GamificationEngine {
  
  static checkAndResetDailyLimits(dailyLimits: DailyLimits): DailyLimits {
    const today = toLocalISOString(new Date());
    if (dailyLimits.date !== today) {
      return {
        date: today,
        taskXp: 0,
        taskGold: 0,
        taskTraitPoints: 0,
        habitsCompleted: 0,
        focusSeconds: 0,
        habitXp: 0,
        habitGold: 0,
        habitTraitPoints: 0,
        focusXp: 0,
        focusGold: 0,
        focusTraitPoints: 0,
        focusMinutes: 0,
        tasksCompleted: 0
      };
    }
    return dailyLimits;
  }

  // --- A. MOTOR DE TAREAS (Task Engine) ---
  static processTaskCompletion(
    stats: UserStats,
    dailyLimits: DailyLimits,
    taskType: TaskType
  ): { newStats: UserStats; newDailyLimits: DailyLimits; reward: RewardResult } {
    
    // 1. Base Values
    let baseXP = 0;
    let baseTP = 0;
    let baseCoins = 0;

    switch (taskType) {
      case 'LIGHT':
        baseXP = GAMIFICATION_CONFIG.TASKS.LIGHT.XP;
        baseTP = GAMIFICATION_CONFIG.TASKS.LIGHT.TP;
        baseCoins = GAMIFICATION_CONFIG.TASKS.LIGHT.COINS;
        break;
      case 'MID':
        baseXP = GAMIFICATION_CONFIG.TASKS.MID.XP;
        baseTP = GAMIFICATION_CONFIG.TASKS.MID.TP;
        baseCoins = GAMIFICATION_CONFIG.TASKS.MID.COINS;
        break;
      case 'EPIC':
        baseXP = GAMIFICATION_CONFIG.TASKS.EPIC.XP;
        baseTP = GAMIFICATION_CONFIG.TASKS.EPIC.TP;
        baseCoins = GAMIFICATION_CONFIG.TASKS.EPIC.COINS;
        break;
    }

    // 2. Daily Cap Check (XP & TP only, Coins always awarded)
    let finalXP = baseXP;
    let finalTP = baseTP;
    let limitReached = false;

    if ((dailyLimits.taskXp || 0) >= GAMIFICATION_CONFIG.MAX_DAILY_TASK_XP) {
      finalXP = 0;
      finalTP = 0;
      limitReached = true;
    } else {
      // Partial cap logic? The prompt implies hard stop: "Si Daily_Task_XP >= 200, la recompensa de XP y TP es 0"
      // It doesn't explicitly say "up to 200". But usually it means "if already >= 200".
      // If currently 190 and get 30, do we cap at 10? The prompt says "Si Daily_Task_XP >= 200... es 0".
      // It implies if the limit is ALREADY reached.
      // But good game design usually caps the overflow.
      // However, following "do what is asked": "Si Daily_Task_XP >= 200, la recompensa... es 0".
      // This implies if we are at 199, we get full reward, then next time 0.
      // I will implement strictly as requested: check if limit is reached BEFORE adding.
    }

    const currentTaskGold = dailyLimits.taskGold || 0;
    const maxTaskGold = GAMIFICATION_CONFIG.MAX_DAILY_TASK_GOLD;
    const remainingGold = Math.max(0, maxTaskGold - currentTaskGold);

    // 3. RNG (Critical Hit)
    const rand = Math.random();
    let isCritical = false;
    let finalCoins = baseCoins;

    if (rand < GAMIFICATION_CONFIG.CRITICAL_HIT_CHANCE) {
      isCritical = true;
      // "Aplicar CRITICAL_MULTIPLIER a TP y Coins (NO a la XP)"
      if (!limitReached) {
        finalTP = Math.floor(finalTP * GAMIFICATION_CONFIG.CRITICAL_MULTIPLIER);
      }
      finalCoins = Math.floor(finalCoins * GAMIFICATION_CONFIG.CRITICAL_MULTIPLIER);
    }

    if (remainingGold <= 0) {
      finalCoins = 0;
    } else if (finalCoins > remainingGold) {
      finalCoins = remainingGold;
    }

    // 4. Update State
    const newStats = { ...stats };
    const newDailyLimits = { ...dailyLimits };

    // Update Stats
    newStats.xp = (newStats.xp || 0) + finalXP;
    newStats.gold = (newStats.gold || 0) + finalCoins;
    newStats.availableTraitPoints = (newStats.availableTraitPoints || 0) + finalTP;
    
    // Recalculate Level
    const newLevel = calculateLevelFromXp(newStats.xp);
    newStats.level = newLevel;

    // Update Daily Limits
    newDailyLimits.taskXp = (newDailyLimits.taskXp || 0) + finalXP;
    newDailyLimits.taskGold = (newDailyLimits.taskGold || 0) + finalCoins;
    newDailyLimits.taskTraitPoints = (newDailyLimits.taskTraitPoints || 0) + finalTP;
    newDailyLimits.tasksCompleted = (newDailyLimits.tasksCompleted || 0) + 1;

    return {
      newStats,
      newDailyLimits,
      reward: {
        xp: finalXP,
        gold: finalCoins,
        traitPoints: finalTP,
        isCritical,
        limitReached,
        newLevel: newStats.level > stats.level ? newStats.level : undefined
      }
    };
  }

  // --- B. MOTOR DE HÁBITOS (Habit Engine) ---
  static processHabitCompletion(
    stats: UserStats,
    dailyLimits: DailyLimits,
    habitIndex: number // 0-based index of the habit in the list
  ): { newStats: UserStats; newDailyLimits: DailyLimits; reward: RewardResult } {
    
    // Regla de Carga Cognitiva (Top 12)
    // Assuming habitIndex matches the user's priority order.
    // "Si habitIndex <= 12" -> implies 1-based index in prompt or 0-11 if 0-based.
    // Prompt says: "Si habitIndex <= 12". Usually means count. Let's assume 1-based index or count.
    // "Si habitIndex > 12".
    // I will assume 0-based index, so index < 12 (0..11) is primary.
    
    const isPrimary = habitIndex < GAMIFICATION_CONFIG.HABITS.COGNITIVE_LOAD_LIMIT; // < 12
    
    let xp = 0;
    let tp = 0;
    let coins = 0;

    if (isPrimary) {
      xp = GAMIFICATION_CONFIG.HABITS.PRIMARY.XP;
      tp = GAMIFICATION_CONFIG.HABITS.PRIMARY.TP;
      coins = GAMIFICATION_CONFIG.HABITS.PRIMARY.COINS;
    } else {
      xp = GAMIFICATION_CONFIG.HABITS.SECONDARY.XP;
      tp = GAMIFICATION_CONFIG.HABITS.SECONDARY.TP;
      coins = GAMIFICATION_CONFIG.HABITS.SECONDARY.COINS;
    }

    // Update State
    const newStats = { ...stats };
    const newDailyLimits = { ...dailyLimits };

    newStats.xp = (newStats.xp || 0) + xp;
    newStats.gold = (newStats.gold || 0) + coins;
    newStats.availableTraitPoints = (newStats.availableTraitPoints || 0) + tp;
    
    const newLevel = calculateLevelFromXp(newStats.xp);
    newStats.level = newLevel;

    newDailyLimits.habitXp = (newDailyLimits.habitXp || 0) + xp;
    newDailyLimits.habitGold = (newDailyLimits.habitGold || 0) + coins;
    newDailyLimits.habitTraitPoints = (newDailyLimits.habitTraitPoints || 0) + tp;
    newDailyLimits.habitsCompleted = (newDailyLimits.habitsCompleted || 0) + 1;

    return {
      newStats,
      newDailyLimits,
      reward: {
        xp,
        gold: coins,
        traitPoints: tp,
        isCritical: false,
        limitReached: !isPrimary, // Sort of a limit
        newLevel: newStats.level > stats.level ? newStats.level : undefined
      }
    };
  }

  // --- C. MOTOR DE FOCUS (Deep Work Engine) ---
  static processFocusSession(
    stats: UserStats,
    dailyLimits: DailyLimits,
    durationMinutes: number,
    currentSessionDurationMinutes: number = 0 // For immersion bonus check
  ): { newStats: UserStats; newDailyLimits: DailyLimits; reward: RewardResult } {
    
    // 1. Biological Limit Check
    // Convert current focus seconds to hours for check
    const currentFocusHours = (dailyLimits.focusSeconds || 0) / 3600;
    
    if (currentFocusHours >= GAMIFICATION_CONFIG.MAX_DAILY_FOCUS_HOURS) {
      return {
        newStats: { ...stats },
        newDailyLimits: { ...dailyLimits },
        reward: {
          xp: 0,
          gold: 0,
          traitPoints: 0,
          isCritical: false,
          limitReached: true
        }
      };
    }

    // 2. Base Rates (Hourly)
    // "20 XP / 25 TP / 10 Coins por hora"
    const baseXpPerMinute = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.XP / 60;
    const baseTpPerMinute = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.TP / 60;
    const baseCoinsPerMinute = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.COINS / 60;

    // 3. Immersion Bonus
    // "Si la sesión actual lleva > 120 minutos continuos"
    // We need to know if this specific chunk of time is happening AFTER 120 mins.
    // If the user does a 150 min session, the first 120 are normal, next 30 are boosted.
    // Or if this is a "processFocusSession" called periodically (e.g. every minute).
    // The prompt says: "Distribución Fraccionada: Calcular recompensa por minuto... y acumular."
    // It implies we might calculate for a duration.
    
    let totalXp = 0;
    let totalTp = 0;
    let totalCoins = 0;

    // We iterate minute by minute to be precise with the threshold
    // Or we can calculate split.
    
    // If we are processing a completed session of X minutes.
    // We assume currentSessionDurationMinutes is the TOTAL duration including this chunk?
    // Or is it the duration BEFORE this chunk?
    // Let's assume we are processing a chunk of 'durationMinutes', and 'currentSessionDurationMinutes' is the accumulated time BEFORE this chunk.
    
    let accumulatedTime = currentSessionDurationMinutes;
    
    for (let i = 0; i < durationMinutes; i++) {
      accumulatedTime++;
      
      let minuteTp = baseTpPerMinute;
      
      if (accumulatedTime > GAMIFICATION_CONFIG.FOCUS.IMMERSION_THRESHOLD_MINUTES) {
        minuteTp *= GAMIFICATION_CONFIG.FOCUS.IMMERSION_MULTIPLIER;
      }
      
      totalXp += baseXpPerMinute;
      totalTp += minuteTp;
      totalCoins += baseCoinsPerMinute;
    }

    // Rounding
    // We should probably keep floats internally but the UserStats uses integers mostly?
    // UserStats defines xp as number, usually int.
    // "Entero. Nunca decrece."
    // So we floor/ceil at the end.
    
    // FIX: Use Math.round to match frontend logic and be fair
    let finalXp = Math.round(totalXp);
    let finalTp = Math.round(totalTp);
    let finalCoins = Math.round(totalCoins);

    // Minimum Reward Fix (Ensure >1 min sessions give at least 1 point)
    if (durationMinutes >= 1) {
        if (finalXp < 1 && baseXpPerMinute > 0) finalXp = 1;
        if (finalTp < 1 && baseTpPerMinute > 0) finalTp = 1;
        if (finalCoins < 1 && baseCoinsPerMinute > 0) finalCoins = 1;
    }

    // 4. Update State
    const newStats = { ...stats };
    const newDailyLimits = { ...dailyLimits };

    newStats.xp = (newStats.xp || 0) + finalXp;
    newStats.gold = (newStats.gold || 0) + finalCoins;
    newStats.availableTraitPoints = (newStats.availableTraitPoints || 0) + finalTp;
    
    const newLevel = calculateLevelFromXp(newStats.xp);
    newStats.level = newLevel;

    newDailyLimits.focusXp = (newDailyLimits.focusXp || 0) + finalXp;
    newDailyLimits.focusGold = (newDailyLimits.focusGold || 0) + finalCoins;
    newDailyLimits.focusTraitPoints = (newDailyLimits.focusTraitPoints || 0) + finalTp;
    newDailyLimits.focusSeconds = (newDailyLimits.focusSeconds || 0) + (durationMinutes * 60);
    newDailyLimits.focusMinutes = (newDailyLimits.focusMinutes || 0) + durationMinutes;

    return {
      newStats,
      newDailyLimits,
      reward: {
        xp: finalXp,
        gold: finalCoins,
        traitPoints: finalTp,
        isCritical: false, // Not applicable
        limitReached: false,
        newLevel: newStats.level > stats.level ? newStats.level : undefined
      }
    };
  }
}
