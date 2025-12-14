import { useState, useEffect } from 'react';

export interface UserStats {
  hp: number;
  xp: number;
  level: number;
  gold: number;
}

export interface UserPreferences {
  theme: string;
  mode: string;
}

export interface UserData {
  uid: string;
  stats: UserStats;
  preferences: UserPreferences;
  currentStreak: number;
}

export interface Task {
  id: string;
  status: 'pending' | 'completed' | 'archived';
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  impact_on_stats?: { xp: number; gold: number };
  [key: string]: any;
}

export interface Habit {
  id: string;
  frequency: string;
  current_streak: number;
  [key: string]: any;
}

export interface MatrixDataHook {
  user: UserData | null;
  tasks: Task[];
  habits: Habit[];
  loading: boolean;
  error: Error | null;
  syncing: boolean;
  completeTask: (taskId: string, difficulty: string, impactOnStats?: { xp: number; gold: number }) => Promise<void>;
}

// MOCK DATA FOR "GOLDEN MASTER" UI
const MOCK_USER: UserData = {
  uid: 'neo-01',
  stats: { hp: 100, xp: 2500, level: 5, gold: 500 },
  preferences: { theme: 'matrix', mode: 'focus' },
  currentStreak: 7
};

const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Complete System Core', status: 'pending', difficulty: 'hard' },
  { id: '2', title: 'Neural Link Calibration', status: 'completed', difficulty: 'medium' }
];

const MOCK_HABITS: Habit[] = [
  { id: 'h1', title: 'Deep Work', frequency: 'daily', current_streak: 5 }
];

export const useMatrixData = (userId: string | null): MatrixDataHook => {
  const [user, setUser] = useState<UserData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate Network Delay for "Realism"
    const timer = setTimeout(() => {
      if (userId) {
        setUser(MOCK_USER);
        setTasks(MOCK_TASKS);
        setHabits(MOCK_HABITS);
      }
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [userId]);

  const completeTask = async (taskId: string) => {
    console.log(`Task ${taskId} completed (Mock)`);
  };

  return {
    user,
    tasks,
    habits,
    loading,
    error: null,
    syncing: false,
    completeTask
  };
};
