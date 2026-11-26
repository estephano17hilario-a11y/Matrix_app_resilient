import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Clock, Coins, Flame, Lock, Settings2, Ticket, TrendingUp } from 'lucide-react';
import { DynamicIcon } from '@/components/DynamicIcon';
import type { BadHabit } from '@/types';
import { agoBucket, SEVERITY_LABELS, streakAtStake, viceImpact, viceRarity, type Rarity } from './viceMarket';
import './shop.css';

export const toRgb = (hex?: string, fallback = '244 63 94') => {
  if (!hex) return fallback;
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : fallback;
};

export interface Quote { base: number; full: number; price: number; recent: number; inflation: number; deal: boolean }

export const RarityTag = ({ rarity, className = '' }: { rarity: Rarity; className?: string }) => {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[9.5px] font-black uppercase tracking-[0.16em] ${className}`} style={{ color: `rgb(${rarity.rgb})` }}>
      <span className="lux-gem" data-tier={rarity.tier} style={{ background: `rgb(${rarity.rgb})`, boxShadow: `0 0 8px rgb(${rarity.rgb} / 0.8)` }} />
      {t(`store.rarity.${rarity.key}`, rarity.label)}
    </span>
  );
};

/** Damage colour by severity: from calm amber to blood red. */
const SEVERITY_RGB = ['250 204 21', '251 146 60', '249 115 22', '244 63 94', '220 38 38'];

/** "How bad is it": five pips, as many lit as the habit's impact. */
export const SeverityPips = ({ impact, size = 7 }: { impact: number; size?: number }) => (
  <span className="inline-flex items-center gap-[3px]" aria-hidden>
    {Array.from({ length: 5 }).map((_, i) => {
      const on = i < impact;
      const rgb = SEVERITY_RGB[Math.min(4, impact - 1)];
      return (
        <span
          key={i}
          className="rounded-[2px] rotate-45"
          style={{
            width: size,
            height: size,
            background: on ? `rgb(${rgb})` : 'rgba(255,255,255,0.1)',
            boxShadow: on ? `0 0 6px rgb(${rgb} / 0.7)` : 'none',
          }}
        />
      );
    })}
  </span>
);

const Fact = ({ icon: Icon, label, value, rgb }: { icon: typeof Clock; label: string; value: ReactNode; rgb: string }) => (
  <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-black/30 px-2 py-1">
    <div className="flex min-w-0 items-center gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-white/45">
      <Icon size={10} className="shrink-0" /> <span className="truncate">{label}</span>
    </div>
    <div className="shrink-0 whitespace-nowrap text-[12px] font-extrabold tabular-nums" style={{ color: `rgb(${rgb})` }}>{value}</div>
  </div>
);

interface ViceCardProps {
  habit: BadHabit;
  rgb: string;
  quote: Quote;
  gold: number;
  /** Last time the vice was done (relapse or paid indulgence); null = never. */
  lastAt: number | null;
  onBuy: () => void;
  onUse: () => void;
  onConfigure: () => void;
}

/**
 * One item on the shelf. Everything you need to decide, without opening anything:
 * its price, how bad it is, when you last did it and how long you've gone without.
 */
export const ViceCard = ({ habit, rgb, quote, gold, lastAt, onBuy, onUse, onConfigure }: ViceCardProps) => {
  const { t } = useTranslation();
  const rarity = viceRarity(habit);
  const impact = viceImpact(habit);
  const passes = habit.vicePasses || 0;
  const stake = streakAtStake(habit);
  const affordable = gold >= quote.price;
  const missing = Math.max(0, quote.price - gold);
  const saved = Math.min(1, gold / Math.max(1, quote.price));
  const high = rarity.tier >= 4;

  const ago = agoBucket(lastAt);
  const agoText = {
    never: t('store.shelf.never', 'Nunca'),
    today: t('store.shelf.today', 'Hoy'),
    yesterday: t('store.shelf.yesterday', 'Ayer'),
    days: t('store.shelf.daysAgo', 'hace {{count}} d', { count: ago.count }),
    weeks: t('store.shelf.weeksAgo', 'hace {{count}} sem', { count: ago.count }),
    months: t('store.shelf.monthsAgo', 'hace {{count}} m', { count: ago.count }),
  }[ago.key];
  // Fresh relapse = red, a while ago = calm green.
  const agoRgb = ago.key === 'today' ? '244 63 94' : ago.key === 'yesterday' || (ago.key === 'days' && ago.count < 4) ? '251 146 60' : '52 211 153';
  const streakRgb = stake > 0 ? '251 146 60' : '161 161 170';
  const impactLabel = t(`store.severity.${impact}`, SEVERITY_LABELS[impact - 1]);

  return (
    <div className="shop-shelf lux-reveal">
      <motion.div
        role="button"
        tabIndex={0}
        onClick={onBuy}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBuy(); } }}
        whileTap={{ scale: 0.975 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        aria-label={`${habit.title} · ${quote.price}`}
        className="shop-item relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[22px] border outline-none"
        style={{
          borderColor: `rgb(${rarity.rgb} / ${high ? 0.5 : 0.24})`,
          background: `linear-gradient(168deg, rgb(${rgb} / 0.16) 0%, rgba(26,19,15,0.96) 42%, rgba(12,9,8,0.98) 100%)`,
          boxShadow: high
            ? `0 16px 30px -18px rgb(${rarity.rgb} / 0.8), inset 0 1px 0 rgba(255,255,255,0.07)`
            : 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {high && <div className="lux-shine" style={{ ['--lux-shine' as string]: rarity.rgb }} />}

        {/* rarity + configure */}
        <div className="relative flex items-center justify-between pl-3 pr-1.5 pt-2">
          <RarityTag rarity={rarity} className="!text-[8.5px] !tracking-[0.14em]" />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onConfigure(); }}
            aria-label={t('store.market.configure', 'Configurar oferta')}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/35 active:text-white before:absolute before:-inset-1 before:content-['']"
          >
            <Settings2 size={13} />
          </button>
        </div>

        {/* the item itself */}
        <div className="relative mx-auto mt-0.5 h-[68px] w-[68px]">
          <div className="absolute inset-[-14px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, rgb(${rgb} / 0.35), transparent 68%)` }} />
          <div
            className="shop-bob relative flex h-full w-full items-center justify-center rounded-[22px] border"
            style={{
              background: `linear-gradient(145deg, rgb(${rgb} / 0.28), rgb(${rgb} / 0.08))`,
              borderColor: `rgb(${rgb} / 0.45)`,
              color: `rgb(${rgb})`,
              boxShadow: `0 10px 22px -10px rgb(${rgb} / 0.7), inset 0 1px 0 rgba(255,255,255,0.18)`,
              animationDelay: `${(habit.id.charCodeAt(0) % 7) * -0.4}s`,
            }}
          >
            <DynamicIcon icon={habit.iconName || 'Skull'} size={32} fallback="⛓" />
          </div>
          {passes > 0 && (
            <span
              className="absolute -right-3 -top-1 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black"
              style={{ background: `rgb(${rgb})`, borderColor: 'rgba(0,0,0,0.35)', boxShadow: `0 0 10px rgb(${rgb} / 0.6)` }}
              aria-label={t('store.market.passesOwned', '{{count}} pases guardados', { count: passes })}
            >
              <Ticket size={10} /> ×{passes}
            </span>
          )}
        </div>

        {/* name + how bad */}
        <div className="relative px-3 pt-2.5 text-center">
          <div className="line-clamp-2 min-h-[2.5em] break-words text-[14px] font-extrabold leading-tight text-white">{habit.title}</div>
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            <SeverityPips impact={impact} />
            <span className="text-[9.5px] font-black uppercase tracking-[0.1em]" style={{ color: `rgb(${SEVERITY_RGB[impact - 1]})` }}>{impactLabel}</span>
          </div>
        </div>

        {/* the facts */}
        <div className="relative mx-3 mt-2.5 flex flex-col gap-1">
          <Fact icon={Clock} label={t('store.shelf.last', 'Última')} value={agoText} rgb={agoRgb} />
          <Fact
            icon={Flame}
            label={t('store.shelf.streak', 'Racha')}
            value={stake > 0 ? t('store.shelf.days', '{{count}} d', { count: stake }) : t('store.shelf.broken', 'Rota')}
            rgb={streakRgb}
          />
        </div>

        {/* price tag */}
        <div className="relative mt-auto flex flex-col gap-1.5 p-3 pt-2.5">
          {passes > 0 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onUse(); }}
              className="relative flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] text-black before:absolute before:-inset-1 before:content-['']"
              style={{ background: `rgb(${rgb})`, boxShadow: `0 0 12px rgb(${rgb} / 0.4)` }}
            >
              <Ticket size={11} /> {t('store.market.use', 'Usar')} ×{passes}
            </button>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onBuy(); }}
            aria-label={`${t('store.market.buyPass', 'Comprar')} ${quote.price}`}
            className="relative flex h-10 w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl border text-[15px] font-black tabular-nums"
            style={affordable
              ? { color: '#2a1700', background: 'linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)', borderColor: 'rgba(255,237,180,0.6)', boxShadow: '0 8px 18px -8px rgba(245,158,11,0.75), inset 0 1px 0 rgba(255,255,255,0.55)' }
              : { color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)' }}
          >
            {affordable && <span className="shop-buy-shine absolute inset-0 overflow-hidden rounded-xl pointer-events-none" />}
            {affordable
              ? <Coins size={15} fill="currentColor" className="relative shop-coin" />
              : <Lock size={13} className="relative" />}
            <span className="relative">{quote.price.toLocaleString()}</span>
            {!affordable && (
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
                <span className="block h-full rounded-r-full bg-amber-400/70" style={{ width: `${Math.round(saved * 100)}%` }} />
              </span>
            )}
            {quote.recent > 0 && (
              // Weekly inflation rides on the price it raised.
              <span
                className="absolute -right-0.5 -top-0.5 inline-flex items-center gap-0.5 rounded-bl-lg rounded-tr-xl border-b border-l border-rose-400/40 bg-[#2a0f16] px-1.5 py-px text-[8.5px] font-black text-rose-300"
                title={t('store.market.inflation', '+{{pct}}% · {{count}} esta semana', { pct: Math.round(quote.inflation * 100), count: quote.recent })}
              >
                <TrendingUp size={8} /> +{Math.round(quote.inflation * 100)}%
              </span>
            )}
          </button>
          {!affordable && (
            <div className="text-center text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">
              {t('store.shelf.missing', 'Te faltan {{amount}}', { amount: missing.toLocaleString() })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
