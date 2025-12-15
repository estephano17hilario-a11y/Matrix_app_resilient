import { ThemeConfig } from '../../types';
import { Target, Dumbbell, Brain, Users, Ghost, Wallet, Palette, Anchor, Crown, Shield, Zap, Feather } from 'lucide-react';

export const THEMES: Record<string, ThemeConfig> = {
  OLED: { type: 'gradient', bg: 'bg-black', accent: '#ffffff' },
  SPOTLIGHT: { type: 'gradient', bg: 'bg-[#000000]', accent: '#38bdf8' },
  NEBULA: { type: 'blob', bg: 'bg-[#000000]', blobs: [{ x: '10%', y: '20%', size: '700px' }, { x: '80%', y: '10%', size: '600px' }, { x: '50%', y: '80%', size: '900px' }], accent: '#8b5cf6' },
  AURORA: { type: 'blob', bg: 'bg-[#000000]', blobs: [{ x: '20%', y: '-10%', size: '800px' }, { x: '80%', y: '50%', size: '700px' }, { x: '10%', y: '90%', size: '600px' }], accent: '#14b8a6' },
  SUNSET: { type: 'blob', bg: 'bg-[#000000]', blobs: [{ x: '10%', y: '10%', size: '800px' }, { x: '80%', y: '80%', size: '700px' }, { x: '50%', y: '50%', size: '500px' }], accent: '#f59e0b' }
};

export const TRAITS_LIST = [
  { id: 'DISCIPLINA', label: 'Disciplina', color: '#3b82f6', icon: Target, desc: 'Voluntad inquebrantable.' },
  { id: 'FISICO', label: 'Físico', color: '#ef4444', icon: Dumbbell, desc: 'Poder y resistencia.' },
  { id: 'MENTAL', label: 'Intelecto', color: '#06b6d4', icon: Brain, desc: 'Agudeza y aprendizaje.' },
  { id: 'SOCIAL', label: 'Carisma', color: '#ec4899', icon: Users, desc: 'Influencia y conexión.' },
  { id: 'ESPIRITU', label: 'Espíritu', color: '#8b5cf6', icon: Ghost, desc: 'Calma y consciencia.' },
  { id: 'FINANZAS', label: 'Riqueza', color: '#10b981', icon: Wallet, desc: 'Libertad de recursos.' },
  { id: 'CREATIVIDAD', label: 'Creatividad', color: '#f59e0b', icon: Palette, desc: 'Visión e innovación.' },
  { id: 'ORDEN', label: 'Sistema', color: '#64748b', icon: Anchor, desc: 'Control y estructura.' },
  { id: 'LIDERAZGO', label: 'Liderazgo', color: '#6366f1', icon: Crown, desc: 'Guiar a otros.' },
  { id: 'RESILIENCIA', label: 'Temple', color: '#f97316', icon: Shield, desc: 'Invencibilidad.' },
  { id: 'VITALIDAD', label: 'Energía', color: '#84cc16', icon: Zap, desc: 'Motor de vida.' },
  { id: 'ESTILO', label: 'Estética', color: '#d946ef', icon: Feather, desc: 'Arte de vivir.' },
];
