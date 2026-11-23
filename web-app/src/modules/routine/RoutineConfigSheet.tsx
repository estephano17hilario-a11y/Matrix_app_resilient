import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellRing, BookOpen, CheckCheck, CheckSquare, Clock, Flame, Layers, Target, Timer, X, Hourglass, EyeOff, CalendarClock,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatHourRange, type RoutineConfig } from './routineEngine';

interface RoutineConfigSheetProps {
  open: boolean;
  onClose: () => void;
  config: RoutineConfig;
  onChange: (patch: Partial<RoutineConfig>) => void;
  journalTimes: string[];
  onEditJournalTimes: () => void;
  es: boolean;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;

const Row: React.FC<{
  icon: React.ElementType; tint: string; label: string; hint?: string; on: boolean; onChange: (v: boolean) => void;
}> = ({ icon: Icon, tint, label, hint, on, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!on)}
    className="w-full flex items-center gap-3 rounded-2xl bg-white/[0.035] border border-white/[0.06] px-3.5 py-3 text-left active:scale-[0.985] transition-transform duration-150"
  >
    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tint}1f`, color: tint }}>
      <Icon size={17} />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-bold text-white leading-tight">{label}</span>
      {hint && <span className="block text-[11px] text-white/40 font-medium leading-snug mt-0.5">{hint}</span>}
    </span>
    <span className={cn('w-11 h-[26px] rounded-full relative shrink-0 transition-colors duration-200', on ? 'bg-emerald-500' : 'bg-white/10')}>
      <motion.span
        className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ x: on ? 18 : 0 }}
        transition={SPRING}
      />
    </span>
  </button>
);

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-5 mb-2 px-1">{children}</h3>
);

export const RoutineConfigSheet: React.FC<RoutineConfigSheetProps> = ({ open, onClose, config, onChange, journalTimes, onEditJournalTimes, es }) => {
  const tr = (a: string, b: string) => (es ? a : b);
  const hours = [1, 2, 3, 4, 5, 6];
  const mode: 'HOURS' | 'NONE' = config.divideByHour ? 'HOURS' : 'NONE';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[30px] sm:rounded-[30px] bg-[#0a0a10] border border-white/10 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
            style={{ willChange: 'transform' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-4" />
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">{tr('Personalizar rutina', 'Customize routine')}</h2>
                <p className="text-[12px] text-white/40 font-medium mt-0.5">{tr('Tu día, a tu manera', 'Your day, your way')}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl bg-white/5 text-white/50 flex items-center justify-center active:scale-90 transition-transform">
                <X size={16} />
              </button>
            </div>

            {/* ── Division ─────────────────────────────────────────────── */}
            <Title>{tr('División del día', 'Day division')}</Title>
            <div className="relative flex p-1 rounded-2xl bg-white/[0.05] border border-white/[0.07]">
              {([
                { id: 'HOURS', icon: Hourglass, label: tr('Por horas', 'By hours') },
                { id: 'NONE', icon: Layers, label: tr('Sin división por hora', 'No hour split') },
              ] as const).map(opt => {
                const active = mode === opt.id;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ divideByHour: opt.id === 'HOURS' })}
                    className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-black"
                  >
                    {active && (
                      <motion.span layoutId="cfg-division-pill" className="absolute inset-0 rounded-xl bg-white" transition={SPRING} />
                    )}
                    <span className={cn('relative flex items-center gap-1.5 transition-colors', active ? 'text-black' : 'text-white/50')}>
                      <OptIcon size={13} /> {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence initial={false} mode="wait">
              {mode === 'HOURS' ? (
                <motion.div
                  key="hours"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="mt-3"
                >
                  <p className="text-[11px] font-bold text-white/45 mb-2 px-1">{tr('Agrupar cada…', 'Group every…')}</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {hours.map(h => {
                      const active = config.hourBlock === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => onChange({ hourBlock: h })}
                          className="relative rounded-xl py-3 text-center active:scale-90 transition-transform duration-150 bg-white/[0.04] border border-white/[0.06]"
                        >
                          {active && (
                            <motion.span
                              layoutId="cfg-hour-pill"
                              className="absolute inset-0 rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)' }}
                              transition={SPRING}
                            />
                          )}
                          <span className={cn('relative block text-[15px] font-black leading-none', active ? 'text-white' : 'text-white/60')}>{h}</span>
                          <span className={cn('relative block text-[9px] font-bold mt-1', active ? 'text-white/80' : 'text-white/25')}>{h === 1 ? 'hora' : 'horas'}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-sky-300/80 font-semibold mt-2.5 px-1 tabular-nums">
                    {formatHourRange(8, Math.min(24, 8 + config.hourBlock), config.use24h)}
                    {'  ·  '}
                    {formatHourRange(Math.min(24, 8 + config.hourBlock), Math.min(24, 8 + config.hourBlock * 2), config.use24h)}
                    {'  ·  …'}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="none"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="mt-3"
                >
                  <Row
                    icon={CalendarClock}
                    tint="#f59e0b"
                    label={tr('Separar mañana · tarde · noche', 'Split morning · afternoon · night')}
                    hint={tr('Sigue siendo cronológico. Las atrasadas van aparte.', 'Still chronological. Overdue go on their own.')}
                    on={config.groupByPart}
                    onChange={v => onChange({ groupByPart: v })}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Time ─────────────────────────────────────────────────── */}
            <Title>{tr('Hora', 'Time')}</Title>
            <div className="space-y-2">
              <Row
                icon={Clock}
                tint="#38bdf8"
                label={tr('Poner hora específica', 'Show exact time')}
                hint={tr('La hora exacta programada dentro del recuadro de cada cosa', 'The exact scheduled time inside every card')}
                on={config.exactTime}
                onChange={v => onChange({ exactTime: v })}
              />
              <Row icon={Timer} tint="#a78bfa" label={tr('Reloj de 24 horas', '24-hour clock')} on={config.use24h} onChange={v => onChange({ use24h: v })} />
            </div>

            {/* ── What to show ─────────────────────────────────────────── */}
            <Title>{tr('Qué mostrar', 'What to show')}</Title>
            <div className="space-y-2">
              <Row icon={Flame} tint="#fb923c" label={tr('Hábitos', 'Habits')} hint={tr('Con su alarma y subtareas', 'With their alarm and subtasks')} on={config.showHabits} onChange={v => onChange({ showHabits: v })} />
              <Row icon={CheckSquare} tint="#22d3ee" label={tr('Tareas', 'Tasks')} hint={tr('Con hora límite si la tienen', 'With a due time when set')} on={config.showTasks} onChange={v => onChange({ showTasks: v })} />
              <Row icon={Target} tint="#34d399" label={tr('Proyectos', 'Projects')} hint={tr('Los que tienen un aviso programado', 'Those with a scheduled reminder')} on={config.showProjects} onChange={v => onChange({ showProjects: v })} />
              <Row icon={BookOpen} tint="#818cf8" label="Journaling" hint={tr('Tus horarios de recordatorio', 'Your reminder times')} on={config.showJournal} onChange={v => onChange({ showJournal: v })} />
              <button
                type="button"
                onClick={onEditJournalTimes}
                className="w-full flex items-center gap-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-3 text-left active:scale-[0.985] transition-transform duration-150"
              >
                <span className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0"><BellRing size={17} /></span>
                <span className="flex-1 text-[13px] font-bold text-indigo-100">{tr('Horarios de journaling', 'Journaling times')}</span>
                <span className="text-[11px] font-black text-indigo-300 tabular-nums">{journalTimes.join(' · ') || tr('Configurar', 'Set up')}</span>
              </button>
            </div>

            <Title>{tr('Lista', 'List')}</Title>
            <div className="space-y-2">
              <Row icon={CheckCheck} tint="#34d399" label={tr('Mostrar completados', 'Show completed')} on={config.showCompleted} onChange={v => onChange({ showCompleted: v })} />
              <Row icon={EyeOff} tint="#94a3b8" label={tr('Mostrar elementos sin hora', 'Show items without a time')} on={config.showUntimed} onChange={v => onChange({ showUntimed: v })} />
              <Row icon={CalendarClock} tint="#fb7185" label={tr('Mostrar tareas atrasadas', 'Show overdue tasks')} on={config.showOverdue} onChange={v => onChange({ showOverdue: v })} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
