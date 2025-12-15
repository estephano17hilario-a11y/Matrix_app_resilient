import { Trophy, Flame, Zap, Brain, Target, Shield, Sword } from 'lucide-react';
import { UserData } from '../hooks/useMatrixData';

export type AchievementCategory = 'XP' | 'STREAK' | 'COMBAT' | 'MASTERY';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any; // Lucide Icon component
  category: AchievementCategory;
  condition: (user: UserData) => boolean;
  xpReward: number;
  isHidden?: boolean; // Secret achievement
  arc?: string; // Part of a bigger goal (Season/Arc)
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'NOV_001',
    title: 'Awakening',
    description: 'Earn your first 1000 XP. Welcome to the Real World.',
    icon: Zap,
    category: 'XP',
    condition: (user) => user.stats.xp >= 1000,
    xpReward: 100,
    arc: 'The Initiate'
  },
  {
    id: 'STR_007',
    title: 'Unbreakable',
    description: 'Maintain a 7-day streak. Consistency is your weapon.',
    icon: Flame,
    category: 'STREAK',
    condition: (user) => user.currentStreak >= 7,
    xpReward: 500,
    arc: 'The Initiate'
  },
  {
    id: 'MST_001',
    title: 'The Architect',
    description: 'Reach Level 10. You are beginning to see the code.',
    icon: Brain,
    category: 'MASTERY',
    condition: (user) => user.stats.level >= 10,
    xpReward: 1000,
    arc: 'The One'
  },
  {
    id: 'CMB_001',
    title: 'First Blood',
    description: 'Complete a "Hard" difficulty task.',
    icon: Sword,
    category: 'COMBAT',
    condition: (user) => false, // This would require tracking completed task history specifically, handled via event check usually
    xpReward: 200,
    arc: 'The Initiate'
  }
];

export const ACHIEVEMENT_ARCS = {
  'The Initiate': {
    title: 'The Initiate Protocol',
    description: 'Complete the basic training to synchronize with the Matrix.',
    reward: 'Neon Katana Skin'
  },
  'The One': {
    title: 'Path of The One',
    description: 'Transcending human limitations.',
    reward: 'God Mode Theme'
  }
};
