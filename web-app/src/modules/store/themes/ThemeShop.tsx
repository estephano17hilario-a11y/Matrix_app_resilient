import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { Check, Coins, Eye, Lock, Palette, Sparkles, X, Crown, Gem, Layers, Briefcase, Rocket, Zap } from 'lucide-react';
import { THEMES, THEME_PRICES, DEFAULT_UNLOCKED_THEMES, ThemeConfig, ThemeCategory, ThemeId } from '@/config/themes';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useEconomy } from '@/context/EconomyContext';
import { HoldToConfirm } from '../market/HoldToConfirm';
import '@/modules/streaks/streaks.css';

// Theme classes, from the cheapest to the rarest. Price comes from THEME_PRICES.
type ShopClass = 'office' | 'gradient' | 'orbs' | 'holo' | 'cosmic';
const CLASSES: { id: ShopClass; label: string; rarity: string; rgb: string; icon: React.ElementType; cats: ThemeCategory[]; blurb: string }[] = [
  { id: 'office', label: 'Office', rarity: 'Común', rgb: '148 163 184', icon: Briefcase, cats: ['minimal'], blurb: 'Sobrios y limpios para concentrarte.' },
  { id: 'gradient', label: 'Gradientes', rarity: 'Raro', rgb: '56 189 248', icon: Palette, cats: ['flow', 'nature'], blurb: 'Degradados profundos, estilo Apple.' },
  { id: 'orbs', label: 'Orbes', rarity: 'Épico', rgb: '192 132 252', icon: Zap, cats: ['orbs'], blurb: 'Luces vivas que flotan detrás de todo.' },
  { id: 'holo', label: 'Holo', rarity: 'Legendario', rgb: '251 191 36', icon: Layers, cats: ['holo'], blurb: 'Reflejos holográficos e iridiscencia.' },
  { id: 'cosmic', label: 'Cosmic', rarity: 'Mítico', rgb: '244 114 182', icon: Rocket, cats: ['cosmic'], blurb: 'Galaxias y nebulosas de fondo.' },
];
const classOf = (t: ThemeConfig) => CLASSES.find(c => c.cats.includes(t.category)) || CLASSES[0];
const priceOf = (t: ThemeConfig) => (DEFAULT_UNLOCKED_THEMES.includes(t.id) ? 0 : THEME_PRICES[t.category] || 0);

/** A tiny live mock of the app painted with a theme's colours. */
const ThemePreview = ({ theme, size = 'md' }: { theme: ThemeConfig; size?: 'md' | 'lg' }) => {
  const c = theme.colors;
  const lg = size === 'lg';
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: theme.bgStyle || `rgb(${c.bgDepth})` }}>
      {!theme.isSolid && (
        <>
          <div className="sk-float absolute -left-[15%] -top-[20%] h-[75%] w-[75%] rounded-full"
            style={{ background: `radial-gradient(circle, rgb(${c.primaryGlow} / 0.75), transparent 65%)` }} />
          <div className="sk-float absolute -right-[20%] bottom-[-25%] h-[80%] w-[80%] rounded-full"
            style={{ animationDelay: '1.5s', background: `radial-gradient(circle, rgb(${c.secondaryGlow} / 0.6), transparent 65%)` }} />
        </>
      )}
      {theme.isSolid && <div className="absolute inset-0 opacity-60" style={{ background: theme.gradient }} />}
      {/* glass card mock */}
      <div className={`absolute inset-x-[10%] ${lg ? 'top-[16%] p-3.5' : 'top-[18%] p-2'} rounded-2xl border`}
        style={{ background: `rgb(${c.glassTint} / 0.10)`, borderColor: `rgb(${c.glassTint} / 0.18)`, backdropFilter: 'blur(6px)' }}>
        <div className="flex items-center gap-1.5">
          <span className={`${lg ? 'h-7 w-7' : 'h-4 w-4'} rounded-full`} style={{ background: theme.gradient }} />
          <span className={`${lg ? 'h-2' : 'h-1'} flex-1 rounded-full`} style={{ background: `rgb(${c.textPrimary} / 0.55)` }} />
        </div>
        <div className={`${lg ? 'mt-3 h-1.5' : 'mt-1.5 h-1'} rounded-full`} style={{ background: `rgb(${c.textPrimary} / 0.15)` }}>
          <div className="h-full w-2/3 rounded-full" style={{ background: `rgb(${c.primaryGlow})` }} />
        </div>
        <div className={`${lg ? 'mt-1.5 h-1.5' : 'mt-1 h-1'} rounded-full`} style={{ background: `rgb(${c.textPrimary} / 0.15)` }}>
          <div className="h-full w-2/5 rounded-full" style={{ background: `rgb(${c.secondaryGlow})` }} />
        </div>
      </div>
      <div className={`absolute inset-x-[10%] ${lg ? 'bottom-[12%] h-12' : 'bottom-[12%] h-5'} flex gap-1.5`}>
        {[0, 1, 2].map(i => (
          <div key={i} className="flex-1 rounded-xl border" style={{ background: `rgb(${c.glassTint} / ${0.06 + i * 0.03})`, borderColor: `rgb(${c.glassTint} / 0.12)` }} />
        ))}
      </div>
    </div>
  );
};

/** `gold` is the player's live gold (same value as the HUD). */
export const ThemeShop = ({ gold }: { gold: number }) => {
  const { theme: equipped, setTheme, previewTheme, setPreviewTheme } = useTheme();
  const { profile } = useAuth();
  const { purchase, isTransactionPending } = useEconomy();
  const unlocked: string[] = (profile as any)?.unlocked_store_items || (profile as any)?.unlockedStoreItems || [];
  const isOwned = (id: ThemeId) => DEFAULT_UNLOCKED_THEMES.includes(id) || unlocked.includes(id);

  const [filter, setFilter] = useState<'all' | 'mine' | ShopClass>('all');
  const [open, setOpen] = useState<ThemeConfig | null>(null);
  const [trial, setTrial] = useState(0);
  const trialTimer = useRef<number | null>(null);

  const all = useMemo(() => Object.values(THEMES), []);
  const ownedCount = all.filter(t => isOwned(t.id)).length;
  const list = useMemo(() => all
    .filter(t => filter === 'all' ? true : filter === 'mine' ? isOwned(t.id) : classOf(t).id === filter)
    .sort((a, b) => Number(isOwned(b.id)) - Number(isOwned(a.id)) || priceOf(a) - priceOf(b) || a.name.localeCompare(b.name)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [all, filter, unlocked.join(',')]);

  const stopTrial = () => {
    if (trialTimer.current) window.clearInterval(trialTimer.current);
    trialTimer.current = null;
    setTrial(0);
    setPreviewTheme(null);
  };
  useEffect(() => () => { if (trialTimer.current) window.clearInterval(trialTimer.current); setPreviewTheme(null); }, [setPreviewTheme]);

  const startTrial = (t: ThemeConfig) => {
    stopTrial();
    setPreviewTheme(t.id);
    let left = 8;
    setTrial(left);
    trialTimer.current = window.setInterval(() => {
      left -= 1;
      if (left <= 0) stopTrial();
      else setTrial(left);
    }, 1000);
  };

  const buy = async (t: ThemeConfig) => {
    const price = priceOf(t);
    if (gold < price) { toast.error(`Te faltan ${(price - gold).toLocaleString()} de oro`); return; }
    const ok = await purchase({ id: t.id, name: t.name, description: t.description, price, category: 'theme' });
    if (ok) {
      stopTrial();
      setTheme(t.id);
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 }, colors: [t.gradient.match(/#[0-9a-f]{6}/gi)?.[0] || '#fbbf24', t.gradient.match(/#[0-9a-f]{6}/gi)?.[1] || '#f472b6', '#ffffff'] });
      toast.success(`Tema ${t.name} desbloqueado y equipado`);
      setOpen(null);
    }
  };

  const current = THEMES[equipped] || all[0];

  return (
    <div className="space-y-4">
      {/* Equipped */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[26px] border border-white/10">
        <div className="h-[150px]"><ThemePreview theme={current} size="lg" /></div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">Tema equipado</div>
            <div className="truncate text-[20px] font-black text-white">{current.name}</div>
            <div className="text-[11.5px] text-white/55">{current.description}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-bold text-white/50">Colección</div>
            <div className="text-[18px] font-black tabular-nums text-white">{ownedCount}<span className="text-white/40">/{all.length}</span></div>
            <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-pink-400" style={{ width: `${(ownedCount / all.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Classes */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="tablist">
        {([{ id: 'all', label: 'Todos', sub: `${all.length} temas`, rgb: '255 255 255', icon: Sparkles }, { id: 'mine', label: 'Míos', sub: `${ownedCount} tuyos`, rgb: '52 211 153', icon: Check }] as const)
          .map(f => ({ ...f, sub: f.sub as string }))
          .concat(CLASSES.map(c => ({ id: c.id, label: c.label, sub: `${c.rarity} · ${(THEME_PRICES[c.cats[0]] || 0).toLocaleString()}`, rgb: c.rgb, icon: c.icon })) as any)
          .map((f: any) => {
            const on = filter === f.id;
            const FIcon = f.icon;
            return (
              <button key={f.id} role="tab" aria-selected={on} onClick={() => setFilter(f.id)}
                className="shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors"
                style={{ borderColor: on ? `rgb(${f.rgb} / 0.55)` : 'rgba(255,255,255,0.07)', background: on ? `rgb(${f.rgb} / 0.14)` : 'rgba(255,255,255,0.025)' }}>
                <span className="flex items-center gap-1.5 text-[12px] font-black text-white"><FIcon size={13} style={{ color: `rgb(${f.rgb})` }} />{f.label}</span>
                <span className="block text-[10px] font-semibold text-white/40 whitespace-nowrap">{f.sub}</span>
              </button>
            );
          })}
      </div>

      {CLASSES.find(c => c.id === filter) && (
        <p className="px-1 text-[11.5px] text-white/45">{CLASSES.find(c => c.id === filter)!.blurb}</p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {list.map((t, i) => {
          const cls = classOf(t);
          const owned = isOwned(t.id);
          const on = equipped === t.id;
          const price = priceOf(t);
          return (
            <motion.button
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.03 }}
              onClick={() => setOpen(t)}
              className="group relative overflow-hidden rounded-[22px] border text-left active:scale-[0.98] transition-transform"
              style={{ borderColor: on ? `rgb(${cls.rgb} / 0.7)` : `rgb(${cls.rgb} / 0.18)`, boxShadow: on ? `0 0 24px -8px rgb(${cls.rgb})` : undefined }}
            >
              <div className="relative h-[118px]">
                <ThemePreview theme={t} />
                {!owned && <div className="absolute inset-0 bg-black/25" />}
                <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                  style={{ background: `rgb(${cls.rgb} / 0.85)`, color: '#000' }}>
                  {cls.rarity}
                </span>
                {on && (
                  <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-black">
                    <Check size={9} strokeWidth={4} /> En uso
                  </span>
                )}
              </div>
              <div className="bg-[#0c0c10] p-2.5">
                <div className="truncate text-[13px] font-black text-white">{t.name}</div>
                <div className="truncate text-[10.5px] text-white/40">{t.description}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/35">{cls.label}</span>
                  {owned
                    ? <span className="text-[10.5px] font-black text-emerald-300">{on ? 'Equipado' : 'Tuyo'}</span>
                    : <span className={`flex items-center gap-0.5 text-[11px] font-black tabular-nums ${gold >= price ? 'text-amber-300' : 'text-white/45'}`}>
                      {gold >= price ? <Coins size={11} /> : <Lock size={10} />} {price.toLocaleString()}
                    </span>}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Detail sheet */}
      {createPortal(
        <AnimatePresence>
          {open && (() => {
            const t = open;
            const cls = classOf(t);
            const owned = isOwned(t.id);
            const on = equipped === t.id;
            const price = priceOf(t);
            const afford = gold >= price;
            const trying = previewTheme === t.id && trial > 0;
            return (
              <>
                <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: trying ? 0.35 : 1 }} exit={{ opacity: 0 }}
                  onClick={() => { stopTrial(); setOpen(null); }} className="fixed inset-0 z-[200] bg-black/85" />
                <div className="pointer-events-none fixed inset-0 z-[201] flex items-end justify-center sm:items-center sm:p-6">
                  <motion.div key="sheet"
                    initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 70, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    className="pointer-events-auto w-full overflow-hidden rounded-t-[30px] border border-white/10 bg-[#0b0b0f] sm:max-w-[420px] sm:rounded-[30px]"
                    role="dialog" aria-label={`Tema ${t.name}`}>
                    <div className="relative h-[230px]">
                      <ThemePreview theme={t} size="lg" />
                      <button onClick={() => { stopTrial(); setOpen(null); }} aria-label="Cerrar"
                        className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 p-1.5 text-white/80"><X size={16} /></button>
                      <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                        style={{ background: `rgb(${cls.rgb})`, color: '#000' }}>
                        {cls.rarity === 'Mítico' ? <Crown size={11} /> : <Gem size={11} />} {cls.rarity}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `rgb(${cls.rgb})` }}>{cls.label}</div>
                      <h3 className="text-[22px] font-black text-white">{t.name}</h3>
                      <p className="text-[12.5px] text-white/50">{t.description} · {cls.blurb}</p>
                      <div className="mt-3 flex gap-1.5">
                        {[t.colors.primaryGlow, t.colors.secondaryGlow, t.colors.glassTint, t.colors.bgDepth].map((rgb, i) => (
                          <span key={i} className="h-6 flex-1 rounded-lg border border-white/10" style={{ background: `rgb(${rgb})` }} />
                        ))}
                      </div>

                      <div className="mt-5 space-y-2.5">
                        {owned ? (
                          <button onClick={() => { if (!on) { setTheme(t.id); toast.success(`Tema ${t.name} equipado`); } setOpen(null); }}
                            className="w-full rounded-2xl py-3.5 text-[13px] font-black"
                            style={{ background: on ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#ffffff,#d4d4d8)', color: on ? 'rgba(255,255,255,0.7)' : '#000' }}>
                            {on ? 'Ya lo llevas puesto' : 'Equipar tema'}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => (trying ? stopTrial() : startTrial(t))}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] py-3 text-[12.5px] font-black text-white">
                              <Eye size={15} /> {trying ? `Probando… ${trial}s (tocar para salir)` : 'Probar en toda la app (8 s)'}
                            </button>
                            <HoldToConfirm
                              label={`Mantén para comprar · ${price.toLocaleString()} oro`}
                              holdingLabel="Comprando…"
                              disabledLabel={`Te faltan ${(price - gold).toLocaleString()} de oro`}
                              disabled={!afford || isTransactionPending}
                              accent={cls.rgb}
                              onComplete={() => buy(t)}
                            />
                            <div className="flex items-center justify-center gap-1 text-[11px] text-white/40">
                              <Coins size={11} className="text-amber-400" /> Tienes {gold.toLocaleString()} de oro
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            );
          })()}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
