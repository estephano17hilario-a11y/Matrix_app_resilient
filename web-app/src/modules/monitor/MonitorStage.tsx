// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — stage. Runs a script over the real app: spotlight with a morphing
// hole, marching-ants ring, animated arrow and El Monitor's speech bubble.
// Explanations block taps outside the spotlight; guides over real creators
// leave the whole UI usable so the user types and taps for real.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Check, ChevronRight, Clock3, FolderKanban, Hand, Lightbulb, ListTodo, Repeat, RotateCcw, StickyNote, X } from 'lucide-react';
import { findVisible } from './dom';
import { MonitorOrb } from './MonitorOrb';
import { RankShowcase } from './RankShowcase';
import { getScript, type Frame, type Lang, type MonitorAction, type RunnerApi } from './scripts';
import { monitor, navigateTo, type ScriptId } from './monitorStore';

type Box = { top: number; left: number; width: number; height: number };
const Z = 100500;
const GAP = 18;
const MARGIN = 12;

const boxOf = (el: HTMLElement | null, pad: number): Box | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
};
const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1);

const ACTION_ICON: Record<NonNullable<MonitorAction['icon']>, React.ReactNode> = {
  task: <ListTodo size={16} />, habit: <Repeat size={16} />, project: <FolderKanban size={16} />, note: <StickyNote size={16} />,
  journal: <BookOpen size={16} />, retry: <RotateCcw size={16} />, later: <Clock3 size={16} />,
};

/** Steps where the user acts on the real UI: the bubble gets an "OK" that hides it until the step changes. */
const isHideable = (f: Frame) => f.hideable ?? (!f.actions && (!!f.tap || (f.block === false && (!!f.todo || f.next === false))));

// Decorative loops of the stage, as CSS keyframes on transform / opacity: the compositor runs them.
// (They were framer-motion JS loops, one of them animating `top`, which relaid out and repainted the
// page every frame while the guide was open.)
const STAGE_CSS = `
.ms-pulse { animation: ms-pulse 1.4s ease-out infinite; will-change: transform, opacity; }
@keyframes ms-pulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.12); opacity: 0; } }
.ms-conic { animation: ms-spin 6s linear infinite; will-change: transform; }
@keyframes ms-spin { to { transform: rotate(360deg); } }
.ms-scan { animation: ms-scan 3.4s linear infinite; will-change: transform; }
@keyframes ms-scan { from { transform: translateY(-30%); } to { transform: translateY(130%); } }
.ms-blink { animation: ms-blink 1.4s ease-in-out infinite; }
@keyframes ms-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.ms-nudge { display: inline-block; animation: ms-nudge 1s ease-in-out infinite; }
@keyframes ms-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
@media (prefers-reduced-motion: reduce) { .ms-pulse, .ms-conic, .ms-scan, .ms-blink, .ms-nudge, .ms-travel { animation: none !important; } }
`;
let stageCssInjected = false;
const injectStageCss = () => {
  if (stageCssInjected || typeof document === 'undefined') return;
  stageCssInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-monitor-stage-css', '');
  el.textContent = STAGE_CSS;
  document.head.appendChild(el);
};

/**
 * Reveals text progressively; a tap shows it all. It lives in its own component so the 45 updates per
 * second only re-render this text, not the whole bubble (orb, buttons, motion components…).
 */
const TypeText: React.FC<{ text: string; enabled: boolean; skip: number; onDone: (done: boolean) => void }> = ({ text, enabled, skip, onDone }) => {
  const [n, setN] = useState(enabled ? 0 : text.length);
  const doneRef = useRef(!enabled);
  useEffect(() => {
    if (!enabled) { setN(text.length); return; }
    setN(0);
    let i = 0;
    const t = setInterval(() => { i += 2; setN(i); if (i >= text.length) clearInterval(t); }, 22);
    return () => clearInterval(t);
  }, [text, enabled]);
  useEffect(() => { if (skip > 0) setN(text.length); }, [skip, text.length]);
  const done = n >= text.length;
  useEffect(() => {
    if (doneRef.current === done) return;
    doneRef.current = done;
    onDone(done);
  }, [done, onDone]);
  return (
    <>
      {text.slice(0, n)}
      {!done && <span style={{ display: 'inline-block', width: 7, height: 14, marginLeft: 2, background: '#67e8f9', verticalAlign: -2, borderRadius: 2, animation: 'monitor-caret 0.8s steps(2) infinite' }} />}
    </>
  );
};

/** Points along a cubic Bézier, for a compositor (transform) keyframe path. */
const bezierKeyframes = (name: string, p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number]) => {
  const N = 16;
  const frames: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // easeInOut on the travel, like the old offset-distance animation
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const u = 1 - e;
    const x = u * u * u * p0[0] + 3 * u * u * e * p1[0] + 3 * u * e * e * p2[0] + e * e * e * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * e * p1[1] + 3 * u * e * e * p2[1] + e * e * e * p3[1];
    frames.push(`${(t * 100).toFixed(2)}% { transform: translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0); }`);
  }
  return `@keyframes ${name} { ${frames.join(' ')} }`;
};

export const MonitorStage: React.FC<{ script: ScriptId; run: number; lang: Lang; onFinish?: () => void }> = ({ script, run, lang, onFinish }) => {
  injectStageCss();
  const reduce = !!useReducedMotion();
  const steps = useMemo(() => getScript(script), [script, run]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [hole, setHole] = useState<Box | null>(null);
  const [hole2, setHole2] = useState<Box | null>(null);
  // The user pressed "OK" on this step: the bubble stays away until the step (or its group) changes.
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const [vw, setVw] = useState({ w: window.innerWidth, h: window.innerHeight });
  const ctx = useRef<Record<string, unknown>>({});
  const frameKey = useRef('');
  const frameSince = useRef(Date.now());
  const scrolledFor = useRef('');
  const step = steps[Math.min(index, steps.length - 1)];

  const finish = useCallback(() => { onFinish?.(); monitor.close(); }, [onFinish]);
  const next = useCallback(() => {
    setIndex(i => {
      if (i + 1 >= steps.length) { setTimeout(finish, 0); return i; }
      return i + 1;
    });
  }, [steps.length, finish]);
  const goto = useCallback((id: string) => {
    const i = steps.findIndex(s => s.id === id);
    if (i < 0) return;
    Object.keys(ctx.current).forEach(k => delete ctx.current[k]);
    setIndex(i);
    // Re-enter even when it's the same step.
    setEntered(false);
  }, [steps]);
  const api: RunnerApi = useMemo(() => ({ next, goto, run: monitor.run, close: finish, ctx: ctx.current }), [next, goto, finish]);

  // Reset when a new script starts.
  useEffect(() => { setIndex(0); Object.keys(ctx.current).forEach(k => delete ctx.current[k]); setEntered(false); }, [script, run]);

  // Enter a step: navigate, wait for the view, run its side effect.
  useEffect(() => {
    if (entered) return;
    setFrame(null);
    setHole(null);
    setHole2(null);
    frameKey.current = '';
    if (step.view) navigateTo(step.view);
    const t = setTimeout(() => {
      step.enter?.(api);
      setEntered(true);
    }, step.view ? 420 : 60);
    return () => clearTimeout(t);
  }, [entered, step, api]);
  useEffect(() => { setEntered(false); }, [index]);

  // Event-driven steps.
  useEffect(() => {
    if (!entered || !step.event) return;
    const h = (e: Event) => { if (!step.onEvent || step.onEvent(e, api)) next(); };
    window.addEventListener(step.event, h);
    return () => window.removeEventListener(step.event as string, h);
  }, [entered, step, api, next]);

  // Poll the real UI: target position, completion, dynamic copy.
  useEffect(() => {
    if (!entered) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      if (step.until?.(api)) { next(); return; }
      const f = step.frame(lang, api);
      const key = f ? `${f.title}|${f.target ?? ''}|${f.body}` : '';
      if (key !== frameKey.current) { frameKey.current = key; frameSince.current = Date.now(); setFrame(f); }
      const el = f?.target ? findVisible(f.target) : null;
      if (el && f && scrolledFor.current !== key) {
        const r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > window.innerHeight - 70) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        scrolledFor.current = key;
      }
      const b = boxOf(el, f?.pad ?? 8);
      setHole(prev => (sameBox(prev, b) ? prev : b));
      const b2 = f?.secondary ? boxOf(findVisible(f.secondary), 3) : null;
      setHole2(prev => (sameBox(prev, b2) ? prev : b2));
      setVw(v => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
    };
    tick();
    const t = setInterval(tick, 120);
    return () => { alive = false; clearInterval(t); };
  }, [entered, step, api, lang, next, reduce]);

  // Taps on a "tap" target advance steps that have no `until` of their own.
  useEffect(() => {
    if (!frame?.tap || step.until || !frame.target) return;
    const el = findVisible(frame.target);
    if (!el) return;
    const h = () => setTimeout(next, 60);
    el.addEventListener('click', h, { once: true });
    return () => el.removeEventListener('click', h);
  }, [frame, step, next, hole]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  // While the target is on its way (view transition), wait a moment before falling back to the centre.
  const waitingTarget = !!frame?.target && !hole && Date.now() - frameSince.current < 1400;
  const [, force] = useState(0);
  useEffect(() => { if (!waitingTarget) return; const t = setTimeout(() => force(n => n + 1), 1450); return () => clearTimeout(t); }, [waitingTarget, frame]);

  if (!frame || waitingTarget) {
    return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: Z, pointerEvents: 'none' }} />, document.body);
  }

  const showHole = frame.placement !== 'center' && hole;
  const block = frame.block ?? true;
  const dim = block ? 0.74 : 0.42;
  const hideable = isHideable(frame);
  const stepKey = `${run}-${index}-${frame.group ?? ''}`;
  const hidden = hideable && hiddenKey === stepKey;

  // "OK" pressed: the screen is the user's. Only a quiet ring marks where to act (and, when the user must tap
  // a spot, the spotlight keeps guarding it) plus a small chip to bring the guide back. The step advancing, or
  // the wizard moving to its next page, shows the bubble again by itself.
  if (hidden) {
    const guard = block && !!frame.tap && !!showHole;
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: Z, pointerEvents: 'none' }} data-monitor-stage data-monitor-hidden>
        {guard && (
          <>
            <svg width={vw.w} height={vw.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
              <defs>
                <mask id="monitor-hole-h">
                  <rect x="0" y="0" width={vw.w} height={vw.h} fill="#fff" />
                  <rect fill="#000" rx={18} x={hole!.left} y={hole!.top} width={hole!.width} height={hole!.height} />
                </mask>
              </defs>
              <rect x="0" y="0" width={vw.w} height={vw.h} fill="#03030a" opacity={0.6} mask="url(#monitor-hole-h)" />
            </svg>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, hole!.top), pointerEvents: 'auto' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: hole!.top + hole!.height, bottom: 0, pointerEvents: 'auto' }} />
            <div style={{ position: 'absolute', left: 0, width: Math.max(0, hole!.left), top: hole!.top, height: hole!.height, pointerEvents: 'auto' }} />
            <div style={{ position: 'absolute', left: hole!.left + hole!.width, right: 0, top: hole!.top, height: hole!.height, pointerEvents: 'auto' }} />
          </>
        )}
        {showHole && <TargetRing box={hole!} reduce={reduce} strong={!!frame.tap} />}
        {hole2 && <TargetRing box={hole2} reduce={reduce} strong />}
        <ReturnChip lang={lang} reduce={reduce} onClick={() => setHiddenKey(null)} />
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z, pointerEvents: 'none' }} data-monitor-stage>
      {/* Dim + spotlight hole */}
      <svg width={vw.w} height={vw.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <mask id="monitor-hole">
            <rect x="0" y="0" width={vw.w} height={vw.h} fill="#fff" />
            {showHole && (
              <motion.rect
                fill="#000" rx={18}
                initial={false}
                animate={{ x: hole.left, y: hole.top, width: hole.width, height: hole.height }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 24 }}
              />
            )}
          </mask>
        </defs>
        <motion.rect x="0" y="0" width={vw.w} height={vw.h} fill="#03030a" mask="url(#monitor-hole)"
          initial={{ opacity: 0 }} animate={{ opacity: dim }} transition={{ duration: 0.35 }} />
      </svg>

      {/* Tap blockers around the hole */}
      {block && (showHole ? (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, hole.top), pointerEvents: 'auto' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: hole.top + hole.height, bottom: 0, pointerEvents: 'auto' }} />
          <div style={{ position: 'absolute', left: 0, width: Math.max(0, hole.left), top: hole.top, height: hole.height, pointerEvents: 'auto' }} />
          <div style={{ position: 'absolute', left: hole.left + hole.width, right: 0, top: hole.top, height: hole.height, pointerEvents: 'auto' }} />
          {!frame.tap && <div style={{ position: 'absolute', left: hole.left, top: hole.top, width: hole.width, height: hole.height, pointerEvents: 'auto' }} />}
        </>
      ) : <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }} />)}

      {/* Ring + pulse around the target */}
      {showHole && <TargetRing box={hole} reduce={reduce} strong={!!frame.tap} />}
      {hole2 && <TargetRing box={hole2} reduce={reduce} strong />}

      <Bubble
        key={`${run}-${index}`}
        frame={frame} hole={showHole ? hole : null} vw={vw} reduce={reduce}
        index={index} total={steps.length} lang={lang} api={api}
        onNext={() => (frame.onNext ? frame.onNext(api) : next())}
        onClose={finish}
        hideable={hideable}
        onHide={() => setHiddenKey(stepKey)}
      />
    </div>,
    document.body,
  );
};

const TargetRing: React.FC<{ box: Box; reduce: boolean; strong: boolean }> = ({ box, reduce, strong }) => (
  <motion.div
    initial={false}
    animate={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 24 }}
    style={{ position: 'absolute', borderRadius: 18, pointerEvents: 'none', boxShadow: '0 0 0 2px rgba(103,232,249,0.95), 0 0 30px 4px rgba(99,102,241,0.5)' }}
  >
    {/* HUD corner brackets */}
    {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
      <span key={c} aria-hidden style={{
        position: 'absolute', width: 14, height: 14,
        top: c[0] === 't' ? -7 : undefined, bottom: c[0] === 'b' ? -7 : undefined,
        left: c[1] === 'l' ? -7 : undefined, right: c[1] === 'r' ? -7 : undefined,
        borderTop: c[0] === 't' ? '2.5px solid #a5f3fc' : undefined, borderBottom: c[0] === 'b' ? '2.5px solid #a5f3fc' : undefined,
        borderLeft: c[1] === 'l' ? '2.5px solid #a5f3fc' : undefined, borderRight: c[1] === 'r' ? '2.5px solid #a5f3fc' : undefined,
        borderRadius: 3,
      }} />
    ))}
    {!reduce && (
      <div className="ms-pulse" style={{ position: 'absolute', inset: 0, borderRadius: 18, border: `2px solid ${strong ? '#a78bfa' : '#67e8f9'}` }} />
    )}
  </motion.div>
);

/** Small floating pill shown while the guide is tucked away: tap to bring it back. */
const ReturnChip: React.FC<{ lang: Lang; reduce: boolean; onClick: () => void }> = ({ lang, reduce, onClick }) => (
  <motion.button
    type="button" onClick={onClick} aria-label={lang === 'es' ? 'Mostrar la guía de El Monitor' : 'Show the El Monitor guide'}
    initial={reduce ? false : { opacity: 0, y: -14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} whileTap={{ scale: 0.94 }}
    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    style={{
      position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: '50%', marginLeft: -78, width: 156, height: 38, borderRadius: 99, pointerEvents: 'auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, color: '#e0faff',
      background: 'linear-gradient(110deg, rgba(21,22,58,0.96), rgba(12,12,31,0.96))', border: '1px solid rgba(103,232,249,0.45)',
      boxShadow: '0 10px 28px -10px rgba(0,0,0,0.9), 0 0 24px -6px rgba(99,102,241,0.7)',
    }}
  >
    <Lightbulb size={15} color="#67e8f9" />
    {lang === 'es' ? 'Ver la guía' : 'Show guide'}
  </motion.button>
);

const Bubble: React.FC<{
  frame: Frame; hole: Box | null; vw: { w: number; h: number }; reduce: boolean; index: number; total: number; lang: Lang; api: RunnerApi;
  onNext: () => void; onClose: () => void; hideable: boolean; onHide: () => void;
}> = ({ frame, hole, vw, reduce, index, total, lang, api, onNext, onClose, hideable, onHide }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(200);
  const width = Math.min(384, vw.w - MARGIN * 2);
  const [twDone, setTwDone] = useState(reduce);
  const [skip, setSkip] = useState(0);
  const tw = { done: twDone, finish: () => setSkip(x => x + 1) };
  const onTypeDone = useCallback((d: boolean) => setTwDone(d), []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    setH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Placement
  let top: number;
  let left: number;
  let side: 'above' | 'below' | 'none' = 'none';
  if (!hole) {
    top = Math.max(MARGIN, (vw.h - h) / 2 - 20);
    left = (vw.w - width) / 2;
  } else {
    const spaceAbove = hole.top;
    const spaceBelow = vw.h - (hole.top + hole.height);
    const want = frame.placement === 'top' ? 'above' : frame.placement === 'bottom' ? 'below' : spaceBelow >= spaceAbove ? 'below' : 'above';
    side = want === 'above' && spaceAbove < h + GAP + MARGIN && spaceBelow > spaceAbove ? 'below'
      : want === 'below' && spaceBelow < h + GAP + MARGIN && spaceAbove > spaceBelow ? 'above' : want;
    top = side === 'above' ? hole.top - GAP - h : hole.top + hole.height + GAP;
    top = Math.max(MARGIN + 4, Math.min(vw.h - h - MARGIN, top));
    left = Math.max(MARGIN, Math.min(vw.w - width - MARGIN, hole.left + hole.width / 2 - width / 2));
  }

  // Arrow from the bubble edge to the target edge.
  let arrow: string | null = null;
  let tip: { x: number; y: number } | null = null;
  let travel: { name: string; css: string } | null = null;
  if (hole && side !== 'none') {
    const tx = hole.left + hole.width / 2;
    const sx = Math.max(left + 40, Math.min(left + width - 40, tx));
    const sy = side === 'above' ? top + h : top;
    const ty = side === 'above' ? hole.top - 4 : hole.top + hole.height + 4;
    if (Math.abs(ty - sy) > 10 && (side === 'above' ? ty > sy : ty < sy)) {
      const my = (sy + ty) / 2;
      arrow = `M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`;
      tip = { x: tx, y: ty };
      const name = `ms-travel-${Math.round(sx)}-${Math.round(sy)}-${Math.round(tx)}-${Math.round(ty)}`;
      travel = { name, css: bezierKeyframes(name, [sx, sy], [sx, my], [tx, my], [tx, ty]) };
    }
  }

  const cx = left + width / 2;
  const cy = top + 40;
  const look = hole ? { x: (hole.left + hole.width / 2 - cx) / 160, y: (hole.top + hole.height / 2 - cy) / 160 } : { x: 0, y: 0.2 };
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const segments = total > 1 && total <= 14;

  return (
    <>
      {arrow && tip && (
        <svg width={vw.w} height={vw.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="monitor-arrow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
          </defs>
          <motion.path d={arrow} fill="none" stroke="url(#monitor-arrow)" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="1 7"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.15 }} />
          <motion.circle cx={tip.x} cy={tip.y} r="5" fill="#67e8f9" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.5, delay: reduce ? 0 : 0.6 }} style={{ transformOrigin: `${tip.x}px ${tip.y}px` }} />
        </svg>
      )}
      {arrow && tip && travel && !reduce && (
        <>
          <style>{`${travel.css} .${travel.name} { animation: ${travel.name} 1.3s linear 0.7s infinite; }`}</style>
          {/* The light running down the arrow: an HTML dot moved with transform keyframes (compositor). */}
          <span aria-hidden className={`ms-travel ${travel.name}`} style={{ position: 'absolute', left: -3.2, top: -3.2, width: 6.4, height: 6.4, borderRadius: 99, background: '#fff', pointerEvents: 'none', willChange: 'transform', transform: 'translate3d(-99px,-99px,0)' }} />
        </>
      )}

      <motion.div
        ref={ref}
        role="dialog" aria-live="polite" aria-label="El Monitor"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: side === 'above' ? 18 : -18 }}
        animate={{ opacity: 1, scale: 1, y: 0, top, left }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 24 }}
        style={{
          position: 'absolute', width, pointerEvents: 'auto', borderRadius: 28, padding: 1.6, overflow: 'hidden',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px -12px rgba(99,102,241,0.75)',
        }}
      >
        {/* Living border: a conic light that turns behind the panel */}
        <span aria-hidden className={reduce ? undefined : 'ms-conic'}
          style={{ position: 'absolute', inset: '-60%', background: 'conic-gradient(from 0deg, #22d3ee, #818cf8, #f472b6, #22d3ee 40%, rgba(34,211,238,0.15) 55%, #818cf8 80%, #22d3ee)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', borderRadius: 26.5, overflow: 'hidden', padding: '14px 14px 13px',
          background: 'linear-gradient(165deg, #15163a 0%, #0c0c1f 48%, #07070f 100%)' }}>
          {/* HUD grid + glow */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
            backgroundImage: 'linear-gradient(rgba(103,232,249,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px',
            maskImage: 'linear-gradient(180deg, black, transparent 75%)', WebkitMaskImage: 'linear-gradient(180deg, black, transparent 75%)' }} />
          <div aria-hidden style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 160, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 65%)' }} />
          {!reduce && (
            <div aria-hidden className="ms-scan" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 70, background: 'linear-gradient(180deg, transparent, rgba(103,232,249,0.07), transparent)' }} />
            </div>
          )}

          <button type="button" onClick={onClose} aria-label={L('Cerrar El Monitor', 'Close El Monitor')}
            style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', zIndex: 2 }}>
            <X size={16} />
          </button>

          {/* Header */}
          <div style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', paddingRight: 38 }}>
            <div style={{ position: 'relative', flex: 'none' }}>
              <span aria-hidden style={{ position: 'absolute', inset: -6, borderRadius: 999, background: 'radial-gradient(circle, rgba(103,232,249,0.35), transparent 70%)' }} />
              <MonitorOrb size={60} mood={frame.mood} look={look} speaking={!tw.done} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '0.28em', color: '#67e8f9', textTransform: 'uppercase' }}>El Monitor</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(167,243,208,0.85)', padding: '2px 7px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span className={reduce ? undefined : 'ms-blink'} style={{ width: 6, height: 6, borderRadius: 9, background: '#34d399' }} />
                  {L('EN LÍNEA', 'ONLINE')}
                </span>
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: 19, lineHeight: 1.15, fontWeight: 900, color: '#fff', letterSpacing: '-0.015em' }}>{frame.title}</h3>
            </div>
          </div>

          {/* Body */}
          <p onClick={tw.finish} style={{ position: 'relative', margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, color: 'rgba(232,236,255,0.86)', minHeight: 40 }}>
            <TypeText text={frame.body} enabled={!reduce} skip={skip} onDone={onTypeDone} />
          </p>

          {frame.showcase === 'ranks' && <RankShowcase lang={lang} />}

          {frame.todo && (
            <div style={{ position: 'relative', marginTop: 11, display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 16,
              background: 'linear-gradient(110deg, rgba(167,139,250,0.2), rgba(34,211,238,0.14))', border: '1px solid rgba(167,139,250,0.4)' }}>
              <span style={{ flex: 'none', width: 28, height: 28, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', color: '#06101f' }}>
                <Hand size={15} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 9.5, fontWeight: 900, letterSpacing: '0.2em', color: '#c4b5fd' }}>{L('AHORA TÚ', 'YOUR TURN')}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13.5, fontWeight: 700, lineHeight: 1.35, color: '#fff' }}>{frame.todo}</span>
              </span>
            </div>
          )}

          {frame.actions && frame.actions.length > 0 && (
            <div style={{ position: 'relative', marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {frame.actions.map((a, i) => {
                const off = !!a.disabled;
                return (
                  <motion.button
                    key={a.label} type="button" disabled={off} aria-disabled={off}
                    onClick={() => { if (!off) a.run(api); }}
                    initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: reduce ? 0 : 0.2 + i * 0.05 }}
                    whileTap={off ? undefined : { scale: 0.96 }}
                    style={{
                      position: 'relative', height: 48, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13.5, fontWeight: 800,
                      gridColumn: a.primary && !off && frame.actions!.length % 2 === 1 ? 'span 2' : undefined,
                      background: off ? 'rgba(255,255,255,0.03)' : a.primary ? 'linear-gradient(100deg, #22d3ee, #818cf8)' : 'rgba(255,255,255,0.07)',
                      color: off ? 'rgba(255,255,255,0.28)' : a.primary ? '#06101f' : '#fff',
                      border: off ? '1px dashed rgba(255,255,255,0.1)' : a.primary ? 'none' : '1px solid rgba(255,255,255,0.09)',
                      cursor: off ? 'not-allowed' : 'pointer', filter: off ? 'grayscale(1)' : undefined,
                      boxShadow: a.primary && !off ? '0 12px 30px -14px rgba(34,211,238,0.9)' : undefined,
                    }}
                  >
                    {a.icon ? ACTION_ICON[a.icon] : null}{a.label}
                    {off && a.badge && (
                      <span style={{ position: 'absolute', top: -7, right: 8, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 900, padding: '2px 7px', borderRadius: 99, background: '#1f2937', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Check size={10} /> {a.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {hideable && (
            <div style={{ position: 'relative', marginTop: 12 }}>
              {total > 1 && (
                <span style={{ display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)' }}>
                  {L('PASO', 'STEP')} {index + 1}/{total}
                </span>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button type="button" onClick={onHide} whileTap={{ scale: 0.96 }}
                  style={{ flex: 1, height: 48, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 15, fontWeight: 900, color: '#fff',
                    background: 'linear-gradient(100deg, #06b6d4, #6366f1 70%, #8b5cf6)', boxShadow: '0 14px 30px -14px rgba(99,102,241,0.95), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                  <Check size={18} /> {L('OK, lo hago', 'OK, I will do it')}
                </motion.button>
                {typeof frame.next === 'string' && (
                  <motion.button type="button" onClick={() => (tw.done ? onNext() : tw.finish())} whileTap={{ scale: 0.96 }}
                    style={{ height: 48, padding: '0 16px', borderRadius: 15, fontSize: 13.5, fontWeight: 800, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {frame.next}
                  </motion.button>
                )}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
                {L('Esto se esconde y vuelve solo cuando termines ✨', 'This hides and comes back by itself when you finish ✨')}
              </p>
            </div>
          )}

          {!hideable && (frame.next !== false && frame.next !== undefined) && (
            <div style={{ position: 'relative', marginTop: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {segments ? (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: total }, (_, i) => (
                      <span key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= index ? 'linear-gradient(90deg, #22d3ee, #a78bfa)' : 'rgba(255,255,255,0.09)', boxShadow: i === index ? '0 0 10px rgba(103,232,249,0.8)' : undefined }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #22d3ee, #a78bfa)', originX: 0 }}
                      initial={false} animate={{ scaleX: (index + 1) / Math.max(1, total) }} transition={{ duration: 0.4 }} />
                  </div>
                )}
                {total > 1 && (
                  <span style={{ display: 'block', marginTop: 5, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)' }}>
                    {L('PASO', 'STEP')} {index + 1}/{total}
                  </span>
                )}
              </div>
              <motion.button type="button" onClick={() => (tw.done ? onNext() : tw.finish())} whileTap={{ scale: 0.95 }}
                style={{ height: 46, padding: '0 18px', borderRadius: 15, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14.5, fontWeight: 900, color: '#fff',
                  background: 'linear-gradient(100deg, #06b6d4, #6366f1 70%, #8b5cf6)', boxShadow: '0 14px 30px -14px rgba(99,102,241,0.95), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                {frame.next}{index + 1 >= total ? <Check size={17} /> : <ChevronRight size={17} />}
              </motion.button>
            </div>
          )}

          {!hideable && frame.next === false && !frame.actions && (
            <p style={{ position: 'relative', marginTop: 11, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em', color: frame.tap ? '#c4b5fd' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={reduce ? undefined : 'ms-nudge'}>👉</span>
              {frame.tap ? L('Toca lo que está iluminado', 'Tap the highlighted spot') : L('Hazlo en la pantalla, yo te sigo', 'Do it on screen, I follow you')}
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
};
