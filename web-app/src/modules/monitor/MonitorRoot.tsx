// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — root. Mounted once in the Dashboard: renders the intro, the live
// guided scripts, the section sheet opened from each lightbulb ("foco") and the
// screenshot gallery.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, ChevronRight, Compass, Images, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MonitorIntro } from './MonitorIntro';
import { MonitorStage } from './MonitorStage';
import { MonitorGallery } from './MonitorGallery';
import { MonitorOrb } from './MonitorOrb';
import { GALLERY } from './galleryContent';
import { monitor, useMonitor, type ScriptId, type SectionId } from './monitorStore';
import type { Lang } from './scripts';

export const useMonitorLang = (): Lang => {
  const { i18n } = useTranslation();
  return (i18n.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
};

const SECTION_META: Record<SectionId, { name: [string, string]; about: [string, string]; color: string; create?: { script: ScriptId; label: [string, string] }[] }> = {
  tasks: { name: ['Tareas', 'Tasks'], about: ['Tus misiones del día: créalas, complétalas y gana XP, oro y ELO.', 'Your daily missions: create them, complete them and earn XP, gold and ELO.'], color: '#f97316', create: [{ script: 'create-task', label: ['Crear una tarea conmigo', 'Create a task with me'] }] },
  habits: { name: ['Hábitos', 'Habits'], about: ['Construye protocolos diarios y destruye vicios. Tu racha y tu ELO dependen de ellos.', 'Build daily protocols and destroy vices. Your streak and ELO depend on them.'], color: '#ef4444', create: [{ script: 'create-habit', label: ['Crear un hábito conmigo', 'Create a habit with me'] }] },
  focus: { name: ['Enfoque', 'Focus'], about: ['Proyectos con meta de tiempo y sesiones con temporizador: cada hora suma +1 ELO.', 'Projects with a time goal and timer sessions: every hour adds +1 ELO.'], color: '#6366f1', create: [{ script: 'create-project', label: ['Crear un proyecto conmigo', 'Create a project with me'] }] },
  notes: { name: ['Notas y diario', 'Notes & journal'], about: ['Tu segundo cerebro y tu página de cada día.', 'Your second brain and your page for every day.'], color: '#06b6d4', create: [{ script: 'create-note', label: ['Crear una nota conmigo', 'Create a note with me'] }, { script: 'create-journal', label: ['Escribir mi diario conmigo', 'Write my journal with me'] }] },
  routine: { name: ['Rutina', 'Routine'], about: ['Tu día ordenado por horas, con todo lo que tiene recordatorio.', 'Your day ordered by time, with everything that has a reminder.'], color: '#22c55e' },
  store: { name: ['Tienda', 'Store'], about: ['Donde gastas el oro que ganas.', 'Where you spend the gold you earn.'], color: '#f59e0b' },
};

const SectionSheet: React.FC<{ section: SectionId; lang: Lang }> = ({ section, lang }) => {
  const reduce = !!useReducedMotion();
  const L = (p: [string, string]) => (lang === 'es' ? p[0] : p[1]);
  const meta = SECTION_META[section];
  const hasGallery = GALLERY[section].length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') monitor.close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Option: React.FC<{ icon: React.ReactNode; title: string; text: string; onClick: () => void; primary?: boolean; i: number }> = ({ icon, title, text, onClick, primary, i }) => (
    <motion.button type="button" onClick={onClick}
      initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.12 + i * 0.06 }}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20,
        background: primary ? 'linear-gradient(110deg, rgba(34,211,238,0.22), rgba(129,140,248,0.22))' : 'rgba(255,255,255,0.05)',
        border: primary ? '1px solid rgba(103,232,249,0.45)' : '1px solid rgba(255,255,255,0.07)', color: '#fff',
      }}>
      <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: primary ? 'linear-gradient(135deg, #22d3ee, #818cf8)' : 'rgba(255,255,255,0.08)', color: primary ? '#06101f' : '#a5f3fc' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 900 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, lineHeight: 1.35, color: 'rgba(235,240,255,0.65)' }}>{text}</span>
      </span>
      <ChevronRight size={18} style={{ opacity: 0.5, flex: 'none' }} />
    </motion.button>
  );

  let i = 0;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100520, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} role="dialog" aria-modal="true" aria-label={`El Monitor · ${L(meta.name)}`}>
      <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={monitor.close} />
      <motion.div
        initial={reduce ? { opacity: 0 } : { y: '100%' }} animate={reduce ? { opacity: 1 } : { y: 0 }} exit={reduce ? { opacity: 0 } : { y: '100%' }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 34 }}
        style={{ position: 'relative', width: '100%', maxWidth: 520, borderRadius: '30px 30px 0 0', padding: '10px 16px calc(env(safe-area-inset-bottom) + 18px)', background: 'linear-gradient(180deg, #14142c, #08080f)', boxShadow: '0 -20px 60px -20px rgba(0,0,0,0.9)', borderTop: '1px solid rgba(103,232,249,0.25)', color: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 9, background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MonitorOrb size={62} mood="talk" look={{ x: 0.3, y: 0.3 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 900, letterSpacing: '0.22em', color: '#67e8f9' }}>EL MONITOR</p>
            <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
              <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 9, background: meta.color, marginRight: 8, verticalAlign: 3, boxShadow: `0 0 10px ${meta.color}` }} />
              {L(meta.name)}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.4, color: 'rgba(235,240,255,0.7)' }}>{L(meta.about)}</p>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meta.create?.map(c => (
            <Option key={c.script} i={i++} primary icon={<Wand2 size={20} />} title={L(c.label)}
              text={lang === 'es' ? 'Te guío paso a paso con la app real: tú escribes, yo te señalo cada parte.' : 'I guide you step by step in the real app: you type, I point at every part.'}
              onClick={() => monitor.run(c.script)} />
          ))}
          {hasGallery && (
            <Option i={i++} icon={<Images size={20} />} title={lang === 'es' ? 'Recorrido con capturas reales' : 'Tour with real screenshots'}
              text={lang === 'es' ? 'Pantallas reales de la app con círculos, flechas y cada parte explicada.' : 'Real app screens with circles, arrows and every part explained.'}
              onClick={() => monitor.gallery(section)} />
          )}
          <Option i={i++} icon={<Compass size={20} />} title={lang === 'es' ? 'Recorrido en vivo' : 'Live tour'}
            text={lang === 'es' ? 'Te señalo cada parte de esta zona en tu propia pantalla.' : 'I point at every part of this zone on your own screen.'}
            onClick={() => monitor.run(`live-${section}`)} />
          <Option i={i++} icon={<BookOpen size={20} />} title={lang === 'es' ? 'Recorrido completo de la app' : 'Full app tour'}
            text={lang === 'es' ? 'Repite la presentación y el recorrido por todas las zonas.' : 'Replay the intro and the tour of every zone.'}
            onClick={() => monitor.intro('tour')} />
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export const MonitorRoot: React.FC<{ userName?: string | null }> = ({ userName }) => {
  const state = useMonitor();
  const lang = useMonitorLang();

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__monitor = { monitor, GALLERY };
  }, []);

  return (
    <>
      <style>{'@keyframes monitor-caret { 0%,100% { opacity: 1 } 50% { opacity: 0 } }'}</style>
      <AnimatePresence>
        {state.kind === 'intro' && (
          <MonitorIntro key="intro" lang={lang} name={userName} onStart={() => monitor.run(state.then)} onSkip={monitor.close} />
        )}
        {state.kind === 'sheet' && <SectionSheet key={`sheet-${state.section}`} section={state.section} lang={lang} />}
        {state.kind === 'gallery' && (
          <MonitorGallery key={`gal-${state.section}`} section={state.section} lang={lang} onClose={monitor.close}
            onCreate={SECTION_META[state.section].create ? () => monitor.run(SECTION_META[state.section].create![0].script) : undefined} />
        )}
      </AnimatePresence>
      {state.kind === 'script' && <MonitorStage script={state.script} run={state.run} lang={lang} />}
    </>
  );
};
