import { Target, Dumbbell, Brain, Users, Ghost, Wallet, Palette, Anchor, Crown, Shield, Zap, Feather } from 'lucide-react';

export const TRAITS_LIST = [
  { id: 'DISCIPLINA', label: 'Disciplina', color: '#3b82f6', icon: Target, desc: 'Capacidad de mantener el rumbo' },
  { id: 'FISICO', label: 'Físico', color: '#ef4444', icon: Dumbbell, desc: 'Fuerza y salud del cuerpo' },
  { id: 'MENTAL', label: 'Mental', color: '#06b6d4', icon: Brain, desc: 'Agudeza y claridad cognitiva' },
  { id: 'SOCIAL', label: 'Social', color: '#ec4899', icon: Users, desc: 'Conexión e influencia' },
  { id: 'ESPIRITU', label: 'Espíritu', color: '#8b5cf6', icon: Ghost, desc: 'Propósito y paz interior' },
  { id: 'FINANZAS', label: 'Finanzas', color: '#10b981', icon: Wallet, desc: 'Gestión de recursos' },
  { id: 'CREATIVIDAD', label: 'Creatividad', color: '#f59e0b', icon: Palette, desc: 'Innovación y expresión' },
  { id: 'ORDEN', label: 'Orden', color: '#64748b', icon: Anchor, desc: 'Estructura y organización' },
  { id: 'LIDERAZGO', label: 'Liderazgo', color: '#6366f1', icon: Crown, desc: 'Inspirar y guiar a otros' },
  { id: 'RESILIENCIA', label: 'Resiliencia', color: '#f97316', icon: Shield, desc: 'Superar la adversidad' },
  { id: 'VITALIDAD', label: 'Vitalidad', color: '#84cc16', icon: Zap, desc: 'Energía y vigor' },
  { id: 'ESTILO', label: 'Estilo', color: '#d946ef', icon: Feather, desc: 'Presencia y estética' },
];

export const DAILY_LIMITS = {
  TASKS: {
    XP: 999999,
    TRAIT_POINTS: 999999, // XP de Rasgos diaria
    GOLD: 999999
  },
  HABITS: {
    MAX_COUNT: 999 // Only first 10 habits give rewards
  },
  FOCUS: {
    MAX_SECONDS: 86400 // 24 hours (24 * 3600)
  }
};
