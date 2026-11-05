import type { UserPlan } from '../types/User';

/** What the server (RevenueCat → Supabase) says about the caller's plan. */
export interface ServerPlan {
  plan: UserPlan;
  es_pro: boolean;
  /** Epoch ms when the paid period ends. null = no expiry (lifetime / manual grant). */
  planExpiryDate: number | null;
  plan_product: string | null;
}

/** Store renewals can reach the server a little after the period ends. */
export const EXPIRY_GRACE_MS = 6 * 60 * 60 * 1000;

/** True when a store-backed plan has run out. A null date never expires. */
export const isPlanExpired = (planExpiryDate: number | null | undefined, now = Date.now()): boolean =>
  typeof planExpiryDate === 'number' && planExpiryDate + EXPIRY_GRACE_MS < now;

/**
 * Asks the `sync-subscription` edge function to re-read the caller's entitlements from RevenueCat and
 * update public.users. Activation and deactivation therefore never depend on the client's say-so.
 * Returns null when the server cannot be reached / is not configured (callers keep the local state).
 */
export const syncSubscriptionWithServer = async (force = false): Promise<ServerPlan | null> => {
  try {
    // Lazy: keeps the pure helpers above importable (and testable) without booting the Supabase client.
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke('sync-subscription', { body: { force } });
    if (error || !data || (data as { error?: string }).error) return null;
    return data as ServerPlan;
  } catch {
    return null;
  }
};
