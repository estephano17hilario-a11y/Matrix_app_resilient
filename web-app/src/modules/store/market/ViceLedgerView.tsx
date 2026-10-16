import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Coins, ScrollText, Ticket } from 'lucide-react';
import type { ViceLedgerEntry } from '@/types';
import { receiptCode } from './viceMarket';
import { toRgb } from './ViceCard';

const DAY = 24 * 60 * 60 * 1000;

export const ViceLedgerView = ({ ledger }: { ledger: ViceLedgerEntry[] }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
  const now = Date.now();

  const stats = useMemo(() => {
    const spent = (ms: number) => ledger.filter(e => now - e.createdAt < ms).reduce((s, e) => s + e.price, 0);
    const uses = ledger.filter(e => e.kind === 'PASS_USE' && now - e.createdAt < 30 * DAY).length;
    const byVice = new Map<string, { title: string; color?: string; total: number }>();
    ledger.forEach(e => {
      if (e.price <= 0 || now - e.createdAt > 30 * DAY) return;
      const cur = byVice.get(e.habitId) || { title: e.habitTitle, color: e.color, total: 0 };
      cur.total += e.price;
      byVice.set(e.habitId, cur);
    });
    const top = Array.from(byVice.values()).sort((a, b) => b.total - a.total).slice(0, 4);
    return { week: spent(7 * DAY), month: spent(30 * DAY), uses, top, max: top[0]?.total || 1 };
  }, [ledger, now]);

  const days = useMemo(() => {
    const groups = new Map<string, ViceLedgerEntry[]>();
    ledger.forEach(e => {
      const key = new Date(e.createdAt).toDateString();
      groups.set(key, [...(groups.get(key) || []), e]);
    });
    return Array.from(groups.entries());
  }, [ledger]);

  if (ledger.length === 0) {
    return (
      <div className="lux-reveal rounded-[24px] border border-white/[0.06] bg-white/[0.02] py-14 px-6 text-center">
        <ScrollText className="mx-auto text-white/20" size={36} strokeWidth={1.5} />
        <div className="mt-3 text-[14px] font-bold text-white/60">{t('store.ledger.emptyTitle', 'Tu registro está en blanco')}</div>
        <div className="mt-1 text-[12px] text-white/35">{t('store.ledger.emptyDesc', 'Cada pase e indulgencia quedará escrita aquí.')}</div>
      </div>
    );
  }

  // Purchases cost gold; anything else is a use (older entries included).
  const isBuy = (e: ViceLedgerEntry) => e.price > 0;
  const label = (e: ViceLedgerEntry) => (isBuy(e)
    ? (e.deal ? t('store.ledger.dealBuy', 'Pase en oferta') : t('store.ledger.passBuy', 'Pase comprado'))
    : t('store.ledger.passUse', 'Indulgencia con pase'));
  const iconOf = (e: ViceLedgerEntry) => (isBuy(e) ? Ticket : CheckCircle2);

  return (
    <div className="space-y-4">
      <div className="lux-reveal grid grid-cols-3 gap-2.5">
        {[
          { label: t('store.ledger.week', 'Esta semana'), value: stats.week, coin: true },
          { label: t('store.ledger.month', '30 días'), value: stats.month, coin: true },
          { label: t('store.ledger.uses', 'Indulgencias'), value: stats.uses, coin: false },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/35 truncate">{s.label}</div>
            <div className="mt-1 flex items-center gap-1 text-[19px] font-black text-white tabular-nums">
              {s.value.toLocaleString()} {s.coin && <Coins size={13} className="text-amber-400" fill="currentColor" />}
            </div>
          </div>
        ))}
      </div>

      {stats.top.length > 0 && (
        <div className="lux-reveal rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{t('store.ledger.byVice', 'Dónde va tu oro (30 días)')}</div>
          <div className="mt-3 space-y-2.5">
            {stats.top.map(v => {
              const rgb = toRgb(v.color);
              return (
                <div key={v.title}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-white/75 truncate">{v.title}</span>
                    <span className="font-black text-white/80 tabular-nums">{v.total.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(v.total / stats.max) * 100}%`, background: `rgb(${rgb})`, boxShadow: `0 0 8px rgb(${rgb} / 0.6)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {days.map(([day, entries]) => (
        <div key={day} className="lux-reveal">
          <div className="px-1 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            {new Date(entries[0].createdAt).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.05]">
            {entries.map(e => {
              const Icon = iconOf(e);
              const rgb = toRgb(e.color);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `rgb(${rgb} / 0.14)`, color: `rgb(${rgb})` }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">{e.habitTitle}</div>
                    <div className="text-[10.5px] text-white/40 truncate">
                      {label(e)} · {new Date(e.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · <span className="font-mono">{receiptCode(e.id)}</span>
                    </div>
                  </div>
                  {e.price > 0 ? (
                    <div className="text-[13px] font-black text-amber-300 tabular-nums">−{e.price.toLocaleString()}</div>
                  ) : (
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300/80">{t('store.ledger.used', 'Uso')}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
