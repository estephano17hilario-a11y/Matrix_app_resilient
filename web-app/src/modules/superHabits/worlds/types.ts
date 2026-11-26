import type React from 'react';
import type { Habit } from '../../../types';
import type { SuperHabitTheme } from '../catalog';
import type { SuperMilestone } from '../engine';

export type NodeState = 'earned' | 'next' | 'locked';

/** Everything a world needs to draw itself. */
export interface WorldCtx {
  habit: Habit;
  theme: SuperHabitTheme;
  streak: number;
  /** 0..1 fill of the world's metaphor, see engine.worldLevel. */
  level: number;
  earned: SuperMilestone[];
  next: SuperMilestone | null;
  daysLeft: number | null;
  /** Habit completed today. */
  lit: boolean;
  selected: number;
  select: (i: number) => void;
  stateOf: (i: number) => NodeState;
}

export interface WorldDef {
  /** Page background behind everything (CSS background). */
  bg: string;
  /** Short line under the title, e.g. "Vaso al 62%". */
  headline: (c: WorldCtx) => string;
  Scene: React.FC<WorldCtx>;
  /** Show the milestone detail sheet at the bottom (default true). */
  sheet?: boolean;
  /** Scene scrolls instead of fitting the screen (chat, terminal…). */
  scroll?: boolean;
}
