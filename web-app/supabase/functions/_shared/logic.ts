// Pure subscription rules (no Deno / network imports) so they can be unit-tested with Vitest.

export const ENTITLEMENT_ID = "lux_pro";

export interface PlanState {
  active: boolean;
  /** Epoch ms when access ends; null = no expiry (lifetime / promotional without end). */
  expiresMs: number | null;
  productId: string | null;
}

export const INACTIVE: PlanState = { active: false, expiresMs: null, productId: null };

/**
 * Picks the entitlement that grants access from a RevenueCat `subscriber.entitlements` object.
 * Billing-retry grace keeps access until the grace period ends. Prefers `lux_pro`, otherwise
 * the entitlement that lasts longest.
 */
export function pickEntitlement(entitlements: Record<string, any> | undefined | null, now: number): PlanState {
  let best: PlanState | null = null;
  for (const [id, ent] of Object.entries(entitlements ?? {})) {
    const exp = ent?.expires_date ? Date.parse(ent.expires_date) : null;
    const grace = ent?.grace_period_expires_date ? Date.parse(ent.grace_period_expires_date) : null;
    const until = exp === null ? null : Math.max(exp, grace ?? 0);
    if (until !== null && until <= now) continue;
    const candidate: PlanState = { active: true, expiresMs: until, productId: ent?.product_identifier ?? null };
    if (id === ENTITLEMENT_ID) return candidate;
    if (!best) { best = candidate; continue; }
    if (best.expiresMs !== null && (until === null || until > best.expiresMs)) best = candidate;
  }
  return best ?? INACTIVE;
}

/** Fallback when no REST key is configured: derive the state from the webhook event alone. */
export function deriveFromEvent(event: any, now = Date.now()): PlanState | "NOOP" {
  const exp: number | null = event?.expiration_at_ms ?? null;
  switch (event?.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT":
      return exp === null || exp > now
        ? { active: true, expiresMs: exp, productId: event.new_product_id ?? event.product_id ?? null }
        : INACTIVE;
    // CANCELLATION only turns auto-renew off: the user paid until expiration_at_ms.
    // BILLING_ISSUE starts a grace/retry period; SUBSCRIPTION_PAUSED takes effect at period end.
    case "CANCELLATION":
    case "BILLING_ISSUE":
    case "SUBSCRIPTION_PAUSED":
      return exp !== null && exp <= now ? INACTIVE : "NOOP";
    case "EXPIRATION":
      return INACTIVE;
    default:
      return "NOOP";
  }
}
