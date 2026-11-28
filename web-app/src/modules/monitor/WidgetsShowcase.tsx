// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — Android widgets showcase. Shown once, right after a new user's tutorial:
// it tells them Lux has home-screen widgets, shows what each one looks like (the same
// previews Android shows in its widget picker) and how to add them.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Smartphone } from 'lucide-react';
import { MonitorOrb } from './MonitorOrb';
import { DeluxeBadge } from '../monetization/DeluxeBadge';
import type { Lang } from './scripts';

interface WidgetInfo {
  id: string;
  name: [string, string];
  desc: [string, string];
  deluxe?: boolean;
}

// Same order as we want people to meet them: the everyday ones first, social last.
const WIDGETS: WidgetInfo[] = [
  { id: 'score', name: ['Score', 'Score'], desc: ['Tu progreso de hoy en un anillo.', 'Your progress today in a ring.'] },
  { id: 'tasks', name: ['Misiones', 'Missions'], desc: ['Tus pendientes con XP y oro. Complétalas con un toque.', 'Your to-dos with XP and gold. Complete them with a tap.'] },
  { id: 'habits', name: ['Protocolos', 'Protocols'], desc: ['Tus hábitos de hoy con acciones rápidas.', 'Today’s habits with quick actions.'] },
  { id: 'project', name: ['Proyecto', 'Project'], desc: ['La meta de un proyecto y el tiempo enfocado hoy.', 'A project’s goal and the time focused today.'] },
  { id: 'focus', name: ['Enfoque', 'Focus'], desc: ['Tu tiempo de enfoque por proyecto.', 'Your focus time per project.'] },
  { id: 'routine', name: ['Rutina', 'Routine'], desc: ['Tu día en orden: lo siguiente y tus hábitos con un toque.', 'Your day in order: what is next, habits in one tap.'], deluxe: true },
  { id: 'calendar', name: ['Calendario', 'Calendar'], desc: ['Tu rutina como un calendario por bloques de horas.', 'Your routine as a calendar of hour blocks.'], deluxe: true },
  { id: 'journal', name: ['Diario', 'Journal'], desc: ['El calendario de tu diario y tus rachas de escritura.', 'Your journal calendar and writing streaks.'], deluxe: true },
  { id: 'duel', name: ['Duelo con amigo', 'Friend duel'], desc: ['Tu marcador contra un amigo, día a día.', 'Your score against a friend, day by day.'] },
  { id: 'friend_streak', name: ['Racha con amigo', 'Friend streak'], desc: ['El calendario de la racha que compartes.', 'The calendar of the streak you share.'] },
  { id: 'rivals', name: ['Duelos', 'Duels'], desc: ['Tu duelo activo contra las leyendas.', 'Your active duel against the legends.'] },
];

const CARD_W = 268;
const GAP = 12;
const FRAME_H = 214;

const CSS = `
.ws-track { scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior-x: contain; }
.ws-track::-webkit-scrollbar { display: none; }
.ws-card { scroll-snap-align: center; }
`;

export const WidgetsShowcase: React.FC<{ lang: Lang; onClose: () => void }> = ({ lang, onClose }) => {
  const reduce = !!useReducedMotion();
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const touched = useRef(false);

  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * (CARD_W + GAP), behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }, [reduce]);

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.max(0, Math.min(WIDGETS.length - 1, Math.round(el.scrollLeft / (CARD_W + GAP))));
    setActive(prev => (prev === i ? prev : i));
  }, []);

  // A gentle auto-advance so the examples "play" by themselves until the user takes over.
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      if (touched.current) return;
      const el = trackRef.current;
      if (!el) return;
      const i = Math.round(el.scrollLeft / (CARD_W + GAP));
      scrollTo(i + 1 >= WIDGETS.length ? 0 : i + 1);
    }, 2800);
    return () => clearInterval(t);
  }, [reduce, scrollTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fade = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } });

  return createPortal(
    <motion.div
      role="dialog" aria-modal="true" aria-label={L('Widgets de Android', 'Android widgets')}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100600, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(120% 80% at 50% 0%, #17174a 0%, #07071a 55%, #02020a 100%)',
        paddingTop: 'calc(var(--sat, env(safe-area-inset-top, 0px)) + 18px)',
        paddingBottom: 'calc(var(--sab, env(safe-area-inset-bottom, 0px)) + 16px)',
      }}
    >
      <style>{CSS}</style>

      {/* Header */}
      <motion.div {...fade(0.05)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          <span aria-hidden style={{ position: 'absolute', inset: -6, borderRadius: 999, background: 'radial-gradient(circle, rgba(103,232,249,0.35), transparent 70%)' }} />
          <MonitorOrb size={52} mood="happy" look={{ x: 0, y: 0.25 }} speaking={false} />
        </div>
        <div style={{ minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 900, letterSpacing: '0.26em', color: '#67e8f9', textTransform: 'uppercase' }}>
            <Smartphone size={11} /> {L('Solo en Android', 'Android only')}
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: 23, lineHeight: 1.1, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            {L('Lux también vive en tu pantalla', 'Lux also lives on your home screen')}
          </h2>
        </div>
      </motion.div>

      <motion.p {...fade(0.15)} style={{ margin: '12px 20px 0', fontSize: 14.5, lineHeight: 1.45, color: 'rgba(232,236,255,0.82)' }}>
        {L(`Tienes ${WIDGETS.length} widgets de Android. Mira cómo se ven:`, `You get ${WIDGETS.length} Android widgets. Here is how they look:`)}
      </motion.p>

      {/* Carousel */}
      <motion.div {...fade(0.25)} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          ref={trackRef} className="ws-track" onScroll={onScroll}
          onPointerDown={() => { touched.current = true; }} onTouchStart={() => { touched.current = true; }}
          style={{
            display: 'flex', gap: GAP, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '14px 0 30px', marginBottom: -12,
            paddingLeft: `calc(50% - ${CARD_W / 2}px)`, paddingRight: `calc(50% - ${CARD_W / 2}px)`,
          }}
        >
          {WIDGETS.map((w, i) => (
            <article
              key={w.id} className="ws-card" aria-label={w.name[lang === 'es' ? 0 : 1]}
              style={{
                flex: 'none', width: CARD_W, borderRadius: 26, padding: 12, display: 'flex', flexDirection: 'column',
                background: 'linear-gradient(165deg, rgba(34,36,92,0.78), rgba(12,12,31,0.92))',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: i === active ? '0 24px 50px -22px rgba(99,102,241,0.85), 0 0 0 1px rgba(103,232,249,0.28)' : '0 14px 30px -20px rgba(0,0,0,0.9)',
                opacity: i === active ? 1 : 0.62, transform: i === active ? 'scale(1)' : 'scale(0.955)',
                transition: 'opacity .3s ease, transform .3s ease, box-shadow .3s ease',
              }}
            >
              <div style={{
                height: FRAME_H, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, overflow: 'hidden',
                background: 'radial-gradient(90% 90% at 50% 20%, rgba(129,140,248,0.2), rgba(4,4,12,0.85) 75%), linear-gradient(135deg, #1b1d4a, #0a0a1c)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <img
                  src={`/widgets/${w.id}.webp`} alt="" draggable={false} loading={i < 2 ? 'eager' : 'lazy'} decoding="async"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.55))' }}
                />
              </div>
              <div style={{ padding: '11px 4px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>{w.name[lang === 'es' ? 0 : 1]}</h3>
                  {w.deluxe && <DeluxeBadge size="xs" />}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.4, color: 'rgba(226,232,255,0.7)', minHeight: 36 }}>{w.desc[lang === 'es' ? 0 : 1]}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Dots */}
        <div role="tablist" aria-label={L('Widgets', 'Widgets')} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, height: 16 }}>
          {WIDGETS.map((w, i) => (
            <button
              key={w.id} type="button" role="tab" aria-selected={i === active} aria-label={w.name[lang === 'es' ? 0 : 1]}
              onClick={() => { touched.current = true; scrollTo(i); }}
              style={{ width: i === active ? 18 : 6, height: 6, borderRadius: 6, padding: 0, background: i === active ? 'linear-gradient(90deg, #22d3ee, #a78bfa)' : 'rgba(255,255,255,0.2)', transition: 'width .25s ease, background .25s ease' }}
            />
          ))}
        </div>
      </motion.div>

      {/* How to add + CTA */}
      <motion.div {...fade(0.35)} style={{ padding: '0 20px' }}>
        <div style={{ borderRadius: 18, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: '#67e8f9', textTransform: 'uppercase' }}>{L('Cómo añadirlos', 'How to add them')}</p>
          <ol style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            <li>{L('Mantén pulsado el inicio', 'Long-press your home screen')}</li>
            <li aria-hidden style={{ color: 'rgba(255,255,255,0.35)' }}>→</li>
            <li>{L('Widgets', 'Widgets')}</li>
            <li aria-hidden style={{ color: 'rgba(255,255,255,0.35)' }}>→</li>
            <li>{L('Busca «Lux»', 'Search “Lux”')}</li>
          </ol>
        </div>
        <motion.button
          type="button" onClick={onClose} whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 12, width: '100%', height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 16, fontWeight: 900, color: '#fff',
            background: 'linear-gradient(100deg, #06b6d4, #6366f1 70%, #8b5cf6)',
            boxShadow: '0 16px 34px -16px rgba(99,102,241,0.95), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <Check size={19} /> {L('Entendido', 'Got it')}
        </motion.button>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
