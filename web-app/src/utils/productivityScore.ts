import { Quest, Habit, Project } from '../types';
import { DailyLimits } from '../types/User';
import { toLocalISOString, getHistoryDateKey, getCompletedCountThisPeriod } from './dateUtils';

const isLastDayOfMonth = (d: Date) => {
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return tomorrow.getDate() === 1;
};

export function isHabitActive(habit: Habit, date: Date): boolean {
  if (habit.archived) return false;
  
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfMonth = date.getDate();
  
  if (habit.frequency === 'DAILY') {
    return true;
  }
  
  if (habit.frequency === 'WEEKLY') {
    if (habit.weeklyType === 'FLEXIBLE_COUNT') {
      const dateStr = toLocalISOString(date);
      const isToday = toLocalISOString(new Date()) === dateStr;
      if (isToday) {
        return !!habit.completedToday;
      }
      const history = habit.history || [];
      return history.some(d => d.startsWith(dateStr));
    }
    if (!habit.frequencyDays || habit.frequencyDays.length === 0) {
      return true;
    }
    return habit.frequencyDays.includes(dayOfWeek);
  }
  
  if (habit.frequency === 'MONTHLY') {
    if (habit.monthlyType === 'FLEXIBLE_COUNT') {
      const dateStr = toLocalISOString(date);
      const isToday = toLocalISOString(new Date()) === dateStr;
      if (isToday) {
        return !!habit.completedToday;
      }
      const history = habit.history || [];
      return history.some(d => d.startsWith(dateStr));
    }
    const selectedDays = habit.frequencyDays || [];
    if (selectedDays.includes(dayOfMonth)) {
      return true;
    }
    if (habit.monthlyLastDay && isLastDayOfMonth(date)) {
      return true;
    }
    return false;
  }
  
  return true;
}

export function isProjectActive(project: Project, date: Date): boolean {
  if (project.archived || project.deleted) return false;
  if (!project.workingDays || project.workingDays.length === 0) return true;
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  return project.workingDays.includes(dayOfWeek);
}

export interface ScoreBreakdown {
  tasks: number;
  habits: number;
  focus: number;
  subHabits: number;
  total: number;
}

/**
 * Detailed score breakdown calculator. Single source of truth for both live and historical entries.
 * Handles dynamic weight redistribution so that scores start at 0 if no progress is made.
 */
export function getDetailedScoreBreakdown(
  entry: {
    date?: string;
    tasksCompleted: number;
    tasksTotal: number;
    focusMinutes: number;
    habitsCompleted: number;
    habitsTotal: number;
    subHabitsCompleted: number;
    subHabitsTotal: number;
    score?: number;
  },
  isToday: boolean,
  _quests?: Quest[],
  habits?: Habit[],
  projects?: Project[]
): ScoreBreakdown {
  if (!entry) {
    return { tasks: 0, habits: 0, focus: 0, subHabits: 0, total: 0 };
  }
  
  const hasActivity = 
    (entry.tasksCompleted || 0) > 0 || 
    (entry.habitsCompleted || 0) > 0 || 
    (entry.focusMinutes || 0) > 0 || 
    (entry.subHabitsCompleted || 0) > 0;

  if (!hasActivity) {
    return { tasks: 0, habits: 0, focus: 0, subHabits: 0, total: 0 };
  }

  // Parse target date based on entry date or current date
  const targetDate = entry.date ? new Date(entry.date + 'T12:00:00') : new Date();

  // Tasks metadata
  const tasksCompleted = entry.tasksCompleted || 0;
  const tasksTotal = entry.tasksTotal || 0;
  const hasTasks = tasksTotal > 0;

  // Focus projects check for the given targetDate if projects array is provided
  let hasFocus = false;
  let focusTargetMinutes = 0;
  let activeProjects: Project[] = [];

  if (projects) {
    activeProjects = projects.filter(p => isProjectActive(p, targetDate));
    activeProjects.forEach(p => {
      if (p.goalTarget > 0) focusTargetMinutes += p.goalTarget;
    });
    hasFocus = focusTargetMinutes > 0;
  }

  // Dynamic weight redistribution
  let taskWeight = 0;
  let habitWeight = 0;
  let focusWeight = 0;

  if (projects) {
    if (hasTasks && hasFocus) {
      taskWeight = 20;
      habitWeight = 40;
      focusWeight = 40;
    } else if (!hasTasks && hasFocus) {
      taskWeight = 0;
      habitWeight = 45;
      focusWeight = 55;
    } else if (hasTasks && !hasFocus) {
      taskWeight = 30;
      habitWeight = 70;
      focusWeight = 0;
    } else {
      taskWeight = 0;
      habitWeight = 100;
      focusWeight = 0;
    }
  } else {
    // If projects are not provided (standalone card rendering fallback)
    taskWeight = hasTasks ? 20 : 0;
    habitWeight = hasTasks ? 40 : 45;
    focusWeight = hasTasks ? 40 : 55;
  }

  // 1. Tasks Contribution
  const tasksScore = hasTasks ? (tasksCompleted / tasksTotal) * taskWeight : 0;

  // 2. Habits & Sub-habits Contribution
  let habitsScore = 0;
  let subHabitsScore = 0;

  if (isToday && habits) {
    const activeHabitsToday = habits.filter(h => isHabitActive(h, targetDate));
    const hTotal = activeHabitsToday.length;

    if (hTotal > 0) {
      let sumCompletions = 0;
      const dayOfWeek = targetDate.getDay();
      
      activeHabitsToday.forEach(h => {
        let itemVal = 0;
        if (h.type === 'CHECKLIST' && h.checklist && h.checklist.length > 0) {
          const todayKey = getHistoryDateKey(toLocalISOString(targetDate));
          const activeSubtasks = h.checklist.filter(sub => {
            if (sub.intervalType === 'WEEKLY' || sub.intervalType === 'MONTHLY') {
              const isDoneToday = sub.history?.includes(todayKey) || sub.skippedHistory?.includes(todayKey);
              if (isDoneToday) return true;
              
              const doneCount = getCompletedCountThisPeriod(sub, sub.intervalType, targetDate);
              return doneCount < (sub.intervalCount || 1);
            }
            return !sub.days || sub.days.length === 0 || sub.days.includes(dayOfWeek);
          });
          const subTotal = activeSubtasks.length;
          if (subTotal > 0) {
            const subCompleted = activeSubtasks.filter(item => {
              if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
                return item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
              }
              return item.completed;
            }).length;
            itemVal = subCompleted / subTotal;
            subHabitsScore += (itemVal / hTotal) * (habitWeight * 0.3);
          } else {
            itemVal = h.completedToday ? 1.0 : 0.0;
          }
        } else if (h.type === 'QUANTITY' && h.targetValue && h.targetValue > 0) {
          itemVal = Math.min((h.currentValue || 0) / h.targetValue, 1.0);
        } else {
          itemVal = h.completedToday ? 1.0 : 0.0;
        }
        sumCompletions += itemVal;
      });
      habitsScore = (sumCompletions / hTotal) * habitWeight;
    } else {
      habitsScore = habitWeight;
    }
  } else {
    // Fallback/historical calculations using stored entry data
    if (entry.habitsTotal > 0) {
      if (entry.subHabitsTotal > 0) {
        subHabitsScore = (entry.subHabitsCompleted / entry.subHabitsTotal) * (habitWeight * 0.3);
        const rawComp = (entry.habitsCompleted + (entry.subHabitsCompleted / entry.subHabitsTotal)) / entry.habitsTotal;
        habitsScore = Math.min(rawComp, 1.0) * habitWeight;
      } else {
        habitsScore = (entry.habitsCompleted / entry.habitsTotal) * habitWeight;
      }
    } else {
      habitsScore = habitWeight;
    }
  }

  const adjustedHabitsScore = Math.max(habitsScore - subHabitsScore, 0);

  // 3. Focus Contribution
  let focusScore = 0;
  if (projects && hasFocus) {
    const dayStr = entry.date || toLocalISOString(targetDate);
    let accumulatedFocusScore = 0;
    activeProjects.forEach(p => {
      const pTarget = p.goalTarget || 0;
      if (pTarget > 0) {
        const share = pTarget / focusTargetMinutes;
        let actualMin = 0;
        if (p.sessions) {
          const sessionsOnDay = p.sessions.filter(s => {
            if (!s.date) return false;
            try {
              return toLocalISOString(new Date(s.date)) === dayStr;
            } catch (e) {
              return false;
            }
          });
          actualMin = Math.round(sessionsOnDay.reduce((acc, s) => acc + (s.duration || 0), 0) / 60);
        }
        const comp = Math.min(actualMin / pTarget, 1.0);
        accumulatedFocusScore += share * comp * focusWeight;
      }
    });
    focusScore = accumulatedFocusScore;
  } else {
    // Simple focus score allocation if projects are not available
    if (entry.focusMinutes > 0) {
      const tempWeight = hasTasks ? 40 : 55;
      focusScore = Math.min(entry.focusMinutes / 120, 1.0) * (projects ? focusWeight : tempWeight);
    } else {
      focusScore = 0;
    }
  }

  const calculatedTotal = tasksScore + adjustedHabitsScore + focusScore + subHabitsScore;
  const total = entry.score !== undefined ? entry.score : calculatedTotal;

  return {
    tasks: Math.round(tasksScore * 10) / 10,
    habits: Math.round(adjustedHabitsScore * 10) / 10,
    focus: Math.round(focusScore * 10) / 10,
    subHabits: Math.round(subHabitsScore * 10) / 10,
    total: Math.round(total * 10) / 10
  };
}

/**
 * Calculates today's live productivity score based on the new custom formula
 */
export function calculateLiveProductivityScore(
  quests: Quest[] = [],
  habits: Habit[] = [],
  projects: Project[] = [],
  dailyLimits: DailyLimits = {} as DailyLimits,
  date: Date = new Date()
): number {
  const safeQuests = quests || [];
  const safeHabits = habits || [];
  const safeProjects = projects || [];
  const safeLimits = dailyLimits || {};

  const today = toLocalISOString(date);
  const todayCompletedQuests = safeQuests.filter(q => {
    if (!q.completed || !q.completedAt) return false;
    try {
      return toLocalISOString(new Date(q.completedAt)) === today;
    } catch (e) {
      return false;
    }
  });
  const tasksCompleted = todayCompletedQuests.length;
  const activeUncompletedQuests = safeQuests.filter(q => !q.completed);
  const tasksTotal = activeUncompletedQuests.length + tasksCompleted;

  let focusSecondsFromSessions = 0;
  safeProjects.forEach(p => {
    if (p.sessions) {
      const todaySessions = p.sessions.filter(s => {
        if (!s.date) return false;
        try {
          return toLocalISOString(new Date(s.date)) === today;
        } catch (e) {
          return false;
        }
      });
      focusSecondsFromSessions += todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    }
  });
  const focusMinutes = Math.round(Math.max(Number(safeLimits.focusSeconds || 0), focusSecondsFromSessions) / 60);

  const habitsCompleted = safeHabits.filter(h => !h.archived && h.completedToday).length;
  const habitsTotal = safeHabits.filter(h => !h.archived).length;

  let subHabitsCompleted = 0;
  let subHabitsTotal = 0;
  const dayOfWeek = date.getDay();
  safeHabits.forEach(h => {
    if (h.archived) return;
    if (h.type === 'CHECKLIST' && h.checklist) {
      const isActive = isHabitActive(h, date);
      if (isActive) {
        const todayKey = getHistoryDateKey(toLocalISOString(date));
        const activeChecklist = h.checklist.filter(sub => {
          if (sub.intervalType === 'WEEKLY' || sub.intervalType === 'MONTHLY') {
            const isDoneToday = sub.history?.includes(todayKey) || sub.skippedHistory?.includes(todayKey);
            if (isDoneToday) return true;
            
            const doneCount = getCompletedCountThisPeriod(sub, sub.intervalType, date);
            return doneCount < (sub.intervalCount || 1);
          }
          return !sub.days || sub.days.length === 0 || sub.days.includes(dayOfWeek);
        });
        subHabitsTotal += activeChecklist.length;
        subHabitsCompleted += activeChecklist.filter(item => {
          if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
            return item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
          }
          return item.completed;
        }).length;
      }
    }
  });

  const breakdown = getDetailedScoreBreakdown({
    date: today,
    tasksCompleted,
    tasksTotal,
    focusMinutes,
    habitsCompleted,
    habitsTotal,
    subHabitsCompleted,
    subHabitsTotal
  }, true, safeQuests, safeHabits, safeProjects);

  return breakdown.total;
}

/**
 * Calculates a fallback productivity score for historical entries
 */
export function calculateFallbackProductivityScore(entry: {
  tasksCompleted: number;
  tasksTotal: number;
  focusMinutes: number;
  habitsCompleted: number;
  habitsTotal: number;
  subHabitsCompleted: number;
  subHabitsTotal: number;
  score?: number;
}): number {
  if (entry.score !== undefined && entry.score !== null) {
    return Math.round(entry.score * 10) / 10;
  }
  const breakdown = getDetailedScoreBreakdown(entry, false);
  return breakdown.total;
}
