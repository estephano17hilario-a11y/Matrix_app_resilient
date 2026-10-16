import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Coins, Flame, Percent, Settings2, Ticket, Timer, TrendingUp } from 'lucide-react';
import { DynamicIcon } from '@/components/DynamicIcon';
import type { BadHabit } from '@/types';
import { formatCountdown, msToMidnight, streakAtStake, viceRarity, type Rarity } from './viceMarket';

export const toRgb = (hex?: string, fallback = '244 63 94') => {
  if (!hex) return fallback;
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : fallback;
};

export interface Quote { base: number; full: number; price: number; recent: number; inflation: number; deal: boolean }

export const RarityTag = ({ rarity, className = '' }: { rarity: Rarity; className?: string }) => {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-[0.16em] ${className}`} style={{ color: `rgb(${rarity.rgb})` }}>
      <span className="lux-gem" data-tier={rarity.tier} style={{ background: `rgb(${rarity.rgb})`, boxShadow: `0 0 8px rgb(${rarity.rgb} / 0.8)` }} />
      {t(`store.rarity.${rarity.key}`, rarity.label)}
    </span>
  );
};

/** Icon tile with the vice's colour and its rarity gem in the corner. */
const ViceIcon = ({ habit, rgb, rarity, size = 44 }: { habit: BadHabit; rgb: string; rarity: Rarity; size?: number }) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <div
      className="w-full h-full rounded-[14px] flex items-center justify-center border"
      style={{ background: `rgb(${rgb} / 0.16)`, borderColor: `rgb(${rgb} / 0.35)`, color: `rgb(${rgb})` }}
    >
      <DynamicIcon icon={habit.iconName || 'Skull'} size={Math.round(size * 0.46)} fallback="⛓" />
    </div>
    <span
      className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center bg-[#0b0b0f] border"
      style={{ borderColor: `rgb(${rarity.rgb} / 0.5)` }}
    >
      <span className="lux-gem !w-[7px] !h-[7px]" data-tier={rarity.tier} style={{ background: `rgb(${rarity.rgb})`, boxShadow: `0 0 6px rgb(${rarity.rgb})` }} />
    </span>
  </div>
);

interface ViceCardProps {
  habit: BadHabit;
  rgb: string;
  quote: Quote;
  gold: number;
  onBuy: () => void;
  onUse: () => void;
  onConfigure: () => void;
}

// One row of the market: compact, but it still reads like a collectible —
// rarity frame, stake and the price on a single line.
export const ViceCard = ({ habit, rgb, quote, gold, onBuy, onUse, onConfigure }: ViceCardProps) => {
  const { t } = useTranslation();
  const rarity = viceRarity(habit);
  const passes = habit.vicePasses || 0;
  const stake = streakAtStake(habit);
  const affordable = gold >= quote.price;

  return (
    <motion.div
      layout
      className="lux-reveal relative rounded-[20px] overflow-hidden border"
      style={{
        borderColor: `rgb(${rarity.rgb} / ${rarity.tier >= 4 ? 0.42 : 0.2})`,
        background: `linear-gradient(115deg, rgb(${rgb} / 0.12) 0%, rgba(13,13,17,0.94) 46%, rgba(8,8,11,0.97) 100%)`,
        boxShadow: rarity.tier >= 4
          ? `0 14px 30px -20px rgb(${rarity.rgb} / 0.7), inset 0 1px 0 rgba(255,255,255,0.05)`
          : 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {rarity.tier >= 4 && <div className="lux-shine" style={{ ['--lux-shine' as string]: rarity.rgb }} />}
      <div className="absolute left-0 inset-y-3 w-[3px] rounded-r-full" style={{ background: `rgb(${rarity.rgb})`, boxShadow: `0 0 10px rgb(${rarity.rgb} / 0.8)` }} />

      <div className="relative flex items-center gap-3 py-2.5 pl-4 pr-2.5">
        <ViceIcon habit={habit} rgb={rgb} rarity={rarity} />

        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-bold text-white leading-tight truncate">{habit.title}</div>
          {/* One line: chips that don't fit wrap out of sight instead of being cut. */}
          <div className="mt-1 h-[22px] flex flex-wrap items-center gap-x-2 overflow-hidden whitespace-nowrap">
            {passes > 0 && (
              <button
                type="button"
                onClick={onUse}
                className="relative h-[22px] rounded-lg pl-1.5 pr-2 flex items-center gap-1 text-[9.5px] font-black uppercase tracking-[0.08em] text-black before:absolute before:-inset-2 before:content-['']"
                style={{ background: `rgb(${rgb})`, boxShadow: `0 0 12px rgb(${rgb} / 0.4)` }}
                aria-label={t('store.market.passesOwned', '{{count}} pases guardados', { count: passes })}
              >
                <Ticket size={11} /> {passes} · {t('store.market.use', 'Usar')}
              </button>
            )}
            <RarityTag rarity={rarity} />
            {quote.deal && (
              <span className="rounded bg-amber-300 px-1 text-[9px] font-black text-black">−30%</span>
            )}
            {stake > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-200/80">
                <Flame size={10} className="text-orange-400" /> {stake}d
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onBuy}
          className="relative shrink-0 h-9 rounded-xl px-2.5 flex items-center gap-1 border text-[13px] font-black tabular-nums"
          style={{
            color: affordable ? '#fff' : 'rgba(255,255,255,0.45)',
            background: affordable ? `linear-gradient(135deg, rgb(${rgb} / 0.32), rgb(${rgb} / 0.12))` : 'rgba(255,255,255,0.04)',
            borderColor: affordable ? `rgb(${rgb} / 0.5)` : 'rgba(255,255,255,0.08)',
          }}
          aria-label={`${t('store.market.buyPass', 'Comprar')} ${quote.price}`}
        >
          <Coins size={13} className="text-amber-400" fill="currentColor" />
          {quote.price.toLocaleString()}
          {quote.recent > 0 && (
            // Weekly inflation rides on the price it raised.
            <span
              className="absolute -top-2 -right-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#2a0f16] border border-rose-400/40 px-1 py-px text-[8.5px] font-black text-rose-300"
              title={t('store.market.inflation', '+{{pct}}% · {{count}} esta semana', { pct: Math.round(quote.inflation * 100), count: quote.recent })}
            >
              <TrendingUp size={8} /> +{Math.round(quote.inflation * 100)}%
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onConfigure}
          aria-label={t('store.market.configure', 'Configurar oferta')}
          className="shrink-0 w-6 h-9 -ml-1 rounded-lg flex items-center justify-center text-white/35 hover:text-white"
        >
          <Settings2 size={14} />
        </button>
      </div>
    </motion.div>
  );
};

/** Counts down to midnight, once a minute. */
const useMidnightCountdown = () => {
  const [left, setLeft] = useState(() => msToMidnight());
  useEffect(() => {
    const id = window.setInterval(() => setLeft(msToMidnight()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return left;
};

interface DealCardProps {
  habit: BadHabit;
  rgb: string;
  quote: Quote;
  gold: number;
  onBuy: () => void;
}

// The deal of the day: one vice, −30%, until midnight.
export const DealCard = ({ habit, rgb, quote, gold, onBuy }: DealCardProps) => {
  const { t } = useTranslation();
  const rarity = viceRarity(habit);
  const left = useMidnightCountdown();
  const affordable = gold >= quote.price;

  return (
    <motion.div
      layout
      className="lux-reveal relative rounded-[24px] overflow-hidden border border-amber-300/30"
      style={{
        background: `linear-gradient(125deg, rgba(251,191,36,0.16) 0%, rgb(${rgb} / 0.12) 38%, rgba(10,10,13,0.96) 78%)`,
        boxShadow: '0 22px 44px -26px rgba(251,191,36,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
    >
      <div className="lux-shine" style={{ ['--lux-shine' as string]: '253 230 138', ['--lux-shine-period' as string]: '3.6s' }} />
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/90 to-transparent" />

      <div className="relative p-3.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.16em] text-black">
            <Percent size={10} strokeWidth={3} /> {t('store.deal.title', 'Oferta del día')}
          </span>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-100/70 tabular-nums">
            <Timer size={11} /> {t('store.deal.endsIn', 'termina en {{time}}', { time: formatCountdown(left) })}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <ViceIcon habit={habit} rgb={rgb} rarity={rarity} size={50} />
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-black text-white leading-tight truncate">{habit.title}</div>
            <div className="mt-1 flex items-center gap-2">
              <RarityTag rarity={rarity} />
              <span className="text-[10px] font-bold text-white/35 line-through tabular-nums">{quote.full.toLocaleString()}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBuy}
            className="shrink-0 rounded-2xl px-3.5 py-2.5 flex flex-col items-center leading-none"
            style={{
              background: affordable ? 'linear-gradient(135deg, #fde68a, #f59e0b)' : 'rgba(255,255,255,0.06)',
              color: affordable ? '#0b0b0f' : 'rgba(255,255,255,0.5)',
              boxShadow: affordable ? '0 0 22px rgba(245,158,11,0.45)' : 'none',
            }}
          >
            <span className="flex items-center gap-1 text-[16px] font-black tabular-nums">
              <Coins size={14} fill="currentColor" /> {quote.price.toLocaleString()}
            </span>
            <span className="mt-1 text-[8.5px] font-black uppercase tracking-[0.18em] opacity-70">−30%</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
