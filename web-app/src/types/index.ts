export type ThemeType = 'gradient' | 'blob';

export interface ThemeConfig {
  type: ThemeType;
  bg: string;
  accent: string;
  blobs?: { x: string; y: string; size: string }[];
  id?: string;
  name?: string;
  description?: string;
  gradient?: string;
}

export interface SubTrait {
  id: string;
  name: string;
  level: number;
  xp: number;
  maxXp: number;
  iconName?: string;
}

export interface AttributeHistoryEntry {
  date: string; // YYYY-MM-DD
  xp: number;
  level: number;
}

export interface Attribute {
  id: string;
  label: string;
  level: number;
  xp: number;
  maxXp: number;
  color: string;
  icon?: any;
  iconName?: string;
  subTraits?: SubTrait[];
  history?: AttributeHistoryEntry[];
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  difficulty: 'S' | 'A' | 'B' | 'C';
  xpReward: number;
  gold: number;
  attribute: string;
  subAttribute?: string; // Selected Sub-Trait ID
  completed: boolean;
  completedAt?: string;
  deadline?: string;
  subtasks?: Subtask[];
  fractalStructure?: any; // Stores the smart task structure
  isSmartQuest?: boolean;
  rescheduledFromOverdue?: boolean;
  projectId?: string;
  smartProjectId?: string;
  color?: string; // Optional UI color override
  estimatedTime?: number; // Minutes
  pomodoroTarget?: number;
  pomodoroCompleted?: number;
  rewardedGold?: number; // Actual gold rewarded upon completion (for integrity)
  rewardedXp?: number; // Actual XP rewarded upon completion (for integrity)
  showInJournaling?: boolean;
  journalIconColor?: string;
  createdAt?: string | number;
  recurrence?: {
    type: 'NONE' | 'INTERVAL' | 'WEEKLY' | 'MONTHLY';
    interval?: number; // Every X days
    days?: number[]; // Days of the week (0-6) or Days of the month (1-31)
    monthlyType?: 'SPECIFIC_DATES' | 'LAST_DAY';
    months?: number[]; // Months of the year (0-11)
  };
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  streak: number;
  completedToday: boolean;
  attribute: string;
  subAttribute?: string; // Selected Sub-Trait ID
  totalCompletions: number;
  frequency: string;
  frequencyDays?: number[]; // 0=Sun, 1=Mon, etc.
  type: 'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN';
  iconName?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  isDivided?: boolean;
  dividedMode?: 'INTERVAL' | 'FIXED';
  dividedQuantity?: number; // Amount per instance (e.g., 1 glass) for INTERVAL mode
  dividedInterval?: number; // Interval in minutes (e.g., 90) for INTERVAL mode
  dividedTimes?: { time: string; amount: number; id: string }[]; // Array of times and amounts for FIXED mode
  nextInstanceTime?: string; // Time when next instance is due (for INTERVAL mode)
  checklist?: { 
    id: string; 
    text: string; 
    completed: boolean;
    color?: string; // Custom color for this item
    days?: number[]; // Specific days this item should appear [0-6]
    reminderTime?: string; // Optional alarm/reminder time for this subtask
    history?: string[]; // Date keys when this subtask was completed
    intervalType?: 'WEEKLY' | 'MONTHLY' | 'NONE';
    intervalCount?: number;
    allowSkip?: boolean;
    skippedHistory?: string[]; // Date keys when this subtask was skipped
  }[];
  reminderTime?: string;
  history?: string[]; // ISO date strings of completions
  valueHistory?: Record<string, number>; // Date key to quantity value mapping
  projectId?: string;
  smartProjectId?: string;
  color?: string; // Optional UI color override
  estimatedTime?: number; // Minutes
  impact?: number;
  customColor?: string;
  archived?: boolean;
  createdAt?: number;
  monthlyType?: 'SPECIFIC_DATES' | 'FLEXIBLE_COUNT';
  monthlyFlexibleCount?: number;
  monthlyLastDay?: boolean;
  weeklyType?: 'SPECIFIC_DAYS' | 'FLEXIBLE_COUNT';
  weeklyFlexibleCount?: number;
  order?: number;
  rewardedGold?: number; // Actual gold rewarded upon completion (for integrity)
  rewardedXp?: number; // Actual XP rewarded upon completion (for integrity)
  lastUpdatedDate?: string; // Tracks the last date any progress was made (to reset correctly)
}

export interface BadHabit {
  id: string;
  title: string;
  attribute: string; // The affected trait
  subAttribute?: string; // Selected Sub-Trait ID
  reason: string;
  negativeImpact: string;
  timeConsumed: number; // in minutes
  streak: number;
  relapsedToday: boolean;
  history: string[]; // Dates when relapse happened
  penalties: {
    hp: number;
    xp: number;
    gold: number; // Cost to pay off
  };
  createdAt: number;
  intelligentStreak?: boolean;
  isDynamic?: boolean;
  dynamicTargetType?: 'neutral' | 'positive';
  dynamicBalance?: number;
  currentTarget?: number;
  reachedDays?: number;
  lastCheckedDate?: string;
  archived?: boolean;
  order?: number;
  iconName?: string;
  customColor?: string;
}

export interface FocusRoutineStep {
  id: string;
  type: 'FOCUS' | 'BREAK';
  duration: number; // minutes
  subAttribute?: string; // Optional specific sub-trait ID
}

export interface Project {
  id: string;
  title: string;
  description: string;
  attribute: string;
  color?: string; // Optional UI color override
  goalTarget: number;
  goalFrequency: string;
  uiFrequency?: string; // Stores the user's selected frequency (WEEKLY, MONTHLY, etc) for UI restoration
  uiTarget?: number; // Stores the user's input target (e.g. 10 hours) for UI restoration
  uiUnit?: 'HOURS' | 'MINUTES'; // Stores the unit preference (HOURS or MINUTES)
  monthlyType?: 'SPECIFIC_DATES' | 'FLEXIBLE_COUNT';
  monthlyFlexibleCount?: number;
  monthlyLastDay?: boolean; // New flag for "Last Day of Month"
  pomoDuration: number;
  breakDuration: number;
  impact: number;
  totalTime: number;
  reminder?: string;
  workingDays?: number[]; // 0=Sun, 1=Mon, etc.
  sessions?: Session[];
  archived?: boolean;
  deleted?: boolean;
  completed?: boolean;
  smartProjectId?: string;
  createdAt?: number;
  lastSessionDate?: string;
  order?: number;
  streak?: number;
  lastStreakDate?: string;
  longestStreak?: number;
  focusRoutine?: FocusRoutineStep[];
  focusRoutineDays?: number[];
}

export interface Session {
  id: string;
  type: 'POMO' | 'STOPWATCH';
  duration: number;
  date: string;
  xpEarned?: number;
  goldEarned?: number;
  traitPointsEarned?: number;
  subTraitId?: string;
}

export interface NoteBlock {
  id: string;
  type: 'text' | 'check' | 'image';
  content: string;
  checked?: boolean;
}

export interface Note {
  id: string;
  title: string;
  blocks: NoteBlock[];
  updatedAt: string;
  theme?: string;
  projectId?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  blocks: NoteBlock[];
  mood?: string;
  theme?: string;
  tags: string[];
}

export interface NoteBlueprint {
  id: string;
  name: string;
  icon: string; // Emoji or Icon name
  content: string; // JSON string of NoteBlock[] (for now) or Markdown
  category: 'SYSTEM' | 'USER';
  accentColor: string;
}

export interface NotificationItem {
  id?: number;
  type: string;
  label: string;
  fromLevel?: string | number;
  toLevel?: string | number;
  icon: any;
  color: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  icon: any;
  color: string;
  type: string;
  tx?: number;
  ty?: number;
}

export interface UserStats {
  hp: number;
  xp: number;
  level: number;
  gold: number;
  streak: number;
  nextXp?: number;
  previousStreak?: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  stats: UserStats;
  unlockedStoreItems?: string[];
  createdAt?: number;
}
