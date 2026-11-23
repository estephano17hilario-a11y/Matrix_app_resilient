import { useEffect } from 'react';
import { getSceneAccent, touchFeedback, WinkKind } from './engine';
import { immersionActive } from './immersionPrefs';

// ─────────────────────────────────────────────────────────────────────────────
// WINKS — every interactive thing answers touch with light, in its own way.
//
// Nothing here touches the components themselves: on press, the touched
// control is found (real buttons/roles, or the app's `cursor-pointer` divs),
// classified by what it is, and a short light effect is drawn over it in a
// fixed overlay. The colour is the current section's accent, so the same
// gesture feels slightly different in each space.
//
//   ping    small icon buttons   → a ring radiating from the icon
//   spark   switches / checks    → a burst of sparks
//   ripple  cards, big areas     → light spreading inside the glass + lit rim
//   sweep   tabs, segments, rows → a band of light sliding across
//   bloom   everything else      → glow at the finger + lit rim
//
// All effects animate transform/opacity only (WAAPI) and remove themselves.
// They wait a beat before showing, like a native ripple, so starting a
// scroll on top of a control doesn't flash light everywhere.
// ─────────────────────────────────────────────────────────────────────────────

const INTERACTIVE = [
  'button', 'a[href]', 'select', 'summary', 'label', '.clickable',
  '[role="button"]', '[role="tab"]', '[role="switch"]', '[role="menuitem"]', '[role="option"]',
  '[role="checkbox"]', '[role="radio"]', 'input[type="checkbox"]', 'input[type="radio"]',
].join(',');

const PRESS_DELAY = 70;
// Outlines (the lit rim and the icon ring) stay at 5% of their original
// strength: a hint of an edge, almost invisible. The light itself stays.
const OUTLINE = 0.05;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

const isDisabled = (el: Element) =>
  (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true';

// The app marks clickable <div>s with `cursor-pointer`. `cursor` is inherited,
// so climb to the outermost ancestor that still reports a pointer: that's the
// element carrying the click handler.
const findControl = (target: EventTarget | null): Element | null => {
  if (!(target instanceof Element)) return null;
  const explicit = target.closest(INTERACTIVE);
  if (explicit) return isDisabled(explicit) ? null : explicit;
  if (getComputedStyle(target).cursor !== 'pointer') return null;
  let el: Element = target;
  for (let i = 0; i < 12; i++) {
    const parent = el.parentElement;
    if (!parent || parent === document.body || getComputedStyle(parent).cursor !== 'pointer') break;
    el = parent;
  }
  // A pointer cursor spanning most of the screen is a backdrop, not a control.
  const r = el.getBoundingClientRect();
  if (r.width * r.height > window.innerWidth * window.innerHeight * 0.6) return null;
  return el;
};

const isSegment = (el: Element, r: DOMRect) => {
  if (r.height > 52 || r.width > 220) return false;
  const parent = el.parentElement;
  if (!parent) return false;
  const peers = Array.from(parent.children).filter(c => c.tagName === el.tagName);
  if (peers.length < 2 || peers.length > 7) return false;
  const cs = getComputedStyle(parent);
  return (cs.display.includes('flex') && !cs.flexDirection.startsWith('column')) || cs.display.includes('grid');
};

const classify = (el: Element, r: DOMRect): WinkKind => {
  const role = el.getAttribute('role');
  const type = (el as HTMLInputElement).type;
  if (
    role === 'switch' || role === 'checkbox' || role === 'radio' ||
    type === 'checkbox' || type === 'radio' ||
    el.hasAttribute('aria-pressed') || el.hasAttribute('aria-checked')
  ) return 'spark';
  if (role === 'tab' || role === 'menuitem' || role === 'option' || isSegment(el, r)) return 'sweep';
  if (r.width <= 56 && r.height <= 56) return 'ping';
  // Wide rows, or tiles (grid cards are ~150px wide on a phone).
  if ((r.width >= 170 && r.height >= 56) || (r.width >= 110 && r.height >= 96)) return 'ripple';
  return 'bloom';
};

// ── Effect builders ──────────────────────────────────────────────────────────

let layer: HTMLDivElement | null = null;

const spawn = (className: string, style: Partial<CSSStyleDeclaration>, parent: HTMLElement = layer!) => {
  const el = document.createElement('span');
  el.className = className;
  Object.assign(el.style, style);
  parent.appendChild(el);
  return el;
};

const play = (el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions, removeTarget: HTMLElement = el) => {
  const anim = el.animate?.(frames, options);
  if (anim) anim.onfinish = () => removeTarget.remove();
  else window.setTimeout(() => removeTarget.remove(), Number(options.duration) || 600);
};

// Motion and light are animated separately: the shape travels fast and
// settles (ease-out) while the light holds for a moment, then dies away.
// One shared curve would make the light vanish as soon as it appears.
const glow = (el: HTMLElement, peak: number, duration: number, hold = 0.3) => {
  el.animate?.(
    [{ opacity: peak }, { opacity: peak * 0.9, offset: hold }, { opacity: 0 }],
    { duration, easing: 'cubic-bezier(0.4, 0, 0.9, 0.6)', fill: 'forwards' },
  );
};

const box = (r: DOMRect, radius: string) => ({
  left: `${r.left}px`,
  top: `${r.top}px`,
  width: `${r.width}px`,
  height: `${r.height}px`,
  borderRadius: radius,
});

// The control's outline lights up and breathes outward.
const rim = (r: DOMRect, radius: string, strength = 0.85) => {
  const el = spawn('lux-wink-rim', box(r, radius));
  glow(el, strength * OUTLINE, 520);
  play(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }], { duration: 520, easing: EASE_OUT });
};

const bloom = (x: number, y: number) => {
  const el = spawn('lux-touch', { left: `${x}px`, top: `${y}px` });
  play(el, [
    { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' },
    { transform: 'translate(-50%, -50%) scale(0.95)', opacity: 1, offset: 0.22, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)' },
    { transform: 'translate(-50%, -50%) scale(1.6)', opacity: 0 },
  ], { duration: 700, easing: 'linear' });
};

const ping = (r: DOMRect) => {
  const size = Math.max(r.width, r.height) + 6;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const ring = spawn('lux-wink-ring', { left: `${cx}px`, top: `${cy}px`, width: `${size}px`, height: `${size}px` });
  glow(ring, OUTLINE, 620);
  play(ring, [
    { transform: 'translate(-50%, -50%) scale(0.85)' },
    { transform: 'translate(-50%, -50%) scale(1.9)' },
  ], { duration: 620, easing: EASE_OUT });
  const core = spawn('lux-wink-core', { left: `${cx}px`, top: `${cy}px` });
  glow(core, 0.9, 380, 0.2);
  play(core, [
    { transform: 'translate(-50%, -50%) scale(0.4)' },
    { transform: 'translate(-50%, -50%) scale(1.3)' },
  ], { duration: 380, easing: EASE_OUT });
};

const spark = (r: DOMRect) => {
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const reach = Math.max(r.width, r.height) / 2 + 16;
  const count = 7;
  const turn = Math.random() * Math.PI;
  for (let i = 0; i < count; i++) {
    const a = turn + (i / count) * Math.PI * 2;
    const d = reach * (0.8 + Math.random() * 0.4);
    const dot = spawn('lux-wink-spark', { left: `${cx}px`, top: `${cy}px` });
    const duration = 560 + i * 12;
    glow(dot, 1, duration, 0.45);
    play(dot, [
      { transform: 'translate(-50%, -50%) translate(0px, 0px) scale(1)' },
      { transform: `translate(-50%, -50%) translate(${(Math.cos(a) * d).toFixed(1)}px, ${(Math.sin(a) * d).toFixed(1)}px) scale(0.25)` },
    ], { duration, easing: EASE_OUT });
  }
  ping(r);
};

const ripple = (r: DOMRect, radius: string, x: number, y: number) => {
  const clip = spawn('lux-wink-clip', box(r, radius));
  const reach = Math.hypot(Math.max(x - r.left, r.right - x), Math.max(y - r.top, r.bottom - y)) * 2;
  const wave = spawn('lux-wink-wave', {
    left: `${x - r.left}px`, top: `${y - r.top}px`, width: `${reach}px`, height: `${reach}px`,
  }, clip);
  glow(wave, 1, 820, 0.35);
  play(wave, [
    { transform: 'translate(-50%, -50%) scale(0.06)' },
    { transform: 'translate(-50%, -50%) scale(1)' },
  ], { duration: 820, easing: EASE_OUT }, clip);
  rim(r, radius, 0.6);
};

const sweep = (r: DOMRect, radius: string) => {
  const clip = spawn('lux-wink-clip', box(r, radius));
  const band = spawn('lux-wink-band', { width: `${Math.max(36, r.width * 0.55)}px` }, clip);
  play(band, [
    { transform: `translateX(-100%) skewX(-18deg)` },
    { transform: `translateX(${(r.width * 1.9).toFixed(0)}px) skewX(-18deg)` },
  ], { duration: 560, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' }, clip);
};

const wink = (kind: WinkKind, el: Element, x: number, y: number) => {
  if (!layer) return;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const radius = getComputedStyle(el).borderRadius || '12px';
  switch (kind) {
    case 'ping': ping(r); break;
    case 'spark': spark(r); break;
    case 'ripple': ripple(r, radius, x, y); break;
    case 'sweep': sweep(r, radius); break;
    default: bloom(x, y); rim(r, radius, 0.7);
  }
};

// ── Wiring ───────────────────────────────────────────────────────────────────

export const TouchLight = () => {
  useEffect(() => {
    layer = document.createElement('div');
    layer.className = 'lux-touch-layer';
    layer.setAttribute('aria-hidden', 'true');
    if (getSceneAccent()) layer.style.setProperty('--lux-accent', getSceneAccent());
    document.body.appendChild(layer);

    let timer = 0;
    let pending: { x: number; y: number; id: number; el: Element; kind: WinkKind } | null = null;
    let last: { el: Element; kind: WinkKind } | null = null;

    const flush = () => {
      window.clearTimeout(timer);
      if (pending) wink(pending.kind, pending.el, pending.x, pending.y);
      pending = null;
    };

    const onDown = (e: PointerEvent) => {
      if (!immersionActive() || e.button > 0) return;
      const el = findControl(e.target);
      if (!el) return;
      const kind = classify(el, el.getBoundingClientRect());
      last = { el, kind };
      pending = { x: e.clientX, y: e.clientY, id: e.pointerId, el, kind };
      window.clearTimeout(timer);
      if (e.pointerType === 'mouse') flush();
      else timer = window.setTimeout(flush, PRESS_DELAY);
    };

    const onMove = (e: PointerEvent) => {
      if (!pending || e.pointerId !== pending.id) return;
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 10) {
        pending = null;
        window.clearTimeout(timer);
      }
    };

    const onCancel = () => { pending = null; window.clearTimeout(timer); };

    // A quick tap releases before the delay elapses: show the light anyway.
    const onUp = () => { if (pending) flush(); };

    // Haptics/sound only on a confirmed tap, never on scroll starts.
    const onClick = (e: MouseEvent) => {
      if (!immersionActive()) return;
      const el = findControl(e.target);
      if (!el) return;
      const kind = last && last.el === el ? last.kind : classify(el, el.getBoundingClientRect());
      touchFeedback(kind);
    };

    document.addEventListener('pointerdown', onDown, { passive: true, capture: true });
    document.addEventListener('pointermove', onMove, { passive: true, capture: true });
    document.addEventListener('pointerup', onUp, { passive: true, capture: true });
    document.addEventListener('pointercancel', onCancel, { passive: true, capture: true });
    document.addEventListener('click', onClick, { capture: true });

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onDown, { capture: true });
      document.removeEventListener('pointermove', onMove, { capture: true });
      document.removeEventListener('pointerup', onUp, { capture: true });
      document.removeEventListener('pointercancel', onCancel, { capture: true });
      document.removeEventListener('click', onClick, { capture: true });
      layer?.remove();
      layer = null;
    };
  }, []);

  return null;
};
