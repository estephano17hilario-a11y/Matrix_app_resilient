import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface RewardPayload {
  id: string;
  source: string; // e.g., "Habit Completed", "Focus Session"
  
  // XP
  xpGained: number;
  currentXp: number; // The new XP total relative to current level
  maxXp: number;
  level: number;
  initialLevel?: number; // Level before reward
  initialXp?: number; // XP before reward (relative to initial level)
  isLevelUp: boolean;
  
  // Trait (Optional)
  traitId?: string;
  traitName?: string;
  traitIcon?: string; // Icon name or component reference logic
  traitXpGained?: number;
  traitCurrentXp?: number;
  traitMaxXp?: number;
  traitLevel?: number;
  isTraitLevelUp?: boolean;
  
  // Sub-Trait (Optional)
  subTraitId?: string;
  subTraitName?: string;
  subTraitIcon?: string;
  subTraitXpGained?: number;
  subTraitCurrentXp?: number;
  subTraitMaxXp?: number;
  subTraitLevel?: number;
  isSubTraitLevelUp?: boolean;
  
  // Gold
  goldGained: number;
  currentGold: number;
}

interface RewardContextType {
  queue: RewardPayload[];
  addReward: (reward: Omit<RewardPayload, 'id'>) => void;
  dismissReward: (id: string) => void;
  isAnimating: boolean;
  setIsAnimating: (state: boolean) => void;
}

const RewardContext = createContext<RewardContextType | undefined>(undefined);

export const RewardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<RewardPayload[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const addReward = useCallback((reward: Omit<RewardPayload, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setQueue((prev) => [...prev, { ...reward, id }]);
  }, []);

  const dismissReward = useCallback((id: string) => {
    setQueue((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <RewardContext.Provider value={{ queue, addReward, dismissReward, isAnimating, setIsAnimating }}>
      {children}
    </RewardContext.Provider>
  );
};

export const useReward = () => {
  const context = useContext(RewardContext);
  if (!context) {
    throw new Error('useReward must be used within a RewardProvider');
  }
  return context;
};
