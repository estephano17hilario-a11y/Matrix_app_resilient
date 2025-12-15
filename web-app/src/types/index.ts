export type ThemeType = 'gradient' | 'blob';

export interface ThemeConfig {
  type: ThemeType;
  bg: string;
  accent: string;
  blobs?: { x: string; y: string; size: string }[];
}

export interface Attribute {
  id: string;
  label: string;
  level: number;
  xp: number;
  maxXp: number;
  color: string;
  icon: any; // Using any for React.ElementType to avoid strict type issues across files for now
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'LEGENDARY';
  reward?: {
    xp: number;
    coins: number;
    traitXp: number;
  };
  xpReward: number; // Keeping for backward compatibility or display
  attribute: string;
  completed: boolean;
  deadline?: string;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  streak: number;
  completedToday: boolean;
  attribute: string;
  totalCompletions: number;
  frequency: string;
  type: 'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  reminderTime?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  attribute: string;
  goalTarget: number;
  goalFrequency: string;
  pomoDuration: number;
  breakDuration: number;
  impact: number;
  totalTime: number;
  reminder?: string;
  sessions?: Session[];
}

export interface Session {
  id: string;
  type: 'POMO' | 'STOPWATCH';
  duration: number;
  date: string;
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

export interface NotificationItem {
  id: number;
  type: string;
  label: string;
  fromLevel: string | number;
  toLevel: string | number;
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
}
