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

export type MembershipPeriod = 'weekly' | 'monthly' | 'yearly' | 'unknown';

export interface MembershipInfo {
  active: boolean;
  period: MembershipPeriod;
  /** Epoch ms when the current paid period ends (null = no expiry, e.g. manual grant). */
  expiresMs: number | null;
  /** true = Google Play will charge again automatically on `expiresMs`. null = unknown (server data only). */
  willRenew: boolean | null;
  billingIssue: boolean;
}

/** Infers the billing period from a Play / RevenueCat product id (e.g. `lux_weekly`, `lux_pro:mensual`). */
export const periodFromProduct = (productId: string | null | undefined): MembershipPeriod => {
  const id = (productId ?? '').toLowerCase();
  if (/week|seman|p1w/.test(id)) return 'weekly';
  if (/month|mens|p1m/.test(id)) return 'monthly';
  if (/year|annual|anual|p1y/.test(id)) return 'yearly';
  return 'unknown';
};

/**
 * Builds what the app shows about the membership. The store (RevenueCat `entitlements.active`) is the
 * freshest source: it knows the renewal date and whether auto-renew is still on. The server row
 * (`plan`, `planExpiryDate`, `plan_product`) is the fallback, e.g. on web or before the SDK answers.
 */
export const describeMembership = (
  profile: { plan?: string | null; planExpiryDate?: number | null; plan_product?: string | null } | null | undefined,
  storeEntitlement?: {
    expirationDate?: string | null;
    willRenew?: boolean;
    productIdentifier?: string;
    billingIssueDetectedAt?: string | null;
  } | null,
  now = Date.now(),
): MembershipInfo => {
  if (storeEntitlement) {
    const exp = storeEntitlement.expirationDate ? Date.parse(storeEntitlement.expirationDate) : null;
    return {
      active: exp === null || exp > now,
      period: periodFromProduct(storeEntitlement.productIdentifier),
      expiresMs: Number.isFinite(exp as number) ? exp : null,
      willRenew: typeof storeEntitlement.willRenew === 'boolean' ? storeEntitlement.willRenew : null,
      billingIssue: !!storeEntitlement.billingIssueDetectedAt,
    };
  }
  const isPro = profile?.plan === 'PRO' || profile?.plan === 'ELITE';
  const expiresMs = typeof profile?.planExpiryDate === 'number' ? profile.planExpiryDate : null;
  return {
    active: isPro && !isPlanExpired(expiresMs, now),
    period: periodFromProduct(profile?.plan_product),
    expiresMs,
    willRenew: null,
    billingIssue: false,
  };
};

/** "3 dic 2026" in the user's locale. */
export const formatMembershipDate = (ms: number, locale?: string): string =>
  new Date(ms).toLocaleDateString(locale || undefined, { day: 'numeric', month: 'short', year: 'numeric' });

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
