// @ts-nocheck
// Shared subscription logic for the RevenueCat webhook and the sync-subscription function.
//
// Design: RevenueCat is the single source of truth. Both entry points end up calling
// `fetchRevenueCatState()` (asks RevenueCat's REST API what the user is entitled to RIGHT NOW)
// and `applyState()` (writes the result to public.users). Because the state is re-read
// instead of inferred from one event, out-of-order / duplicated / missing webhooks and
// TRANSFER events cannot leave a user in the wrong plan.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Constant-time string compare. */
export const safeEqual = (a: string, b: string): boolean => {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
};

/**
 * Reads a function secret. Order: environment variable (Supabase CLI / Coolify env) and then
 * Supabase Vault through `public.get_function_secret` (service_role only). Vault survives Coolify
 * redeploys, which regenerate the container environment from Coolify's own database.
 * Values are cached per worker for a few minutes.
 */
const secretCache = new Map<string, { value: string | null; at: number }>();
export async function getSecret(name: string): Promise<string | null> {
  const fromEnv = Deno.env.get(name);
  if (fromEnv) return fromEnv;
  const hit = secretCache.get(name);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.value;
  let value: string | null = null;
  try {
    const { data, error } = await adminClient().rpc("get_function_secret", { p_name: name });
    if (error) console.error(`get_function_secret(${name}) failed:`, error.message);
    else value = typeof data === "string" && data.length > 0 ? data : null;
  } catch (err) {
    console.error(`get_function_secret(${name}) threw:`, err);
  }
  secretCache.set(name, { value, at: Date.now() });
  return value;
}

export { ENTITLEMENT_ID, INACTIVE, deriveFromEvent, pickEntitlement } from "./logic.ts";
import { INACTIVE, pickEntitlement } from "./logic.ts";
import type { PlanState } from "./logic.ts";
export type { PlanState };

/** Reads the customer's current entitlements from RevenueCat. Returns null when no secret key is configured. */
export async function fetchRevenueCatState(appUserId: string): Promise<PlanState | null> {
  const key = await getSecret("REVENUECAT_SECRET_API_KEY");
  if (!key) return null;

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`RevenueCat API responded ${res.status}`);

  const { subscriber } = await res.json();
  return pickEntitlement(subscriber?.entitlements, Date.now());
}

export interface ApplyResult { applied: boolean; note: string; plan?: string; expiresMs?: number | null }

/** Writes a resolved state to public.users. Never downgrades manually granted PRO accounts. */
export async function applyState(db: any, userId: string, state: PlanState, eventMs?: number | null): Promise<ApplyResult> {
  const { data: row, error: readErr } = await db
    .from("users")
    .select("id, plan, plan_source, revenuecat_app_user_id, plan_event_ms")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!row) return { applied: false, note: "user row not found" };

  if (eventMs && row.plan_event_ms && eventMs < row.plan_event_ms) {
    return { applied: false, note: "stale event ignored" };
  }

  const revenueCatManaged = row.plan_source === "revenuecat" || row.revenuecat_app_user_id === row.id;
  if (!state.active && row.plan !== "FREE" && !revenueCatManaged) {
    // PRO granted by hand (developer / promo): RevenueCat knowing nothing about it is expected.
    return { applied: false, note: "manual PRO left untouched", plan: row.plan };
  }

  const patch = state.active
    ? { plan: "PRO", es_pro: true, planExpiryDate: state.expiresMs, plan_product: state.productId }
    : { plan: "FREE", es_pro: false, planExpiryDate: null, plan_product: null };

  const { error } = await db
    .from("users")
    .update({
      ...patch,
      plan_source: "revenuecat",
      revenuecat_app_user_id: userId,
      plan_synced_at: new Date().toISOString(),
      ...(eventMs ? { plan_event_ms: eventMs } : {}),
    })
    .eq("id", userId);
  if (error) throw error;

  return { applied: true, note: state.active ? "activated" : "deactivated", plan: patch.plan, expiresMs: patch.planExpiryDate };
}
