// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION STORE — the one place the app talks to the pure engine.
//
// · Holds the event-sourced engine state, settings (meta) and completion logs.
// · Persists locally (instant boot) and to user_collections:
//     progressionDays/<dayKey>   events + xp + close record + shield of that day
//     progressionMeta/meta       settings + report memory
//     completionLogs/<id>        one per completion (rating, note, metrics)
//   Docs from several devices are merged by event id, so nothing is applied twice.
// · Exposes a React hook through useSyncExternalStore (no provider needed).
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import { completionLogService, progressionDayService, progressionMetaService } from '@/services/persistenceService';
import {
  PROGRESSION_CONFIG, availableEarnedShields, awardFocus, awardXp, boostReward, closeDay, compareStandings,
  createProgressionState, getDayKey, getStanding, levelFromXp, pendingDays, projectDay, replay, requestShield,
  totalXp, type DayCloseInput, type DayKey, type DayProjection, type EloEvent, type LevelInfo,
  type ProgressionState, type ProgressionSummary, type ShieldSource, type Standing, type XpGrant,
} from './engine';
import { emptyMemory, rememberReport, type CompletionKind, type CompletionReport, type ReportMemory } from './report';
import { leaderboardService, type LeaderboardRow } from './leaderboardService';

export interface ProgressionMeta {
  id: 'meta';
  registeredDayKey: DayKey;
  startDayKey: DayKey;
  habitGoalPct: number;
  dayCutoff: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reportsEnabled: boolean;
  appearance: 'DARK' | 'LIGHT' | 'SYSTEM';
  /** Rank index of the HUD avatar frame the user equipped (owned in the inventory); null = no frame. */
  equippedFrame?: number | null;
  memory: ReportMemory;
  weeklyMemory: ReportMemory;
  updatedAt: number;
}

export interface CompletionLog {
  id: string;
  kind: CompletionKind;
  itemId: string;
  itemName: string;
  projectId?: string | null;
  at: number;
  dayKey: DayKey;
  minutes?: number | null;
  plannedMinutes?: number | null;
  pauses?: number | null;
  manual?: boolean;
  rating?: number | null;
  note?: string | null;
  eloDelta: number;
  xp: number;
  metrics?: { label: string; display: string }[];
  narrative?: string;
  journalEntryId?: string | null;
}

export interface PendingReport {
  log: CompletionLog;
  report: CompletionReport;
  eloInstant: number;
  projectedDay: number;
  xp: number;
  standing: Standing;
  /** Fill of the division bar before this completion (0..1). */
  progressBefore: number;
}

export type Celebration = { kind: 'DIVISION_UP' | 'RANK_UP'; standing: Standing; at: number };

export type LeaderboardState =
  | { status: 'IDLE' } | { status: 'LOADING' } | { status: 'UNAVAILABLE' }
  | { status: 'READY'; rows: LeaderboardRow[]; myPosition: number | null; legendPosition: number | null; fetchedAt: number };

export interface ProgressionSnapshot {
  userId: string | null;
  ready: boolean;
  engine: ProgressionState;
  meta: ProgressionMeta;
  logs: CompletionLog[];
  summary: ProgressionSummary;
  standing: Standing;
  totalXp: number;
  level: LevelInfo;
  earnedShieldsAvailable: number;
  pendingReport: PendingReport | null;
  celebration: Celebration | null;
  leaderboard: LeaderboardState;
}

const LOCAL_KEY = (uid: string) => `matrix_progression_v1_${uid}`;
const MAX_LOCAL_LOGS = 600;
const SAVE_DELAY_MS = 1500;

const defaultMeta = (registeredDayKey: DayKey, startDayKey: DayKey): ProgressionMeta => ({
  id: 'meta',
  registeredDayKey,
  startDayKey,
  habitGoalPct: PROGRESSION_CONFIG.ELO.HABIT_GOAL_DEFAULT_PCT,
  dayCutoff: PROGRESSION_CONFIG.DAY_CUTOFF,
  soundEnabled: false,
  hapticsEnabled: true,
  reportsEnabled: true,
  appearance: 'DARK',
  memory: emptyMemory(),
  weeklyMemory: emptyMemory(),
  updatedAt: 0,
});

const derive = (engine: ProgressionState) => {
  const summary = replay(engine);
  const xp = totalXp(engine);
  return {
    summary,
    standing: getStanding(summary.elo, summary.rankIndex),
    totalXp: xp,
    level: levelFromXp(xp),
    earnedShieldsAvailable: availableEarnedShields(engine),
  };
};

const blankEngine = () => createProgressionState(getDayKey(Date.now()));
let snap: ProgressionSnapshot = {
  userId: null,
  ready: false,
  engine: blankEngine(),
  meta: defaultMeta(getDayKey(Date.now()), getDayKey(Date.now())),
  logs: [],
  pendingReport: null,
  celebration: null,
  leaderboard: { status: 'IDLE' },
  ...derive(blankEngine()),
};

const listeners = new Set<() => void>();
const set = (patch: Partial<ProgressionSnapshot>) => {
  snap = { ...snap, ...patch };
  listeners.forEach(l => l());
};

// ── Persistence ─────────────────────────────────────────────────────────────

const dirtyDays = new Set<DayKey>();
const dirtyLogs = new Set<string>();
let metaDirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const writeLocal = () => {
  if (!snap.userId) return;
  try {
    localStorage.setItem(LOCAL_KEY(snap.userId), JSON.stringify({
      engine: snap.engine, meta: snap.meta, logs: snap.logs.slice(0, MAX_LOCAL_LOGS),
    }));
  } catch (e) {
    console.warn('[Progression] local save failed', e);
  }
};

const dayDoc = (engine: ProgressionState, dayKey: DayKey) => ({
  id: dayKey,
  events: engine.events.filter(e => e.dayKey === dayKey),
  xpEvents: engine.xpEvents.filter(e => e.dayKey === dayKey),
  close: engine.dayCloses[dayKey] ?? null,
  shield: engine.shieldRequests[dayKey] ?? null,
});

const flushRemote = async () => {
  saveTimer = null;
  const uid = snap.userId;
  if (!uid) return;
  const days = [...dirtyDays];
  const logs = [...dirtyLogs];
  const meta = metaDirty;
  dirtyDays.clear();
  dirtyLogs.clear();
  metaDirty = false;
  try {
    await Promise.all([
      ...days.map(d => progressionDayService.save(uid, dayDoc(snap.engine, d))),
      ...logs.map(id => {
        const log = snap.logs.find(l => l.id === id);
        return log ? completionLogService.save(uid, log) : Promise.resolve();
      }),
      meta ? progressionMetaService.save(uid, snap.meta) : Promise.resolve(),
    ]);
  } catch (e) {
    console.warn('[Progression] remote save failed, will retry', e);
    days.forEach(d => dirtyDays.add(d));
    logs.forEach(id => dirtyLogs.add(id));
    if (meta) metaDirty = true;
  }
};

const persist = (opts: { days?: DayKey[]; logs?: string[]; meta?: boolean } = {}) => {
  opts.days?.forEach(d => dirtyDays.add(d));
  opts.logs?.forEach(id => dirtyLogs.add(id));
  if (opts.meta) metaDirty = true;
  writeLocal();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushRemote, SAVE_DELAY_MS);
};

const mergeEngines = (a: ProgressionState, b: ProgressionState): ProgressionState => {
  const byId = <T extends { id: string }>(xs: T[], ys: T[]) => {
    const map = new Map<string, T>();
    [...xs, ...ys].forEach(x => { if (!map.has(x.id)) map.set(x.id, x); });
    return [...map.values()];
  };
  const minKey = (x?: DayKey, y?: DayKey) => (!x ? y : !y ? x : x < y ? x : y);
  return {
    registeredDayKey: minKey(a.registeredDayKey, b.registeredDayKey) as DayKey,
    startDayKey: minKey(a.startDayKey, b.startDayKey),
    events: byId(a.events, b.events),
    xpEvents: byId(a.xpEvents, b.xpEvents),
    dayCloses: { ...b.dayCloses, ...a.dayCloses },
    shieldRequests: { ...b.shieldRequests, ...a.shieldRequests },
  };
};

const loadRemote = async (uid: string) => {
  const [days, metas, logs] = await Promise.all([
    progressionDayService.getAll(uid),
    progressionMetaService.getAll(uid),
    completionLogService.getAll(uid),
  ]);
  if (snap.userId !== uid) return;

  const remoteMeta = metas?.find(m => m.id === 'meta') as ProgressionMeta | undefined;
  const remote: ProgressionState = createProgressionState(remoteMeta?.registeredDayKey ?? snap.engine.registeredDayKey);
  remote.startDayKey = remoteMeta?.startDayKey;
  for (const d of days ?? []) {
    remote.events.push(...((d.events ?? []) as EloEvent[]));
    remote.xpEvents.push(...(d.xpEvents ?? []));
    if (d.close) remote.dayCloses[d.id] = d.close;
    if (d.shield && !d.close) remote.shieldRequests[d.id] = d.shield;
  }

  const engine = mergeEngines(snap.engine, remote);
  const meta: ProgressionMeta = remoteMeta && remoteMeta.updatedAt > snap.meta.updatedAt
    ? { ...defaultMeta(engine.registeredDayKey, engine.startDayKey ?? engine.registeredDayKey), ...remoteMeta }
    : { ...snap.meta, registeredDayKey: engine.registeredDayKey, startDayKey: engine.startDayKey ?? snap.meta.startDayKey };

  const logMap = new Map<string, CompletionLog>();
  [...snap.logs, ...((logs ?? []) as CompletionLog[])].forEach(l => {
    const prev = logMap.get(l.id);
    logMap.set(l.id, prev ? { ...l, ...prev, rating: prev.rating ?? l.rating, note: prev.note ?? l.note } : l);
  });
  const mergedLogs = [...logMap.values()].sort((x, y) => y.at - x.at);

  // Push back whatever this device had that the server didn't.
  const remoteDayIds = new Set((days ?? []).map(d => d.id));
  const localOnlyDays = new Set<DayKey>();
  snap.engine.events.forEach(e => { if (!remote.events.some(r => r.id === e.id)) localOnlyDays.add(e.dayKey); });
  snap.engine.xpEvents.forEach(e => { if (!remote.xpEvents.some(r => r.id === e.id)) localOnlyDays.add(e.dayKey); });
  Object.keys(snap.engine.dayCloses).forEach(d => { if (!remoteDayIds.has(d)) localOnlyDays.add(d); });
  const remoteLogIds = new Set((logs ?? []).map(l => l.id));

  set({ engine, meta, logs: mergedLogs, ...derive(engine) });
  persist({
    days: [...localOnlyDays],
    logs: snap.logs.filter(l => !remoteLogIds.has(l.id)).map(l => l.id),
    meta: !remoteMeta || meta !== remoteMeta,
  });
};

// ── Public API ──────────────────────────────────────────────────────────────

export const progressionStore = {
  getSnapshot: () => snap,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },

  /** Loads the user's progression (local first, then merged with the server). */
  init(userId: string, opts: { createdAt?: number | null }) {
    if (snap.userId === userId) return;
    const today = getDayKey(Date.now());
    let engine = createProgressionState(getDayKey(opts.createdAt || Date.now()));
    engine.startDayKey = today;
    let meta = defaultMeta(engine.registeredDayKey, today);
    let logs: CompletionLog[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_KEY(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        engine = { ...createProgressionState(parsed.engine.registeredDayKey), ...parsed.engine };
        meta = { ...defaultMeta(engine.registeredDayKey, engine.startDayKey ?? today), ...parsed.meta };
        logs = parsed.logs ?? [];
      }
    } catch (e) {
      console.warn('[Progression] local load failed', e);
    }
    set({ userId, ready: true, engine, meta, logs, pendingReport: null, celebration: null, leaderboard: { status: 'IDLE' }, ...derive(engine) });
    loadRemote(userId).catch(e => console.warn('[Progression] remote load failed', e));
  },

  todayKey: () => getDayKey(Date.now(), snap.meta.dayCutoff),

  /** Runs an engine transition, then detects division/rank-ups and persists. */
  mutate(fn: (s: ProgressionState) => ProgressionState, days: DayKey[]) {
    const before = snap.standing;
    const engine = fn(snap.engine);
    if (engine === snap.engine) return;
    const derived = derive(engine);
    const change = compareStandings(before, derived.standing);
    const celebration: Celebration | null = change === 'RANK_UP' || change === 'DIVISION_UP'
      ? { kind: change, standing: derived.standing, at: Date.now() }
      : snap.celebration;
    set({ engine, ...derived, celebration });
    persist({ days });
  },

  /** Immediate focus ELO. Pass the day's total *timer* minutes. Returns ELO awarded now. */
  awardFocusMinutes(dayKey: DayKey, timerMinutesToday: number): number {
    let awarded = 0;
    progressionStore.mutate(s => {
      const r = awardFocus(s, dayKey, timerMinutesToday, Date.now());
      awarded = r.awarded.reduce((sum, e) => sum + e.amount, 0);
      return r.state;
    }, [dayKey]);
    return awarded;
  },

  awardXp(grant: XpGrant): number {
    let amount = 0;
    progressionStore.mutate(s => {
      const r = awardXp(s, grant);
      amount = r.event?.amount ?? 0;
      return r.state;
    }, [grant.dayKey]);
    return amount;
  },

  /** Closes every finished day in order. `build` returns null when data isn't ready. */
  closePendingDays(build: (dayKey: DayKey) => DayCloseInput | null): number {
    const days = pendingDays(snap.engine, progressionStore.todayKey());
    let closed = 0;
    for (const day of days) {
      const input = build(day);
      if (!input) break;
      progressionStore.mutate(s => {
        const r = closeDay(s, input);
        return r.state;
      }, [day]);
      closed++;
    }
    return closed;
  },

  project(input: DayCloseInput): DayProjection {
    return projectDay(snap.engine, input);
  },

  /** Activates a rest shield for today. PURCHASED ones must already be paid. */
  activateShield(source: ShieldSource) {
    const day = progressionStore.todayKey();
    const r = requestShield(snap.engine, day, source);
    if (!r.ok) return r;
    progressionStore.mutate(() => r.state, [day]);
    return r;
  },

  shieldActiveToday: () => snap.engine.shieldRequests[progressionStore.todayKey()] ?? null,

  addLog(log: CompletionLog) {
    set({ logs: [log, ...snap.logs.filter(l => l.id !== log.id)] });
    persist({ logs: [log.id] });
  },

  updateLog(id: string, patch: Partial<CompletionLog>) {
    set({
      logs: snap.logs.map(l => (l.id === id ? { ...l, ...patch } : l)),
      pendingReport: snap.pendingReport?.log.id === id ? { ...snap.pendingReport, log: { ...snap.pendingReport.log, ...patch } } : snap.pendingReport,
    });
    persist({ logs: [id] });
  },

  showReport(report: PendingReport) {
    set({ pendingReport: report });
  },

  dismissReport() {
    const p = snap.pendingReport;
    if (!p) return;
    set({ pendingReport: null, meta: { ...snap.meta, memory: rememberReport(snap.meta.memory, p.report), updatedAt: Date.now() } });
    persist({ meta: true });
  },

  clearCelebration() {
    set({ celebration: null });
  },

  updateSettings(patch: Partial<Pick<ProgressionMeta, 'habitGoalPct' | 'dayCutoff' | 'soundEnabled' | 'hapticsEnabled' | 'reportsEnabled' | 'appearance' | 'equippedFrame'>>) {
    set({ meta: { ...snap.meta, ...patch, updatedAt: Date.now() } });
    persist({ meta: true });
  },

  async refreshLeaderboard(profile: { displayName?: string | null; avatarId?: string | null }) {
    const uid = snap.userId;
    if (!uid) return;
    set({ leaderboard: { status: 'LOADING' } });
    await leaderboardService.publish({
      user_id: uid,
      display_name: profile.displayName ?? null,
      avatar_id: profile.avatarId ?? null,
      elo: snap.summary.elo,
      rank_index: snap.summary.rankIndex,
      level: snap.level.level,
    });
    const rows = await leaderboardService.top(100);
    if (!rows) return set({ leaderboard: { status: 'UNAVAILABLE' } });
    const legendEntry = PROGRESSION_CONFIG.RANKS[PROGRESSION_CONFIG.RANKS.length - 1].entry;
    const isLegend = snap.standing.division === null;
    const [myPosition, legendPosition] = await Promise.all([
      leaderboardService.positionOf(snap.summary.elo),
      isLegend ? leaderboardService.positionOf(snap.summary.elo, legendEntry) : Promise.resolve(null),
    ]);
    set({ leaderboard: { status: 'READY', rows, myPosition, legendPosition, fetchedAt: Date.now() } });
  },
};

export const useProgression = (): ProgressionSnapshot =>
  useSyncExternalStore(progressionStore.subscribe, progressionStore.getSnapshot, progressionStore.getSnapshot);

/** Sunday (configurable) +25% on gold and XP rewards of the existing economy. */
export const applyWeeklyBoost = (amount: number): number => boostReward(amount, progressionStore.todayKey());
