
export type Difficulty = 'S' | 'A' | 'B' | 'C';

export interface RewardPrediction {
  xp: number;
  coins: number;
  traitXp: number;
  baseXp: number;
  bonusApplied: boolean;
}

export const calculateTaskRewards = (
  estimatedTime?: number,
  impact: number = 1,
  streak: number = 0,
  type: 'TASK' | 'HABIT' = 'TASK'
): RewardPrediction => {
  // Base Hourly Rates (Shared Baseline)
  const BASE_XP_PER_HOUR = 30; // Restored to original
  const BASE_COINS_PER_HOUR = 15; // Restored to original
  const BASE_TP_PER_HOUR = 25; // Restored to original

  let xp = 0;
  let coins = 0;
  let traitXp = 0;

  // Use the exact minutes without artificial 30-min floor, fallback to 15 mins only if totally undefined
  // This ensures even 5 mins gives a tiny reward instead of jumping at 20+ mins
  const minutes = (estimatedTime !== undefined && estimatedTime >= 0) ? estimatedTime : 15;
  const hours = minutes / 60;
  
  // 1. Base Rewards for Duration
  // Tasks give less time-based reward than Habits, but boosted by 20% from previous value
  const timeModifier = type === 'HABIT' ? 0.27 : 0.18; // 0.15 * 1.2 = 0.18
  
  // Use a semi-linear curve
  // Habits decay less (0.98), Tasks decay slightly more (0.89) to keep distinction
  const timeExponent = type === 'HABIT' ? 0.98 : 0.89;
  const timeMultiplier = Math.pow(hours, timeExponent) * timeModifier;

  xp = Math.round(timeMultiplier * BASE_XP_PER_HOUR);
  coins = Math.round(timeMultiplier * BASE_COINS_PER_HOUR);
  traitXp = Math.round(timeMultiplier * BASE_TP_PER_HOUR);

  // 2. Completion Bonus
  // Scale bonus linearly but with a lower floor for short tasks
  // Cap the duration factor strictly to 1.0 to prevent abuse
  const durationFactor = Math.min(1.0, Math.max(0.1, hours)); // Reduced min from 0.2 to 0.1 to allow tiny tasks to give very little
  
  // Habits give a slightly higher base bonus, Tasks boosted 20%
  const baseBonusValue = type === 'HABIT' ? 10 : 8.4; // 7 * 1.2 = 8.4
  const baseBonus = baseBonusValue * durationFactor; 
  
  // Impact Multiplier (Difficulty) - SLIGHTLY BOOSTED
  // Tasks scale slightly less with impact than Habits, but boosted 20%
  const impactScale = type === 'HABIT' ? 0.65 : 0.60; // 0.50 * 1.2 = 0.60
  const impactMultiplier = 1 + ((impact - 1) * impactScale);
  
  // Calculate Bonus
  const bonusXp = Math.floor(baseBonus * impactMultiplier);
  const bonusCoins = Math.floor(bonusXp * 0.6); // 60% of bonus XP as coins

  // Total Expected Reward (Base + Bonus)
  xp += bonusXp;
  coins += bonusCoins;
  traitXp += bonusXp; // Bonus applies to TP too

  // Ensure minimums (Floor) - Reduced for micro-habits
  xp = Math.max(5, xp); // Was 15
  coins = Math.max(2, coins); // Was 5
  traitXp = Math.max(5, traitXp); // Was 10

  // 3. STREAK BONUS (Unified Here)
  // The streak bonus was previously calculated separately in the UI and Logic.
  // Now it's part of the CORE calculation to ensure consistency.
  const streakBonus = Math.min(50, Math.floor(streak * 2)); // Ensure integer
  
  xp += streakBonus;
  coins += Math.floor(streakBonus / 5);
  traitXp += streakBonus;

  return {
    xp: Math.floor(xp),
    coins: Math.floor(coins),
    traitXp: Math.floor(traitXp),
    baseXp: Math.floor(xp - bonusXp - streakBonus),
    bonusApplied: true
  };
};
