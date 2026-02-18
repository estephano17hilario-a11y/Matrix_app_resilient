import { Target, Dumbbell, Brain, Users, Ghost, Wallet, Palette, Anchor, Crown, Shield, Zap, Feather } from 'lucide-react';
import { GAMIFICATION_CONFIG } from '@/config/gamification';

export const TRAITS_LIST = [
  { id: 'DISCIPLINA', label: 'traits.DISCIPLINA', color: '#3b82f6', icon: Target, desc: 'Capacidad de mantener el rumbo' },
  { id: 'FISICO', label: 'traits.FISICO', color: '#ef4444', icon: Dumbbell, desc: 'Fuerza y salud del cuerpo' },
  { id: 'MENTAL', label: 'traits.MENTAL', color: '#06b6d4', icon: Brain, desc: 'Agudeza y claridad cognitiva' },
  { id: 'SOCIAL', label: 'traits.SOCIAL', color: '#ec4899', icon: Users, desc: 'Conexión e influencia' },
  { id: 'ESPIRITU', label: 'traits.ESPIRITU', color: '#8b5cf6', icon: Ghost, desc: 'Propósito y paz interior' },
  { id: 'FINANZAS', label: 'traits.FINANZAS', color: '#10b981', icon: Wallet, desc: 'Gestión de recursos' },
  { id: 'CREATIVIDAD', label: 'traits.CREATIVIDAD', color: '#f59e0b', icon: Palette, desc: 'Innovación y expresión' },
  { id: 'ORDEN', label: 'traits.ORDEN', color: '#64748b', icon: Anchor, desc: 'Estructura y organización' },
  { id: 'LIDERAZGO', label: 'traits.LIDERAZGO', color: '#6366f1', icon: Crown, desc: 'Inspirar y guiar a otros' },
  { id: 'RESILIENCIA', label: 'traits.RESILIENCIA', color: '#f97316', icon: Shield, desc: 'Superar la adversidad' },
  { id: 'VITALIDAD', label: 'traits.VITALIDAD', color: '#84cc16', icon: Zap, desc: 'Energía y vigor' },
  { id: 'ESTILO', label: 'traits.ESTILO', color: '#d946ef', icon: Feather, desc: 'Presencia y estética' },
];

export const DAILY_LIMITS = {
  TASKS: {
    XP: GAMIFICATION_CONFIG.MAX_DAILY_TASK_XP,
    TRAIT_POINTS: GAMIFICATION_CONFIG.MAX_DAILY_TASK_XP, // Assuming same limit for simplicity or strictly 200
    GOLD: 999999 // No strict limit on gold mentioned in caps, only XP/TP
  },
  HABITS: {
    MAX_COUNT: GAMIFICATION_CONFIG.HABITS.COGNITIVE_LOAD_LIMIT // 12
  },
  FOCUS: {
    MAX_HOURS: GAMIFICATION_CONFIG.MAX_DAILY_FOCUS_HOURS,
    MAX_SECONDS: GAMIFICATION_CONFIG.MAX_DAILY_FOCUS_HOURS * 3600
  }
};
