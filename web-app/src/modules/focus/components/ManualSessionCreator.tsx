'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { TimeWheel } from './TimeWheel';
import { useTranslation } from 'react-i18next';

interface ManualSessionCreatorProps {
  initialDuration: number; // in minutes
  initialDate: Date;
  project: Project;
  attribute?: Attribute;
  onSave: (duration: number, date: Date, subTraitId?: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

export const ManualSessionCreator = ({
  initialDuration,
  initialDate,
  project,
  attribute,
  onSave,
  onCancel,
  onDelete,
  isEditing = false
}: ManualSessionCreatorProps) => {
  const { t } = useTranslation();
  // Start at 0h 0m by default (unless editing an existing session)
  const defaultHours = isEditing ? Math.floor(initialDuration / 60) : 0;
  const defaultMinutes = isEditing ? (initialDuration % 60) : 0;

  const [hours, setHours] = useState(defaultHours);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [startDate, setStartDate] = useState<Date>(initialDate);
  const [activePicker, setActivePicker] = useState<'DURATION' | 'START_TIME'>('DURATION');
  const [selectedSubTrait, setSelectedSubTrait] = useState<string | undefined>(undefined);

  // Sub-traits from the attribute
  const subTraits = useMemo(() => attribute?.subTraits ?? [], [attribute]);
  const hasSubTraits = subTraits.length > 0;

  // Derived
  const totalMinutes = hours * 60 + minutes;
  const endDate = addMinutes(startDate, totalMinutes);

  // Arrays for wheels
  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesArray = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const handleSave = () => {
    if (totalMinutes <= 0) return;
    onSave(totalMinutes, startDate, selectedSubTrait);
  };

  const themeColor = project.color || attribute?.color || '#0A84FF';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 bg-[#08080e] flex flex-col z-50 font-sans overflow-hidden"
    >
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${themeColor}60 0%, transparent 70%)` }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-6 pb-3 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentColor]"
            style={{ backgroundColor: themeColor, color: themeColor }}
          />
          <h2 className="text-[15px] font-black text-white tracking-tight uppercase">
            {isEditing ? 'Editar sesión' : 'Nueva sesión'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && onDelete && (
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center active:scale-90 transition-all border border-red-500/20"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-xl bg-white/5 text-white/50 flex items-center justify-center active:scale-90 transition-all border border-white/8"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* DURATION DISPLAY + PICKER TOGGLE */}
      <div className="relative z-10 px-5 mb-3 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          {/* Duration Card */}
          <button
            onClick={() => setActivePicker('DURATION')}
            className={cn(
              "py-4 rounded-2xl flex flex-col items-center justify-center transition-all border relative overflow-hidden",
              activePicker === 'DURATION'
                ? "border-opacity-50 shadow-lg"
                : "bg-white/[0.02] border-white/5"
            )}
            style={activePicker === 'DURATION' ? {
              backgroundColor: `${themeColor}12`,
              borderColor: `${themeColor}40`,
              boxShadow: `0 0 30px ${themeColor}15`
            } : {}}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: activePicker === 'DURATION' ? themeColor : 'rgba(255,255,255,0.3)' }}>
              DURACIÓN
            </span>
            <span className={cn("text-[32px] font-black tracking-tight tabular-nums leading-none transition-colors", activePicker === 'DURATION' ? "text-white" : "text-white/30")}>
              {hours}<span className="text-[16px] font-medium text-white/30 mx-0.5">h</span>{minutes.toString().padStart(2, '0')}<span className="text-[16px] font-medium text-white/30 mx-0.5">m</span>
            </span>
            {activePicker === 'DURATION' && (
              <motion.div layoutId="active-pip" className="absolute bottom-2 w-8 h-1 rounded-full" style={{ backgroundColor: themeColor }} />
            )}
          </button>

          {/* Start Time Card */}
          <button
            onClick={() => setActivePicker('START_TIME')}
            className={cn(
              "py-4 rounded-2xl flex flex-col items-center justify-center transition-all border relative overflow-hidden",
              activePicker === 'START_TIME'
                ? "border-opacity-50 shadow-lg"
                : "bg-white/[0.02] border-white/5"
            )}
            style={activePicker === 'START_TIME' ? {
              backgroundColor: `${themeColor}12`,
              borderColor: `${themeColor}40`,
              boxShadow: `0 0 30px ${themeColor}15`
            } : {}}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: activePicker === 'START_TIME' ? themeColor : 'rgba(255,255,255,0.3)' }}>
              INICIO → FIN
            </span>
            <span className={cn("text-[22px] font-black tracking-tight tabular-nums leading-none transition-colors", activePicker === 'START_TIME' ? "text-white" : "text-white/30")}>
              {format(startDate, 'H:mm')}
            </span>
            <span className="text-[11px] font-bold mt-0.5" style={{ color: activePicker === 'START_TIME' ? `${themeColor}90` : 'rgba(255,255,255,0.2)' }}>
              → {format(endDate, 'H:mm')}
            </span>
            {activePicker === 'START_TIME' && (
              <motion.div layoutId="active-pip" className="absolute bottom-2 w-8 h-1 rounded-full" style={{ backgroundColor: themeColor }} />
            )}
          </button>
        </div>
      </div>

      {/* WHEEL PICKER */}
      <div className="relative z-10 mx-5 mb-3 h-[180px] shrink-0 select-none overflow-hidden bg-black/60 rounded-2xl border border-white/5">
        {/* Highlight Bar */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[50px] bg-white/5 rounded-xl z-0 border border-white/8" />
        {/* Gradient Masks */}
        <div className="absolute top-0 left-0 right-0 h-[70px] bg-gradient-to-b from-black/90 via-black/60 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 pointer-events-none" />

        <AnimatePresence mode="wait">
          {activePicker === 'DURATION' ? (
            <motion.div
              key="duration-wheel"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="grid grid-cols-[1fr_auto_1fr_auto] h-full relative z-20 px-8"
            >
              <TimeWheel value={hours} onChange={setHours} items={hoursArray} height={180} itemHeight={50} />
              <div className="flex items-center h-full pointer-events-none">
                <span className="text-[13px] font-bold text-white/40 uppercase tracking-widest pl-1 pr-3">h</span>
              </div>
              <TimeWheel value={minutes} onChange={setMinutes} items={minutesArray} height={180} itemHeight={50} />
              <div className="flex items-center h-full pointer-events-none">
                <span className="text-[13px] font-bold text-white/40 uppercase tracking-widest pl-1">m</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="start-wheel"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="grid grid-cols-[1fr_auto_1fr] h-full relative z-20 px-12"
            >
              <TimeWheel
                value={startDate.getHours()}
                onChange={(val) => { const d = new Date(startDate); d.setHours(val); setStartDate(d); }}
                items={hoursArray}
                height={180}
                itemHeight={50}
              />
              <div className="flex items-center justify-center h-full pointer-events-none">
                <span className="text-[28px] font-black opacity-40" style={{ color: themeColor }}>:</span>
              </div>
              <TimeWheel
                value={startDate.getMinutes()}
                onChange={(val) => { const d = new Date(startDate); d.setMinutes(val); setStartDate(d); }}
                items={minutesArray}
                height={180}
                itemHeight={50}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SUB-TRAIT SELECTOR (only if attribute has sub-traits) */}
      {hasSubTraits && (
        <div className="relative z-10 px-5 mb-3 shrink-0">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Sub-Rasgo (Opcional)</p>
          <div className="flex flex-wrap gap-2">
            {/* "None" option */}
            <button
              onClick={() => setSelectedSubTrait(undefined)}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all",
                !selectedSubTrait
                  ? "text-white border-opacity-50"
                  : "bg-white/[0.02] border-white/8 text-white/40"
              )}
              style={!selectedSubTrait ? { backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40`, color: themeColor } : {}}
            >
              Al Rasgo Principal
            </button>
            {subTraits.map(st => (
              <button
                key={st.id}
                onClick={() => setSelectedSubTrait(st.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all",
                  selectedSubTrait === st.id
                    ? "text-white border-opacity-50"
                    : "bg-white/[0.02] border-white/8 text-white/40"
                )}
                style={selectedSubTrait === st.id ? { backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40`, color: themeColor } : {}}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PROJECT INFO */}
      <div className="relative z-10 px-5 mb-3 shrink-0">
        <div className="w-full py-3 px-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}` }} />
          <span className="text-xs font-bold text-white/60 truncate flex-1">{project.title}</span>
          <span className="text-[9px] text-white/20 font-mono shrink-0">{Math.floor(project.totalTime / 60)}min total</span>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="relative z-10 px-5 pb-8 mt-auto shrink-0">
        <button
          onClick={handleSave}
          disabled={totalMinutes <= 0}
          className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: totalMinutes > 0 ? themeColor : 'rgba(255,255,255,0.05)',
            color: 'white',
            boxShadow: totalMinutes > 0 ? `0 0 30px ${themeColor}40` : 'none'
          }}
        >
          {isEditing ? 'Guardar Cambios' : 'Guardar Sesión'}
        </button>
      </div>
    </motion.div>
  );
};
