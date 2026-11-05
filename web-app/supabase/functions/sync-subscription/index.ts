// @ts-nocheck
// Called by the app (with the user's own JWT) right after a purchase / restore and whenever the
// app comes to the foreground. Asks RevenueCat what the caller is entitled to and updates
// public.users, so activation is instant (no waiting for the webhook) and deactivation happens
// automatically even if a webhook was lost.
//
// The user id comes from the verified JWT, never from the request body, so nobody can
// sync (or fake) another account.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { adminClient, applyState, corsHeaders, fetchRevenueCatState, json } from "../_shared/subscription.ts";

const db = adminClient();

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: auth, error: authErr } = await db.auth.getUser(jwt);
  if (authErr || !auth?.user) return json({ error: "unauthorized" }, 401);
  const userId = auth.user.id;

  try {
    // Cheap throttle: the app calls this on every foreground. A purchase/restore sends {force:true}.
    const force = (await req.json().catch(() => ({})))?.force === true;
    const { data: row } = await db
      .from("users")
      .select("plan, es_pro, planExpiryDate, plan_product, plan_synced_at")
      .eq("id", userId)
      .maybeSingle();
    const syncedAgo = row?.plan_synced_at ? Date.now() - Date.parse(row.plan_synced_at) : Infinity;
    if (!force && syncedAgo < 8000) return json({ plan: row.plan, es_pro: row.es_pro, planExpiryDate: row.planExpiryDate, plan_product: row.plan_product, cached: true });

    const state = await fetchRevenueCatState(userId);
    if (state === null) return json({ error: "REVENUECAT_SECRET_API_KEY not configured" }, 501);

    await applyState(db, userId, state);
    const { data: fresh } = await db.from("users").select("plan, es_pro, planExpiryDate, plan_product").eq("id", userId).maybeSingle();
    return json({ ...fresh });
  } catch (err) {
    console.error("sync-subscription error:", err);
    return json({ error: "sync failed" }, 502);
  }
});
