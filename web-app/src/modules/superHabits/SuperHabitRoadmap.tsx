import React from 'react';
import type { Habit } from '../../types';
import { getSuperTheme } from './catalog';
import { getWorld } from './worlds/registry';
import { WorldShell } from './worlds/WorldShell';

interface SuperHabitRoadmapProps {
  habit: Habit | null;
  onClose: () => void;
  /** Opens the regular statistics view of the habit. */
  onOpenStats?: (habit: Habit) => void;
}

/**
 * Entering a super habit drops you into its own world (a glass of water to fill,
 * a startup to launch, a notebook, a rose window…). Each world is its 60-day roadmap.
 */
export const SuperHabitRoadmap: React.FC<SuperHabitRoadmapProps> = ({ habit, onClose, onOpenStats }) => {
  const theme = getSuperTheme(habit?.superHabit);
  if (!habit || !theme) return null;
  return <WorldShell habit={habit} theme={theme} def={getWorld(theme.id)} onClose={onClose} onOpenStats={onOpenStats} />;
};
