// Tiny bridge between the focus timer (useFocusSession) and the progression
// layer: live elapsed time for immediate ELO, pause count and planned length
// for the completion report. No React, no persistence.

export interface LiveFocus {
  projectId: string;
  /** Planned length of the current segment (POMO), null for the stopwatch. */
  plannedSeconds: number | null;
  pauses: number;
  /** Elapsed seconds of the running segment. */
  elapsedSeconds: number;
  running: boolean;
}

type Listener = (live: LiveFocus) => void;

let live: LiveFocus | null = null;
const listeners = new Set<Listener>();

const notify = () => { if (live) listeners.forEach(l => l(live as LiveFocus)); };

export const focusBus = {
  start(projectId: string, plannedSeconds: number | null) {
    // Resuming after a pause keeps the same segment.
    if (live && live.projectId === projectId && !live.running) {
      live = { ...live, running: true };
    } else {
      live = { projectId, plannedSeconds, pauses: 0, elapsedSeconds: 0, running: true };
    }
    notify();
  },
  pause(projectId: string) {
    if (!live || live.projectId !== projectId || !live.running) return;
    live = { ...live, pauses: live.pauses + 1, running: false };
    notify();
  },
  tick(projectId: string, elapsedSeconds: number) {
    if (!live || live.projectId !== projectId) live = { projectId, plannedSeconds: null, pauses: 0, elapsedSeconds, running: true };
    if (Math.floor(elapsedSeconds / 60) === Math.floor(live.elapsedSeconds / 60) && live.running) {
      live.elapsedSeconds = elapsedSeconds;
      return;
    }
    live = { ...live, elapsedSeconds, running: true };
    notify();
  },
  /** Returns and clears the segment info (called when a session is recorded). */
  finish(projectId: string | null): LiveFocus | null {
    const current = live && (!projectId || live.projectId === projectId) ? live : null;
    if (current) live = null;
    return current;
  },
  stop() {
    live = null;
  },
  get: () => live,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};
