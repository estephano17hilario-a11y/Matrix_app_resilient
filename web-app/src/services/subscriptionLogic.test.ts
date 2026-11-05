import { describe, expect, it } from 'vitest';
import { deriveFromEvent, pickEntitlement, INACTIVE } from '../../supabase/functions/_shared/logic';
import { isPlanExpired, EXPIRY_GRACE_MS } from './subscriptionService';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 86_400_000;

describe('pickEntitlement (RevenueCat → access)', () => {
  it('activates a weekly plan until its own expiry', () => {
    const exp = NOW + 6 * DAY;
    const s = pickEntitlement({ lux_pro: { expires_date: iso(exp), product_identifier: 'lux_weekly' } }, NOW);
    expect(s).toEqual({ active: true, expiresMs: exp, productId: 'lux_weekly' });
  });

  it('activates a monthly plan until its own expiry', () => {
    const exp = NOW + 29 * DAY;
    const s = pickEntitlement({ lux_pro: { expires_date: iso(exp), product_identifier: 'lux_monthly' } }, NOW);
    expect(s.active).toBe(true);
    expect(s.expiresMs).toBe(exp);
    expect(s.productId).toBe('lux_monthly');
  });

  it('is inactive once the period has ended', () => {
    expect(pickEntitlement({ lux_pro: { expires_date: iso(NOW - 1000) } }, NOW)).toEqual(INACTIVE);
  });

  it('keeps access during the billing-retry grace period', () => {
    const grace = NOW + 3 * DAY;
    const s = pickEntitlement({ lux_pro: { expires_date: iso(NOW - DAY), grace_period_expires_date: iso(grace) } }, NOW);
    expect(s.active).toBe(true);
    expect(s.expiresMs).toBe(grace);
  });

  it('treats a null expiry as lifetime access', () => {
    expect(pickEntitlement({ lux_pro: { expires_date: null } }, NOW)).toMatchObject({ active: true, expiresMs: null });
  });

  it('prefers lux_pro, otherwise the longest-lasting active entitlement', () => {
    const s = pickEntitlement({
      other: { expires_date: iso(NOW + 30 * DAY), product_identifier: 'other' },
      lux_pro: { expires_date: iso(NOW + DAY), product_identifier: 'lux_weekly' },
    }, NOW);
    expect(s.productId).toBe('lux_weekly');
    const t = pickEntitlement({
      a: { expires_date: iso(NOW + DAY), product_identifier: 'a' },
      b: { expires_date: iso(NOW + 9 * DAY), product_identifier: 'b' },
    }, NOW);
    expect(t.productId).toBe('b');
  });

  it('handles empty / missing entitlements', () => {
    expect(pickEntitlement({}, NOW)).toEqual(INACTIVE);
    expect(pickEntitlement(undefined, NOW)).toEqual(INACTIVE);
  });
});

describe('deriveFromEvent (webhook fallback without REST key)', () => {
  const future = NOW + 7 * DAY;

  it.each(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE'])(
    '%s activates until expiration_at_ms', (type) => {
      expect(deriveFromEvent({ type, expiration_at_ms: future, product_id: 'p' }, NOW)).toEqual({ active: true, expiresMs: future, productId: 'p' });
    });

  it('a purchase event that is already expired does not activate', () => {
    expect(deriveFromEvent({ type: 'RENEWAL', expiration_at_ms: NOW - 1 }, NOW)).toEqual(INACTIVE);
  });

  it('CANCELLATION keeps access until the paid period ends (does NOT downgrade)', () => {
    expect(deriveFromEvent({ type: 'CANCELLATION', expiration_at_ms: future }, NOW)).toBe('NOOP');
  });

  it('CANCELLATION with an already-passed expiry (refund) downgrades', () => {
    expect(deriveFromEvent({ type: 'CANCELLATION', expiration_at_ms: NOW - 1 }, NOW)).toEqual(INACTIVE);
  });

  it('BILLING_ISSUE does not cut access during the grace period', () => {
    expect(deriveFromEvent({ type: 'BILLING_ISSUE', expiration_at_ms: future }, NOW)).toBe('NOOP');
  });

  it('EXPIRATION deactivates', () => {
    expect(deriveFromEvent({ type: 'EXPIRATION', expiration_at_ms: NOW - 1 }, NOW)).toEqual(INACTIVE);
  });

  it('ignores unknown / test events', () => {
    expect(deriveFromEvent({ type: 'TEST' }, NOW)).toBe('NOOP');
    expect(deriveFromEvent({ type: 'INVOICE_ISSUANCE' }, NOW)).toBe('NOOP');
  });
});

describe('isPlanExpired (client-side safety net)', () => {
  it('never expires without a date (manual / lifetime grants)', () => {
    expect(isPlanExpired(null, NOW)).toBe(false);
    expect(isPlanExpired(undefined, NOW)).toBe(false);
  });
  it('is valid inside the period and inside the renewal grace window', () => {
    expect(isPlanExpired(NOW + DAY, NOW)).toBe(false);
    expect(isPlanExpired(NOW - EXPIRY_GRACE_MS + 1000, NOW)).toBe(false);
  });
  it('expires after the grace window', () => {
    expect(isPlanExpired(NOW - EXPIRY_GRACE_MS - 1000, NOW)).toBe(true);
  });
});
