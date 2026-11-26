import type { Habit } from '../../types';
import { getSuperTheme, type SuperHabitId } from './catalog';

/** Fired whenever a super habit is completed (from any screen). */
export const SUPER_HABIT_EVENT = 'lux:super-habit-complete';

export interface SuperHabitFxDetail {
  habitId: string;
  superHabit: SuperHabitId;
  title: string;
  /** Streak after completing. */
  streak: number;
  /** Streak before completing, to know whether a badge was unlocked. */
  before: number;
  /** Where the tap happened, 0..1 of the viewport. */
  origin?: { x: number; y: number };
}

/**
 * Announce that `habit` (already updated, with its new streak) was just completed.
 * Returns true when it is a super habit — callers use that to skip the generic effects.
 */
export const emitSuperHabitComplete = (
  habit: Pick<Habit, 'id' | 'title' | 'streak' | 'superHabit'>,
  before: number,
  origin?: { x: number; y: number },
): boolean => {
  const theme = getSuperTheme(habit.superHabit);
  if (!theme || typeof window === 'undefined') return false;
  const detail: SuperHabitFxDetail = {
    habitId: habit.id, superHabit: theme.id, title: habit.title, streak: habit.streak || 0, before, origin,
  };
  window.dispatchEvent(new CustomEvent<SuperHabitFxDetail>(SUPER_HABIT_EVENT, { detail }));
  return true;
};
