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
  difficulty: 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
  xpReward: number;
  gold: number;
  attribute: string;
  completed: boolean;
  deadline?: string;
  subtasks?: Subtask[];
  fractalStructure?: any; // Stores the smart task structure
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

export interface NoteBlueprint {
  id: string;
  name: string;
  icon: string; // Emoji or Icon name
  content: string; // JSON string of NoteBlock[] (for now) or Markdown
  category: 'SYSTEM' | 'USER';
  accentColor: string;
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
