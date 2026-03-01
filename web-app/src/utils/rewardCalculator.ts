
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
  
  // 1. Base Rewards for Duration
  xp = Math.round(hours * BASE_XP_PER_HOUR);
  coins = Math.round(hours * BASE_COINS_PER_HOUR);
  traitXp = Math.round(hours * BASE_TP_PER_HOUR);

  // 2. Completion Bonus
  // Scale bonus linearly but with a generous floor
  const durationFactor = Math.min(1.5, Math.max(0.8, hours)); // Min 0.8x, Max 1.5x
  const baseBonus = 10 * durationFactor; // Base bonus 10
  
  // Impact Multiplier (Difficulty)
  // Impact 1 (Easy) -> 1x
  // Impact 3 (Hard) -> 1.5x
  const impactMultiplier = 1 + ((impact - 1) * 0.25);
  
  // Calculate Bonus
  const bonusXp = Math.floor(baseBonus * impactMultiplier);
  const bonusCoins = Math.floor(bonusXp * 0.6); // 60% of bonus XP as coins

  // Total Expected Reward (Base + Bonus)
  xp += bonusXp;
  coins += bonusCoins;
  traitXp += bonusXp; // Bonus applies to TP too

  // Ensure minimums (Floor)
  xp = Math.max(15, xp);
  coins = Math.max(5, coins);
  traitXp = Math.max(10, traitXp);

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
