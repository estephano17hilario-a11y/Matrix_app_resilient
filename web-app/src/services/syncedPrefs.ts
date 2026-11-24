// ─────────────────────────────────────────────────────────────────────────────
// SYNCED PREFS — user-owned UI preferences and small bits of content that used to
// live ONLY in this phone's localStorage (lost on reinstall / new device):
// project routines per weekday, quick actions, notification phrases, layout and
// chart choices, journal reminder times, tutorial-seen flags, …
//
// How it works (no call site had to change):
//   · installSyncedPrefs() wraps localStorage.setItem/removeItem once. A write to a
//     registered key is stamped and queued; ~2s later (or when the app is hidden)
//     the batch is merged into settings.local_prefs on the VPS through
//     mergeUserSettings (atomic RPC, per-key last-writer-wins).
//   · hydrateSyncedPrefs() pulls settings.local_prefs: a newer remote value replaces
//     the local one; a newer/unknown local value is uploaded. First sync of a device
//     uploads whatever it already holds, so nothing existing is lost.
//   · Unsent changes are persisted, retried on `online`, on hide and on next launch.
//
// Per-device settings (immersion/perf, widgets, caches) are deliberately NOT here.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import { isTransientError, mergeUserSettings } from './settingsSync';

const EXACT_KEYS = new Set([
  'matrix_top_quick_actions',
  'matrix_notification_tone',
  'matrix_anti_procrastination_phrase',
  'matrix_splash_phrase',
  'habitViewPreference',
  'hideCompletedHabits',
  'showAllHabits',
  'notes_sort_order',
  'notes_layout_mode',
  'MATRIX_CALENDAR_OPACITY',
  'MATRIX_CALENDAR_SHOW_FUTURE',
  'matrix_particle_config',
  'matrix_solid_chart_bg',
  'matrix_bar_chart_style',
  'feed_circle_color',
  'feed_number_color',
  'i18nextLng',
  'lux_start_section',
  'lux_plus_hold_target',
  'lux_plus_hold_ms',
]);

/** Key families. `perUser`: the key embeds the user id, so it is only synced for that user. */
const PREFIXES: { prefix: string; perUser: boolean }[] = [
  { prefix: 'matrix_project_routine_', perUser: false },   // mode + per-weekday focus routines
  { prefix: 'blueprint_order_', perUser: true },
  { prefix: 'journal_reminders_v1_', perUser: true },
  { prefix: 'routine_config_v1_', perUser: true },
  { prefix: 'matrix_stats_tutorial_seen_', perUser: true },
  { prefix: 'matrix_tour_seen_', perUser: true },
];

const MAX_VALUE_CHARS = 100_000;
const FLUSH_DELAY_MS = 2000;

interface Entry { v: string | null; t: number }

let installed = false;
let activeUid: string | null = null;
let applying = 0;                    // >0 while hydration writes, so they are not echoed back
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let origSet: (this: Storage, k: string, v: string) => void;
let origRemove: (this: Storage, k: string) => void;

const metaKey = (uid: string) => `lux_prefs_meta_v1:${uid}`;
const pendingKey = (uid: string) => `lux_prefs_pending_v1:${uid}`;

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};
const writeJsonRaw = (key: string, value: unknown) => {
  try { origSet.call(window.localStorage, key, JSON.stringify(value)); } catch { /* storage full */ }
};

export const isSyncedKey = (key: string, uid: string | null = activeUid): boolean => {
  if (EXACT_KEYS.has(key)) return true;
  for (const { prefix, perUser } of PREFIXES) {
    if (!key.startsWith(prefix)) continue;
    return !perUser || (!!uid && key.endsWith(uid));
  }
  return false;
};

// ── local → remote ───────────────────────────────────────────────────────────

const queueWrite = (key: string, value: string | null) => {
  const uid = activeUid;
  if (!uid || !isSyncedKey(key, uid)) return;
  if (value !== null && value.length > MAX_VALUE_CHARS) return;
  const t = Date.now();
  const meta = readJson<Record<string, number>>(metaKey(uid), {});
  meta[key] = t;
  writeJsonRaw(metaKey(uid), meta);
  const pending = readJson<Record<string, Entry>>(pendingKey(uid), {});
  pending[key] = { v: value, t };
  writeJsonRaw(pendingKey(uid), pending);
  scheduleFlush();
};

const scheduleFlush = (delay = FLUSH_DELAY_MS) => {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { flushTimer = null; void flushPending(); }, delay);
};

export const flushPending = async (): Promise<void> => {
  const uid = activeUid;
  if (!uid || flushing) return;
  const pending = readJson<Record<string, Entry>>(pendingKey(uid), {});
  const keys = Object.keys(pending);
  if (keys.length === 0) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  flushing = true;
  try {
    await mergeUserSettings(uid, { local_prefs: pending });
    // Drop only what was sent and not rewritten meanwhile.
    const latest = readJson<Record<string, Entry>>(pendingKey(uid), {});
    for (const k of keys) if (latest[k] && latest[k].t === pending[k].t) delete latest[k];
    writeJsonRaw(pendingKey(uid), latest);
    if (Object.keys(latest).length > 0) scheduleFlush();
  } catch (e) {
    if (isTransientError(e)) scheduleFlush(30_000);
    else console.warn('[SyncedPrefs] upload rejected:', (e as any)?.message || e);
  } finally {
    flushing = false;
  }
};

// ── remote → local ───────────────────────────────────────────────────────────

/** Returns how many local values were replaced by newer remote ones. */
export const hydrateSyncedPrefs = async (): Promise<number> => {
  const uid = activeUid;
  if (!uid || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 0;

  let remote: Record<string, Entry> = {};
  try {
    const { data, error } = await supabase
      .from('user_collections')
      .select('data')
      .eq('id', `config_${uid}`)
      .eq('user_id', uid)
      .eq('collection_name', 'settings')
      .maybeSingle();
    if (error) throw error;
    remote = (data?.data?.local_prefs || {}) as Record<string, Entry>;
  } catch (e) {
    console.warn('[SyncedPrefs] hydrate failed:', (e as any)?.message || e);
    return 0;
  }
  if (activeUid !== uid) return 0; // user switched while fetching

  const meta = readJson<Record<string, number>>(metaKey(uid), {});
  const pending = readJson<Record<string, Entry>>(pendingKey(uid), {});
  let replaced = 0;

  applying++;
  try {
    for (const [key, entry] of Object.entries(remote)) {
      if (!entry || typeof entry.t !== 'number' || !isSyncedKey(key, uid)) continue;
      const localT = meta[key] ?? 0;
      if (entry.t <= localT) continue;
      const current = window.localStorage.getItem(key);
      const next = typeof entry.v === 'string' ? entry.v : null;
      if (current !== next) {
        if (next === null) origRemove.call(window.localStorage, key);
        else origSet.call(window.localStorage, key, next);
        replaced++;
      }
      meta[key] = entry.t;
      delete pending[key];
    }

    // Local values the server has never seen (first sync of this device, or edits made offline).
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !isSyncedKey(key, uid)) continue;
      const localT = meta[key];
      const r = remote[key];
      if (r && localT !== undefined && localT <= r.t) continue;
      if (r && localT === undefined) continue; // remote already has it and won above
      const value = window.localStorage.getItem(key);
      if (value === null || value.length > MAX_VALUE_CHARS) continue;
      const t = localT ?? Date.now();
      meta[key] = t;
      pending[key] = { v: value, t };
    }
  } finally {
    applying--;
  }

  writeJsonRaw(metaKey(uid), meta);
  writeJsonRaw(pendingKey(uid), pending);
  void flushPending();
  return replaced;
};

/** True when this device has never synced prefs for the current user (fresh install / new phone). */
export const isFirstSyncOnDevice = (): boolean =>
  !!activeUid && window.localStorage.getItem(metaKey(activeUid)) === null;

// ── wiring ───────────────────────────────────────────────────────────────────

/** Wrap localStorage writes and track the signed-in user. Call once, before the app renders. */
export const installSyncedPrefs = async (): Promise<void> => {
  if (installed || typeof window === 'undefined' || typeof Storage === 'undefined') return;
  installed = true;

  origSet = Storage.prototype.setItem;
  origRemove = Storage.prototype.removeItem;

  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    origSet.call(this, key, value);
    if (applying === 0 && this === window.localStorage) queueWrite(key, String(value));
  };
  Storage.prototype.removeItem = function (this: Storage, key: string) {
    origRemove.call(this, key);
    if (applying === 0 && this === window.localStorage) queueWrite(key, null);
  };

  window.addEventListener('online', () => { void flushPending(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushPending();
  });

  try {
    const { data } = await supabase.auth.getSession();
    activeUid = data.session?.user?.id ?? null;
  } catch { activeUid = null; }

  supabase.auth.onAuthStateChange((event, session) => {
    const next = session?.user?.id ?? null;
    const changed = next !== activeUid;
    activeUid = next;
    // Deferred: awaiting supabase calls inside this callback would deadlock the auth lock.
    if (next && (event === 'SIGNED_IN' || changed)) {
      setTimeout(() => { void onSignedIn(); }, 0);
    }
  });
};

/** After a login on a device that has no synced state: pull the account's prefs, then reload once so
 *  every screen reads them from the first render. */
const onSignedIn = async () => {
  const fresh = isFirstSyncOnDevice();
  const replaced = await hydrateSyncedPrefs();
  if (fresh && replaced > 0) {
    const flag = 'lux_prefs_reloaded';
    try {
      if (window.sessionStorage.getItem(flag) === activeUid) return;
      window.sessionStorage.setItem(flag, activeUid || '');
    } catch { /* no sessionStorage: reload at most once per call anyway */ }
    window.location.reload();
  }
};

/** Boot-time sync. Waits for the network only on a device with no synced state yet; otherwise it
 *  runs in the background so a normal launch is never delayed. Resolves when it is safe to render. */
export const bootSyncedPrefs = async (budgetMs = 1500): Promise<number> => {
  if (!activeUid) return 0;
  const first = isFirstSyncOnDevice(); // must be read before hydrate writes the meta record
  const job = hydrateSyncedPrefs();
  if (!first) return 0;
  return Promise.race([job, new Promise<number>(resolve => setTimeout(() => resolve(0), budgetMs))]);
};
