import { supabase } from './supabase';

// Local mirror of the signed-in user's `user_collections` rows.
//
// Why: every sync used to download ALL of the user's rows (every collection, every time) in one
// request. That (1) costs bandwidth/DB time that grows with every completion logged, and (2) was
// silently cut at PostgREST's `max_rows` (1000 on the VPS): past that, random rows were missing
// from the answer and the app replaced its lists with the truncated result.
//
// Now: the first sync on a device pages through the live rows (keyset pagination, no limit), and
// every later sync only asks for rows whose `updated_at` moved since the last one (deletes are soft,
// so tombstones arrive as changes too). A full refresh still runs once a day to catch rows that were
// hard-deleted server-side (tombstone purge, legacy cleanups). Rows are stored in IndexedDB so they
// never compete with localStorage's quota.

export interface MirrorRow {
  id: string;
  collection_name: string;
  data: any;
}

interface RawRow extends MirrorRow {
  deleted?: boolean;
  updated_at?: string;
}

interface MirrorState {
  /** Highest server `updated_at` seen (raw string, server clock). */
  wm: string | null;
  /** When the last full (non-delta) download finished, client clock. */
  fullAt: number;
  rows: Map<string, MirrorRow>;
}

const PAGE = 1000; // == PGRST_DB_MAX_ROWS; a shorter page means it was the last one
const OVERLAP_MS = 5 * 60_000; // rows committed late with an older updated_at are still caught
const FULL_REFRESH_MS = 24 * 60 * 60_000;
const SELECT = 'id, collection_name, data, deleted, updated_at';

const states = new Map<string, MirrorState>();
const loading = new Map<string, Promise<MirrorState>>();
const inflight = new Map<string, Promise<MirrorRow[]>>();

// ── tiny IndexedDB key/value store ─────────────────────────────────────────
const DB_NAME = 'lux-mirror';
const STORE = 'kv';
let dbPromise: Promise<IDBDatabase | null> | null = null;
const openDb = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
};
const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  });
};
const idbSet = async (key: string, value: unknown): Promise<void> => {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch { resolve(); }
  });
};

const storeKey = (uid: string) => `rows_v1_${uid}`;

const loadState = (uid: string): Promise<MirrorState> => {
  const ready = states.get(uid);
  if (ready) return Promise.resolve(ready);
  const pending = loading.get(uid);
  if (pending) return pending;
  const p = (async () => {
    const saved = await idbGet<{ wm: string | null; fullAt: number; rows: MirrorRow[] }>(storeKey(uid));
    const st: MirrorState = {
      wm: saved?.wm ?? null,
      fullAt: saved?.fullAt ?? 0,
      rows: new Map((saved?.rows ?? []).map(r => [r.id, r])),
    };
    // A mirror without rows has nothing to build a delta on.
    if (st.rows.size === 0) { st.wm = null; st.fullAt = 0; }
    states.set(uid, st);
    loading.delete(uid);
    return st;
  })();
  loading.set(uid, p);
  return p;
};

const ms = (iso?: string | null) => (iso ? Date.parse(iso) : NaN);

/** Pages through rows ordered by (updated_at, id): rows that change mid-download move to the end and are read again, never skipped. */
const fetchRows = async (uid: string, sinceIso: string | null): Promise<RawRow[]> => {
  const out: RawRow[] = [];
  let after: { u: string; id: string } | null = null;
  for (let guard = 0; guard < 500; guard++) {
    let q = supabase.from('user_collections').select(SELECT).eq('user_id', uid);
    q = sinceIso ? q.gt('updated_at', sinceIso) : q.eq('deleted', false);
    if (after) q = q.or(`updated_at.gt."${after.u}",and(updated_at.eq."${after.u}",id.gt."${after.id}")`);
    const { data, error } = await q
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    const page = (data || []) as RawRow[];
    out.push(...page);
    if (page.length < PAGE) break;
    const last = page[page.length - 1];
    if (!last.updated_at) break; // cannot continue a keyset without the key
    after = { u: last.updated_at, id: last.id };
  }
  return out;
};

const persist = (uid: string, st: MirrorState) => {
  void idbSet(storeKey(uid), { wm: st.wm, fullAt: st.fullAt, rows: Array.from(st.rows.values()) });
};

const liveRows = (st: MirrorState) => Array.from(st.rows.values());

/**
 * Brings the mirror up to date and returns every live row of the user (all collections).
 * Concurrent callers share one request. Throws on network/DB errors (callers already handle that).
 */
export const syncUserRows = (uid: string, opts: { full?: boolean } = {}): Promise<MirrorRow[]> => {
  const running = inflight.get(uid);
  if (running) return running;
  const p = (async () => {
    const st = await loadState(uid);
    const full = opts.full || !st.wm || Date.now() - st.fullAt > FULL_REFRESH_MS;
    const since = full ? null : new Date(ms(st.wm) - OVERLAP_MS).toISOString();
    const fetched = await fetchRows(uid, since);

    if (full) st.rows.clear();
    let wm = full ? null : st.wm;
    for (const r of fetched) {
      if (r.deleted) st.rows.delete(r.id);
      else st.rows.set(r.id, { id: r.id, collection_name: r.collection_name, data: r.data });
      if (r.updated_at && (!wm || ms(r.updated_at) > ms(wm))) wm = r.updated_at;
    }
    st.wm = wm;
    if (full) st.fullAt = Date.now();
    persist(uid, st);
    return liveRows(st);
  })().finally(() => { inflight.delete(uid); });
  inflight.set(uid, p);
  return p;
};

/** Live items of one collection, deduplicated by item id (preferring the namespaced row id). */
export const extractCollection = <T extends { id: string }>(uid: string, rows: MirrorRow[], collectionName: string): T[] => {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (row.collection_name !== collectionName) continue;
    const item = row.data as T;
    if (!item || !item.id || (item as any).deleted) continue;
    const expectedId = `${uid}_${collectionName}_${item.id}`;
    if (!map.has(item.id) || row.id === expectedId) map.set(item.id, item);
  }
  return Array.from(map.values());
};

/** Forget a user's mirror (sign-out / account deletion). */
export const clearUserRows = (uid: string) => {
  states.delete(uid);
  void idbSet(storeKey(uid), undefined);
};
