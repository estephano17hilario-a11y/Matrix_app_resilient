import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserStats {
  hp: number;
  xp: number;
  level: number;
  gold: number;
}

export interface UserPreferences {
  theme: string;
  mode: string;
  archetype?: string;
  weakness?: string;
}

export interface UserData {
  uid: string;
  stats: UserStats;
  preferences: UserPreferences;
  currentStreak: number;
  inventory?: Record<string, number>; // Add inventory support
  unlockedAchievements?: string[];
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

// MOCK DATA FALLBACK (If no user or offline/empty)
const MOCK_USER: UserData = {
  uid: 'neo-01',
  stats: { hp: 100, xp: 2500, level: 5, gold: 500 },
  preferences: { theme: 'matrix', mode: 'focus' },
  currentStreak: 7,
  inventory: {}
};

export const useMatrixData = (userId: string | null): MatrixDataHook => {
  const [user, setUser] = useState<UserData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener for User Document
    const userRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          setUser({ uid: doc.id, ...doc.data() } as UserData);
        } else {
            // If user doesn't exist in DB yet (new user), maybe show mock or null
            // For now, let's fallback to mock if doc missing but userId exists (dev mode)
            console.warn("User document not found in Firestore, using Mock.");
            setUser(MOCK_USER); 
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // TODO: Add listeners for Tasks and Habits subcollections here
    // For now, we keep Mock tasks/habits to avoid breaking that part of the app
    setTasks([
      { id: '1', title: 'Complete System Core', status: 'pending', difficulty: 'hard' },
      { id: '2', title: 'Neural Link Calibration', status: 'completed', difficulty: 'medium' }
    ]);

    return () => {
      unsubscribeUser();
    };
  }, [userId]);

  const completeTask = async (taskId: string) => {
    console.log(`Task ${taskId} completed (Mock)`);
    // Here we would implement real task completion logic
  };

  return {
    user,
    tasks,
    habits,
    loading,
    error,
    syncing: false,
    completeTask
  };
};
