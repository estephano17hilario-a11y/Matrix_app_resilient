import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useMountTransition } from '../../../hooks/useMountTransition';
import { BellRing, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_JOURNAL_TIME, MAX_JOURNAL_REMINDERS, normalizeJournalTimes } from '../../../services/journalReminders';

interface JournalRemindersModalProps {
  isOpen: boolean;
  /** First time the journaling zone is opened: friendlier copy and a "later" button. */
  isFirstTime?: boolean;
  initialTimes: string[];
  onSave: (times: string[]) => void;
  /** Close without changing anything (for the first-time sheet this also marks it as seen). */
  onSkip: () => void;
}

export const JournalRemindersModal: React.FC<JournalRemindersModalProps> = ({ isOpen, isFirstTime, initialTimes, onSave, onSkip }) => {
  const { i18n } = useTranslation();
  const es = !!i18n.language?.startsWith('es');
  const [times, setTimes] = useState<string[]>([]);
  const mounted = useMountTransition(isOpen, 300);

  useEffect(() => {
    if (!isOpen) return;
    // First time: suggest an evening slot so "Guardar" is one tap.
    setTimes(initialTimes.length > 0 ? initialTimes : (isFirstTime ? [DEFAULT_JOURNAL_TIME] : []));
  }, [isOpen, isFirstTime, initialTimes]);

  const update = (i: number, value: string) => setTimes(prev => prev.map((t, idx) => (idx === i ? value : t)));
  const remove = (i: number) => setTimes(prev => prev.filter((_, idx) => idx !== i));
  const add = () => setTimes(prev => (prev.length >= MAX_JOURNAL_REMINDERS ? prev : [...prev, DEFAULT_JOURNAL_TIME]));

  const valid = normalizeJournalTimes(times);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {(
        <motion.div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
          onClick={onSkip}
        >
          <motion.div
            className="w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] bg-[#0c0c12] border border-white/10 shadow-2xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: isOpen ? 0 : 40, opacity: isOpen ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-300 shrink-0">
                <BellRing size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-white tracking-tight">
                  {es ? 'Recordatorios de journaling' : 'Journaling reminders'}
                </h2>
                <p className="text-[12px] text-white/45 font-medium leading-snug mt-0.5">
                  {isFirstTime
                    ? (es ? '¿A qué hora quieres que te avise para escribir? Puedes elegir hasta 4 horarios y cambiarlos luego en el engranaje.' : 'When should we nudge you to write? Pick up to 4 times; you can change them later with the gear.')
                    : (es ? 'Elige hasta 4 horarios al día en los que quieres que te avise.' : 'Pick up to 4 times a day you want to be reminded.')}
                </p>
              </div>
              <button type="button" onClick={onSkip} aria-label="Close" className="w-8 h-8 rounded-xl bg-white/5 text-white/50 flex items-center justify-center shrink-0 active:scale-95">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2.5">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.05] border border-white/10 px-4 py-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 w-5">{i + 1}</span>
                  <input
                    type="time"
                    value={t}
                    onChange={e => update(i, e.target.value)}
                    className="flex-1 bg-transparent text-xl font-black text-white outline-none [color-scheme:dark] tabular-nums"
                  />
                  <button type="button" onClick={() => remove(i)} aria-label={es ? 'Quitar' : 'Remove'} className="w-7 h-7 rounded-full bg-white/10 text-white/60 flex items-center justify-center active:scale-95">
                    <X size={13} />
                  </button>
                </div>
              ))}

              {times.length < MAX_JOURNAL_REMINDERS && (
                <button
                  type="button"
                  onClick={add}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-[12px] font-bold text-white/55 hover:text-white hover:border-white/30 active:scale-[0.98] transition-all"
                >
                  <Plus size={14} /> {es ? 'Añadir horario' : 'Add time'} ({times.length}/{MAX_JOURNAL_REMINDERS})
                </button>
              )}
              {times.length === 0 && (
                <p className="text-center text-[11px] text-white/35 font-medium pt-1">
                  {es ? 'Sin horarios: no recibirás avisos de journaling.' : 'No times: you will not get journaling reminders.'}
                </p>
              )}
            </div>

            <div className="flex gap-2.5 mt-5">
              {isFirstTime && (
                <button type="button" onClick={onSkip} className="flex-1 rounded-2xl bg-white/[0.06] border border-white/10 py-3.5 text-sm font-black text-white/70 active:scale-95">
                  {es ? 'Ahora no' : 'Not now'}
                </button>
              )}
              <button
                type="button"
                onClick={() => onSave(valid)}
                className="flex-[1.5] rounded-2xl bg-white py-3.5 text-sm font-black text-black active:scale-95"
              >
                {es ? 'Guardar' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>,
    document.body,
  );
};
