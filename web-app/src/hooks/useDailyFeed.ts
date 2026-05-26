import { useState, useEffect, useCallback, useMemo } from 'react';
import { persistenceService } from '../services/persistenceService';
import { PersistenceService } from '../services/persistence';
import { DailyFeedEntry } from '../types/DailyFeedEntry';
import { Quest, Habit, Project } from '../types';
import { DailyLimits } from '../types/User';
import { toLocalISOString } from '../utils/dateUtils';
import { calculateLiveProductivityScore } from '../utils/productivityScore';

interface UseDailyFeedProps {
  userId?: string;
  quests: Quest[];
  habits: Habit[];
  projects: Project[];
  dailyLimits: DailyLimits;
  player: { level: number; xp: number; gold: number };
  streak: number;
}

export const useDailyFeed = ({ 
  userId, 
  quests = [], 
  habits = [], 
  projects = [], 
  dailyLimits = {} as DailyLimits, 
  streak = 0 
}: UseDailyFeedProps) => {
  const [feedEntries, setFeedEntries] = useState<DailyFeedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load historical feed entries
  useEffect(() => {
    if (!userId) return;
    
    const loadFeed = async () => {
      try {
        setIsLoading(true);
        // 1. Check local cache first
        const cached = PersistenceService.getCollection<DailyFeedEntry>(userId, 'dailyFeed');
        if (cached && cached.length > 0) {
          const sorted = [...cached].sort((a, b) => b.date.localeCompare(a.date));
          setFeedEntries(sorted);
          setIsLoading(false); // Stop loading spinner since we have cache
        }
        
        // 2. Query Supabase
        const entries = await persistenceService.dailyFeed.getAll(userId);
        if (entries) {
          // 3. Save to local cache
          PersistenceService.saveCollection(userId, 'dailyFeed', entries);
          const sorted = entries.sort((a, b) => b.date.localeCompare(a.date));
          setFeedEntries(sorted);
        }
      } catch (e) {
        console.error('[DailyFeed] Failed to load feed entries', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeed();
  }, [userId]);

  // Calculate today's entry in real-time from live data
  const todayEntry: DailyFeedEntry = useMemo(() => {
    const today = toLocalISOString(new Date());
    
    const safeQuests = quests || [];
    const safeHabits = habits || [];
    const safeProjects = projects || [];
    const safeLimits = dailyLimits || {};

    // Tasks
    const todayCompletedTasks = safeQuests.filter(q => {
      if (!q.completed || !q.completedAt) return false;
      const dateStr = typeof q.completedAt === 'number' 
        ? toLocalISOString(new Date(q.completedAt)) 
        : String(q.completedAt);
      return dateStr.startsWith(today);
    });
    const tasksCompleted = Number(safeLimits.tasksCompleted || 0);
    const tasksTotal = safeQuests.filter(q => !q.completed).length + tasksCompleted;

    // Focus
    const focusSeconds = Number(safeLimits.focusSeconds || 0);
    const focusMinutes = Math.round(focusSeconds / 60);
    
    // Count sessions from projects for today
    let focusSessions = 0;
    let topProjects: { name: string; minutes: number; color?: string }[] = [];
    
    const projectTimeMap = new Map<string, { name: string; minutes: number; color?: string }>();
    safeProjects.forEach(p => {
      if (p.sessions) {
        const todaySessions = p.sessions.filter(s => s.date && typeof s.date === 'string' && s.date.startsWith(today));
        if (todaySessions.length > 0) {
          focusSessions += todaySessions.length;
          const totalMin = Math.round(todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60);
          if (totalMin > 0) {
            projectTimeMap.set(p.id, { 
              name: p.title, 
              minutes: totalMin,
              color: p.color
            });
          }
        }
      }
    });
    topProjects = Array.from(projectTimeMap.values())
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    // Habits
    const habitsCompleted = Number(safeLimits.habitsCompleted || 0);
    const habitsTotal = safeHabits.filter(h => !h.archived).length;
    
    // Sub-habits (checklist items)
    let subHabitsCompleted = 0;
    let subHabitsTotal = 0;
    safeHabits.forEach(h => {
      if (h.archived) return;
      if (h.type === 'CHECKLIST' && h.checklist) {
        subHabitsTotal += h.checklist.length;
        subHabitsCompleted += h.checklist.filter(item => item.completed).length;
      }
    });

    // XP & Gold earned today
    const xpEarned = Number(safeLimits.totalXp || 0) || 
                     (Number(safeLimits.taskXp || 0) + Number(safeLimits.focusXp || 0) + Number(safeLimits.habitXp || 0));
    const goldEarned = Number(safeLimits.totalGold || 0) || 
                       (Number(safeLimits.taskGold || 0) + Number(safeLimits.focusGold || 0) + Number(safeLimits.habitGold || 0));
    const tpEarned = Number(safeLimits.totalTraitPoints || 0) ||
                     (Number(safeLimits.taskTraitPoints || 0) + Number(safeLimits.focusTraitPoints || 0) + Number(safeLimits.habitTraitPoints || 0));

    // Completed task/habit titles
    const completedTaskTitles = todayCompletedTasks.map(t => t.title).slice(0, 5);
    const completedHabitTitles = safeHabits
      .filter(h => !h.archived && h.completedToday)
      .map(h => h.title)
      .slice(0, 5);

    const score = calculateLiveProductivityScore(safeQuests, safeHabits, safeProjects, safeLimits);

    return {
      id: `feed_${today}`,
      date: today,
      tasksCompleted,
      tasksTotal,
      focusMinutes,
      focusSessions,
      habitsCompleted,
      habitsTotal,
      subHabitsCompleted,
      subHabitsTotal,
      xpEarned,
      goldEarned,
      tpEarned,
      streak,
      topProjects,
      completedTaskTitles,
      completedHabitTitles,
      createdAt: Date.now(),
      score
    };
  }, [quests, habits, projects, dailyLimits, streak]);

  // Save a feed entry (called on daily reset or manually)
  const saveFeedEntry = useCallback(async (entry: DailyFeedEntry) => {
    if (!userId) return;
    try {
      // Optimistically update state & local cache
      setFeedEntries(prev => {
        const filtered = prev.filter(e => e.date !== entry.date);
        const updated = [entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
        PersistenceService.saveCollection(userId, 'dailyFeed', updated);
        return updated;
      });

      await persistenceService.dailyFeed.save(userId, entry);
      console.log(`[DailyFeed] Saved entry for ${entry.date}`);
    } catch (e) {
      console.error('[DailyFeed] Failed to save feed entry', e);
    }
  }, [userId]);

  // All entries combined (today live + historical)
  const allEntries = useMemo(() => {
    const today = toLocalISOString(new Date());
    const historical = feedEntries.filter(e => e.date !== today);
    return [todayEntry, ...historical];
  }, [todayEntry, feedEntries]);

  // Last 7 days data for sparkline charts
  const last7Days = useMemo(() => {
    const days: DailyFeedEntry[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = toLocalISOString(d);
      
      const existing = allEntries.find(e => e.date === dateStr);
      if (existing) {
        days.push(existing);
      } else {
        // Empty day placeholder
        days.push({
          id: `feed_${dateStr}`,
          date: dateStr,
          tasksCompleted: 0,
          tasksTotal: 0,
          focusMinutes: 0,
          focusSessions: 0,
          habitsCompleted: 0,
          habitsTotal: 0,
          subHabitsCompleted: 0,
          subHabitsTotal: 0,
          xpEarned: 0,
          goldEarned: 0,
          tpEarned: 0,
          streak: 0,
          topProjects: [],
          completedTaskTitles: [],
          completedHabitTitles: [],
          createdAt: 0
        });
      }
    }
    
    return days;
  }, [allEntries]);

  return {
    feedEntries: allEntries,
    todayEntry,
    last7Days,
    isLoading,
    saveFeedEntry
  };
};
