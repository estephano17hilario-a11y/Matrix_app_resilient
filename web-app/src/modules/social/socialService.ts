// Supabase access for the social features. Every function returns null / []
// on failure (e.g. before the migration is applied) instead of throwing, and
// callers show an "unavailable" state.

import { supabase } from '@/services/supabase';
import type { DayKey, DuelDuration } from './engine';

export interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_id: string | null;
  elo: number;
  rank_index: number;
  division: number | null;
  level: number;
  hud_streak: number;
  invite_code?: string | null;
  /** Deluxe (PRO) subscriber. Written only by the server (see 20261126_deluxe_badge.sql). */
  is_deluxe?: boolean;
}

export interface Friendship {
  id: string;
  requester: string;
  addressee: string;
  status: 'PENDING' | 'ACCEPTED';
  created_at: string;
}

export interface DailyStatRow {
  user_id: string;
  day: DayKey;
  score: number;
  focus_minutes: number;
  hud_streak_active: boolean;
  hud_streak: number;
}

export type DuelStatus = 'PENDING' | 'ACTIVE' | 'DECLINED' | 'CANCELLED' | 'FINISHED';

export interface DuelRow {
  id: string;
  challenger: string;
  opponent: string;
  duration: DuelDuration;
  start_day: DayKey;
  end_day: DayKey;
  excluded_days: DayKey[];
  stake: number;
  status: DuelStatus;
  winner: string | null;
  created_at: string;
  accepted_at: string | null;
  finished_at: string | null;
}

export type ClaimKind = 'STAKE_PAID' | 'STAKE_REFUND' | 'DAY_WIN' | 'FINAL_WIN';
export interface ClaimRow { duel_id: string; user_id: string; kind: ClaimKind; day: DayKey }

export interface FriendStreakRow {
  id: string;
  user_a: string;
  user_b: string;
  requested_by: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED';
  started_on: DayKey | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  from_user: string;
  to_user: string;
  kind: 'NUDGE' | 'MESSAGE';
  body: string;
  created_at: string;
  read_at: string | null;
}

export const NO_DAY = '1900-01-01';

const BASE_PROFILE_COLS = 'user_id, display_name, avatar_id, elo, rank_index, division, level, hud_streak';
// `is_deluxe` only exists after the 20261126 migration: until then (or if it is ever rolled back) a read that
// fails because of it is retried without it, so Friends never breaks over a badge.
let deluxeColumnMissing = false;
const profileCols = () => (deluxeColumnMissing ? BASE_PROFILE_COLS : `${BASE_PROFILE_COLS}, is_deluxe`);
const isMissingDeluxeColumn = (error: { message?: string; code?: string } | null) =>
  !!error && (error.code === '42703' || error.code === 'PGRST204' || /is_deluxe/i.test(error.message ?? ''));

const warn = (what: string, error: { message: string } | null) => {
  if (error) console.warn(`[Social] ${what} failed:`, error.message);
};

/** Reason of the last failed load, shown on the "unavailable" screen so a failure is diagnosable. */
let lastLoadError: string | null = null;

const describeError = (error: { message?: string; code?: string } | null): string =>
  [error?.code, error?.message].filter(Boolean).join(' · ') || 'Error desconocido';

export const socialService = {
  lastError: (): string | null => lastLoadError,

  /**
   * Waits until the persisted login is restored. On the phone the session is read from native
   * storage asynchronously: a request fired before that goes out as "anon" and is rejected, which
   * used to leave Friends stuck on "unavailable" until the user retried by hand.
   */
  async whenSessionReady(timeoutMs = 6000): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return true;
    } catch { /* fall through to waiting for the auth event */ }
    return new Promise<boolean>(resolve => {
      let stop: () => void = () => {};
      let done = false;
      const finish = (ok: boolean) => { if (done) return; done = true; clearTimeout(timer); stop(); resolve(ok); };
      const timer = setTimeout(() => finish(false), timeoutMs);
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { if (session) finish(true); });
      stop = () => sub.subscription.unsubscribe();
      if (done) stop();
    });
  },

  /** Calls `cb` whenever the login becomes (or is refreshed to) valid. Returns an unsubscribe. */
  onSessionAvailable(cb: () => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) cb();
    });
    return () => data.subscription.unsubscribe();
  },
  // ── Profiles ──
  async upsertProfile(row: Partial<PublicProfile> & { user_id: string }): Promise<boolean> {
    const { error } = await supabase.from('public_profiles').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    warn('profile upsert', error);
    return !error;
  },

  /** My own invite code, created server-side the first time (other users can never read it). */
  async myInviteCode(_userId: string): Promise<string | null | undefined> {
    const { data, error } = await supabase.rpc('my_invite_code');
    if (error) { warn('invite code', error); return undefined; }
    return (data as string | null) ?? null;
  },

  async profiles(ids: string[]): Promise<PublicProfile[]> {
    if (!ids.length) return [];
    const read = () => supabase.from('public_profiles').select(profileCols()).in('user_id', ids);
    let { data, error } = await read();
    if (isMissingDeluxeColumn(error)) { deluxeColumnMissing = true; ({ data, error } = await read()); }
    warn('profiles', error);
    return (data as unknown as PublicProfile[]) ?? [];
  },

  async search(query: string, excludeId: string): Promise<PublicProfile[] | null> {
    const q = query.trim().replace(/[%_,()]/g, '');
    if (q.length < 2) return [];
    const read = () => supabase.from('public_profiles').select(profileCols())
      .ilike('display_name', `%${q}%`).neq('user_id', excludeId).order('elo', { ascending: false }).limit(25);
    let { data, error } = await read();
    if (isMissingDeluxeColumn(error)) { deluxeColumnMissing = true; ({ data, error } = await read()); }
    if (error) { warn('search', error); return null; }
    return data as unknown as PublicProfile[];
  },

  // ── Friendships ──
  async friendships(): Promise<Friendship[] | null> {
    const { data, error } = await supabase.from('friendships').select('id, requester, addressee, status, created_at');
    if (error) { warn('friendships', error); lastLoadError = describeError(error); return null; }
    lastLoadError = null;
    return data as Friendship[];
  },

  async sendRequest(me: string, to: string): Promise<boolean> {
    const { error } = await supabase.from('friendships').insert({ requester: me, addressee: to });
    warn('friend request', error);
    return !error;
  },

  async answerRequest(id: string, accept: boolean): Promise<boolean> {
    const { error } = accept
      ? await supabase.from('friendships').update({ status: 'ACCEPTED', responded_at: new Date().toISOString() }).eq('id', id)
      : await supabase.from('friendships').delete().eq('id', id);
    warn('answer request', error);
    return !error;
  },

  async removeFriendship(id: string): Promise<boolean> {
    const { error } = await supabase.from('friendships').delete().eq('id', id);
    warn('remove friend', error);
    return !error;
  },

  /** Returns the inviter's user id. Errors: INVITE_NOT_FOUND, INVITE_SELF. */
  async acceptInvite(code: string): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
    const { data, error } = await supabase.rpc('accept_invite', { p_code: code });
    if (error) return { ok: false, reason: /INVITE_\w+/.exec(error.message)?.[0] ?? error.message };
    return { ok: true, userId: data as string };
  },

  // ── Daily stats ──
  async publishDay(row: DailyStatRow): Promise<boolean> {
    const { error } = await supabase.from('daily_public_stats').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' });
    warn('publish day', error);
    return !error;
  },

  async stats(userIds: string[], from: DayKey, to: DayKey): Promise<DailyStatRow[]> {
    if (!userIds.length) return [];
    const { data, error } = await supabase.from('daily_public_stats')
      .select('user_id, day, score, focus_minutes, hud_streak_active, hud_streak')
      .in('user_id', userIds).gte('day', from).lte('day', to);
    warn('stats', error);
    return (data as DailyStatRow[]) ?? [];
  },

  // ── Duels ──
  async duels(): Promise<DuelRow[] | null> {
    const { data, error } = await supabase.from('duels').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) { warn('duels', error); return null; }
    return data as DuelRow[];
  },

  async createDuel(row: Omit<DuelRow, 'id' | 'status' | 'winner' | 'created_at' | 'accepted_at' | 'finished_at'>): Promise<DuelRow | null> {
    const { data, error } = await supabase.from('duels').insert(row).select('*').single();
    warn('create duel', error);
    return (data as DuelRow) ?? null;
  },

  async updateDuel(id: string, patch: Partial<DuelRow>): Promise<boolean> {
    const { error } = await supabase.from('duels').update(patch).eq('id', id);
    warn('update duel', error);
    return !error;
  },

  async claims(duelIds: string[]): Promise<ClaimRow[]> {
    if (!duelIds.length) return [];
    const { data, error } = await supabase.from('duel_claims').select('duel_id, user_id, kind, day').in('duel_id', duelIds);
    warn('claims', error);
    return (data as ClaimRow[]) ?? [];
  },

  /** Inserts a claim. Returns false when it already existed (prize already paid). */
  async claim(row: ClaimRow): Promise<boolean> {
    const { error } = await supabase.from('duel_claims').insert(row);
    if (error && !/duplicate|23505/i.test(`${error.message} ${(error as { code?: string }).code ?? ''}`)) warn('claim', error);
    return !error;
  },

  // ── Friend streaks ──
  async streaks(): Promise<FriendStreakRow[] | null> {
    const { data, error } = await supabase.from('friend_streaks').select('*').neq('status', 'ENDED');
    if (error) { warn('streaks', error); return null; }
    return data as FriendStreakRow[];
  },

  async proposeStreak(me: string, friend: string): Promise<boolean> {
    const { error } = await supabase.from('friend_streaks').insert({ user_a: me, user_b: friend, requested_by: me });
    warn('propose streak', error);
    return !error;
  },

  async updateStreak(id: string, patch: Partial<FriendStreakRow> & { ended_at?: string }): Promise<boolean> {
    const { error } = await supabase.from('friend_streaks').update(patch).eq('id', id);
    warn('update streak', error);
    return !error;
  },

  // ── Messages ──
  async inbox(me: string, limit = 50): Promise<MessageRow[]> {
    const { data, error } = await supabase.from('friend_messages').select('*')
      .or(`to_user.eq.${me},from_user.eq.${me}`).order('created_at', { ascending: false }).limit(limit);
    warn('inbox', error);
    return (data as MessageRow[]) ?? [];
  },

  async send(me: string, to: string, kind: MessageRow['kind'], body: string): Promise<boolean> {
    const { error } = await supabase.from('friend_messages').insert({ from_user: me, to_user: to, kind, body });
    warn('send message', error);
    return !error;
  },

  async markRead(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await supabase.from('friend_messages').update({ read_at: new Date().toISOString() }).in('id', ids);
    warn('mark read', error);
  },

  /** Live updates for anything that touches me. Returns an unsubscribe function. */
  subscribe(me: string, onChange: (table: string, row: Record<string, unknown>) => void): () => void {
    const channel = supabase.channel(`social-${me}`);
    for (const [table, filter] of [
      ['friend_messages', `to_user=eq.${me}`],
      ['friendships', `addressee=eq.${me}`],
      ['friendships', `requester=eq.${me}`],
      ['duels', `opponent=eq.${me}`],
      ['duels', `challenger=eq.${me}`],
      ['friend_streaks', `user_b=eq.${me}`],
      ['friend_streaks', `user_a=eq.${me}`],
    ] as const) {
      channel.on('postgres_changes' as never, { event: '*', schema: 'public', table, filter } as never, (payload: { new?: Record<string, unknown> }) => onChange(table, payload.new ?? {}));
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};
