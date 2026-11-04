/// <reference lib="webworker" />
// Sky worker: owns the whole sky, off the main thread.
//
// The main thread only sends *targets* when they change (which scene the
// camera travels to, the hand's tilt, the content scroll, the day's mood, an
// impact pulse). The camera physics, easing and drawing all run here, in the
// worker's own animation frames, so the sky keeps gliding at 60fps even while
// the main thread is busy rendering the section that was just opened.
import { createStarRenderer, type StarFieldSpec, type StarView } from './starRenderer';

export interface SkyInputs {
  camTarget: number;     // scene index the camera travels to
  width: number;         // viewport width (CSS px), travel is measured in widths
  tiltX: number;         // -1..1 target
  tiltY: number;
  scroll: number;        // content scroll target (px)
  stars: number;         // brightness 0..1
  energy: number;        // drift speed factor
  drift: boolean;        // ambient drift (desktop)
  halfRate: boolean;     // minimal tier: repaint every other frame when calm
  instant: boolean;      // immersion off: jump, don't animate
}

type Msg =
  | { type: 'canvas'; canvas: OffscreenCanvas }
  | { type: 'setup'; specs: StarFieldSpec[]; tint: string; dpr: number }
  | { type: 'size'; width: number; height: number }
  | { type: 'inputs'; inputs: SkyInputs }
  | { type: 'pulse'; x: number; y: number; rgb: string }
  | { type: 'draw'; view: StarView };   // main-thread-driven fallback frame

const scope = self as unknown as DedicatedWorkerGlobalScope;
const raf: (cb: (t: number) => void) => void =
  typeof scope.requestAnimationFrame === 'function'
    ? cb => { scope.requestAnimationFrame(cb); }
    : cb => { setTimeout(() => cb(performance.now()), 16); };

const PULSE_MS = 1700;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let renderer: ReturnType<typeof createStarRenderer> | null = null;
let dpr = 1;
let width = 0;
let height = 0;

// Same physics as the engine (engine.ts), so the sky and the DOM layers agree.
const cam = { x: 0, v: 0, target: 0 };
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
const scroll = { y: 0, ty: 0 };
let travelWidth = 0;
let mood = { stars: 1, energy: 1 };
let drift = false;
let halfRate = false;
let driftTime = 0;
let pulses: { x: number; y: number; rgb: string; start: number }[] = [];
let primed = false;

let running = false;
let lastFrame = 0;
let parity = 0;
let dirty = true;

// Resizing a canvas clears it, so only resize when the size really changes
// (a theme change re-seeds the sky with the same size: it must not blink).
const fitCanvas = () => {
  if (!canvas || !width) return;
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
};

const paint = (now: number) => {
  if (!renderer) return;
  pulses = pulses.filter(p => now - p.start < PULSE_MS);
  renderer.draw({
    travel: cam.x * travelWidth,
    tiltX: tilt.x,
    tiltY: tilt.y,
    scroll: scroll.y,
    speed: Math.abs(cam.v),
    time: drift ? driftTime : 0,
    brightness: mood.stars,
    pulses: pulses.map(p => ({ x: p.x, y: p.y, rgb: p.rgb, t: (now - p.start) / PULSE_MS })),
  }, width, height);
};

const frame = (now: number) => {
  const elapsed = lastFrame ? now - lastFrame : 0;
  const dt = Math.min(elapsed / 1000, 1 / 24) || 1 / 60;
  lastFrame = now;

  // Slightly under-damped spring: the camera arrives with a hint of settle.
  const a = 70 * (cam.target - cam.x) - 15 * cam.v;
  cam.v += a * dt;
  cam.x += cam.v * dt;
  const follow = 1 - Math.pow(0.0009, dt);
  tilt.x += (tilt.tx - tilt.x) * follow;
  tilt.y += (tilt.ty - tilt.y) * follow;
  scroll.y += (scroll.ty - scroll.y) * Math.min(1, follow * 1.6);
  if (drift) driftTime += dt * mood.energy;

  const settled =
    Math.abs(cam.target - cam.x) < 0.0008 && Math.abs(cam.v) < 0.002 &&
    Math.abs(tilt.tx - tilt.x) < 0.002 && Math.abs(tilt.ty - tilt.y) < 0.002 &&
    Math.abs(scroll.ty - scroll.y) < 0.3 && pulses.length === 0;
  if (settled) { cam.x = cam.target; cam.v = 0; tilt.x = tilt.tx; tilt.y = tilt.ty; scroll.y = scroll.ty; }

  // Desktop idle drift runs at ~30fps and the minimal tier halves calm frames;
  // everything else (travel, pulses) paints every frame.
  const calm = Math.abs(cam.v) < 0.002 && pulses.length === 0;
  parity ^= 1;
  const skip = parity === 1 && calm && (halfRate || (drift && settled));
  const stopping = settled && !drift;
  if (!skip || dirty || stopping) {
    paint(now);
    dirty = false;
  }

  if (stopping) { running = false; lastFrame = 0; return; }
  raf(frame);
};

const wake = () => {
  dirty = true;
  if (running || !renderer || !width) return;
  running = true;
  raf(frame);
};

scope.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  switch (m.type) {
    case 'canvas':
      canvas = m.canvas;
      ctx = canvas.getContext('2d');
      break;
    case 'setup':
      if (!ctx) return;
      dpr = m.dpr;
      renderer = createStarRenderer(ctx, (w, h) => new OffscreenCanvas(w, h), m.specs, m.tint, dpr);
      fitCanvas();
      // Repaint right away with the new tint: no empty frame in between.
      if (primed) paint(performance.now());
      wake();
      break;
    case 'size':
      width = m.width;
      height = m.height;
      fitCanvas();
      wake();
      break;
    case 'inputs': {
      const i = m.inputs;
      travelWidth = i.width;
      cam.target = i.camTarget;
      tilt.tx = i.tiltX;
      tilt.ty = i.tiltY;
      scroll.ty = i.scroll;
      mood = { stars: i.stars, energy: i.energy };
      drift = i.drift;
      halfRate = i.halfRate;
      // The first inputs place the camera; later ones are travelled to.
      if (i.instant || !primed) {
        cam.x = cam.target; cam.v = 0;
        tilt.x = tilt.tx; tilt.y = tilt.ty;
        scroll.y = scroll.ty;
        primed = true;
      }
      wake();
      break;
    }
    case 'pulse':
      pulses.push({ x: m.x, y: m.y, rgb: m.rgb, start: performance.now() });
      wake();
      break;
    case 'draw':
      // Main-thread-driven frame (kept for compatibility).
      if (renderer) renderer.draw(m.view, width, height);
      break;
  }
};
