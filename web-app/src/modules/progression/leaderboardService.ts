// Public leaderboard rows (table public_profiles, see supabase/migrations/20261030_social.sql).
// Every call degrades gracefully: if the table doesn't exist yet, the UI shows
// an "unavailable" state instead of failing.

import { supabase } from '@/services/supabase';

export interface LeaderboardRow {
  user_id: string;
  display_name: string | null;
  avatar_id: string | null;
  elo: number;
  rank_index: number;
  level: number;
  updated_at?: string;
}

const TABLE = 'public_profiles';

export const leaderboardService = {
  async publish(row: LeaderboardRow): Promise<boolean> {
    const { error } = await supabase.from(TABLE).upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) console.warn('[Leaderboard] publish failed', error.message);
    return !error;
  },

  async top(limit = 100): Promise<LeaderboardRow[] | null> {
    const { data, error } = await supabase.from(TABLE).select('user_id, display_name, avatar_id, elo, rank_index, level').order('elo', { ascending: false }).limit(limit);
    if (error) {
      console.warn('[Leaderboard] fetch failed', error.message);
      return null;
    }
    return data as LeaderboardRow[];
  },

  /** 1-based position of a user among everyone with more ELO (+1). */
  async positionOf(elo: number, minElo = 0): Promise<number | null> {
    const { count, error } = await supabase.from(TABLE).select('user_id', { count: 'exact', head: true }).gt('elo', elo).gte('elo', minElo);
    if (error) return null;
    return (count ?? 0) + 1;
  },
};
