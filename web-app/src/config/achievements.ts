import { Flame, Zap, Brain, Target, Dumbbell, Users, Ghost, Wallet, Palette, Anchor, Crown, Shield, Feather } from 'lucide-react';
import { UserData } from '../types/User';
import { Attribute } from '../types';

export type AchievementCategory = 'LEVEL' | 'STREAK' | 'RANK' | 'TRAIT';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any; // Lucide Icon component
  category: AchievementCategory;
  condition: (user: UserData, attributes?: Attribute[]) => boolean;
  xpReward: number;
  isHidden?: boolean; // Secret achievement
  arc?: string; // Part of a bigger goal (Season/Arc)
  level?: number; // For interpolation
}

const TRAIT_NAMES: Record<string, string[]> = {
  DISCIPLINA: ["traits.disciplina.achievements.0", "traits.disciplina.achievements.1", "traits.disciplina.achievements.2", "traits.disciplina.achievements.3", "traits.disciplina.achievements.4", "traits.disciplina.achievements.5", "traits.disciplina.achievements.6", "traits.disciplina.achievements.7"],
  FISICO: ["traits.fisico.achievements.0", "traits.fisico.achievements.1", "traits.fisico.achievements.2", "traits.fisico.achievements.3", "traits.fisico.achievements.4", "traits.fisico.achievements.5", "traits.fisico.achievements.6", "traits.fisico.achievements.7"],
  MENTAL: ["traits.mental.achievements.0", "traits.mental.achievements.1", "traits.mental.achievements.2", "traits.mental.achievements.3", "traits.mental.achievements.4", "traits.mental.achievements.5", "traits.mental.achievements.6", "traits.mental.achievements.7"],
  SOCIAL: ["traits.social.achievements.0", "traits.social.achievements.1", "traits.social.achievements.2", "traits.social.achievements.3", "traits.social.achievements.4", "traits.social.achievements.5", "traits.social.achievements.6", "traits.social.achievements.7"],
  ESPIRITU: ["traits.espiritu.achievements.0", "traits.espiritu.achievements.1", "traits.espiritu.achievements.2", "traits.espiritu.achievements.3", "traits.espiritu.achievements.4", "traits.espiritu.achievements.5", "traits.espiritu.achievements.6", "traits.espiritu.achievements.7"],
  FINANZAS: ["traits.finanzas.achievements.0", "traits.finanzas.achievements.1", "traits.finanzas.achievements.2", "traits.finanzas.achievements.3", "traits.finanzas.achievements.4", "traits.finanzas.achievements.5", "traits.finanzas.achievements.6", "traits.finanzas.achievements.7"],
  CREATIVIDAD: ["traits.creatividad.achievements.0", "traits.creatividad.achievements.1", "traits.creatividad.achievements.2", "traits.creatividad.achievements.3", "traits.creatividad.achievements.4", "traits.creatividad.achievements.5", "traits.creatividad.achievements.6", "traits.creatividad.achievements.7"],
  ORDEN: ["traits.orden.achievements.0", "traits.orden.achievements.1", "traits.orden.achievements.2", "traits.orden.achievements.3", "traits.orden.achievements.4", "traits.orden.achievements.5", "traits.orden.achievements.6", "traits.orden.achievements.7"],
  LIDERAZGO: ["traits.liderazgo.achievements.0", "traits.liderazgo.achievements.1", "traits.liderazgo.achievements.2", "traits.liderazgo.achievements.3", "traits.liderazgo.achievements.4", "traits.liderazgo.achievements.5", "traits.liderazgo.achievements.6", "traits.liderazgo.achievements.7"],
  RESILIENCIA: ["traits.resiliencia.achievements.0", "traits.resiliencia.achievements.1", "traits.resiliencia.achievements.2", "traits.resiliencia.achievements.3", "traits.resiliencia.achievements.4", "traits.resiliencia.achievements.5", "traits.resiliencia.achievements.6", "traits.resiliencia.achievements.7"],
  VITALIDAD: ["traits.vitalidad.achievements.0", "traits.vitalidad.achievements.1", "traits.vitalidad.achievements.2", "traits.vitalidad.achievements.3", "traits.vitalidad.achievements.4", "traits.vitalidad.achievements.5", "traits.vitalidad.achievements.6", "traits.vitalidad.achievements.7"],
  ESTILO: ["traits.estilo.achievements.0", "traits.estilo.achievements.1", "traits.estilo.achievements.2", "traits.estilo.achievements.3", "traits.estilo.achievements.4", "traits.estilo.achievements.5", "traits.estilo.achievements.6", "traits.estilo.achievements.7"]
};

const TRAIT_ICONS: Record<string, any> = {
  DISCIPLINA: Target, FISICO: Dumbbell, MENTAL: Brain, SOCIAL: Users, 
  ESPIRITU: Ghost, FINANZAS: Wallet, CREATIVIDAD: Palette, ORDEN: Anchor, 
  LIDERAZGO: Crown, RESILIENCIA: Shield, VITALIDAD: Zap, ESTILO: Feather
};

const LEVELS = [3, 5, 10, 15, 20, 30, 50, 100];

const generateTraitAchievements = (): Achievement[] => {
  const achievements: Achievement[] = [];
  
  Object.entries(TRAIT_NAMES).forEach(([traitId, names]) => {
    names.forEach((name, index) => {
      const level = LEVELS[index];
      achievements.push({
        id: `TRT_${traitId}_${level}`,
        title: name,
        description: `achievements.trait.${traitId.toLowerCase()}.desc`,
        icon: TRAIT_ICONS[traitId] || Zap,
        category: 'TRAIT',
        condition: (_, attributes) => {
          if (!attributes) return false;
          const attr = attributes.find(a => a.id === traitId);
          return attr ? attr.level >= level : false;
        },
        xpReward: level * 100,
        arc: 'Mastery',
        level: level
      });
    });
  });
  
  return achievements;
};

export const ACHIEVEMENTS: Achievement[] = [
  // --- LEVEL ACHIEVEMENTS ---
  { id: 'LVL_001', title: 'achievements.level.001.title', description: 'achievements.level.001.desc', icon: Zap, category: 'LEVEL', condition: (user) => user.stats.level >= 1, xpReward: 50, arc: 'The Initiate' },
  { id: 'LVL_005', title: 'achievements.level.005.title', description: 'achievements.level.005.desc', icon: Zap, category: 'LEVEL', condition: (user) => user.stats.level >= 5, xpReward: 250, arc: 'The Initiate' },
  { id: 'LVL_010', title: 'achievements.level.010.title', description: 'achievements.level.010.desc', icon: Zap, category: 'LEVEL', condition: (user) => user.stats.level >= 10, xpReward: 500, arc: 'The One' },
  { id: 'LVL_020', title: 'achievements.level.020.title', description: 'achievements.level.020.desc', icon: Zap, category: 'LEVEL', condition: (user) => user.stats.level >= 20, xpReward: 1000, arc: 'The One' },
  { id: 'LVL_030', title: 'achievements.level.030.title', description: 'achievements.level.030.desc', icon: Zap, category: 'LEVEL', condition: (user) => user.stats.level >= 30, xpReward: 1500, arc: 'The One' },
  { id: 'LVL_050', title: 'achievements.level.050.title', description: 'achievements.level.050.desc', icon: Zap, category: 'LEVEL', condition: (user) => user.stats.level >= 50, xpReward: 2500, arc: 'Legend' },
  { id: 'LVL_100', title: 'achievements.level.100.title', description: 'achievements.level.100.desc', icon: Zap, category: 'LEVEL', condition: (user) => user.stats.level >= 100, xpReward: 5000, arc: 'Legend' },

  // --- STREAK ACHIEVEMENTS ---
  { id: 'STR_003', title: 'achievements.streak.003.title', description: 'achievements.streak.003.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 3, xpReward: 150, arc: 'The Initiate' },
  { id: 'STR_007', title: 'achievements.streak.007.title', description: 'achievements.streak.007.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 7, xpReward: 500, arc: 'The Initiate' },
  { id: 'STR_014', title: 'achievements.streak.014.title', description: 'achievements.streak.014.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 14, xpReward: 1000, arc: 'The One' },
  { id: 'STR_030', title: 'achievements.streak.030.title', description: 'achievements.streak.030.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 30, xpReward: 2000, arc: 'The One' },
  { id: 'STR_050', title: 'achievements.streak.050.title', description: 'achievements.streak.050.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 50, xpReward: 3000, arc: 'The One' },
  { id: 'STR_075', title: 'achievements.streak.075.title', description: 'achievements.streak.075.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 75, xpReward: 4000, arc: 'Legend' },
  { id: 'STR_100', title: 'achievements.streak.100.title', description: 'achievements.streak.100.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 100, xpReward: 5000, arc: 'Legend' },
  { id: 'STR_200', title: 'achievements.streak.200.title', description: 'achievements.streak.200.desc', icon: Flame, category: 'STREAK', condition: (user) => user.stats.streak >= 200, xpReward: 10000, arc: 'Legend' },

  // --- TRAIT ACHIEVEMENTS ---
  ...generateTraitAchievements()
];

export const ACHIEVEMENT_ARCS = {
  'The Initiate': {
    title: 'achievements.arcs.initiate.title',
    description: 'achievements.arcs.initiate.desc',
    reward: 'achievements.rewards.neonKatana'
  },
  'The One': {
    title: 'achievements.arcs.theone.title',
    description: 'achievements.arcs.theone.desc',
    reward: 'achievements.rewards.godMode'
  }
};
