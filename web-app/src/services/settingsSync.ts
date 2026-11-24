// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS SYNC — one place that writes the per-user `settings` document
// (user_collections row `config_<uid>`).
//
// Preferred path: the atomic server-side `merge_user_settings(patch)` RPC
// (migration 20261123_persistence.sql). It cannot lose keys written by another
// device/component and needs no read round-trip.
// Fallback (RPC not deployed yet): read → shallow merge → upsert, with
// `local_prefs` merged one level deeper so the semantics are identical.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';

export type SettingsPatch = Record<string, any>;

let rpcAvailable: boolean | null = null; // null = not probed yet

const isMissingRpc = (error: any): boolean => {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return code === 'PGRST202' || code === '42883' || msg.includes('could not find the function') || msg.includes('does not exist');
};

/** Network/server hiccups worth retrying later (as opposed to RLS / validation errors). */
export const isTransientError = (error: any): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  if (status >= 500 || status === 408 || status === 429) return true;
  const msg = String(error?.message || error || '').toLowerCase();
  return /fetch|network|timeout|timed out|load failed|gateway|unavailable|econn|socket|offline/.test(msg);
};

const deepMergeLocalPrefs = (existing: any, patch: SettingsPatch) => {
  const { local_prefs: patchPrefs, ...rest } = patch;
  const merged: Record<string, any> = { ...(existing || {}), ...rest };
  if (patchPrefs && typeof patchPrefs === 'object') {
    merged.local_prefs = { ...((existing && existing.local_prefs) || {}), ...patchPrefs };
  }
  return merged;
};

/** Merge `patch` into the settings doc of `userId`. Throws on failure (caller decides to queue). */
export const mergeUserSettings = async (userId: string, patch: SettingsPatch): Promise<void> => {
  if (rpcAvailable !== false) {
    const { error } = await supabase.rpc('merge_user_settings', { p_patch: patch });
    if (!error) { rpcAvailable = true; return; }
    if (!isMissingRpc(error)) throw error;
    rpcAvailable = false; // not deployed: use the fallback for the rest of the session
  }

  const docId = `config_${userId}`;
  const { data: current, error: readErr } = await supabase
    .from('user_collections')
    .select('data')
    .eq('id', docId)
    .eq('user_id', userId)
    .eq('collection_name', 'settings')
    .maybeSingle();
  if (readErr) throw readErr;

  const { error } = await supabase
    .from('user_collections')
    .upsert({
      id: docId,
      user_id: userId,
      collection_name: 'settings',
      data: deepMergeLocalPrefs(current?.data, patch),
      deleted: false
    }, { onConflict: 'id' });
  if (error) throw error;
};
