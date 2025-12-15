import { Timestamp } from 'firebase/firestore';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'LEGENDARY';

export interface RewardPrediction {
  xp: number;
  coins: number;
  traitXp: number;
  baseXp: number;
  bonusApplied: boolean;
}

const BASE_REWARDS: Record<Difficulty, { xp: number; coins: number }> = {
  EASY: { xp: 10, coins: 5 },
  MEDIUM: { xp: 25, coins: 15 },
  HARD: { xp: 50, coins: 35 },
  LEGENDARY: { xp: 100, coins: 80 },
};

export const calculateTaskRewards = (
  difficulty: Difficulty,
  dueDate?: string | Date | null
): RewardPrediction => {
  const base = BASE_REWARDS[difficulty];
  let xp = base.xp;
  let coins = base.coins;
  let bonusApplied = false;

  // Early Bird Bonus Logic
  if (dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    // If due date is more than 24 hours from now (meaning we are completing it early? 
    // Wait, user says: "Si la tarea se completa > 24h antes del deadline".
    // But calculateTaskRewards is used for "Prediction" at creation time.
    // At creation time, we show "Maximum Potential".
    // So if the user sets a deadline > 24h from now, they HAVE the potential to get the bonus.
    // Or does it mean if they finish it early?
    // "Este cálculo se hace al completar, pero en la creación muestra el valor 'Potencial Máximo'."
    // So at creation, if I set a deadline for next week, I *could* finish it > 24h before.
    // But usually prediction shows what you get if you do it *now* or *optimally*.
    // Let's assume for prediction we show the max possible if they meet the condition.
    // But wait, if I set deadline to 1 hour from now, I CANNOT get the bonus.
    // So we should check if (Deadline - Now) > 24h. If so, it's possible.
    
    // Actually, usually "Early Bird" means finishing it well in advance.
    // If I create a task due in 2 days, and finish it now, I get the bonus.
    // If I create a task due in 1 hour, I probably can't get > 24h early bonus.
    // So for prediction, we should probably assume the user *can* get the bonus if the deadline allows it (i.e. deadline is > 24h away).
    
    if (diffHours > 24) {
      xp = Math.floor(xp * 1.2);
      coins = Math.floor(coins * 1.2);
      bonusApplied = true;
    }
  }

  const traitXp = Math.floor(xp * 0.4);

  return {
    xp,
    coins,
    traitXp,
    baseXp: base.xp,
    bonusApplied
  };
};
