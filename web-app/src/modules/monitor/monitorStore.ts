// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — tiny external store. Anything in the app can start the intro or
// a live guided script; <MonitorRoot/> renders whatever is active. The lightbulb
// ("foco") of every section starts that section's live tour.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';

export type SectionId = 'tasks' | 'habits' | 'focus' | 'notes' | 'routine' | 'store';
export type ScriptId =
  | 'tour'
  | 'create-task' | 'create-habit' | 'create-project' | 'create-note' | 'create-journal'
  | `live-${SectionId}`;

export type MonitorState =
  | { kind: 'idle' }
  | { kind: 'intro'; then: ScriptId }
  | { kind: 'script'; script: ScriptId; run: number }
  | { kind: 'widgets' };

let state: MonitorState = { kind: 'idle' };
let runCounter = 0;
const listeners = new Set<() => void>();
const set = (next: MonitorState) => { state = next; listeners.forEach(l => l()); };

export const SEEN_KEY = (uid: string) => `lux_monitor_seen_${uid}`;
/** The Android widgets showcase is offered once per device, right after a new user's tutorial. */
const WIDGETS_SEEN_KEY = 'lux_widgets_intro_seen';

/** The first-run tutorial is in progress (started by `intro`), and the user got to its last steps. */
let firstRun = false;
let reachedEnd = false;

const readFlag = (k: string) => { try { return localStorage.getItem(k) === 'true'; } catch { return false; } };
const writeFlag = (k: string) => { try { localStorage.setItem(k, 'true'); } catch { /* storage blocked */ } };

export const monitor = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  intro: (then: ScriptId = 'tour') => { firstRun = true; reachedEnd = false; set({ kind: 'intro', then }); },
  run: (script: ScriptId) => set({ kind: 'script', script, run: ++runCounter }),
  /** The lightbulb of a section: its live, dynamic tour (no screenshots). */
  openSection: (section: SectionId) => set({ kind: 'script', script: `live-${section}`, run: ++runCounter }),
  /** A first-run step that means "the tutorial is basically done" (the finale, or after creating something). */
  markEnd: () => { if (firstRun) reachedEnd = true; },
  /** Opens the Android widgets showcase right away (no checks). */
  widgets: () => set({ kind: 'widgets' }),
  /**
   * Closes whatever is open. When that was the end of a new user's tutorial, the Android widgets
   * showcase takes over (only on Android, only once).
   */
  close: () => {
    const wasFirstRun = firstRun && reachedEnd && state.kind !== 'widgets';
    // Whatever closes the guide ends the first-run tutorial (skipping it halfway must not leak into later tours).
    firstRun = false;
    reachedEnd = false;
    if (wasFirstRun && Capacitor.getPlatform() === 'android' && !readFlag(WIDGETS_SEEN_KEY)) {
      writeFlag(WIDGETS_SEEN_KEY);
      set({ kind: 'widgets' });
      return;
    }
    set({ kind: 'idle' });
  },
};

export const useMonitor = () => useSyncExternalStore(monitor.subscribe, monitor.get, monitor.get);

/** Navigates the dashboard to a view (handled in Dashboard). */
export const navigateTo = (view: string) => window.dispatchEvent(new CustomEvent('monitor:navigate', { detail: { view } }));
