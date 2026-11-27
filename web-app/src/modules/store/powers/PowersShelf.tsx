import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Coins, Lock, Snowflake, Flame, Repeat, FolderKanban, Sparkles, ShieldCheck, HeartPulse, ScrollText, Gift, ChevronDown, Feather, Check } from 'lucide-react';
import type { StoreItem, InventoryItem } from '@/services/economyService';
import { MYSTERY_TABLE } from '@/context/EconomyContext';
import { powerMeta, useStreakMeta } from '@/modules/streaks/StreakFx';
import { BUNDLE_DISCOUNT, LostStreak, RESTORE_PRICES, RestoreCategory, bundlePrice, openStreakRecovery } from '@/modules/streaks/recovery';
import { itemRarity } from '../components/StoreCard';
import { RarityTag } from '../market/ViceCard';
import '@/modules/streaks/streaks.css';

interface PowersShelfProps {
  items: StoreItem[];
  inventory: InventoryItem[];
  gold: number;
  disabled?: boolean;
  streakLosses: LostStreak[];
  onBuy: (item: StoreItem) => void;
}

const GROUPS: { id: NonNullable<StoreItem['subCategory']>; title: string; lead: string; icon: React.ElementType; rgb: string }[] = [
  { id: 'protection', title: 'Protección de racha', lead: 'Un día protegido no rompe ninguna racha: diaria, hábitos ni proyectos.', icon: ShieldCheck, rgb: '125 211 252' },
  { id: 'restore', title: 'Restablecimientos', lead: 'Recupera una racha perdida durante los 3 días siguientes.', icon: Flame, rgb: '251 146 60' },
  { id: 'vitality', title: 'Vitalidad', lead: 'Recupera la vida que pierdes al fallar días.', icon: HeartPulse, rgb: '251 113 133' },
  { id: 'growth', title: 'Crecimiento', lead: 'Experiencia instantánea para subir de nivel.', icon: ScrollText, rgb: '52 211 153' },
  { id: 'mystery', title: 'Misterio', lead: 'Un cofre, un premio. Las probabilidades están a la vista.', icon: Gift, rgb: '232 121 249' },
];

/** One power: floating orb, rarity, effect chip and the price with a fill bar. */
const PowerCard = ({ item, owned, gold, disabled, onBuy, index }: { item: StoreItem; owned: number; gold: number; disabled?: boolean; onBuy: () => void; index: number }) => {
  const { t } = useTranslation();
  const pm = powerMeta(item.id);
  const Icon = pm.icon;
  const rarity = itemRarity(item.price);
  const afford = gold >= item.price;
  const [showOdds, setShowOdds] = useState(false);
  const totalWeight = MYSTERY_TABLE.reduce((s, r) => s + r.weight, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
      className="relative flex flex-col overflow-hidden rounded-[24px] border p-3.5"
      style={{
        borderColor: `rgb(${pm.rgb} / ${afford ? 0.32 : 0.14})`,
        background: `radial-gradient(120% 70% at 50% 0%, rgb(${pm.rgb} / 0.16), transparent 60%), linear-gradient(180deg, rgba(16,16,20,0.96), rgba(8,8,11,0.98))`,
        boxShadow: afford ? `0 20px 40px -28px rgb(${pm.rgb} / 0.8), inset 0 1px 0 rgba(255,255,255,0.06)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {owned > 0 && (
        <span className="absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums"
          style={{ borderColor: `rgb(${pm.rgb} / 0.4)`, background: `rgb(${pm.rgb} / 0.15)`, color: `rgb(${pm.rgb})` }}>
          ×{owned}
        </span>
      )}

      {/* Orb */}
      <div className="relative mx-auto mt-1 mb-3 h-[74px] w-[74px]">
        <div className="absolute inset-0 rounded-full sk-spin-rev opacity-70"
          style={{ background: `conic-gradient(from 0deg, transparent, rgb(${pm.rgb} / 0.5), transparent 35%, rgb(${pm.rgb} / 0.25), transparent 70%)` }} />
        <div className="absolute inset-[5px] rounded-full bg-[#0b0b0e]" />
        <div className="sk-float absolute inset-[9px] rounded-full flex items-center justify-center"
          style={{ animationDelay: `${index * 0.35}s`, background: `radial-gradient(circle at 38% 30%, rgb(${pm.rgb} / 0.7), rgb(${pm.rgb} / 0.12) 72%)`, boxShadow: `0 0 26px -6px rgb(${pm.rgb})` }}>
          <Icon size={26} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" strokeWidth={2} />
        </div>
      </div>

      <RarityTag rarity={rarity} />
      <h3 className="mt-1 text-[14.5px] font-black leading-tight text-white">{t(item.name)}</h3>
      <p className="mt-1 flex-1 text-[11.5px] leading-snug text-white/50">{t(item.description)}</p>

      {pm.tag && (
        <span className="mt-2.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
          style={{ background: `rgb(${pm.rgb} / 0.12)`, color: `rgb(${pm.rgb})` }}>
          {item.id === 'phoenix_feather' ? <Feather size={10} /> : <Sparkles size={10} />} {pm.tag}
        </span>
      )}

      {item.id === 'mystery_chest' && (
        <>
          <button onClick={() => setShowOdds(v => !v)} className="mt-2 flex items-center gap-1 text-[10.5px] font-bold text-white/45">
            Probabilidades <ChevronDown size={12} className={`transition-transform ${showOdds ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showOdds && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {MYSTERY_TABLE.map(r => (
                  <li key={r.label} className="flex justify-between py-0.5 text-[10.5px] text-white/55">
                    <span>{r.label}</span>
                    <span className="tabular-nums font-bold text-white/70">{Math.round((r.weight / totalWeight) * 100)}%</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      )}

      <button
        type="button"
        onClick={onBuy}
        disabled={disabled || !afford}
        className="relative mt-3 overflow-hidden rounded-2xl py-2.5 text-[12.5px] font-black active:scale-[0.97] transition-transform disabled:active:scale-100"
        style={afford
          ? { background: `linear-gradient(135deg, rgb(${pm.rgb}), rgb(${pm.rgb} / 0.75))`, color: '#000', boxShadow: `0 8px 22px -10px rgb(${pm.rgb})` }
          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {!afford && <span className="absolute inset-y-0 left-0 bg-white/[0.06]" style={{ width: `${Math.min(100, (gold / item.price) * 100)}%` }} />}
        <span className="relative flex items-center justify-center gap-1.5 tabular-nums">
          {afford ? <Coins size={13} /> : <Lock size={12} />}
          {item.price.toLocaleString()}
        </span>
      </button>
    </motion.div>
  );
};

const RESTORE_CARDS: { id: RestoreCategory | 'ALL'; title: string; desc: string; icon: React.ElementType; rgb: string }[] = [
  { id: 'HUD', title: 'Racha diaria', desc: 'Devuelve la racha del HUD con todos sus días.', icon: Flame, rgb: '249 115 22' },
  { id: 'HABIT', title: 'Racha de hábito', desc: 'Perdona los días fallados de un hábito. Precio por hábito.', icon: Repeat, rgb: '52 211 153' },
  { id: 'PROJECT', title: 'Racha de proyecto', desc: 'Recupera la racha de meta diaria de un proyecto.', icon: FolderKanban, rgb: '129 140 248' },
  { id: 'ALL', title: 'Restablecimiento total', desc: `Todas tus rachas perdidas a la vez, con un ${Math.round(BUNDLE_DISCOUNT * 100)}% de descuento.`, icon: Sparkles, rgb: '251 191 36' },
];

export const PowersShelf = ({ items, inventory, gold, disabled, streakLosses, onBuy }: PowersShelfProps) => {
  const meta = useStreakMeta();
  const owned = (id: string) => inventory.find(i => i.itemId === id)?.quantity || 0;
  const upcoming = useMemo(() => meta.frozenDays.filter(d => d >= meta.today).length, [meta.frozenDays, meta.today]);
  const featherReady = owned('phoenix_feather') > 0;

  return (
    <div className="space-y-6">
      {/* Status of your streak defenses */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="sk-sheen relative overflow-hidden rounded-[26px] border border-sky-300/15 p-4"
        style={{ background: 'radial-gradient(120% 120% at 0% 0%, rgba(56,189,248,0.16), transparent 55%), radial-gradient(120% 120% at 100% 100%, rgba(249,115,22,0.14), transparent 55%), #0b0b0f' }}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Tus defensas</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-2.5">
            <Snowflake size={15} className={meta.protectedToday ? 'text-sky-300' : 'text-white/25'} />
            <div className="mt-1 text-[12.5px] font-black text-white">{meta.protectedToday ? 'Hoy a salvo' : 'Sin proteger'}</div>
            <div className="text-[10px] text-white/40">{upcoming > 0 ? `${upcoming} día${upcoming > 1 ? 's' : ''} protegido${upcoming > 1 ? 's' : ''}` : 'Hoy'}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-2.5">
            <Feather size={15} className={featherReady ? 'text-orange-300' : 'text-white/25'} />
            <div className="mt-1 text-[12.5px] font-black text-white">{featherReady ? 'Fénix lista' : 'Sin fénix'}</div>
            <div className="text-[10px] text-white/40">{featherReady ? `×${owned('phoenix_feather')} en reserva` : 'Salvavidas automático'}</div>
          </div>
          <button
            onClick={() => openStreakRecovery()}
            className="rounded-2xl border p-2.5 text-left active:scale-95 transition-transform"
            style={{ borderColor: streakLosses.length ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.06)', background: streakLosses.length ? 'rgba(251,191,36,0.1)' : 'rgba(0,0,0,0.3)' }}
          >
            <Flame size={15} className={streakLosses.length ? 'text-amber-300' : 'text-white/25'} />
            <div className="mt-1 text-[12.5px] font-black text-white">{streakLosses.length ? `${streakLosses.length} perdida${streakLosses.length > 1 ? 's' : ''}` : 'Todo en pie'}</div>
            <div className="text-[10px] text-white/40">{streakLosses.length ? 'Toca para restaurar' : 'Ninguna racha rota'}</div>
          </button>
        </div>
      </motion.div>

      {GROUPS.map(g => {
        const GIcon = g.icon;
        const groupItems = items.filter(i => i.subCategory === g.id);
        if (g.id !== 'restore' && !groupItems.length) return null;
        return (
          <section key={g.id}>
            <div className="mb-2.5 flex items-start gap-2.5 px-1">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
                style={{ borderColor: `rgb(${g.rgb} / 0.3)`, background: `rgb(${g.rgb} / 0.12)` }}>
                <GIcon size={15} style={{ color: `rgb(${g.rgb})` }} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-black leading-tight text-white">{g.title}</h2>
                <p className="text-[11.5px] leading-snug text-white/45">{g.lead}</p>
              </div>
            </div>

            {g.id === 'restore' ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {RESTORE_CARDS.map((c, i) => {
                  const list = c.id === 'ALL' ? streakLosses : streakLosses.filter(l => l.category === c.id);
                  const price = c.id === 'ALL' ? (streakLosses.length > 1 ? bundlePrice(streakLosses) : null) : RESTORE_PRICES[c.id];
                  const available = c.id === 'ALL' ? streakLosses.length > 1 : list.length > 0;
                  const CIcon = c.icon;
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => openStreakRecovery(c.id === 'ALL' ? {} : { category: c.id })}
                      className={`relative flex items-center gap-3 overflow-hidden rounded-[22px] border p-3 text-left active:scale-[0.98] transition-transform ${available ? 'sk-sheen' : ''}`}
                      style={{
                        borderColor: `rgb(${c.rgb} / ${available ? 0.38 : 0.14})`,
                        background: `linear-gradient(110deg, rgb(${c.rgb} / ${available ? 0.18 : 0.07}), rgba(10,10,13,0.94) 62%)`,
                      }}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                        style={{ borderColor: `rgb(${c.rgb} / 0.35)`, background: `radial-gradient(circle at 40% 30%, rgb(${c.rgb} / 0.45), rgb(${c.rgb} / 0.08))` }}>
                        <CIcon size={21} className="text-white" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-black text-white">{c.title}</span>
                        <span className="block text-[11px] leading-snug text-white/45">{c.desc}</span>
                        <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-black ${available ? 'text-amber-300' : 'text-white/30'}`}>
                          {available ? <><Flame size={10} /> {list.length} disponible{list.length > 1 ? 's' : ''}</> : <><Check size={10} /> Sin rachas perdidas</>}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-xl px-2.5 py-1.5 text-[11.5px] font-black tabular-nums flex items-center gap-1"
                        style={available ? { background: `rgb(${c.rgb})`, color: '#000' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}>
                        <Coins size={11} /> {price ? price.toLocaleString() : c.id === 'ALL' ? '−20%' : '—'}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
                {groupItems.map((item, i) => (
                  <PowerCard key={item.id} item={item} owned={owned(item.id)} gold={gold} disabled={disabled} onBuy={() => onBuy(item)} index={i} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
