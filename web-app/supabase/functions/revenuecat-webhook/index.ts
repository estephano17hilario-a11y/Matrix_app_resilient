// @ts-nocheck
// RevenueCat -> Supabase webhook. Activates / extends / deactivates PRO automatically.
//
// Secrets: REVENUECAT_WEBHOOK_AUTH_TOKEN (must match the "Authorization header" set in the
// RevenueCat dashboard, value `Bearer <token>`), REVENUECAT_SECRET_API_KEY (sk_..., recommended),
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  UUID_RE, adminClient, applyState, corsHeaders, deriveFromEvent, fetchRevenueCatState, getSecret, json, safeEqual,
} from "../_shared/subscription.ts";

const db = adminClient();

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Fail closed: with no configured token EVERY request would otherwise match "Bearer undefined".
  const token = await getSecret("REVENUECAT_WEBHOOK_AUTH_TOKEN");
  if (!token) {
    console.error("REVENUECAT_WEBHOOK_AUTH_TOKEN is not configured");
    return json({ error: "webhook not configured" }, 500);
  }
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${token}`)) {
    return json({ error: "unauthorized" }, 401);
  }

  let event: any;
  try {
    event = (await req.json())?.event;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!event?.type) return json({ error: "no event" }, 400);

  try {
    // Users touched by this event. TRANSFER moves a subscription between app user ids.
    const candidates = new Set<string>(
      [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
        .filter((id: unknown): id is string => typeof id === "string" && UUID_RE.test(id)),
    );

    // Idempotency + audit trail.
    const eventId: string | null = event.id ?? null;
    if (eventId) {
      const { data: seen } = await db.from("subscription_events").select("id, applied").eq("event_id", eventId).maybeSingle();
      if (seen?.applied) return json({ success: true, duplicate: true });
    }
    const { data: logged, error: logErr } = await db
      .from("subscription_events")
      .upsert({
        event_id: eventId,
        app_user_id: String(event.app_user_id ?? ""),
        event_type: event.type,
        environment: event.environment ?? null,
        product_id: event.product_id ?? null,
        expiration_at_ms: event.expiration_at_ms ?? null,
        event_timestamp_ms: event.event_timestamp_ms ?? null,
        payload: event,
      }, { onConflict: "event_id" })
      .select("id")
      .maybeSingle();
    if (logErr) throw logErr;

    if (candidates.size === 0) {
      // Anonymous RevenueCat ids ($RCAnonymousID:...) cannot be mapped to a user. Ack so RC does not retry.
      await db.from("subscription_events").update({ applied: true, note: "no mappable user id" }).eq("id", logged?.id);
      return json({ success: true, ignored: "no mappable user id" });
    }

    const notes: string[] = [];
    for (const userId of candidates) {
      let state = await fetchRevenueCatState(userId);
      if (state === null) {
        // No REST key configured: fall back to what the event itself says (only for the event's own user).
        if (userId !== event.app_user_id) continue;
        const derived = deriveFromEvent(event);
        if (derived === "NOOP") { notes.push(`${event.type}: no access change`); continue; }
        state = derived;
      }
      const result = await applyState(db, userId, state, event.event_timestamp_ms);
      notes.push(`${userId.slice(0, 8)}: ${result.note}`);
    }

    await db.from("subscription_events").update({ applied: true, note: notes.join("; ").slice(0, 500) }).eq("id", logged?.id);
    console.log(`RevenueCat ${event.type} -> ${notes.join("; ")}`);
    return json({ success: true });
  } catch (err) {
    // 5xx makes RevenueCat retry the delivery, which is what we want for transient failures.
    console.error("Webhook error:", err);
    return json({ error: "internal error" }, 500);
  }
});
