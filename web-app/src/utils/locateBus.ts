// ─────────────────────────────────────────────────────────────────────────────
// LOCATE BUS — "take me to that item and flash it".
//
// The Routine section lists habits, subtasks and tasks that live in other
// sections. Tapping a card there asks the destination section (Habits / Tasks)
// to reveal the item: the request waits here until that section is active, then
// the section opens/expands whatever is needed, scrolls to the item and flashes it.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export type LocateKind = 'HABIT' | 'TASK';

export interface LocateTarget {
  kind: LocateKind;
  id: string;
  /** Habit checklist item to open inside the habit. */
  subtaskId?: string;
  nonce: number;
}

let pending: LocateTarget | null = null;
let seq = 0;
const listeners = new Set<() => void>();

export const locateBus = {
  request(target: Omit<LocateTarget, 'nonce'>) {
    pending = { ...target, nonce: ++seq };
    listeners.forEach(l => l());
  },
  /** Takes the pending request if it is for `kind` (it is delivered only once). */
  consume(kind: LocateKind): LocateTarget | null {
    if (pending?.kind !== kind) return null;
    const t = pending;
    pending = null;
    return t;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

/**
 * Returns the active locate target for `kind` while that section is `active`.
 * The target is cleared automatically after `ttl` ms (long enough for the flash).
 */
export const useLocateTarget = (kind: LocateKind, active: boolean, ttl = 3600): LocateTarget | null => {
  const [target, setTarget] = useState<LocateTarget | null>(null);

  useEffect(() => {
    if (!active) return;
    const take = () => {
      const t = locateBus.consume(kind);
      if (t) setTarget(t);
    };
    take();
    return locateBus.subscribe(take);
  }, [kind, active]);

  useEffect(() => {
    if (!target) return;
    const id = window.setTimeout(() => setTarget(cur => (cur === target ? null : cur)), ttl);
    return () => window.clearTimeout(id);
  }, [target, ttl]);

  return target;
};

/**
 * Scrolls the first element matching one of `selectors` (in order of preference) to the
 * middle of the screen and flashes it. Retries while the section is still laying out.
 * Returns a cancel function.
 */
export const revealAndFlash = (selectors: string[], delayMs = 320): (() => void) => {
  let cancelled = false;
  let tries = 0;
  const timers: number[] = [];

  const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };

  const find = (): HTMLElement | null => {
    for (const s of selectors) {
      const el = document.querySelector<HTMLElement>(s);
      if (el && el.getClientRects().length > 0) return el;
    }
    return null;
  };

  const attempt = () => {
    if (cancelled) return;
    const el = find();
    if (!el) {
      if (tries++ < 25) later(attempt, 90);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Let the scroll settle a moment so the flash is seen where the item ends up.
    later(() => {
      if (cancelled) return;
      el.classList.remove('lux-locate-flash');
      void el.offsetWidth; // restart the animation if it was already running
      el.classList.add('lux-locate-flash');
      later(() => el.classList.remove('lux-locate-flash'), 2800);
    }, 260);
  };

  later(attempt, delayMs);
  return () => { cancelled = true; timers.forEach(t => window.clearTimeout(t)); };
};
