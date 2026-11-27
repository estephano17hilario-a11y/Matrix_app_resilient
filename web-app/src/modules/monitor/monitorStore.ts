// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — tiny external store. Anything in the app can start the intro,
// a live guided script, a section sheet (lightbulb button) or the screenshot
// gallery; <MonitorRoot/> renders whatever is active.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

export type SectionId = 'tasks' | 'habits' | 'focus' | 'notes' | 'routine' | 'store';
export type ScriptId =
  | 'tour'
  | 'create-task' | 'create-habit' | 'create-project' | 'create-note' | 'create-journal'
  | `live-${SectionId}`;

export type MonitorState =
  | { kind: 'idle' }
  | { kind: 'intro'; then: ScriptId }
  | { kind: 'script'; script: ScriptId; run: number }
  | { kind: 'sheet'; section: SectionId }
  | { kind: 'gallery'; section: SectionId };

let state: MonitorState = { kind: 'idle' };
let runCounter = 0;
const listeners = new Set<() => void>();
const set = (next: MonitorState) => { state = next; listeners.forEach(l => l()); };

export const SEEN_KEY = (uid: string) => `lux_monitor_seen_${uid}`;

export const monitor = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  intro: (then: ScriptId = 'tour') => set({ kind: 'intro', then }),
  run: (script: ScriptId) => set({ kind: 'script', script, run: ++runCounter }),
  openSection: (section: SectionId) => set({ kind: 'sheet', section }),
  gallery: (section: SectionId) => set({ kind: 'gallery', section }),
  close: () => set({ kind: 'idle' }),
};

export const useMonitor = () => useSyncExternalStore(monitor.subscribe, monitor.get, monitor.get);

/** Navigates the dashboard to a view (handled in Dashboard). */
export const navigateTo = (view: string) => window.dispatchEvent(new CustomEvent('monitor:navigate', { detail: { view } }));
