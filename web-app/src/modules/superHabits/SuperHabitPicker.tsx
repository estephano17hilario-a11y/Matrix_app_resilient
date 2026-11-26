import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, X, Crown } from 'lucide-react';
import { SUPER_HABIT_LIST, getSuperTheme, type SuperHabitId } from './catalog';
import './superHabits.css';

/** The loud button next to the title in the habit form. */
export const SuperHabitButton: React.FC<{ value: SuperHabitId | null; open: boolean; onToggle: () => void; /** Free account: shows a Deluxe crown (tapping explains the feature). */ locked?: boolean }> = ({ value, open, onToggle, locked }) => {
  const theme = getSuperTheme(value);
  const Icon = theme?.icon ?? Sparkles;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!!theme}
      aria-expanded={open}
      data-tour="habit-modal-super-habit"
      className="sh-cta shrink-0 h-[46px] px-2.5 rounded-xl flex items-center gap-1.5 text-left active:scale-95 transition-transform border"
      style={{
        background: theme
          ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
          : 'linear-gradient(135deg, #f59e0b 0%, #ec4899 55%, #6366f1 100%)',
        borderColor: 'rgba(255,255,255,0.45)',
        boxShadow: theme ? `0 6px 20px -4px ${theme.colors.primary}aa` : '0 6px 20px -4px #ec4899aa',
      }}
    >
      <span className="w-7 h-7 rounded-lg bg-black/25 flex items-center justify-center shrink-0">
        {locked ? <Crown size={15} className="text-white" fill="currentColor" /> : <Icon size={15} className="text-white" fill={theme ? 'none' : 'currentColor'} />}
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[8px] font-black tracking-[0.18em] uppercase text-white/85">{theme ? 'Activo' : locked ? 'Deluxe' : 'Activar'}</span>
        <span className="text-[11px] font-black tracking-tight text-white mt-0.5 whitespace-nowrap">
          {theme ? theme.shortName.slice(0, 11) : 'SUPER HÁBITO'}
        </span>
      </span>
    </button>
  );
};

/** Choose which of the 15 super habits this is. */
export const SuperHabitGrid: React.FC<{ value: SuperHabitId | null; onSelect: (id: SuperHabitId | null) => void }> = ({ value, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="overflow-hidden"
  >
    <div className="rounded-2xl border border-white/10 bg-black/30 p-2 mt-1">
      <p className="text-[10px] leading-snug text-white/55 font-medium px-1 pb-2">
        Un super hábito tiene su propio roadmap de 60 días, insignias, sonidos y efectos. Elige cuál es:
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {SUPER_HABIT_LIST.map(t => {
          const selected = value === t.id;
          const I = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className="relative rounded-xl px-1 py-2 flex flex-col items-center gap-1 border active:scale-95 transition-transform"
              style={{
                background: selected ? `linear-gradient(160deg, ${t.colors.primary}55, ${t.colors.deep})` : 'rgba(255,255,255,0.04)',
                borderColor: selected ? t.colors.primary : 'rgba(255,255,255,0.08)',
                boxShadow: selected ? `0 0 14px -2px ${t.colors.primary}99` : 'none',
              }}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}>
                <I size={16} className="text-white" />
              </span>
              <span className="text-[9px] font-black text-white leading-tight text-center line-clamp-2">{t.name}</span>
              {selected && <Check size={11} className="absolute top-1 right-1 text-white" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mt-2 w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/60 bg-white/5 hover:bg-white/10"
        >
          <X size={12} /> Quitar super hábito
        </button>
      )}
    </div>
  </motion.div>
);
