// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION LAYER — mounted once inside the Dashboard.
//
// Watches the app's data instead of hooking every completion path: a habit
// whose history gains today's key, a quest/subtask that flips to completed or
// a new focus session is a completion. XP grants are deduplicated by id, so a
// sync or a complete/undo/complete cycle never pays twice.
// ─────────────────────────────────────────────────────────────────────────────

import React, { Suspense, useCallback, useEffect, useRef } from 'react';
import type { Habit, Project, Quest, Session } from '@/types';
import { toLocalISOString, parseLocalDate } from '@/utils/dateUtils';
import { dayEndsAt, getDayKey, type DayKey } from './engine';
import { generateReport } from './report';
import { focusBus } from './focusBus';
import { buildDayCloseInput, buildReportInput, isManualSession, sessionMinutes, type CompletionEvent } from './integration';
import { leaderboardService } from './leaderboardService';
import { progressionStore, useProgression, type CompletionLog } from './progressionStore';
import { CompletionReportSheet } from './ui/CompletionReportSheet';
import { CelebrationLayer } from './ui/CelebrationLayer';
import { FrameUnlocker } from './ui/FrameUnlocker';
import { rankStyle } from './ui/tokens';
import type { ProgressionTab } from './ui/ProgressionScreen';
import { XP_BASE } from './xpRules';
import { preloadable } from '@/utils/preloadable';
import { registerWarmup } from '@/utils/bootWarmup';
import './ui/progression.css';

// Preloadable: warmed up in idle time so opening the screen never waits on the chunk.
const ProgressionScreen = preloadable(() => import('./ui/ProgressionScreen').then(m => ({ default: m.ProgressionScreen })));
registerWarmup(() => ProgressionScreen.preload());

/** Completions older than this when detected are treated as synced, not live (no report). */
const LIVE_WINDOW_MS = 10 * 60_000;

interface Props {
  user: { id: string; createdAt?: number | null; displayName?: string | null; avatarId?: string | null } | null;
  habits: Habit[];
  quests: Quest[];
  projects: Project[];
  dataReady: boolean;
  screenOpen: boolean;
  screenTab?: ProgressionTab;
  onCloseScreen: () => void;
  onUpdateProject: (p: Project) => void;
  onOpenStore: () => void;
}

interface Seen {
  habits: Set<string>;
  quests: Set<string>;
  subtasks: Set<string>;
  sessions: Set<string>;
}

const snapshot = (habits: Habit[], quests: Quest[], projects: Project[]): Seen => ({
  habits: new Set(habits.flatMap(h => (h.history || []).map(d => `${h.id}:${toLocalISOString(parseLocalDate(d))}`))),
  quests: new Set(quests.filter(q => q.completed).map(q => q.id)),
  subtasks: new Set(quests.flatMap(q => (q.subtasks || []).filter(s => s.isCompleted).map(s => `${q.id}:${s.id}`))),
  sessions: new Set(projects.flatMap(p => (p.sessions || []).map(s => s.id))),
});

/** Timer minutes that belong to a progression day (respects the cut-off). */
const timerMinutesOn = (projects: Project[], dayKey: DayKey, cutoff: string) =>
  projects.flatMap(p => p.sessions || [])
    .filter(s => !isManualSession(s) && getDayKey(parseLocalDate(s.date), cutoff) === dayKey)
    .reduce((sum, s) => sum + sessionMinutes(s), 0);

export const ProgressionLayer: React.FC<Props> = ({ user, habits, quests, projects, dataReady, screenOpen, screenTab, onCloseScreen, onUpdateProject, onOpenStore }) => {
  const snap = useProgression();
  const data = useRef({ habits, quests, projects });
  data.current = { habits, quests, projects };
  const seen = useRef<Seen | null>(null);

  // The ranks screen chunk is requested at module load (see registerWarmup above). Once the
  // app is idle, also fetch the leaderboard so the first visit to Ranks already has rows.
  useEffect(() => {
    if (!snap.ready || !snap.userId) return;
    const t = window.setTimeout(() => {
      if (progressionStore.getSnapshot().leaderboard.status === 'IDLE') {
        progressionStore.refreshLeaderboard({ displayName: user?.displayName, avatarId: user?.avatarId }).catch(() => {});
      }
    }, 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.ready, snap.userId]);

  // 1. Load the user's progression.
  useEffect(() => {
    if (user?.id) progressionStore.init(user.id, { createdAt: user.createdAt ?? null });
  }, [user?.id, user?.createdAt]);

  // 2. Close finished days: when data is ready, on resume, and at the next cut-off.
  const closeDays = useCallback(() => {
    if (!dataReady || !progressionStore.getSnapshot().ready) return;
    const { meta } = progressionStore.getSnapshot();
    progressionStore.closePendingDays(day => buildDayCloseInput(day, { ...data.current, meta }));
  }, [dataReady]);

  useEffect(() => {
    if (!snap.ready || !dataReady) return;
    closeDays();
    const today = progressionStore.todayKey();
    const ms = Math.max(1000, dayEndsAt(today, snap.meta.dayCutoff).getTime() - Date.now() + 5000);
    const timer = setTimeout(closeDays, Math.min(ms, 2 ** 31 - 1));
    const onVisible = () => { if (document.visibilityState === 'visible') closeDays(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [snap.ready, dataReady, snap.meta.dayCutoff, snap.summary.lastClosedDay, closeDays]);

  // 2b. Today's projected ELO for the HUD (same figure as Ranks → Hoy). Recomputed whenever
  // the data or the engine changes; a day rollover also changes `lastClosedDay`.
  useEffect(() => {
    if (!snap.ready || !dataReady) return;
    const today = progressionStore.todayKey();
    const projection = progressionStore.project(buildDayCloseInput(today, { habits, quests, projects, meta: snap.meta }));
    progressionStore.setTodayProjected(projection.projectedTotal);
  }, [snap.ready, dataReady, habits, quests, projects, snap.meta, snap.engine]);

  // 3. Immediate focus ELO while the timer runs (+1 each time an hour is crossed).
  useEffect(() => focusBus.subscribe(live => {
    if (!live.running || !progressionStore.getSnapshot().ready) return;
    const { meta } = progressionStore.getSnapshot();
    const day = progressionStore.todayKey();
    progressionStore.awardFocusMinutes(day, timerMinutesOn(data.current.projects, day, meta.dayCutoff) + live.elapsedSeconds / 60);
  }), []);

  // 4. Completion handling.
  const handle = useCallback((ev: CompletionEvent, opts: { live: boolean; manual?: boolean }) => {
    const store = progressionStore.getSnapshot();
    if (!store.ready) return;
    const { meta } = store;
    const dayKey = ev.dayKey;
    // Completions from before the system was enabled (late syncs) never pay XP/ELO.
    if (dayKey < (store.engine.startDayKey ?? store.engine.registeredDayKey)) return;
    const progressBefore = store.standing.progress ?? 0;

    const xpId = ev.kind === 'HABIT' ? `habit:${ev.itemId}:${toLocalISOString(new Date(ev.at))}` : `${ev.kind.toLowerCase()}:${ev.itemId}`;
    const base = ev.kind === 'FOCUS' ? Math.floor(sessionMinutes(ev.session as Session)) * XP_BASE.FOCUS : XP_BASE[ev.kind];
    const xp = progressionStore.awardXp({ id: xpId, dayKey, at: ev.at, source: ev.kind, base, ref: ev.itemId });

    let eloInstant = 0;
    if (ev.kind === 'FOCUS' && !opts.manual) {
      const live = focusBus.finish(ev.project?.id ?? null);
      ev.plannedMinutes = live?.plannedSeconds ? live.plannedSeconds / 60 : null;
      ev.pauses = live?.pauses ?? 0;
      progressionStore.awardFocusMinutes(dayKey, timerMinutesOn(data.current.projects, dayKey, meta.dayCutoff));
      // Focus ELO earned during this session, including hours granted live while it ran.
      const sessionStart = ev.at - sessionMinutes(ev.session as Session) * 60_000 - 1000;
      eloInstant = progressionStore.getSnapshot().engine.events
        .filter(e => e.dayKey === dayKey && e.source === 'FOCUS' && e.at >= sessionStart)
        .reduce((s, e) => s + e.amount, 0);
    }

    const after = progressionStore.getSnapshot();
    const projection = progressionStore.project(buildDayCloseInput(dayKey, { ...data.current, meta }));
    const log: CompletionLog = {
      id: xpId,
      kind: ev.kind,
      itemId: ev.itemId,
      itemName: ev.itemName,
      projectId: ev.project?.id ?? null,
      at: ev.at,
      dayKey,
      minutes: ev.session ? Math.round(sessionMinutes(ev.session)) : null,
      plannedMinutes: ev.plannedMinutes ?? null,
      pauses: ev.pauses ?? null,
      manual: !!opts.manual,
      rating: null,
      note: null,
      eloDelta: eloInstant,
      xp,
    };

    if (!opts.live || opts.manual || !meta.reportsEnabled || document.visibilityState !== 'visible' || after.pendingReport) {
      progressionStore.addLog(log);
      return;
    }

    const input = buildReportInput(ev, {
      ...data.current,
      engine: after.engine,
      meta,
      logs: after.logs,
      eloInstant,
      projectedDay: projection.projectedTotal,
      elo: after.summary.elo,
      rankIndex: after.summary.rankIndex,
      xp,
      userName: user?.displayName,
    });
    const report = generateReport(input);
    const fullLog = { ...log, metrics: report.metrics.map(m => ({ label: m.label, display: m.display })), narrative: report.narrative };
    progressionStore.addLog(fullLog);
    progressionStore.showReport({ log: fullLog, report, eloInstant, projectedDay: projection.projectedTotal, xp, standing: after.standing, progressBefore });
  }, [user?.displayName]);

  useEffect(() => {
    if (!dataReady || !snap.ready) return;
    const next = snapshot(habits, quests, projects);
    const prev = seen.current;
    seen.current = next;
    if (!prev) return; // first hydrated snapshot: nothing is "new"

    const now = Date.now();
    const dayKey = progressionStore.todayKey();
    const todayCal = toLocalISOString(new Date());
    const events: { ev: CompletionEvent; live: boolean; manual?: boolean }[] = [];

    for (const h of habits) {
      const key = `${h.id}:${todayCal}`;
      if (next.habits.has(key) && !prev.habits.has(key)) {
        events.push({ ev: { kind: 'HABIT', itemId: h.id, itemName: h.title, at: now, dayKey, habit: h }, live: true });
      }
    }
    for (const q of quests) {
      if (q.completed && !prev.quests.has(q.id)) {
        const at = q.completedAt ? parseLocalDate(q.completedAt).getTime() : now;
        events.push({ ev: { kind: 'TASK', itemId: q.id, itemName: q.title, at: Math.min(at, now), dayKey: getDayKey(Math.min(at, now), snap.meta.dayCutoff), quest: q }, live: now - at < LIVE_WINDOW_MS });
      }
      for (const s of q.subtasks || []) {
        const key = `${q.id}:${s.id}`;
        if (s.isCompleted && !prev.subtasks.has(key)) {
          events.push({ ev: { kind: 'SUBTASK', itemId: s.id, itemName: s.title, at: now, dayKey, quest: q }, live: true });
        }
      }
    }
    for (const p of projects) {
      for (const s of p.sessions || []) {
        if (prev.sessions.has(s.id)) continue;
        const at = parseLocalDate(s.date).getTime();
        events.push({
          ev: { kind: 'FOCUS', itemId: s.id, itemName: p.title, at, dayKey: getDayKey(at, snap.meta.dayCutoff), session: s, project: p },
          live: now - at < LIVE_WINDOW_MS,
          manual: isManualSession(s),
        });
      }
    }

    // Only the last live completion of a batch gets a report; the rest just log XP.
    events.forEach((e, i) => handle(e.ev, { ...e, live: e.live && i === events.length - 1 }));
  }, [habits, quests, projects, dataReady, snap.ready, snap.meta.dayCutoff, handle]);

  // 5. Publish the public leaderboard row (debounced) when ELO changes.
  useEffect(() => {
    if (!snap.ready || !snap.userId) return;
    const timer = setTimeout(() => {
      leaderboardService.publish({
        user_id: snap.userId as string,
        display_name: user?.displayName ?? null,
        avatar_id: user?.avatarId ?? null,
        elo: snap.summary.elo,
        rank_index: snap.summary.rankIndex,
        level: snap.level.level,
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, [snap.ready, snap.userId, snap.summary.elo, snap.summary.rankIndex, snap.level.level, user?.displayName, user?.avatarId]);

  return (
    <>
      <div className="prog-rank-tint" style={{ ...rankStyle(snap.standing.rankIndex), zIndex: 5 }} aria-hidden="true" />
      <CompletionReportSheet />
      <CelebrationLayer />
      <FrameUnlocker />
      {screenOpen && (
        <Suspense fallback={null}>
          <ProgressionScreen
            open={screenOpen}
            initialTab={screenTab}
            onClose={onCloseScreen}
            habits={habits}
            quests={quests}
            projects={projects}
            userName={user?.displayName}
            avatarId={user?.avatarId}
            onUpdateProject={onUpdateProject}
            onOpenStore={onOpenStore}
          />
        </Suspense>
      )}
    </>
  );
};
