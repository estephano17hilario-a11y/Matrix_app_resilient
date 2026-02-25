export type Difficulty = 'S' | 'A' | 'B' | 'C';

export interface RewardPrediction {
  xp: number;
  coins: number;
  traitXp: number;
  baseXp: number;
  bonusApplied: boolean;
}

export const calculateTaskRewards = (
  estimatedTime?: number
): RewardPrediction => {
  // SIMPLIFIED REWARD LOGIC (User Request)
  // "Recompensas que se muestra en el creador... sea cuando logres cumplir con el objetivo del dia"
  
  // Base Hourly Rates (From Config)
  // XP: 20/h, Coins: 12/h
  const BASE_XP_PER_HOUR = 20;
  const BASE_COINS_PER_HOUR = 12;

  let xp = 0;
  let coins = 0;

  // Calculate based on Estimated Time (Daily Goal)
  if (estimatedTime && estimatedTime > 0) {
    const hours = estimatedTime / 60;
    xp = Math.round(hours * BASE_XP_PER_HOUR);
    coins = Math.round(hours * BASE_COINS_PER_HOUR);
  } else {
    // Fallback if no time set (e.g. 1 hour default)
    xp = BASE_XP_PER_HOUR;
    coins = BASE_COINS_PER_HOUR;
  }

  // Minimums
  xp = Math.max(5, xp);
  coins = Math.max(2, coins);

  const traitXp = Math.floor(xp * 1.25); // Trait Points are slightly higher (25/h vs 20/h)

  return {
    xp,
    coins,
    traitXp,
    baseXp: xp,
    bonusApplied: false
  };
};
