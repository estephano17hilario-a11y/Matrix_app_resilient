// Starfield: one viewport-sized canvas, drawn as star sprites (starRenderer.ts).
//
// Where OffscreenCanvas is available the sky is drawn in a Web Worker: the
// main thread only posts the camera each frame, so a heavy React render on a
// tap never makes the sky stutter, and drawing the sky never delays a tap.
// Elsewhere the same renderer runs on the main thread.

import { createStarRenderer, type StarFieldSpec, type StarView, type Pulse } from './starRenderer';
import type { SkyInputs } from './starfield.worker';

export type { StarFieldSpec, StarView, Pulse, SkyInputs };

export interface Starfield {
  /** True when the sky animates itself (worker): feed it targets, not frames. */
  drivesItself: boolean;
  /** Main-thread path: draw this frame. */
  draw: (view: StarView) => void;
  /** Worker path: where the camera, hand and scroll should go. */
  setInputs: (inputs: SkyInputs) => void;
  /** Worker path: an impact shockwave starting now. */
  pulse: (x: number, y: number, rgb: string) => void;
}

// A canvas can be handed to a worker only once; its worker is kept with it so
// a theme change (new tint) just re-seeds the same worker.
const workers = new WeakMap<HTMLCanvasElement, Worker>();

const canUseWorker = (canvas: HTMLCanvasElement) =>
  typeof Worker !== 'undefined' &&
  typeof OffscreenCanvas !== 'undefined' &&
  (workers.has(canvas) || typeof canvas.transferControlToOffscreen === 'function');

const pickDpr = () => {
  // Render at (almost) the screen's real density so every star is a crisp
  // point; capped to keep memory sane on ~3x displays.
  const touch = !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  return Math.min(window.devicePixelRatio || 1, touch ? 2 : 2.25);
};

const workerStarfield = (canvas: HTMLCanvasElement, specs: StarFieldSpec[], tint: string): Starfield | null => {
  let worker = workers.get(canvas);
  if (!worker) {
    try {
      // Worker first: if it can't start, the canvas is still ours to draw on.
      worker = new Worker(new URL('./starfield.worker.ts', import.meta.url), { type: 'module' });
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'canvas', canvas: offscreen }, [offscreen]);
      workers.set(canvas, worker);
    } catch {
      worker?.terminate();
      return null;
    }
  }
  const w = worker;
  const dpr = pickDpr();
  let width = window.innerWidth;
  let height = window.innerHeight;
  w.postMessage({ type: 'size', width, height });
  w.postMessage({ type: 'setup', specs, tint, dpr });

  const syncSize = () => {
    if (window.innerWidth === width && window.innerHeight === height) return;
    width = window.innerWidth;
    height = window.innerHeight;
    w.postMessage({ type: 'size', width, height });
  };
  let last = '';

  return {
    drivesItself: true,
    draw: (view: StarView) => { syncSize(); w.postMessage({ type: 'draw', view }); },
    setInputs: (inputs: SkyInputs) => {
      syncSize();
      // Only changes cross the thread boundary.
      const key = JSON.stringify(inputs);
      if (key === last) return;
      last = key;
      w.postMessage({ type: 'inputs', inputs });
    },
    pulse: (x: number, y: number, rgb: string) => { w.postMessage({ type: 'pulse', x, y, rgb }); },
  };
};

const mainThreadStarfield = (canvas: HTMLCanvasElement, specs: StarFieldSpec[], tint: string): Starfield => {
  const ctx = canvas.getContext('2d');
  const dpr = pickDpr();
  const renderer = ctx ? createStarRenderer(ctx, (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }, specs, tint, dpr) : null;

  return {
    drivesItself: false,
    setInputs: () => {},
    pulse: () => {},
    draw: (view: StarView) => {
      if (!renderer) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      renderer.draw(view, width, height);
    },
  };
};

export const createStarfield = (canvas: HTMLCanvasElement, specs: StarFieldSpec[], tint: string): Starfield =>
  (canUseWorker(canvas) && workerStarfield(canvas, specs, tint)) || mainThreadStarfield(canvas, specs, tint);

/** Stops the sky worker of a canvas that has left the page. */
export const releaseStarfield = (canvas: HTMLCanvasElement) => {
  const w = workers.get(canvas);
  if (!w) return;
  w.terminate();
  workers.delete(canvas);
};
