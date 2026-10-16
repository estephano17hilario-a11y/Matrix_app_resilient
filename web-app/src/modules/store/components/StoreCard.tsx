import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { StoreItem } from '../../../services/economyService';
import {
  Zap, Brain, Palette, ShieldAlert, ShoppingBag, Lock, Clock, Code, Smartphone, Coins, Backpack, Heart, Flame, Snowflake, Sparkles
} from 'lucide-react';
import { rarityOfTier } from '../market/viceMarket';
import { RarityTag } from '../market/ViceCard';

interface StoreCardProps {
  item: StoreItem;
  userGold: number;
  onPurchase: (item: StoreItem) => void;
  disabled?: boolean;
  /** How many the player already carries. */
  owned?: number;
}

const IconMap: Record<string, React.ElementType> = {
  Zap, Brain, Palette, ShieldAlert, ShoppingBag, Clock, Code, Smartphone
};

/** Rarity of an upgrade, from its price. */
export const itemRarity = (price: number) =>
  rarityOfTier(price < 500 ? 1 : price < 1000 ? 2 : price < 1600 ? 3 : price < 3000 ? 4 : 5);

export const StoreCard = React.forwardRef<HTMLDivElement, StoreCardProps>(({ item, userGold, onPurchase, disabled, owned = 0 }, ref) => {
  const { t } = useTranslation();
  const Icon = IconMap[item.iconName || 'ShoppingBag'] || ShoppingBag;
  const canAfford = userGold >= item.price;
  const isAffordable = canAfford && !disabled;
  const rarity = itemRarity(item.price);
  const progress = Math.min(1, userGold / Math.max(1, item.price));
  const missing = Math.max(0, item.price - userGold);

  const effect = (() => {
    const e = item.effect;
    if (!e) return null;
    switch (e.type) {
      case 'heal': return { icon: Heart, text: t('store.effect.heal', '+{{value}} HP', { value: e.value }) };
      case 'restore_streak': return { icon: Flame, text: t('store.effect.restore', 'Restaura una racha') };
      case 'freeze_streak': return { icon: Snowflake, text: t('store.effect.freeze', 'Congela tu racha') };
      case 'xp_boost': return { icon: Sparkles, text: t('store.effect.xp', '+{{value}}% XP', { value: e.value }) };
      default: return null;
    }
  })();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={isAffordable ? { scale: 0.99 } : {}}
      className="relative flex flex-col rounded-[22px] overflow-hidden border"
      style={{
        borderColor: `rgb(${rarity.rgb} / ${canAfford ? 0.38 : 0.16})`,
        background: `linear-gradient(160deg, rgb(${rarity.rgb} / 0.14) 0%, rgba(14,14,18,0.94) 45%, rgba(8,8,11,0.97) 100%)`,
        boxShadow: canAfford ? `0 18px 36px -24px rgb(${rarity.rgb} / 0.7), inset 0 1px 0 rgba(255,255,255,0.06)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {rarity.tier >= 4 && <div className="lux-shine" style={{ ['--lux-shine' as string]: rarity.rgb }} />}
      <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, rgb(${rarity.rgb} / 0.9), transparent)` }} />

      <div className="relative p-4 flex flex-col flex-1">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0"
            style={{ background: `rgb(${rarity.rgb} / 0.14)`, borderColor: `rgb(${rarity.rgb} / 0.35)`, color: `rgb(${rarity.rgb})`, boxShadow: `0 0 22px rgb(${rarity.rgb} / 0.25)` }}
          >
            <Icon size={22} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <RarityTag rarity={rarity} />
            <h3 className="mt-1 text-[16px] font-bold text-white leading-snug tracking-tight">{t(item.name)}</h3>
          </div>
          {owned > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-1 text-[10px] font-black text-white/70">
              <Backpack size={11} /> ×{owned}
            </span>
          )}
        </div>

        <p className="mt-2.5 text-[12.5px] text-white/50 leading-relaxed flex-1">{t(item.description)}</p>

        {effect && (
          <div className="mt-3 inline-flex self-start items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold" style={{ background: `rgb(${rarity.rgb} / 0.12)`, color: `rgb(${rarity.rgb})` }}>
            <effect.icon size={12} /> {effect.text}
          </div>
        )}

        {/* How close the vault is to this item */}
        <div className="mt-3.5">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full origin-left"
              style={{
                transform: `scaleX(${progress})`,
                background: canAfford ? `linear-gradient(90deg, rgb(${rarity.rgb} / 0.6), rgb(${rarity.rgb}))` : 'linear-gradient(90deg, rgba(251,191,36,0.4), rgba(251,191,36,0.75))',
              }}
            />
          </div>
          {!canAfford && (
            <div className="mt-1.5 text-[10.5px] font-semibold text-white/40 tabular-nums">
              {t('store.upgrades.missing', 'Te faltan {{amount}} de oro', { amount: missing.toLocaleString() })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => isAffordable && onPurchase(item)}
          disabled={!isAffordable}
          className="mt-3 w-full h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-[13px] tabular-nums disabled:cursor-not-allowed"
          style={canAfford
            ? { background: `linear-gradient(135deg, rgb(${rarity.rgb}), rgb(${rarity.rgb} / 0.75))`, color: '#0b0b0f', boxShadow: `0 0 20px rgb(${rarity.rgb} / 0.35)` }
            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
        >
          {canAfford ? <Coins size={14} fill="currentColor" /> : <Lock size={13} />}
          {item.price.toLocaleString()}
          <span className="ml-1 text-[10px] uppercase tracking-[0.14em] opacity-70">{canAfford ? t('store.buy') : t('store.locked')}</span>
        </button>
      </div>
    </motion.div>
  );
});

StoreCard.displayName = 'StoreCard';
