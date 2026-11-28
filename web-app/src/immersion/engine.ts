import { flushSync } from 'react-dom';
import { getImmersionPrefs, immersionActive, subscribeImmersionPrefs } from './immersionPrefs';
import { playTouch, playTravel } from './spatialSound';
import { applyPerfClass, getPerfTier, reportFrame, subscribePerf } from './perf';
import type { Pulse, Starfield } from './starfield';
import { revealNow } from './reveal';

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

// Viewport size, cached. Reading window.innerWidth/innerHeight forces the browser to flush any pending
// style/layout work first; the frame loop read them every frame (right after React or an animation had
// dirtied the page), so each frame paid for a synchronous layout inside the rAF callback.
const viewport = { w: typeof window !== 'undefined' ? window.innerWidth : 0, h: typeof window !== 'undefined' ? window.innerHeight : 0 };
const syncViewport = () => { viewport.w = window.innerWidth; viewport.h = window.innerHeight; };

const hoverCapable = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Continuous ambient drift is a desktop luxury; phones stay idle when still.
const ambientDrift = () => hoverCapable && getPerfTier() === 0;

// ── Frame loop ───────────────────────────────────────────────────────────────

// The worker sky animates itself: it only needs to know where things are
// heading. Sent whenever a target changes (deduplicated in starfield.ts).
const pushSky = () => {
  if (!starfield?.drivesItself) return;
  const tiltFactor = getPerfTier() >= 2 ? 0 : 1;
  starfield.setInputs({
    camTarget: cam.target,
    width: viewport.w,
    tiltX: tilt.tx * tiltFactor,
    tiltY: tilt.ty * tiltFactor,
    scroll: scroll.ty,
    stars: mood.stars,
    energy: mood.energy,
    drift: ambientDrift(),
    halfRate: getPerfTier() >= 2,
    instant: !immersionActive(),
  });
};

const drawStars = (now = performance.now()) => {
  if (!starfield) return;
  if (starfield.drivesItself) { pushSky(); return; }
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
    travel: cam.x * viewport.w,
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
  const w = viewport.w;
  const h = viewport.h;

  // The sky is cheap to draw (sprites, see starfield.ts), so it moves at full
  // rate; only the minimal tier repaints it every other frame while nothing
  // but the hand moves it. Travel always runs at full rate.
  const onlyTilt = Math.abs(cam.v) < 0.002 && Math.abs(scroll.ty - scroll.y) < 0.3 && pulses.length === 0;
  const halfRate = onlyTilt && getPerfTier() >= 2;
  frameParity ^= 1;
  if (!(halfRate && frameParity)) drawStars(now);

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
    if (ambientDrift() && starfield && !starfield.drivesItself && immersionActive()) raf = requestAnimationFrame(idle);
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
  pushSky(); // the sky starts moving now, without waiting for a main-thread frame
  if (raf) cancelAnimationFrame(raf); // an idle frame may be queued: switch to physics
  raf = requestAnimationFrame(step);
};

// ── Inputs ───────────────────────────────────────────────────────────────────

// Neutral orientation adapts slowly to however the phone is being held.
const base = { beta: NaN, gamma: NaN };

// While a finger is on the glass (tapping, scrolling) the sky stops following
// the tilt, so every frame goes to the interface; it eases back afterwards.
let touchingUntil = 0;
const onTouchStart = () => { touchingUntil = Infinity; };
const onTouchEnd = () => { touchingUntil = performance.now() + 450; };

const onOrientation = (e: DeviceOrientationEvent) => {
  if (e.beta == null || e.gamma == null) return;
  if (performance.now() < touchingUntil) return;
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
  tilt.tx = clamp((e.clientX / viewport.w) * 2 - 1, -1, 1) * 0.6;
  tilt.ty = clamp((e.clientY / viewport.h) * 2 - 1, -1, 1) * 0.6;
  wake();
};

const onPointerLeave = () => { pointer.active = false; tilt.tx = 0; tilt.ty = 0; wake(); };

let motionBound = false;
const bindMotion = (on: boolean) => {
  if (on === motionBound) return;
  motionBound = on;
  if (on) {
    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
    if (hoverCapable) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
    }
  } else {
    window.removeEventListener('deviceorientation', onOrientation);
    window.removeEventListener('touchstart', onTouchStart, true);
    window.removeEventListener('touchend', onTouchEnd, true);
    window.removeEventListener('touchcancel', onTouchEnd, true);
    touchingUntil = 0;
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
  window.addEventListener('resize', () => { syncViewport(); render(); }, { passive: true });
  window.addEventListener('orientationchange', syncViewport, { passive: true });
  // Typing carries the section's colour: set on the field that gets focus,
  // instead of through a variable inherited from <html> (see setSceneAccent).
  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement | null;
    if (!accent || !t || !t.matches || !document.documentElement.classList.contains('lux-immersive')) return;
    if (t.matches('input, textarea, [contenteditable="true"]')) t.style.caretColor = `rgb(${accent})`;
  }, true);
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

let accentTimer = 0;

export const setSceneAccent = (scene: string) => {
  const rgb = SCENE_ACCENTS[scene];
  if (!rgb) return;
  window.clearTimeout(accentTimer);
  if (rgb === accent) return;
  const apply = () => {
    accent = rgb;
    // Custom properties inherit, so setting this on <html> made the browser
    // restyle every element on the page (a ~1000-element recalculation, ~40ms on
    // a desktop and several times that on a phone) on each section change. Only
    // the touch layer consumes it (the whisper and the caret get it below), so
    // it is set there and nowhere else.
    document.querySelectorAll<HTMLElement>('.lux-touch-layer').forEach(el => el.style.setProperty('--lux-accent', rgb));
    accentListeners.forEach(l => l(rgb));
  };
  if (!accent) apply();
  else accentTimer = window.setTimeout(apply, TRAVEL_MS);
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

// The app finished booting. (The sky no longer plays an entrance of its own:
// the boot is just the name fading, and the world is already there behind it.)
export const arrive = () => {
  arrived = true;
  window.dispatchEvent(new Event('lux:arrived'));
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
  if (starfield.drivesItself) { starfield.pulse(x, y, toRgb(color)); return; }
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

// Scene travel, built for phones. The section changes on the same tap (no
// snapshot of the screen is taken first, which is what made Android wait), and
// the new section glides in from the direction of travel while the sky moves.
// Only `transform` is animated, on the content alone: no opacity, filter or
// mask, so the dock and every frosted panel keep their blur the whole time and
// the section is complete from the first frame.
const TRAVEL_MS = 260;
const DEPTH_MS = 280;
let sceneAnim: Animation | null = null;

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const playArrival = (direction: number, kind: SceneKind) => {
  const scene = document.querySelector('[data-lux-scene]') as HTMLElement | null;
  if (!scene || typeof scene.animate !== 'function') return;
  sceneAnim?.cancel();
  if (kind === 'depth') {
    // A sub-section (Protocols ↔ Vices, Missions ↔ Strategy…) surfaces in place:
    // a soft fade with a hint of zoom around the centre of what is on screen
    // (the section can be much taller than the screen, so its own centre would
    // make the visible part drift). Nothing moves up or down.
    const r = scene.getBoundingClientRect();
    scene.style.transformOrigin = `50% ${(window.innerHeight / 2 - r.top).toFixed(0)}px`;
    sceneAnim = scene.animate(
      [{ opacity: 0.2, transform: 'scale(0.985)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: DEPTH_MS, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    );
  } else {
    const shift = Math.min(viewport.w || 412, 640) * 0.07 * (direction >= 0 ? 1 : -1);
    sceneAnim = scene.animate(
      [{ transform: `translate3d(${shift.toFixed(1)}px, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
      { duration: TRAVEL_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }
  const done = sceneAnim;
  done.onfinish = done.oncancel = () => { if (sceneAnim === done) sceneAnim = null; };
};

/**
 * Applies a navigation state change as a scene transition: the change is
 * committed synchronously (with everything in the new section revealed at
 * once), then the section glides in. With immersion off or reduced motion the
 * change is simply applied.
 */
export const runSceneTransition = (update: () => void, direction: number, kind: SceneKind = 'travel') => {
  const active = immersionActive();
  if (active) {
    haptic(kind === 'travel' ? 12 : 7);
    if (getImmersionPrefs().sound) playTravel(kind === 'travel' ? Math.sign(direction) : 0);
  }

  try { flushSync(update); } catch { update(); }
  revealNow(document.querySelector('[data-lux-stage]') || document);

  if (active && !reducedMotion() && !document.hidden) playArrival(direction, kind);
};
