// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — cinematic intro. Particles converge, the orb assembles, the name
// is stamped letter by letter and El Monitor introduces itself line by line.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MonitorOrb } from './MonitorOrb';
import type { Lang } from './scripts';

const lines = (L: Lang, name: string) => L === 'es'
  ? [
    name ? `Hola, ${name}.` : 'Hola.',
    'Soy El Monitor. Yo dirijo esta app.',
    'Veo tus hábitos, tus tareas, tu foco y tu rango… y te ayudo a mejorar cada día.',
    'Vamos a recorrerla juntos, paso a paso. No te dejaré solo.',
  ]
  : [
    name ? `Hi, ${name}.` : 'Hi.',
    'I am El Monitor. I run this app.',
    'I watch your habits, tasks, focus and rank… and help you improve every day.',
    "Let's walk through it together, step by step. I won't leave you alone.",
  ];

export const MonitorIntro: React.FC<{ lang: Lang; name?: string | null; onStart: () => void; onSkip: () => void }> = ({ lang, name, onStart, onSkip }) => {
  const reduce = !!useReducedMotion();
  const first = (name || '').split(' ')[0];
  const script = useMemo(() => lines(lang, first), [lang, first]);
  const [phase, setPhase] = useState(reduce ? 3 : 0); // 0 particles · 1 orb · 2 title · 3 lines
  const [lineIdx, setLineIdx] = useState(reduce ? script.length : 0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 1700);
    const t3 = setTimeout(() => setPhase(3), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [reduce]);

  // Type each line, then move to the next.
  useEffect(() => {
    if (phase < 3 || lineIdx >= script.length) return;
    const text = script[lineIdx];
    if (chars < text.length) {
      const t = setTimeout(() => setChars(c => c + 1), 19);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setLineIdx(i => i + 1); setChars(0); }, 420);
    return () => clearTimeout(t);
  }, [phase, lineIdx, chars, script]);

  const done = lineIdx >= script.length;
  const skipTyping = () => { if (!done) { setPhase(3); setLineIdx(script.length); } };

  const particles = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const a = (i / 34) * Math.PI * 2 + (i % 3) * 0.3;
    const d = 220 + (i % 5) * 60;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 2 + (i % 4), c: ['#67e8f9', '#a78bfa', '#f472b6', '#fde68a'][i % 4], delay: (i % 7) * 0.05 };
  }), []);

  const title = 'EL MONITOR';

  return createPortal(
    <motion.div
      role="dialog" aria-modal="true" aria-label="El Monitor"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={skipTyping}
      style={{ position: 'fixed', inset: 0, zIndex: 100600, background: 'radial-gradient(120% 90% at 50% 35%, #12123a 0%, #05050f 55%, #000 100%)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)' }}
    >
      {/* perspective grid */}
      <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} transition={{ duration: 1.2 }}
        style={{ position: 'absolute', pointerEvents: 'none', left: '-50%', right: '-50%', bottom: '-10%', height: '55%', transform: 'perspective(420px) rotateX(62deg)', backgroundImage: 'linear-gradient(rgba(103,232,249,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.22) 1px, transparent 1px)', backgroundSize: '42px 42px', maskImage: 'linear-gradient(to top, black, transparent)', WebkitMaskImage: 'linear-gradient(to top, black, transparent)' }} />
      {!reduce && (
        <motion.div aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #67e8f9, transparent)', boxShadow: '0 0 24px #67e8f9' }}
          initial={{ top: '-5%' }} animate={{ top: '105%' }} transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.6 }} />
      )}

      <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* converging particles */}
        {!reduce && particles.map((p, i) => (
          <motion.span key={i} aria-hidden="true"
            style={{ position: 'absolute', pointerEvents: 'none', width: p.s, height: p.s, borderRadius: 99, background: p.c, boxShadow: `0 0 10px ${p.c}` }}
            initial={{ x: p.x, y: p.y, opacity: 0 }}
            animate={phase === 0 ? { x: p.x * 0.35, y: p.y * 0.35, opacity: 1 } : { x: Math.cos(i) * 76, y: Math.sin(i) * 76, opacity: [1, 0.4, 0.9] }}
            transition={phase === 0 ? { duration: 0.9, delay: p.delay, ease: 'easeOut' } : { duration: 2.8, repeat: Infinity, repeatType: 'mirror', delay: p.delay }}
          />
        ))}
        {/* shockwave */}
        {phase >= 1 && !reduce && (
          <motion.span aria-hidden="true" style={{ position: 'absolute', width: 140, height: 140, borderRadius: 999, border: '2px solid #67e8f9' }}
            initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
        )}
        <motion.div
          initial={reduce ? false : { scale: 0, rotate: -120, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : {}}
          transition={{ type: 'spring', stiffness: 140, damping: 13 }}
        >
          <MonitorOrb size={150} mood={done ? 'happy' : 'talk'} speaking={phase >= 3 && !done} look={{ x: 0, y: 0.15 }} />
        </motion.div>
      </div>

      {/* Name stamp */}
      <div style={{ marginTop: 18, display: 'flex', gap: 3, height: 40 }} aria-label={title}>
        {title.split('').map((ch, i) => (
          <motion.span key={i}
            initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ fontSize: 34, fontWeight: 900, letterSpacing: '0.12em', width: ch === ' ' ? 14 : undefined, background: 'linear-gradient(180deg, #ffffff, #a5f3fc 55%, #818cf8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 30px rgba(103,232,249,0.35)' }}
          >{ch}</motion.span>
        ))}
      </div>
      <motion.p initial={reduce ? false : { opacity: 0 }} animate={phase >= 2 ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}
        style={{ marginTop: 6, fontSize: 11, fontWeight: 800, letterSpacing: '0.32em', color: 'rgba(165,243,252,0.6)', textTransform: 'uppercase' }}>
        {lang === 'es' ? 'Tu guía dentro de Lux' : 'Your guide inside Lux'}
      </motion.p>

      {/* Lines */}
      <div style={{ marginTop: 22, width: '100%', maxWidth: 380, minHeight: 150 }} aria-live="polite">
        {script.slice(0, Math.min(script.length, lineIdx + 1)).map((ln, i) => {
          const text = i < lineIdx ? ln : ln.slice(0, chars);
          return (
            <motion.p key={i} initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: i === lineIdx || done ? 1 : 0.55, x: 0 }}
              style={{ margin: '0 0 8px', fontSize: i === 0 ? 20 : 15.5, fontWeight: i === 0 ? 900 : 600, lineHeight: 1.4, color: '#eef2ff', textAlign: 'center' }}>
              {text}
              {i === lineIdx && !done && <span style={{ display: 'inline-block', width: 8, height: 16, marginLeft: 3, verticalAlign: -2, background: '#67e8f9', borderRadius: 2, animation: 'monitor-caret 0.8s steps(2) infinite' }} />}
            </motion.p>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.4 }}
        style={{ position: 'relative', zIndex: 2, marginTop: 10, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: done ? 'auto' : 'none' }}>
        <button type="button" onClick={e => { e.stopPropagation(); onStart(); }}
          style={{ height: 54, borderRadius: 18, fontSize: 16, fontWeight: 900, color: '#06101f', background: 'linear-gradient(100deg, #22d3ee, #818cf8 60%, #f472b6)', boxShadow: '0 16px 40px -14px rgba(99,102,241,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {lang === 'es' ? 'Comenzar el recorrido' : 'Start the tour'} <ArrowRight size={18} />
        </button>
        <button type="button" onClick={e => { e.stopPropagation(); onSkip(); }}
          style={{ height: 44, borderRadius: 14, fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
          {lang === 'es' ? 'Ahora no (lo encuentras en cada 💡)' : 'Not now (find me in every 💡)'}
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
