import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { BookPlus, Check, Clock, Flame, ListChecks, Star, Target, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { JournalEntry, NoteBlock } from '@/types';
import { toLocalISOString } from '@/utils/dateUtils';
import { useNotesContext } from '@/modules/notes/context/NotesContext';
import { progressionStore, useProgression, type CompletionLog, type PendingReport } from '../progressionStore';
import { REPORT_CONFIG } from '../report';
import { RankBadge } from './RankBadge';
import { CountUp, DivisionBar, Typewriter, haptic } from './primitives';
import { MOTION, rankStyle } from './tokens';

const KIND_LABEL: Record<CompletionLog['kind'], { key: string; es: string; Icon: typeof Clock }> = {
  FOCUS: { key: 'progression.kind.focus', es: 'Sesión de foco', Icon: Clock },
  HABIT: { key: 'progression.kind.habit', es: 'Hábito', Icon: Flame },
  TASK: { key: 'progression.kind.task', es: 'Tarea', Icon: Target },
  SUBTASK: { key: 'progression.kind.subtask', es: 'Subtarea', Icon: ListChecks },
};

const NOTE_MAX = 280;

const journalBlocks = (p: PendingReport, typeLabel: string): NoteBlock[] => {
  const { log, report } = p;
  const time = new Date(log.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const id = (s: string) => `rep-${log.id}-${s}`;
  const blocks: NoteBlock[] = [
    { id: id('h'), type: 'heading3', content: `${typeLabel}: ${log.itemName} · ${time}` },
  ];
  if (report.metrics.length) blocks.push({ id: id('m'), type: 'text', content: report.metrics.map(m => `${m.label}: ${m.display}`).join(' · ') });
  if (log.rating) blocks.push({ id: id('r'), type: 'text', content: `Enfoque: ${'★'.repeat(log.rating)}${'☆'.repeat(5 - log.rating)} (${log.rating}/5)` });
  if (log.note) blocks.push({ id: id('n'), type: 'quote', content: log.note });
  blocks.push({ id: id('e'), type: 'callout', calloutIcon: '🏆', content: `ELO ${p.eloInstant >= 0 ? '+' : ''}${p.eloInstant} ahora · proyectado del día ${p.projectedDay >= 0 ? '+' : ''}${p.projectedDay} · XP +${p.xp}` });
  blocks.push({ id: id('t'), type: 'text', content: report.narrative });
  return blocks;
};

export const CompletionReportSheet: React.FC = memo(() => {
  const { pendingReport } = useProgression();
  return createPortal(
    <AnimatePresence>
      {pendingReport && <Sheet key={pendingReport.log.id} pending={pendingReport} />}
    </AnimatePresence>,
    document.body,
  );
});
CompletionReportSheet.displayName = 'CompletionReportSheet';

const Sheet: React.FC<{ pending: PendingReport }> = ({ pending }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { meta } = useProgression();
  const { journalEntries, updateJournal } = useNotesContext();
  const { log, report, standing } = pending;
  const kind = KIND_LABEL[log.kind];
  const [stage, setStage] = useState<'intro' | 'text' | 'actions'>(reduce ? 'actions' : 'intro');
  const [note, setNote] = useState(log.note ?? '');
  const [journaled, setJournaled] = useState(!!log.journalEntryId);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>();

  const close = useCallback(() => progressionStore.dismissReport(), []);

  // Stage timing: header → numbers → bar → narrative → actions.
  useEffect(() => {
    if (reduce) return;
    const timer = setTimeout(() => setStage('text'), 1500);
    return () => clearTimeout(timer);
  }, [reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 700) close();
  };

  const rate = (n: number) => {
    haptic(meta.hapticsEnabled, 12);
    progressionStore.updateLog(log.id, { rating: n });
  };

  const onNote = (value: string) => {
    const v = value.slice(0, NOTE_MAX);
    setNote(v);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => progressionStore.updateLog(log.id, { note: v.trim() || null }), 400);
  };

  const addToJournal = async () => {
    if (journaled) return;
    clearTimeout(noteTimer.current);
    const current = { ...pending, log: { ...log, note: note.trim() || null } };
    progressionStore.updateLog(log.id, { note: current.log.note });
    const date = toLocalISOString(new Date(log.at));
    const existing = journalEntries.find(e => e.date === date);
    const blocks = journalBlocks(current, t(kind.key, kind.es));
    const link = { kind: log.kind, id: log.itemId, name: log.itemName, logId: log.id };
    const entry: JournalEntry = existing
      ? { ...existing, blocks: [...existing.blocks, ...blocks], linkedItems: [...(existing.linkedItems ?? []), link] }
      : { id: `${Date.now()}`, date, blocks, tags: ['informe'], linkedItems: [link] };
    await updateJournal(entry);
    progressionStore.updateLog(log.id, { journalEntryId: entry.id });
    haptic(meta.hapticsEnabled, [10, 40, 10]);
    setJournaled(true);
  };

  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: MOTION.short, delay: reduce ? 0 : delay, ease: MOTION.easeOut },
  });

  const when = log.at ? new Date(log.at) : new Date();

  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="prog-report-title">
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: MOTION.micro }}
        onClick={close}
      />
      <motion.div
        className="prog-root relative w-full max-w-[560px] rounded-t-[var(--p-r-2xl)] shadow-[var(--p-shadow-2)]"
        data-prog-theme={meta.appearance === 'LIGHT' ? 'light' : meta.appearance === 'SYSTEM' ? 'system' : 'dark'}
        style={{ ...rankStyle(standing.rankIndex), background: 'rgb(var(--p-bg))', maxHeight: '90vh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={reduce ? { duration: 0 } : MOTION.sheet}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={onDragEnd}
      >
        <div className="flex justify-center pt-3 pb-1"><div className="prog-sheet-handle" /></div>
        <div className="prog-scroll px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]" style={{ maxHeight: 'calc(90vh - 24px)' }}>
          {/* 1. Header */}
          <motion.div {...fade(0.1)} className="flex items-start gap-3 pt-2">
            <div className="w-11 h-11 shrink-0 rounded-[var(--p-r-md)] flex items-center justify-center" style={{ background: 'rgb(var(--rank) / 0.16)', color: 'rgb(var(--rank))' }}>
              <kind.Icon size={20} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] prog-text-3">{t(kind.key, kind.es)}</p>
              <h2 id="prog-report-title" className="text-[20px] leading-tight font-bold truncate">{log.itemName}</h2>
              <p className="text-[12px] prog-text-3">
                {when.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {when.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button type="button" onClick={close} className="prog-tap -mr-2 -mt-1 flex items-center justify-center rounded-full prog-text-2" aria-label={t('common.close', 'Cerrar')}>
              <X size={20} />
            </button>
          </motion.div>

          {/* 2. Numbers */}
          <motion.div {...fade(0.3)} className="grid grid-cols-3 gap-2 mt-5">
            <Stat label={t('progression.report.eloNow', 'ELO ahora')} tone={pending.eloInstant > 0 ? 'pos' : 'neutral'}>
              <CountUp value={pending.eloInstant} signed delay={reduce ? 0 : 350} />
            </Stat>
            <Stat label={t('progression.report.eloDay', 'ELO proyectado hoy')} tone={pending.projectedDay > 0 ? 'pos' : pending.projectedDay < 0 ? 'neg' : 'neutral'}>
              <CountUp value={pending.projectedDay} signed delay={reduce ? 0 : 400} />
            </Stat>
            <Stat label="XP" tone="pos">
              <CountUp value={pending.xp} prefix="+" delay={reduce ? 0 : 450} />
            </Stat>
          </motion.div>

          {report.metrics.length > 0 && (
            <motion.ul {...fade(0.45)} className="mt-3 flex flex-wrap gap-2" aria-label={t('progression.report.metrics', 'Métricas')}>
              {report.metrics.map(m => (
                <li key={m.id} className="prog-surface rounded-full px-3 py-1.5 text-[12px]">
                  <span className="prog-text-3">{m.label} </span>
                  <span className="font-semibold tabular-nums">{m.display}</span>
                </li>
              ))}
            </motion.ul>
          )}

          {/* 3. Division bar */}
          <motion.div {...fade(0.8)} className="mt-5 prog-surface rounded-[var(--p-r-lg)] p-4 flex items-center gap-3">
            <RankBadge rankIndex={standing.rankIndex} division={standing.division} size={34} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-[15px]">{standing.label}</span>
                {standing.eloToNext !== null && (
                  <span className="text-[11px] prog-text-3 tabular-nums">
                    {standing.eloToNext} {t('progression.toNext', 'para')} {standing.nextLabel}
                  </span>
                )}
              </div>
              {standing.progress !== null && (
                <div className="mt-2"><DivisionBar value={standing.progress} from={pending.progressBefore} delay={0.9} shine label={standing.label} /></div>
              )}
            </div>
          </motion.div>

          {/* 4. Narrative */}
          <div className="mt-5 min-h-[96px]">
            {stage !== 'intro' && (
              <Typewriter
                text={report.narrative}
                cps={REPORT_CONFIG.TYPEWRITER_CPS}
                onDone={() => setStage('actions')}
                className="text-[15.5px] leading-[1.6]"
              />
            )}
          </div>

          {/* 5. Rating, note, journaling */}
          <AnimatePresence>
            {stage === 'actions' && (
              <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: MOTION.short, ease: MOTION.easeOut }} className="mt-4 space-y-4">
                <fieldset>
                  <legend className="text-[12px] font-semibold prog-text-2 mb-2">{t('progression.report.rate', '¿Qué tal tu enfoque?')}</legend>
                  <div className="grid grid-cols-5 gap-2" role="radiogroup">
                    {[1, 2, 3, 4, 5].map(n => {
                      const active = (log.rating ?? 0) >= n;
                      return (
                        <motion.button
                          key={n} type="button" role="radio" aria-checked={log.rating === n}
                          aria-label={t('progression.report.stars', '{{n}} de 5', { n })}
                          whileTap={reduce ? undefined : { scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => rate(n)}
                          className="prog-tap h-12 rounded-[var(--p-r-md)] flex items-center justify-center"
                          style={{ background: active ? 'rgb(var(--rank) / 0.2)' : 'rgb(var(--p-line) / 0.06)', color: active ? 'rgb(var(--rank))' : 'rgb(var(--p-text-3))' }}
                        >
                          <Star size={22} fill={active ? 'currentColor' : 'none'} />
                        </motion.button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="text-[12px] font-semibold prog-text-2">{t('progression.report.note', 'Nota rápida (opcional)')}</span>
                  <textarea
                    value={note}
                    onChange={e => onNote(e.target.value)}
                    maxLength={NOTE_MAX}
                    rows={2}
                    placeholder={t('progression.report.notePlaceholder', '¿Qué te ayudó o qué te distrajo?')}
                    className="mt-1.5 w-full resize-none rounded-[var(--p-r-md)] px-3 py-2.5 text-[14px] outline-none prog-surface focus:border-[rgb(var(--rank)/0.6)]"
                    style={{ color: 'rgb(var(--p-text))' }}
                  />
                  <span className="block text-right text-[11px] prog-text-3 tabular-nums">{note.length}/{NOTE_MAX}</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button" onClick={addToJournal} disabled={journaled}
                    className="prog-tap flex-1 h-12 rounded-[var(--p-r-md)] flex items-center justify-center gap-2 font-bold text-[14px] disabled:opacity-70"
                    style={{ background: 'linear-gradient(90deg, var(--rank-from), var(--rank-to))', color: '#0b0b10' }}
                  >
                    {journaled ? <Check size={18} /> : <BookPlus size={18} />}
                    {journaled ? t('progression.report.journaled', 'Añadido a tu journaling') : t('progression.report.journal', 'Añadir a mi journaling')}
                  </button>
                  <button type="button" onClick={close} className="prog-tap h-12 px-5 rounded-[var(--p-r-md)] font-semibold text-[14px] prog-surface">
                    {t('progression.report.done', 'Listo')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const Stat: React.FC<{ label: string; tone: 'pos' | 'neg' | 'neutral'; children: React.ReactNode }> = ({ label, tone, children }) => (
  <div className="prog-surface rounded-[var(--p-r-lg)] px-3 py-3 text-center">
    <div className={`text-[24px] font-black tabular-nums leading-none ${tone === 'pos' ? 'prog-positive' : tone === 'neg' ? 'prog-negative' : ''}`}>{children}</div>
    <div className="mt-1.5 text-[10.5px] leading-tight prog-text-3">{label}</div>
  </div>
);
