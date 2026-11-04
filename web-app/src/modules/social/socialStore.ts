// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL STORE — friends, duels, shared streaks and messages.
//
// Rewards are paid by each player's own client, but only after inserting a row
// in duel_claims (unique per duel/user/kind/day). If the insert fails because
// the row exists, the prize was already paid on some device: nothing happens.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import {
  EMPTY_PRIZE, addDays, addPrizes, checkExclusions, dayPrize, duelStanding, finalPrize, friendStreak, headToHead,
  localDayKey, makeInviteCode, periodDays, type DayKey, type DayStats, type DuelDuration, type DuelStanding,
  type FriendStreak, type Prize, type Record2,
} from './engine';
import {
  NO_DAY, socialService, type ClaimRow, type DailyStatRow, type DuelRow, type Friendship, type FriendStreakRow,
  type MessageRow, type PublicProfile,
} from './socialService';
import { socialWins } from './socialWins';

export interface FriendEntry { friendshipId: string; profile: PublicProfile }
export interface StatDay extends DayStats { hud: boolean }

export interface SocialSnapshot {
  userId: string | null;
  /** False when the server tables are missing (migration not applied) or offline. */
  available: boolean;
  loading: boolean;
  loadedAt: number;
  myCode: string | null;
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  profiles: Record<string, PublicProfile>;
  duels: DuelRow[];
  claims: ClaimRow[];
  streaks: FriendStreakRow[];
  stats: Record<string, Record<DayKey, StatDay>>;
  messages: MessageRow[];
  unread: number;
}

export interface RewardEvent extends Prize { reason: string }

type Listener = () => void;

const initial = (): SocialSnapshot => ({
  userId: null, available: true, loading: false, loadedAt: 0, myCode: null, friends: [], incoming: [], outgoing: [],
  profiles: {}, duels: [], claims: [], streaks: [], stats: {}, messages: [], unread: 0,
});

let snap = initial();
const listeners = new Set<Listener>();
const set = (patch: Partial<SocialSnapshot>) => {
  snap = { ...snap, ...patch };
  listeners.forEach(l => l());
};

// Host callbacks (set by SocialLayer)
let rewardHandler: ((r: RewardEvent) => Promise<void> | void) | null = null;
let goldGetter: () => number = () => 0;
let notify: (title: string, body: string) => void = () => {};
let profileExtras: () => Partial<PublicProfile> = () => ({});

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let settling = false;

const today = () => localDayKey();

const statsFor = (userId: string): Record<DayKey, DayStats> => snap.stats[userId] ?? {};

// ── Derived helpers (pure on the snapshot) ──────────────────────────────────

export const otherSide = (duel: DuelRow, me: string) => (duel.challenger === me ? duel.opponent : duel.challenger);

export const standingOf = (duel: DuelRow, s: SocialSnapshot = snap, day: DayKey = today()): DuelStanding =>
  duelStanding(duel, { a: s.stats[duel.challenger] ?? {}, b: s.stats[duel.opponent] ?? {} }, day);

export const recordAgainst = (friendId: string, s: SocialSnapshot = snap): Record2 => {
  const me = s.userId;
  if (!me) return { dayWins: 0, dayLosses: 0, duelWins: 0, duelLosses: 0 };
  return headToHead(
    s.duels
      .filter(d => (d.status === 'ACTIVE' || d.status === 'FINISHED') && otherSide(d, me) === friendId)
      .map(d => ({ mineIsA: d.challenger === me, standing: standingOf(d, s) })),
  );
};

export const streakWith = (row: FriendStreakRow, s: SocialSnapshot = snap): FriendStreak | null => {
  const me = s.userId;
  if (!me || row.status !== 'ACTIVE' || !row.started_on) return null;
  const friend = row.user_a === me ? row.user_b : row.user_a;
  const days = (id: string) => new Set(Object.entries(s.stats[id] ?? {}).filter(([, v]) => v.hud).map(([k]) => k));
  return friendStreak(row.started_on, days(me), days(friend), today());
};

// ── Loading ─────────────────────────────────────────────────────────────────

const loadStats = async (userIds: string[], duels: DuelRow[], streaks: FriendStreakRow[]) => {
  const t = today();
  const starts = [
    addDays(t, -35),
    ...duels.filter(d => d.status === 'ACTIVE').map(d => d.start_day),
    ...streaks.filter(s => s.status === 'ACTIVE' && s.started_on).map(s => s.started_on as DayKey),
  ];
  const from = starts.sort()[0];
  const rows = await socialService.stats(userIds, from, t);
  const stats: SocialSnapshot['stats'] = {};
  for (const r of rows as DailyStatRow[]) {
    (stats[r.user_id] ??= {})[r.day] = { score: Number(r.score) || 0, focusMinutes: r.focus_minutes || 0, hud: !!r.hud_streak_active };
  }
  return stats;
};

const refreshNow = async () => {
  const me = snap.userId;
  if (!me) return;
  set({ loading: true });
  const friendships = await socialService.friendships();
  if (friendships === null) {
    set({ loading: false, available: false });
    return;
  }
  const [duels, streaks] = await Promise.all([socialService.duels(), socialService.streaks()]);
  const others = new Set<string>();
  friendships.forEach(f => others.add(f.requester === me ? f.addressee : f.requester));
  (duels ?? []).forEach(d => others.add(otherSide(d, me)));
  const [profilesList, claims, messages] = await Promise.all([
    socialService.profiles([...others, me]),
    socialService.claims((duels ?? []).map(d => d.id)),
    socialService.inbox(me),
  ]);
  const profiles = Object.fromEntries(profilesList.map(p => [p.user_id, p]));
  const placeholder = (id: string): PublicProfile => ({ user_id: id, display_name: null, avatar_id: null, elo: 50, rank_index: 0, division: 0, level: 1, hud_streak: 0 });
  const entry = (f: Friendship): FriendEntry => {
    const other = f.requester === me ? f.addressee : f.requester;
    return { friendshipId: f.id, profile: profiles[other] ?? placeholder(other) };
  };
  const friendIds = friendships.filter(f => f.status === 'ACCEPTED').map(f => (f.requester === me ? f.addressee : f.requester));
  const stats = await loadStats([me, ...friendIds], duels ?? [], streaks ?? []);

  set({
    available: true,
    loading: false,
    loadedAt: Date.now(),
    myCode: profiles[me]?.invite_code ?? snap.myCode,
    friends: friendships.filter(f => f.status === 'ACCEPTED').map(entry).sort((a, b) => b.profile.elo - a.profile.elo),
    incoming: friendships.filter(f => f.status === 'PENDING' && f.addressee === me).map(entry),
    outgoing: friendships.filter(f => f.status === 'PENDING' && f.requester === me).map(entry),
    profiles,
    duels: duels ?? [],
    claims,
    streaks: streaks ?? [],
    stats,
    messages,
    unread: messages.filter(m => m.to_user === me && !m.read_at).length,
  });

  // Wins feed the social achievements.
  for (const k of ['DAY', 'WEEK', 'MONTH'] as DuelDuration[]) {
    socialWins[k] = snap.duels.filter(d => d.status === 'FINISHED' && d.winner === me && d.duration === k).length;
  }

  await settle();
};

const scheduleRefresh = (ms = 800) => {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { refreshTimer = null; refreshNow().catch(e => console.warn('[Social] refresh', e)); }, ms);
};

// ── Settlement: day prizes, final prize, refunds ────────────────────────────

const hasClaim = (duelId: string, kind: ClaimRow['kind'], day: DayKey = NO_DAY) =>
  snap.claims.some(c => c.duel_id === duelId && c.user_id === snap.userId && c.kind === kind && c.day === day);

const claimOnce = async (duelId: string, kind: ClaimRow['kind'], day: DayKey = NO_DAY) => {
  if (!snap.userId || hasClaim(duelId, kind, day)) return false;
  const ok = await socialService.claim({ duel_id: duelId, user_id: snap.userId, kind, day });
  if (ok) set({ claims: [...snap.claims, { duel_id: duelId, user_id: snap.userId, kind, day }] });
  return ok;
};

const pay = async (prize: Prize, reason: string) => {
  if (!rewardHandler || (prize.gold === 0 && prize.xp === 0 && !prize.chests.length)) return;
  await rewardHandler({ ...prize, reason });
};

const settle = async () => {
  const me = snap.userId;
  if (!me || settling) return;
  settling = true;
  try {
    let total = EMPTY_PRIZE;
    const reasons: string[] = [];
    const t = today();
    for (const duel of snap.duels) {
      const mine = duel.challenger === me;
      // Refund the challenger's stake when a duel never started.
      if (mine && duel.stake > 0 && (duel.status === 'DECLINED' || duel.status === 'CANCELLED') && hasClaim(duel.id, 'STAKE_PAID') && await claimOnce(duel.id, 'STAKE_REFUND')) {
        total = addPrizes(total, { gold: duel.stake, xp: 0, chests: [] });
        reasons.push('refund');
      }
      // A pending challenge whose first day already passed expires.
      if (mine && duel.status === 'PENDING' && duel.start_day < t) {
        await socialService.updateDuel(duel.id, { status: 'CANCELLED' });
      }
      if (duel.status !== 'ACTIVE' && duel.status !== 'FINISHED') continue;

      const standing = standingOf(duel);
      const side = mine ? 'A' : 'B';
      for (const r of standing.results) {
        if (r.winner === side && await claimOnce(duel.id, 'DAY_WIN', r.day)) {
          total = addPrizes(total, dayPrize());
          reasons.push('day');
        }
      }
      if (standing.finished && standing.winner) {
        const winnerId = standing.winner === 'A' ? duel.challenger : duel.opponent;
        if (duel.status === 'ACTIVE') {
          await socialService.updateDuel(duel.id, { status: 'FINISHED', winner: winnerId, finished_at: new Date().toISOString() });
        }
        if (winnerId === me && await claimOnce(duel.id, 'FINAL_WIN')) {
          total = addPrizes(total, finalPrize(duel));
          socialWins[duel.duration] += 1;
          reasons.push(duel.duration);
        }
      }
    }
    if (reasons.length) await pay(total, reasons.join(','));
  } finally {
    settling = false;
  }
};

// ── Public API ──────────────────────────────────────────────────────────────

export const socialStore = {
  getSnapshot: () => snap,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },

  configure(opts: {
    onReward: (r: RewardEvent) => Promise<void> | void;
    getGold: () => number;
    notify: (title: string, body: string) => void;
    profileExtras: () => Partial<PublicProfile>;
  }) {
    rewardHandler = opts.onReward;
    goldGetter = opts.getGold;
    notify = opts.notify;
    profileExtras = opts.profileExtras;
  },

  init(userId: string) {
    if (snap.userId === userId) return;
    unsubscribe?.();
    snap = { ...initial(), userId };
    listeners.forEach(l => l());
    refreshNow().catch(e => console.warn('[Social] init', e));
    unsubscribe = socialService.subscribe(userId, (table, row) => {
      if (table === 'friend_messages' && row.to_user === userId) {
        const from = snap.profiles[row.from_user as string]?.display_name ?? 'Un amigo';
        notify(row.kind === 'NUDGE' ? `🔥 ${from}` : `💬 ${from}`, String(row.body ?? ''));
      }
      scheduleRefresh();
    });
  },

  reset() {
    unsubscribe?.();
    unsubscribe = null;
    snap = initial();
    listeners.forEach(l => l());
  },

  refresh: () => refreshNow(),

  /** Keeps my public card and today's numbers up to date (call on change, it is cheap). */
  async publishToday(day: { score: number; focusMinutes: number; hudActive: boolean; hudStreak: number }) {
    const me = snap.userId;
    if (!me || !snap.available) return;
    const key = today();
    const row: DailyStatRow = {
      user_id: me, day: key, score: Math.max(0, Math.min(100, Math.round(day.score * 10) / 10)),
      focus_minutes: Math.max(0, Math.round(day.focusMinutes)), hud_streak_active: day.hudActive, hud_streak: day.hudStreak,
    };
    const prev = snap.stats[me]?.[key];
    if (prev && prev.score === row.score && prev.focusMinutes === row.focus_minutes && prev.hud === row.hud_streak_active) return;
    set({ stats: { ...snap.stats, [me]: { ...(snap.stats[me] ?? {}), [key]: { score: row.score, focusMinutes: row.focus_minutes, hud: row.hud_streak_active } } } });
    await socialService.publishDay(row);
    await socialService.upsertProfile({ user_id: me, hud_streak: day.hudStreak, ...profileExtras() });
  },

  /** Creates my invite code the first time it is needed. */
  async ensureInviteCode(): Promise<string | null> {
    const me = snap.userId;
    if (!me) return null;
    if (snap.myCode) return snap.myCode;
    const existing = await socialService.myInviteCode(me);
    if (existing === undefined) { set({ available: false }); return null; }
    if (existing) { set({ myCode: existing }); return existing; }
    for (let i = 0; i < 4; i++) {
      const code = makeInviteCode();
      if (await socialService.upsertProfile({ user_id: me, invite_code: code, ...profileExtras() })) {
        set({ myCode: code });
        return code;
      }
    }
    return null;
  },

  search: (q: string) => (snap.userId ? socialService.search(q, snap.userId) : Promise.resolve([])),

  async addFriend(userId: string) {
    if (!snap.userId) return false;
    const ok = await socialService.sendRequest(snap.userId, userId);
    if (ok) scheduleRefresh(0);
    return ok;
  },

  async answerRequest(friendshipId: string, accept: boolean) {
    const ok = await socialService.answerRequest(friendshipId, accept);
    if (ok) scheduleRefresh(0);
    return ok;
  },

  async removeFriend(friendshipId: string) {
    const ok = await socialService.removeFriendship(friendshipId);
    if (ok) scheduleRefresh(0);
    return ok;
  },

  async acceptInvite(code: string) {
    const r = await socialService.acceptInvite(code);
    if (r.ok) scheduleRefresh(0);
    return r;
  },

  // ── Duels ──
  async challenge(opts: { friendId: string; duration: DuelDuration; start: DayKey; excluded: DayKey[]; stake: number }) {
    const me = snap.userId;
    if (!me) return { ok: false as const, reason: 'NO_USER' };
    const problem = checkExclusions(opts.duration, opts.start, opts.excluded);
    if (problem) return { ok: false as const, reason: problem };
    if (opts.stake > goldGetter()) return { ok: false as const, reason: 'NO_GOLD' };
    const days = periodDays(opts.duration, opts.start);
    const row = await socialService.createDuel({
      challenger: me, opponent: opts.friendId, duration: opts.duration, start_day: opts.start,
      end_day: days[days.length - 1], excluded_days: [...new Set(opts.excluded)].sort(), stake: Math.max(0, Math.round(opts.stake)),
    });
    if (!row) return { ok: false as const, reason: 'SERVER' };
    if (row.stake > 0 && await claimOnce(row.id, 'STAKE_PAID')) await pay({ gold: -row.stake, xp: 0, chests: [] }, 'stake');
    scheduleRefresh(0);
    return { ok: true as const, duel: row };
  },

  async respondDuel(duel: DuelRow, accept: boolean) {
    if (!accept) {
      const ok = await socialService.updateDuel(duel.id, { status: 'DECLINED' });
      scheduleRefresh(0);
      return { ok, reason: ok ? null : 'SERVER' };
    }
    if (duel.start_day < today()) return { ok: false, reason: 'EXPIRED' };
    if (duel.stake > goldGetter()) return { ok: false, reason: 'NO_GOLD' };
    const ok = await socialService.updateDuel(duel.id, { status: 'ACTIVE', accepted_at: new Date().toISOString() });
    if (ok && duel.stake > 0 && await claimOnce(duel.id, 'STAKE_PAID')) await pay({ gold: -duel.stake, xp: 0, chests: [] }, 'stake');
    scheduleRefresh(0);
    return { ok, reason: ok ? null : 'SERVER' };
  },

  async cancelDuel(duel: DuelRow) {
    const ok = await socialService.updateDuel(duel.id, { status: 'CANCELLED' });
    scheduleRefresh(0);
    return ok;
  },

  // ── Friend streaks ──
  async proposeStreak(friendId: string) {
    if (!snap.userId) return false;
    const ok = await socialService.proposeStreak(snap.userId, friendId);
    scheduleRefresh(0);
    return ok;
  },

  async respondStreak(row: FriendStreakRow, accept: boolean) {
    const ok = await socialService.updateStreak(row.id, accept
      ? { status: 'ACTIVE', started_on: today() }
      : { status: 'ENDED', ended_at: new Date().toISOString() });
    scheduleRefresh(0);
    return ok;
  },

  async endStreak(row: FriendStreakRow) {
    const ok = await socialService.updateStreak(row.id, { status: 'ENDED', ended_at: new Date().toISOString() });
    scheduleRefresh(0);
    return ok;
  },

  // ── Messages ──
  async send(to: string, kind: MessageRow['kind'], body: string) {
    if (!snap.userId) return false;
    const ok = await socialService.send(snap.userId, to, kind, body.trim().slice(0, 200));
    if (ok) scheduleRefresh(300);
    return ok;
  },

  async markAllRead() {
    const me = snap.userId;
    const ids = snap.messages.filter(m => m.to_user === me && !m.read_at).map(m => m.id);
    if (!ids.length) return;
    set({ messages: snap.messages.map(m => (ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m)), unread: 0 });
    await socialService.markRead(ids);
  },

  statsFor,
};

export const useSocial = (): SocialSnapshot =>
  useSyncExternalStore(socialStore.subscribe, socialStore.getSnapshot, socialStore.getSnapshot);
