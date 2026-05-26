export interface DailyFeedEntry {
  id: string;                    // "feed_YYYY-MM-DD"
  date: string;                  // "YYYY-MM-DD"
  tasksCompleted: number;
  tasksTotal: number;
  focusMinutes: number;          // Total focus time in minutes
  focusSessions: number;         // Number of sessions
  habitsCompleted: number;
  habitsTotal: number;
  subHabitsCompleted: number;    // Checklist items completed
  subHabitsTotal: number;
  xpEarned: number;
  goldEarned: number;
  tpEarned: number;              // Trait points earned on that day
  streak: number;                // Streak count on that day
  topProjects: { name: string; minutes: number; color?: string }[];
  completedTaskTitles: string[]; // Names of completed tasks (max 5)
  completedHabitTitles: string[];
  mood?: string;                 // Optional mood from journal
  createdAt: number;
  score?: number;                // Productivity score (0-100)
}

