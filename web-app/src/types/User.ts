export type UserPlan = 'FREE' | 'PRO';
export type UserArchetype = 'NEO' | 'SPARTAN' | 'HACKER' | 'MONK';

export interface UserStats {
  hp: number;       // Actual (0-100)
  maxHp: number;    // Base 100
  xp: number;       // Acumulado
  level: number;    // Calculado (XP / 1000)
  gold: number;     // Moneda virtual
  streak: number;   // Días consecutivos
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: UserPlan;
  archetype: UserArchetype;
  stats: UserStats;
  createdAt: number; // Timestamp
  lastLoginAt: number;
  // Configuración visual
  theme: 'ETHER' | 'MATRIX' | 'SUNSET';
  
  // Onboarding Data
  onboarding?: {
    successDefinition: string;
    obstacles: string[];
    coachingTone: string;
    completedAt: number;
  };
}

export const DEFAULT_USER_STATS: UserStats = {
  hp: 100,
  maxHp: 100,
  xp: 0,
  level: 1,
  gold: 0,
  streak: 0
};
