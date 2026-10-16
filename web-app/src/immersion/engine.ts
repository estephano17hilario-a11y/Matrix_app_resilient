import { flushSync } from 'react-dom';
import { getImmersionPrefs, immersionActive, subscribeImmersionPrefs } from './immersionPrefs';
import { playTouch, playTravel } from './spatialSound';
import { applyPerfClass, getPerfTier, reportFrame, subscribePerf } from './perf';
import type { Pulse, Starfield } from './starfield';

// ─────────────────────────────────────────────────────────────────────────────
// LUX IMMERSION ENGINE
//
// One camera for the whole app. Navigating between sections moves the camera
// through a single continuous space; tilting the phone (or moving the mouse)
// shifts it slightly so the background behaves like depth, not wallpaper.
//
// Rules this module follows so it holds 60fps on Android WebViews:
//   • DOM layers only get `transform` / `opacity` (compositor-only properties)
//   • the sky is one viewport-sized canvas, redrawn only while something moves
//   • the rAF loop sleeps as soon as the camera settles (desktop keeps a slow
//     30fps drift; phones get their life from the hand's own motion instead)
//   • frame times are reported to the perf governor, which lowers quality if
//     a device can't keep up
//   • everything stops while the document is hidden
// ─────────────────────────────────────────────────────────────────────────────

type LayerKind = 'far' | 'spot';

interface Layer {
  el: HTMLElement;
  kind: LayerKind;
}

const layers = new Set<Layer>();
const sheens = new Set<HTMLElement>();
let starfield: Starfield | null = null;

// Camera state. `x` is measured in "scenes": 0 = first dock section, 1 = next…
const cam = { x: 0, v: 0, target: 0 };
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
const scroll = { y: 0, ty: 0 }; // content scroll offset, eased
const pointer = { x: 0, y: 0, active: false };
const PULSE_MS = 1700;
let pulses: { x: number; y: number; rgb: string; start: number }[] = [];

// Sky mood, set by the adaptive world: how bright the stars are and how
// fast the sky drifts.
const mood = { stars: 1, energy: 1 };
let driftTime = 0;

let raf = 0;
let lastFrame = 0;
let lastStarDraw = 0;
let lastDriftAt = 0;
let started = false;
let arrived = false;

const hoverCapable = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Continuous ambient drift is a desktop luxury; phones stay idle when still.
const ambientDrift = () => hoverCapable && getPerfTier() === 0;

// ── Frame loop ───────────────────────────────────────────────────────────────

const drawStars = (now = performance.now()) => {
  if (!starfield) return;
  if (ambientDrift()) {
    if (lastDriftAt) driftTime += Math.min(now - lastDriftAt, 100) / 1000 * mood.energy;
    lastDriftAt = now;
  }
  lastStarDraw = now;
  pulses = pulses.filter(p => now - p.start < PULSE_MS);
  const active: Pulse[] = pulses.map(p => ({ x: p.x, y: p.y, rgb: p.rgb, t: (now - p.start) / PULSE_MS }));
  // Minimal tier: the sky stops following the tilt (the far layer still does).
  const tiltFactor = getPerfTier() >= 2 ? 0 : 1;
  starfield.draw({
    pulses: active,
    travel: cam.x * window.innerWidth,
    tiltX: tilt.x * tiltFactor,
    tiltY: tilt.y * tiltFactor,
    scroll: scroll.y,
    speed: Math.abs(cam.v),
    time: ambientDrift() ? driftTime : 0,
    brightness: mood.stars,
  });
};

let frameParity = 0;

const render = (now = performance.now()) => {
  if (!immersionActive()) {
    layers.forEach(layer => { layer.el.style.transform = ''; });
    sheens.forEach(el => { el.style.transform = ''; });
    return;
  }
  const w = window.innerWidth;
  const h = window.innerHeight;

  // When only the hand is moving (no travel, scroll or pulses), a reduced tier
  // repaints the sky every other frame; the DOM layers still move at 60fps.
  const onlyTilt = Math.abs(cam.v) < 0.002 && Math.abs(scroll.ty - scroll.y) < 0.3 && pulses.length === 0;
  frameParity ^= 1;
  if (!(onlyTilt && getPerfTier() >= 1 && frameParity)) drawStars(now);

  layers.forEach(layer => {
    if (layer.kind === 'far') {
      // The far field never leaves the screen: it sways inside its oversized box.
      const tx = -Math.sin(cam.x * 0.85) * w * 0.035 + tilt.x * w * 0.014;
      const ty = Math.cos(cam.x * 0.6) * h * 0.018 + tilt.y * h * 0.012 - Math.min(scroll.y * 0.025, h * 0.035);
      layer.el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    } else if (layer.kind === 'spot') {
      layer.el.style.transform = `translate3d(${pointer.x.toFixed(1)}px, ${pointer.y.toFixed(1)}px, 0)`;
      layer.el.style.opacity = pointer.active ? '1' : '0';
    }
  });

  // Specular sheen: the light source is fixed in the world, so the highlight
  // slides opposite to the device tilt.
  if (sheens.size) {
    const sx = (-tilt.x * 14).toFixed(2);
    const sy = (-tilt.y * 14).toFixed(2);
    sheens.forEach(el => { el.style.transform = `translate3d(${sx}%, ${sy}%, 0)`; });
  }
};

const step = (now: number) => {
  raf = 0;
  const elapsed = lastFrame ? now - lastFrame : 0;
  if (elapsed) reportFrame(elapsed);
  const dt = Math.min(elapsed / 1000, 1 / 24) || 1 / 60;
  lastFrame = now;

  // Slightly under-damped spring: the camera arrives with a hint of settle.
  const k = 70;
  const c = 15;
  const a = k * (cam.target - cam.x) - c * cam.v;
  cam.v += a * dt;
  cam.x += cam.v * dt;

  const follow = 1 - Math.pow(0.0009, dt); // ~frame-rate independent easing
  tilt.x += (tilt.tx - tilt.x) * follow;
  tilt.y += (tilt.ty - tilt.y) * follow;
  scroll.y += (scroll.ty - scroll.y) * Math.min(1, follow * 1.6);

  render(now);

  const settled =
    Math.abs(cam.target - cam.x) < 0.0008 && Math.abs(cam.v) < 0.002 &&
    Math.abs(tilt.tx - tilt.x) < 0.002 && Math.abs(tilt.ty - tilt.y) < 0.002 &&
    Math.abs(scroll.ty - scroll.y) < 0.3 &&
    pulses.length === 0;

  if (settled) {
    cam.x = cam.target; cam.v = 0; tilt.x = tilt.tx; tilt.y = tilt.ty; scroll.y = scroll.ty;
    frameParity = 0;
    render(now);
    lastFrame = 0;
    if (ambientDrift() && starfield && immersionActive()) raf = requestAnimationFrame(idle);
    return;
  }
  raf = requestAnimationFrame(step);
};

// Desktop idle: only the sky drifts, at ~30fps.
const idle = (now: number) => {
  raf = 0;
  if (!starfield || !immersionActive() || document.hidden || !ambientDrift()) { lastDriftAt = 0; return; }
  if (now - lastStarDraw >= 33) drawStars(now);
  raf = requestAnimationFrame(idle);
};

const wake = () => {
  if (document.hidden) return;
  if (raf) cancelAnimationFrame(raf); // an idle frame may be queued: switch to physics
  raf = requestAnimationFrame(step);
};

// ── Inputs ───────────────────────────────────────────────────────────────────

// Neutral orientation adapts slowly to however the phone is being held.
const base = { beta: NaN, gamma: NaN };

const onOrientation = (e: DeviceOrientationEvent) => {
  if (e.beta == null || e.gamma == null) return;
  if (Number.isNaN(base.beta)) { base.beta = e.beta; base.gamma = e.gamma; }
  base.beta += (e.beta - base.beta) * 0.012;
  base.gamma += (e.gamma - base.gamma) * 0.012;

  const nx = clamp((e.gamma - base.gamma) / 18, -1, 1);
  const ny = clamp((e.beta - base.beta) / 18, -1, 1);
  // Dead zone on change, so sensor noise doesn't keep the loop awake.
  if (Math.abs(nx - tilt.tx) < 0.018 && Math.abs(ny - tilt.ty) < 0.018) return;
  tilt.tx = nx;
  tilt.ty = ny;
  wake();
};

const onPointerMove = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = true;
  tilt.tx = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1) * 0.6;
  tilt.ty = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1) * 0.6;
  wake();
};

const onPointerLeave = () => { pointer.active = false; tilt.tx = 0; tilt.ty = 0; wake(); };

let motionBound = false;
const bindMotion = (on: boolean) => {
  if (on === motionBound) return;
  motionBound = on;
  if (on) {
    window.addEventListener('deviceorientation', onOrientation);
    if (hoverCapable) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
    }
  } else {
    window.removeEventListener('deviceorientation', onOrientation);
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    base.beta = NaN;
    tilt.tx = 0; tilt.ty = 0; pointer.active = false;
    wake();
  }
};

const syncWithPrefs = () => {
  const prefs = getImmersionPrefs();
  const root = document.documentElement;
  const active = immersionActive();
  root.classList.toggle('lux-immersive', active);
  bindMotion(active && prefs.motion && !document.hidden);
  if (!active) { cam.x = cam.target; cam.v = 0; render(); }
};

export const startImmersion = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  applyPerfClass();
  syncWithPrefs();
  subscribeImmersionPrefs(syncWithPrefs);
  subscribePerf(() => { render(); wake(); });
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', syncWithPrefs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; lastFrame = 0; lastDriftAt = 0;
    }
    syncWithPrefs();
    wake();
  });
  window.addEventListener('resize', () => { render(); }, { passive: true });
};

// ── Registration (used by the world + sheen components) ──────────────────────

export const registerLayer = (el: HTMLElement, kind: LayerKind) => {
  const layer: Layer = { el, kind };
  layers.add(layer);
  render();
  return () => { layers.delete(layer); };
};

export const registerStarfield = (sf: Starfield) => {
  starfield = sf;
  render();
  wake();
  return () => { if (starfield === sf) starfield = null; };
};

export const registerSheen = (el: HTMLElement) => {
  sheens.add(el);
  render();
  return () => { sheens.delete(el); };
};

export const hasHoverPointer = hoverCapable;

/** Adaptive world → how bright the stars are (0..1) and how fast they drift. */
export const setSkyMood = (stars: number, energy: number) => {
  mood.stars = clamp(stars, 0.2, 1);
  mood.energy = clamp(energy, 0.2, 2);
  render();
};

// ── Scenes ───────────────────────────────────────────────────────────────────

// Every section has its own light. Touch, the sky light and the caret take it
// on, so each space feels slightly distinct while the theme stays the user's.
const SCENE_ACCENTS: Record<string, string> = {
  TASKS: '34 211 238',        // cyan
  HABITS: '251 146 60',       // ember
  FOCUS: '167 139 250',       // violet
  NOTES: '52 211 153',        // emerald
  FEED: '45 212 191',         // teal
  ACHIEVEMENTS: '250 204 21', // gold
  STORE: '251 191 36',        // amber
};

let accent = '';
const accentListeners = new Set<(rgb: string) => void>();

export const getSceneAccent = () => accent;

export const accentFor = (scene: string) => SCENE_ACCENTS[scene] || accent;

export const subscribeSceneAccent = (l: (rgb: string) => void) => {
  accentListeners.add(l);
  return () => { accentListeners.delete(l); };
};

export const setSceneAccent = (scene: string) => {
  const rgb = SCENE_ACCENTS[scene];
  if (!rgb || rgb === accent) return;
  accent = rgb;
  // One style recalc per navigation (never per frame).
  document.documentElement.style.setProperty('--lux-accent', rgb);
  accentListeners.forEach(l => l(rgb));
};

export const setScene = (index: number) => {
  if (!Number.isFinite(index) || index === cam.target) return;
  cam.target = index;
  if (!immersionActive()) { cam.x = index; cam.v = 0; render(); return; }
  wake();
};

// The main content scrolled; the sky follows with depth-scaled parallax.
export const setWorldScroll = (y: number) => {
  if (!Number.isFinite(y) || y === scroll.ty) return;
  scroll.ty = Math.max(0, y);
  if (!immersionActive()) return;
  wake();
};

export const hasArrived = () => arrived;

// Fires the "arrival" sequence on the world when the app finishes booting.
export const arrive = () => {
  const root = document.documentElement;
  arrived = true;
  window.dispatchEvent(new Event('lux:arrived'));
  if (!immersionActive()) return;
  root.classList.remove('lux-arriving');
  void root.offsetWidth; // restart the CSS animation
  root.classList.add('lux-arriving');
  window.setTimeout(() => root.classList.remove('lux-arriving'), 2200);
};

// ── Impact ───────────────────────────────────────────────────────────────────

// Resolves any CSS color (hex, rgb(), named) to "r,g,b" for canvas gradients.
let colorCtx: CanvasRenderingContext2D | null = null;
const toRgb = (color?: string) => {
  if (!color || color.includes('var(')) {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-glow').trim();
    return v.split(/[\s,]+/).slice(0, 3).join(',') || '99,102,241';
  }
  colorCtx = colorCtx || document.createElement('canvas').getContext('2d');
  if (!colorCtx) return '255,255,255';
  colorCtx.fillStyle = '#ffffff';
  colorCtx.fillStyle = color;
  const n = String(colorCtx.fillStyle);
  if (n.startsWith('#')) return [1, 3, 5].map(i => parseInt(n.slice(i, i + 2), 16)).join(',');
  const m = n.match(/[\d.]+/g);
  return m ? m.slice(0, 3).join(',') : '255,255,255';
};

// A shockwave of light that travels through the world behind the interface,
// from the point where something was achieved.
export const pulseWorld = (x: number, y: number, color?: string) => {
  if (!starfield || !immersionActive() || document.hidden) return;
  pulses.push({ x, y, rgb: toRgb(color), start: performance.now() });
  if (pulses.length > 4) pulses.shift();
  wake();
};

// ── Feedback ─────────────────────────────────────────────────────────────────

export const haptic = (pattern: number | number[]) => {
  if (!getImmersionPrefs().haptics) return;
  // Vibration needs a prior user gesture; programmatic navigations before the
  // first tap would only log a console error.
  const activation = (navigator as any).userActivation;
  if (activation && !activation.hasBeenActive) return;
  try { navigator.vibrate?.(pattern); } catch { /* not allowed yet */ }
};

export type WinkKind = 'bloom' | 'ping' | 'spark' | 'ripple' | 'sweep';

// Each kind of control answers with its own touch: a tick for icons, a double
// tick for switches, a firmer press for cards. Semantic haptics fired later by
// the app (task complete, streak…) replace these, since a new vibrate() call
// cancels the previous pattern.
const WINK_HAPTICS: Record<WinkKind, number | number[]> = {
  bloom: 9,
  ping: 6,
  spark: [7, 34, 10],
  ripple: 13,
  sweep: 6,
};

const WINK_PITCH: Record<WinkKind, number> = { bloom: 1, ping: 1.25, spark: 1.5, ripple: 0.8, sweep: 1.12 };

export const touchFeedback = (kind: WinkKind = 'bloom') => {
  haptic(WINK_HAPTICS[kind]);
  if (getImmersionPrefs().sound && immersionActive()) playTouch(WINK_PITCH[kind]);
};

type SceneKind = 'travel' | 'depth';

let transitionRunning = false;
let activeTransition: { skipTransition?: () => void } | null = null;

// While a view transition plays, the browser doesn't deliver taps to the real
// interface, so a quick second tap on the dock used to be lost. Any touch now
// fast-forwards the running transition to its end first; the tap's click
// (dispatched on release) then reaches the interface as usual.
//
// The press itself landed on the transition overlay, though, so when the
// finger lifts over a button the browser sends the click to their common
// ancestor (the root), not to the button. In that case the tap is delivered to
// the control under the finger by hand — only if the browser didn't.
const TAPPABLE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="menuitem"]';
let skipOnTouchBound = false;
const bindSkipOnTouch = () => {
  if (skipOnTouchBound || typeof window === 'undefined') return;
  skipOnTouchBound = true;
  let pendingTap: { x: number; y: number; id: number } | null = null;
  let awaiting: HTMLElement | null = null;

  window.addEventListener('pointerdown', e => {
    if (!activeTransition) return;
    pendingTap = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { activeTransition.skipTransition?.(); } catch { /* already finished */ }
  }, { capture: true, passive: true });

  window.addEventListener('pointerup', e => {
    const tap = pendingTap;
    pendingTap = null;
    if (!tap || e.pointerId !== tap.id) return;
    if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12) return; // a drag, not a tap
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest(TAPPABLE) as HTMLElement | null;
    if (!target || (target as HTMLButtonElement).disabled) return;
    awaiting = target;
    // The native click (if any) fires right after pointerup, before this frame.
    requestAnimationFrame(() => {
      if (awaiting === target) target.click();
      awaiting = null;
    });
  }, { capture: true, passive: true });

  window.addEventListener('click', e => {
    if (awaiting && e.isTrusted && e.target instanceof Node && awaiting.contains(e.target)) awaiting = null;
  }, { capture: true });
};

/**
 * Applies a navigation state change as a scene transition.
 *
 * Uses the View Transitions API when available: the old screen recedes while
 * the new one flies in from the direction of travel. The world background is
 * excluded from the snapshot so it keeps moving live underneath. Without
 * support (or with immersion off) the update is applied instantly, exactly as
 * before.
 */
export const runSceneTransition = (update: () => void, direction: number, kind: SceneKind = 'travel') => {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void>; skipTransition?: () => void } };
  const active = immersionActive();
  bindSkipOnTouch();

  // A navigation while another transition is still playing: finish that one
  // now instead of making the user wait for it.
  if (transitionRunning && activeTransition) {
    try { activeTransition.skipTransition?.(); } catch { /* ignore */ }
  }

  if (active) {
    haptic(kind === 'travel' ? 12 : 7);
    if (getImmersionPrefs().sound) playTravel(kind === 'travel' ? Math.sign(direction) : 0);
  }

  if (!active || !doc.startViewTransition || document.hidden) {
    update();
    return;
  }

  const root = document.documentElement;
  root.dataset.luxScene = kind === 'depth' ? 'depth' : direction >= 0 ? 'fwd' : 'back';
  root.classList.add('lux-vt');
  transitionRunning = true;

  let vt: { finished: Promise<void>; skipTransition?: () => void } | null = null;
  const cleanup = () => {
    if (activeTransition !== vt) return; // a newer transition owns the state now
    transitionRunning = false;
    activeTransition = null;
    root.classList.remove('lux-vt');
    delete root.dataset.luxScene;
  };

  try {
    vt = doc.startViewTransition(() => { flushSync(update); });
    activeTransition = vt;
    vt.finished.then(cleanup, cleanup);
  } catch {
    transitionRunning = false;
    activeTransition = null;
    root.classList.remove('lux-vt');
    delete root.dataset.luxScene;
    update();
  }
};
