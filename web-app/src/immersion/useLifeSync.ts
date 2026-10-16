import { useEffect, useMemo, useState } from 'react';
import { readLife } from './lifeState';
import { setLifeReading, useBattery } from './lifeStore';
import { useImmersionPrefs } from './immersionPrefs';
import { setEcoMode } from './perf';

// Minimal shapes of what the Dashboard already holds.
interface QuestLike { completed?: boolean; completedAt?: number | string | null }
interface HabitLike {
  completedToday?: boolean; archived?: boolean; frequency?: string; frequencyDays?: number[];
  weeklyType?: string; monthlyType?: string; monthlyLastDay?: boolean;
}
interface BadHabitLike { relapsedToday?: boolean; archived?: boolean }

interface Args {
  quests: QuestLike[];
  habits: HabitLike[];
  badHabits: BadHabitLike[];
  questsTotalToday: number;
  focusSeconds: number;
  health: number;          // 0..100
  streak: number;
  streakSecured: boolean;
}

const localDay = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const isLastDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getDate() === 1;

// Same rule the habits view uses to decide what is due today.
const isDueToday = (h: HabitLike, now: Date) => {
  if (h.archived) return false;
  if (h.frequency === 'DAILY' || !h.frequency) return true;
  if (h.frequency === 'WEEKLY') {
    return h.weeklyType === 'FLEXIBLE_COUNT' || !h.frequencyDays?.length || h.frequencyDays.includes(now.getDay());
  }
  if (h.frequency === 'MONTHLY') {
    if (h.monthlyType === 'FLEXIBLE_COUNT') return true;
    return !!h.frequencyDays?.includes(now.getDate()) || (!!h.monthlyLastDay && isLastDayOfMonth(now));
  }
  return true;
};

/**
 * Reads the user's day from the Dashboard's data and publishes it for the
 * adaptive world. Re-reads every few minutes too, so the light follows the
 * clock even when nothing is touched.
 */
export const useLifeSync = (args: Args) => {
  const prefs = useImmersionPrefs();
  const battery = useBattery();
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 5 * 60 * 1000);
    const onVisible = () => { if (!document.hidden) setClock(Date.now()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const { quests, habits, badHabits, questsTotalToday, focusSeconds, health, streak, streakSecured } = args;

  const reading = useMemo(() => {
    const now = new Date(clock);
    const today = localDay(now);
    const tasksDone = (quests || []).filter(q => {
      if (!q.completed || !q.completedAt) return false;
      const d = new Date(q.completedAt);
      return !Number.isNaN(d.getTime()) && localDay(d) === today;
    }).length;
    const due = (habits || []).filter(h => isDueToday(h, now));
    return readLife({
      now,
      tasksTotal: questsTotalToday,
      tasksDone,
      habitsTotal: due.length,
      habitsDone: due.filter(h => h.completedToday).length,
      relapses: (badHabits || []).filter(b => b.relapsedToday && !b.archived).length,
      health: Math.max(0, Math.min(1, (health ?? 100) / 100)),
      streak: streak || 0,
      streakSecured,
      focusMinutes: (focusSeconds || 0) / 60,
      battery,
    });
  }, [clock, quests, habits, badHabits, questsTotalToday, focusSeconds, health, streak, streakSecured, battery]);

  useEffect(() => {
    const on = prefs.enabled && prefs.adaptive;
    setLifeReading(on ? reading : null);
    setEcoMode(on && reading.eco);
  }, [reading, prefs.enabled, prefs.adaptive]);
};
