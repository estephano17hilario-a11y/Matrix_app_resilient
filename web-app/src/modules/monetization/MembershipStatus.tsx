import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CalendarClock, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { describeMembership, formatMembershipDate, type MembershipInfo } from '../../services/subscriptionService';

type StoreEntitlement = Parameters<typeof describeMembership>[1];

/**
 * Reads the active Deluxe entitlement straight from Google Play (via RevenueCat): it knows the next
 * renewal date and whether auto-renew is still on. Falls back to the server row when unavailable.
 */
const useStoreEntitlement = (): StoreEntitlement => {
  const [ent, setEnt] = useState<StoreEntitlement>(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let alive = true;
    (async () => {
      try {
        const [{ Purchases }, { initRevenueCat, ENTITLEMENT_ID }] = await Promise.all([
          import('@revenuecat/purchases-capacitor'),
          import('../../services/revenueCatService'),
        ]);
        await initRevenueCat();
        const { customerInfo } = await Purchases.getCustomerInfo();
        const active = customerInfo?.entitlements?.active ?? {};
        const pick = active[ENTITLEMENT_ID] ?? Object.values(active)[0] ?? null;
        if (alive) setEnt(pick as StoreEntitlement);
      } catch (e) {
        console.warn('[Membership] could not read store entitlement:', e);
      }
    })();
    return () => { alive = false; };
  }, []);
  return ent;
};

export const useMembership = (): MembershipInfo => {
  const { profile } = useAuth();
  const ent = useStoreEntitlement();
  return describeMembership(profile as any, ent);
};

/** Compact card: "Plan mensual · Se renueva el 3 dic 2026 (cobro automático)". Renders nothing for free accounts. */
export const MembershipStatus = ({ className = '' }: { className?: string }) => {
  const { t, i18n } = useTranslation();
  const m = useMembership();
  if (!m.active) return null;

  const periodLabel = {
    weekly: t('membership.weekly', 'Plan semanal'),
    monthly: t('membership.monthly', 'Plan mensual'),
    yearly: t('membership.yearly', 'Plan anual'),
    unknown: t('membership.deluxe', 'Lux Deluxe'),
  }[m.period];

  const date = m.expiresMs ? formatMembershipDate(m.expiresMs, i18n.language) : null;
  let line: string;
  if (!date) line = t('membership.noExpiry', 'Sin fecha de vencimiento');
  else if (m.willRenew === false) line = t('membership.endsOn', 'Vence el {{date}} · renovación automática desactivada', { date });
  else if (m.willRenew === true) line = t('membership.renewsOn', 'Se renueva el {{date}} · cobro automático', { date });
  else line = t('membership.activeUntil', 'Activo hasta el {{date}}', { date });

  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-purple-500/25 bg-purple-500/[0.07] px-4 py-3 text-left ${className}`}>
      <div className="mt-0.5 text-purple-300">
        {m.willRenew === true ? <RefreshCw size={16} /> : <CalendarClock size={16} />}
      </div>
      <div className="min-w-0">
        <p className="text-white text-xs font-bold tracking-wide">{periodLabel}</p>
        <p className="text-white/60 text-[11px] font-medium mt-0.5">{line}</p>
        {m.billingIssue && (
          <p className="flex items-center gap-1 text-amber-300 text-[11px] font-semibold mt-1">
            <AlertTriangle size={12} />
            {t('membership.billingIssue', 'Problema con el pago: actualiza tu método de pago en Google Play.')}
          </p>
        )}
      </div>
    </div>
  );
};
