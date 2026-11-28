import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Supabase mock: an in-memory user_collections table with PostgREST-like filtering ─────────────
type Row = { id: string; user_id: string; collection_name: string; data: any; deleted: boolean; updated_at: string };
const db: { rows: Row[]; failUpsertIds: Set<string>; calls: string[] } = { rows: [], failUpsertIds: new Set(), calls: [] };

const makeQuery = (table: string) => {
  const filters: Array<(r: Row) => boolean> = [];
  let limit = Infinity;
  let op: 'select' | 'upsert' | 'update' = 'select';
  let payload: any = null;
  const q: any = {
    select: () => q,
    eq: (col: string, v: any) => { filters.push(r => (col === 'data->>id' ? r.data?.id === v : (r as any)[col] === v)); return q; },
    neq: (col: string, v: any) => { filters.push(r => (r as any)[col] !== v); return q; },
    gt: (col: string, v: any) => { filters.push(r => Date.parse((r as any)[col]) > Date.parse(v)); return q; },
    in: (col: string, vs: any[]) => { filters.push(r => vs.includes((r as any)[col])); return q; },
    or: (expr: string) => {
      // keyset: updated_at.gt."X",and(updated_at.eq."X",id.gt."Y")
      const m = /updated_at\.gt\."([^"]+)",and\(updated_at\.eq\."([^"]+)",id\.gt\."([^"]+)"\)/.exec(expr);
      if (m) filters.push(r => Date.parse(r.updated_at) > Date.parse(m[1]) || (r.updated_at === m[2] && r.id > m[3]));
      else {
        const ids = [...expr.matchAll(/id\.eq\.([^,)]+)/g)].map(x => x[1]);
        filters.push(r => ids.includes(r.id));
      }
      return q;
    },
    order: () => q,
    limit: (n: number) => { limit = n; return q; },
    upsert: (p: any) => { op = 'upsert'; payload = p; return q; },
    update: (p: any) => { op = 'update'; payload = p; return q; },
    then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
  };
  const run = () => {
    db.calls.push(`${table}:${op}`);
    if (op === 'upsert') {
      if (db.failUpsertIds.has(payload.id)) return { error: { code: '42501', message: 'permission denied', status: 403 } };
      const existing = db.rows.find(r => r.id === payload.id);
      const ts = new Date(Date.now() + db.rows.length).toISOString();
      if (existing) Object.assign(existing, payload, { updated_at: ts });
      else db.rows.push({ ...payload, updated_at: ts });
      return { error: null };
    }
    const hit = db.rows.filter(r => filters.every(f => f(r)));
    if (op === 'update') { hit.forEach(r => Object.assign(r, payload)); return { error: null }; }
    const sorted = [...hit].sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id));
    return { data: sorted.slice(0, limit), error: null };
  };
  return q;
};

vi.mock('./supabase', () => ({
  supabase: { from: (t: string) => makeQuery(t), auth: { refreshSession: async () => ({}) }, rpc: async () => ({ error: null }) },
}));
vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>();
  return { Preferences: { get: async ({ key }: any) => ({ value: store.get(key) ?? null }), set: async ({ key, value }: any) => { store.set(key, value); }, remove: async ({ key }: any) => { store.delete(key); } } };
});

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); },
  removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear(), key: () => null, length: 0,
};
let online = true;
Object.defineProperty(globalThis, 'navigator', { configurable: true, get: () => ({ onLine: online }) });
const setOnline = (v: boolean) => { online = v; };

const U = 'u1';
const row = (c: string, id: string, data: any, at: string, deleted = false): Row =>
  ({ id: `${U}_${c}_${id}`, user_id: U, collection_name: c, data: { id, ...data }, deleted, updated_at: at });

describe('rowMirror', () => {
  beforeEach(() => { db.rows = []; db.calls = []; vi.resetModules(); });

  it('pages past the 1000-row limit without losing rows', async () => {
    for (let i = 0; i < 2500; i++) db.rows.push(row('dailyFeed', `f${String(i).padStart(4, '0')}`, { n: i }, new Date(Date.UTC(2026, 0, 1, 0, 0, Math.floor(i / 3))).toISOString()));
    const { syncUserRows, extractCollection } = await import('./rowMirror');
    const rows = await syncUserRows(U);
    expect(extractCollection(U, rows, 'dailyFeed')).toHaveLength(2500);
  });

  it('applies deltas: changes and soft deletes since the last sync', async () => {
    db.rows.push(row('notes', 'a', { t: 'A' }, '2026-11-01T00:00:00.000Z'), row('notes', 'b', { t: 'B' }, '2026-11-01T00:00:01.000Z'));
    const { syncUserRows, extractCollection } = await import('./rowMirror');
    expect(extractCollection(U, await syncUserRows(U), 'notes').map((n: any) => n.t).sort()).toEqual(['A', 'B']);
    const now = new Date().toISOString();
    Object.assign(db.rows[0], { data: { id: 'a', t: 'A2' }, updated_at: now });
    Object.assign(db.rows[1], { deleted: true, data: { id: 'b', deleted: true }, updated_at: now });
    db.rows.push(row('notes', 'c', { t: 'C' }, now));
    const after = extractCollection<any>(U, await syncUserRows(U), 'notes');
    expect(after.map(n => n.t).sort()).toEqual(['A2', 'C']);
  });
});

describe('offline queue', () => {
  beforeEach(() => { db.rows = []; db.calls = []; db.failUpsertIds.clear(); mem.clear(); vi.resetModules(); });

  it('folds an UPDATE into a pending SAVE of the same item', async () => {
    const { OfflineSyncService } = await import('./offlineSync');
    setOnline(false);
    await OfflineSyncService.addAction({ type: 'SAVE', collectionName: 'notes', userId: U, itemId: 'n1', data: { id: 'n1', title: 'x' } });
    await OfflineSyncService.addAction({ type: 'UPDATE', collectionName: 'notes', userId: U, itemId: 'n1', data: { body: 'y' } });
    const q = await OfflineSyncService.getQueue();
    expect(q).toHaveLength(1);
    expect(q[0].data).toEqual({ id: 'n1', title: 'x', body: 'y' });
    setOnline(true);
  });

  it('a permanently failing write does not block the others and stays queued with backoff', async () => {
    const { OfflineSyncService } = await import('./offlineSync');
    setOnline(false);
    db.failUpsertIds.add(`${U}_notes_bad`);
    await OfflineSyncService.addAction({ type: 'SAVE', collectionName: 'notes', userId: U, itemId: 'bad', data: { id: 'bad' } });
    await OfflineSyncService.addAction({ type: 'SAVE', collectionName: 'journal', userId: U, itemId: 'good', data: { id: 'good' } });
    setOnline(true);
    await OfflineSyncService.processQueue();
    expect(db.rows.some(r => r.id === `${U}_journal_good`)).toBe(true);
    const q = await OfflineSyncService.getQueue();
    expect(q).toHaveLength(1);
    expect(q[0].itemId).toBe('bad');
    expect(q[0].attempts).toBe(1);
    expect(q[0].nextAt).toBeGreaterThan(Date.now());
  });

  it('a queued edit never resurrects an item deleted elsewhere', async () => {
    db.rows.push(row('notes', 'gone', { deleted: true }, '2026-11-01T00:00:00.000Z', true));
    const { OfflineSyncService } = await import('./offlineSync');
    setOnline(false);
    await OfflineSyncService.addAction({ type: 'UPDATE', collectionName: 'notes', userId: U, itemId: 'gone', data: { title: 'edit' } });
    setOnline(true);
    await OfflineSyncService.processQueue();
    expect(db.rows.find(r => r.id === `${U}_notes_gone`)?.deleted).toBe(true);
    expect((await OfflineSyncService.getQueue()).filter(a => a.itemId === 'gone')).toHaveLength(0);
  });
});
