
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
  streak: number = 0
): RewardPrediction => {
  // REVISED REWARD LOGIC (User Request)
  // Base Rewards aligned with user expectation (~20 XP, ~10 Coins for standard tasks)
  
  // Base Hourly Rates
  const BASE_XP_PER_HOUR = 30; // Was 3
  const BASE_COINS_PER_HOUR = 15; // Was 1
  const BASE_TP_PER_HOUR = 25; // Was 3

  let xp = 0;
  let coins = 0;
  let traitXp = 0;

  // Default to 30 mins if no time specified, to ensure decent base reward
  const minutes = (estimatedTime && estimatedTime > 0) ? estimatedTime : 30;
  const hours = minutes / 60;
  
  // 1. Base Rewards for Duration with Aggressive Diminishing Returns
  // Use a square root curve (x^0.5) so longer tasks yield significantly less marginal reward.
  // 1 Hour = 1x, 4 Hours = 2x (instead of 4x).
  const timeMultiplier = Math.pow(hours, 0.5);

  xp = Math.round(timeMultiplier * BASE_XP_PER_HOUR);
  coins = Math.round(timeMultiplier * BASE_COINS_PER_HOUR);
  traitXp = Math.round(timeMultiplier * BASE_TP_PER_HOUR);

  // 2. Completion Bonus
  // Scale bonus linearly but with a lower floor for short tasks
  // Cap the duration factor strictly to 1.0 to prevent abuse
  const durationFactor = Math.min(1.0, Math.max(0.2, hours)); // Reduced min from 0.8 to 0.2 for short tasks
  const baseBonus = 10 * durationFactor; // Base bonus 10
  
  // Impact Multiplier (Difficulty) - HEAVILY BOOSTED
  // Impact 1 (Easy) -> 1x
  // Impact 3 (Hard) -> 2.2x (Was 1.7x)
  const impactMultiplier = 1 + ((impact - 1) * 0.60);
  
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
  const streakBonus = Math.min(50, streak * 2); // Cap at 50, +2 per day
  
  xp += streakBonus;
  coins += Math.floor(streakBonus / 5);
  traitXp += streakBonus;

  return {
    xp,
    coins,
    traitXp,
    baseXp: xp - bonusXp - streakBonus,
    bonusApplied: true
  };
};
