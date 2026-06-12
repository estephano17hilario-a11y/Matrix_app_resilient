import { DockConfig } from '@/components/ui/DockConfigModal';

export type UserPlan = 'FREE' | 'PRO';
export type UserArchetype = 'NEO' | 'SPARTAN' | 'HACKER' | 'MONK';

export interface UserStats {
  hp: number;       // Actual (0-100)
  maxHp: number;    // Base 100
  xp: number;       // Acumulado
  level: number;    // Calculado (XP / 1000)
  gold: number;     // Moneda virtual
  availableTraitPoints?: number; // Puntos para mejorar atributos
  streak: number;   // Días consecutivos
  streakFrozenUntil?: string; // Fecha ISO hasta cuando está congelada la racha
  lastStreakDate?: string; // Fecha de la última vez que se incrementó la racha
  previousStreak?: number;
  nextXp?: number;
}

export interface DailyLimits {
  date: string; // "YYYY-MM-DD"
  taskXp: number;
  taskGold: number;
  taskTraitPoints: number;
  habitsCompleted: number; // Count of habits completed
  focusSeconds: number; // Total seconds focused
  totalXp?: number;
  totalGold?: number;
  totalTraitPoints?: number;
  focusXp?: number;
  focusGold?: number;
  focusTraitPoints?: number;
  habitXp?: number;
  habitGold?: number;
  habitTraitPoints?: number;
  tasksCompleted?: number;
  notesCompleted?: number;
  focusMinutes?: number;
}

export interface UserProfile {
  id: string; // Used to be uid, migrated to Supabase id
  uid: string; // Kept for backward compatibility
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  avatarId?: string; // ID del avatar seleccionado (interno)
  plan: UserPlan;
  es_pro?: boolean; // Flag to easily check if user has premium plan
  archetype: UserArchetype;
  stats: UserStats;
  preferences?: {
    theme?: string;
    vividMode?: boolean;
    avatarShape?: 'CIRCLE' | 'SQUARE';
    dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS';
    habitSectionControl?: 'VISIBLE' | 'HIDDEN';
    defaultHabitView?: 'DEFAULT' | 'CHRONOLOGICAL';
    allowDockSectionSwitch?: boolean;
    dockConfig?: DockConfig;
    weekStartDay?: 0 | 1;
    defaultChartMode?: 'RADAR' | 'BAR';
    showProfile?: boolean;
    defaultChartViews?: any;
    defaultProjectView?: any;
    defaultTaskFilters?: any;
    notesDefaultTab?: 'OVERVIEW' | 'EMOTIONS';
    traitChanges?: {
      count: number;
      weekStart: number;
    };
  };
  dailyLimits?: DailyLimits;
  unlockedAchievements?: string[];
  unlockedStoreItems?: string[];
  unlocked_store_items?: string[]; // Snake_case from Supabase DB column
  inventory?: { itemId: string; quantity: number; acquiredAt: number }[];

  equippedItems?: { [slot: string]: string }; // e.g. { "background": "theme_neon_purple" }
  createdAt: number; // Timestamp
  lastLoginAt: number;
  // Configuración visual
  theme: 'ETHER' | 'MATRIX' | 'SUNSET';
  dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS';
  avatarShape?: 'CIRCLE' | 'SQUARE';
  habitSectionControl?: 'VISIBLE' | 'HIDDEN';
  defaultHabitView?: 'DEFAULT' | 'CHRONOLOGICAL';
  allowDockSectionSwitch?: boolean;
  dockConfig?: DockConfig;
  weekStartDay?: 0 | 1;
  defaultChartMode?: 'RADAR' | 'BAR';
  showProfile?: boolean;
  
  defaultChartViews?: {
    tasks?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    habits?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    focus?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    projects?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    notes?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
  };
  defaultProjectView?: 'PROJECT' | 'TRAIT' | 'NONE';
  defaultTaskFilters?: {
    timeframe?: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | '3_MONTHS';
    traitFilter?: string;
    typeFilter?: 'all' | 'normal' | 'smart';
    difficultyFilter?: 'all' | 'S' | 'A' | 'B' | 'C';
    hideCompleted?: boolean;
  };
  notesDefaultTab?: 'OVERVIEW' | 'EMOTIONS';

  // Rate Limiting
  traitChanges?: {
    count: number;
    weekStart: number;
  };

  // Trait History
  archivedTraits?: Record<string, { level: number, xp: number, maxXp: number, label?: string, color?: string, iconName?: string }>;

  // Onboarding Data
  onboarding?: {
    successDefinition: string;
    obstacles: string[];
    coachingTone: string;
    completedAt: number;
    language?: string;
  };
  
  // Internal State Flags
  isSkeleton?: boolean;
}

export type UserData = UserProfile;

export const DEFAULT_USER_STATS: UserStats = {
  hp: 100,
  maxHp: 100,
  xp: 0,
  level: 1,
  gold: 0,
  streak: 0
};
