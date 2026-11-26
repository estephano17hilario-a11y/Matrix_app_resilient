import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLux } from '@/context/LuxContext';
import { useEconomy } from '@/context/EconomyContext';
import { StoreCard, itemRarity } from './components/StoreCard';
import { StreakRecoveryModal } from './components/StreakRecoveryModal';
import { StoreItem, InventoryItem } from '../../services/economyService';
import { FrameInventory } from '@/modules/progression/ui/FrameInventory';
import type { Attribute, BadHabit, ViceLedgerEntry, ViceOffer } from '../../types';
import { toast } from 'react-hot-toast';
import { pulseWorld } from '@/immersion/engine';
import { RarityTag, ViceCard, toRgb } from './market/ViceCard';
import { ShopFront } from './market/ShopFront';
import { PurchaseRitual } from './market/PurchaseRitual';
import { OfferConfigSheet } from './market/OfferConfigSheet';
import { ViceLedgerView } from './market/ViceLedgerView';
import { availableUses, lastDoneAt, offerOf, passQuote, streakAtStake, viceImpact, viceRarity } from './market/viceMarket';
import confetti from 'canvas-confetti';
import { 
    Zap, Palette, ShoppingBag,
    Check, Brain, ShieldAlert, Clock,
    Smartphone, Code, Square, Image, User, Share2, Bell, Gamepad, Newspaper,
    Coffee, Armchair, Moon, UserX, Droplet, Layers, Frown, CloudRain, Target,
    MicOff, Watch, MessageSquare, CreditCard, Trash,
    Flame, Backpack, ScrollText, Ticket, Plus, Gift
} from 'lucide-react';
import clsx from 'clsx';

const DAY_MS = 24 * 60 * 60 * 1000;

// --- COMPONENTS ---

// Icon Map (Should be shared but keeping simple for now)
const IconMap: Record<string, React.ElementType> = {
    Zap, Brain, Palette, User, ShieldAlert, ShoppingBag, Clock, Code, Smartphone,
    Square, Image, Share2, Bell, Gamepad, Newspaper, Coffee, Armchair, Moon, UserX,
    Droplet, Layers, Frown, CloudRain, Target, MicOff, Watch, MessageSquare, CreditCard, Trash, Gift
};

const ConfirmationModal = ({ 
    item, 
    onConfirm, 
    onCancel,
    isOpen,
    disabled
}: { 
    item: StoreItem | null, 
    onConfirm: () => void, 
    onCancel: () => void,
    isOpen: boolean,
    disabled: boolean
}) => {
    const { t } = useTranslation();
    if (!item) return null;
    const Icon = IconMap[item.iconName || 'ShoppingBag'] || ShoppingBag;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={() => !disabled && onCancel()}
                        className="absolute inset-0 bg-black/90" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 shadow-md shadow-indigo-500/10 overflow-hidden"
                    >
                        {/* Background Glow - Optimized */}
                        <div 
                            className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none" 
                            style={{ background: 'radial-gradient(circle at 50% 0%, #6366f1 0%, transparent 70%)' }}
                        />

                        <div className="relative flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-md">
                                <Icon size={40} className="text-white" strokeWidth={1.5} />
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2">{t(item.name)}</h3>
                            <p className="text-white/50 text-sm mb-6 leading-relaxed px-4">
                                {t('store.confirm.desc', { price: item.price })}
                            </p>

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={onCancel}
                                    disabled={disabled}
                                    className={clsx(
                                        "flex-1 py-3.5 rounded-xl font-medium transition-colors border border-white/5",
                                        disabled
                                            ? "bg-white/5 text-white/20 cursor-not-allowed border-transparent"
                                            : "bg-white/5 hover:bg-white/10 text-white"
                                    )}
                                >
                                    {t('store.confirm.no')}
                                </button>
                                <button 
                                    onClick={onConfirm}
                                    disabled={disabled}
                                    className={clsx(
                                        "flex-1 py-3.5 rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2",
                                        disabled
                                            ? "bg-white/20 text-white/40 cursor-not-allowed"
                                            : "bg-white text-black hover:bg-white/90 shadow-white/10"
                                    )}
                                >
                                    {disabled ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            {t('store.confirm.yes')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const PurchaseSuccessModal = ({ 
    item, 
    onClose, 
    onGoToInventory,
    isOpen 
}: { 
    item: StoreItem | null, 
    onClose: () => void, 
    onGoToInventory: () => void,
    isOpen: boolean
}) => {
    const { t } = useTranslation();
    const [isFlying, setIsFlying] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsFlying(true);
        }
    }, [isOpen]);

    if (!item) return null;
    const Icon = IconMap[item.iconName || 'ShoppingBag'] || ShoppingBag;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
                    />
                    
                    {/* Floating Item Animation */}
                    {isFlying && (
                        <motion.div
                            initial={{ scale: 1.5, opacity: 1, y: -50 }}
                            animate={{ 
                                y: 250, 
                                scale: 0.2, 
                                opacity: 0 
                            }}
                            transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                            onAnimationComplete={() => setIsFlying(false)}
                            className="absolute z-[110] w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-500 flex items-center justify-center text-black shadow-lg pointer-events-none"
                        >
                            <Icon size={24} strokeWidth={2.5} />
                        </motion.div>
                    )}

                    <motion.div 
                        initial={{ scale: 0.85, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="relative w-full max-w-sm bg-gradient-to-b from-[#242427] to-[#1c1c1e] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden text-center"
                    >
                        {/* Background Glow */}
                        <div 
                            className="absolute top-0 left-0 right-0 h-40 opacity-30 pointer-events-none" 
                            style={{ background: 'radial-gradient(circle at 50% 0%, #eab308 0%, transparent 70%)' }}
                        />

                        {/* Animated Sparkles / Success Rings */}
                        <div className="relative flex flex-col items-center">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ delay: 0.1, duration: 0.5 }}
                                className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/5 relative"
                            >
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-500/40 animate-spin"
                                    style={{ animationDuration: '8s' }}
                                />
                                <Icon size={44} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" strokeWidth={1.5} />
                            </motion.div>
                            
                            <motion.h3 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-black text-white tracking-tight mb-2"
                            >
                                {t('store.successPurchase', '¡COMPRA EXITOSA!')}
                            </motion.h3>
                            
                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-white/60 text-sm mb-8 leading-relaxed px-4"
                            >
                                {t('store.youAcquired', 'Has adquirido')} <span className="text-yellow-400 font-bold">{t(item.name)}</span>{t('store.itemSentToInventory', '. El objeto ha sido enviado a tu inventario.')}
                            </motion.p>

                            <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-col gap-3 w-full"
                            >
                                <button 
                                    onClick={onGoToInventory}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-[11px] uppercase tracking-[0.2em] hover:from-yellow-600 hover:to-amber-600 active:scale-[0.98] shadow-lg shadow-yellow-500/10"
                                >
                                    {t('store.goToInventory', 'Ir al Inventario')}
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-[11px] uppercase tracking-[0.2em] transition-all border border-white/5"
                                >
                                    {t('store.keepShopping', 'Seguir Comprando')}
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};



interface StoreScreenProps {
  onNavigate?: (view: string) => void;
  /** The player's gold (same value as the header). */
  gold?: number;
  badHabits?: BadHabit[];
  attributes?: Attribute[];
  viceLedger?: ViceLedgerEntry[];
  onBuyVice?: (habitId: string) => ViceLedgerEntry | null;
  onSpendVicePass?: (habitId: string) => ViceLedgerEntry | null;
  onUpdateViceOffer?: (habitId: string, offer: ViceOffer) => void;
  /** Opens the bad-habit wizard, so vices can be created from the store. */
  onCreateVice?: () => void;
  /** Real streak data + the restore action, from the dashboard logic. */
  streakStats?: any;
  recoverableHabits?: any[];
  recoverableProjects?: any[];
  onRestoreStreak?: (category: 'HUD' | 'HABIT' | 'PROJECT', targetId?: string, cost?: number) => Promise<boolean>;
}

const StoreContent = ({ gold, badHabits, attributes, viceLedger, onBuyVice, onSpendVicePass, onUpdateViceOffer, onCreateVice, streakStats, recoverableHabits, recoverableProjects, onRestoreStreak }: StoreScreenProps) => {
  const { user, updateLuxLocally } = useLux();
  const { t } = useTranslation();
  const { purchase, storeItems, isTransactionPending, inventory, consume } = useEconomy();
  
  // Confirmation State
  const [itemToBuy, setItemToBuy] = useState<StoreItem | null>(null);
  const [successItem, setSuccessItem] = useState<StoreItem | null>(null);
  const [consumingItemId, setConsumingItemId] = useState<string | null>(null);
  const [isConsuming, setIsConsuming] = useState<boolean>(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState<boolean>(false);
  
  const initiatePurchase = (item: StoreItem) => {
      if (item.id === 'redemption_token') {
          setIsStreakModalOpen(true);
          return;
      }
      setItemToBuy(item);
  };

  const handleRestoreStreakAction = async (
      category: 'HUD' | 'FLAME' | 'HABIT' | 'PROJECT',
      targetId?: string,
      cost: number = 1800,
      streakValue: number = 1
  ): Promise<boolean> => {
      if (!user || (user.stats?.gold || 0) < cost) {
          return false;
      }

      // Daily / habit / project streaks are restored by the dashboard logic,
      // which owns that data (the old path wrote to fields nothing reads).
      if (onRestoreStreak && category !== 'FLAME') {
          const ok = await onRestoreStreak(category, targetId, cost);
          if (ok) confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          return ok;
      }

      const currentGold = (user.stats?.gold || 0) - cost;

      if (category === 'HUD') {
          const restoredStreak = streakValue > 0 ? streakValue : ((user.stats as any)?.previousStreak || 1);
          updateLuxLocally({
              stats: {
                  ...user.stats,
                  gold: currentGold,
                  streak: restoredStreak,
                  previousStreak: 0
              }
          });
      } else if (category === 'FLAME') {
          const restoredStreak = streakValue > 0 ? streakValue : ((user.stats as any)?.previousFlameStreak || 1);
          updateLuxLocally({
              stats: {
                  ...user.stats,
                  gold: currentGold,
                  flameStreak: restoredStreak,
                  previousFlameStreak: 0
              } as any
          });
      } else if (category === 'HABIT' && targetId) {
          const updatedHabits = ((user as any).habits || []).map((h: any) => {
              if (h.id === targetId) {
                  const restored = h.previousStreak || streakValue || 1;
                  return { ...h, streak: restored, previousStreak: 0 };
              }
              return h;
          });
          updateLuxLocally({
              stats: { ...user.stats, gold: currentGold },
              habits: updatedHabits
          } as any);
      } else if (category === 'PROJECT' && targetId) {
          const updatedProjects = ((user as any).projects || []).map((p: any) => {
              if (p.id === targetId) {
                  const restored = p.previousStreak || streakValue || 1;
                  return { ...p, streak: restored, previousStreak: 0 };
              }
              return p;
          });
          updateLuxLocally({
              stats: { ...user.stats, gold: currentGold },
              projects: updatedProjects
          } as any);
      }

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      return true;
  };

  const confirmPurchase = async () => {
      if (!itemToBuy) return;
      
      const item = itemToBuy;
      const result = await purchase(item);
      
      // Close modal only after transaction completes
      setItemToBuy(null);

      if (result) {
          setSuccessItem(item);
          confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 }
          });
      }
  };

  const handleConsume = async (itemId: string) => {
      if (isConsuming) return;
      setIsConsuming(true);
      setConsumingItemId(itemId);
      
      try {
          const userInventory = (user?.inventory || []) as InventoryItem[];
          const item = userInventory.find(i => i.itemId === itemId);
          if (!item || item.quantity < 1) {
              throw new Error("No tienes este ítem en tu inventario");
          }
          
          const success = await consume(itemId);
          if (success) {
              // Haptic feedback and confetti animation
              if (navigator.vibrate) navigator.vibrate(30);
              confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.6 }
              });
          }
      } catch (error: any) {
          console.error('[Inventory] Error consumiendo ítem:', error);
          alert(error.message || 'Error al usar el objeto');
      } finally {
          setIsConsuming(false);
          setConsumingItemId(null);
      }
  };

  // ── Vice market ──
  const vault = gold ?? user?.stats?.gold ?? 0;
  const [tab, setTab] = useState<'MARKET' | 'UPGRADES' | 'INVENTORY' | 'LEDGER'>('MARKET');
  const [ritualId, setRitualId] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const ledger = viceLedger || [];
  const vices = useMemo(() => (badHabits || []).filter(h => !h.archived), [badHabits]);
  const onSale = vices.filter(h => offerOf(h).mode !== 'OFF');
  const offMarket = vices.filter(h => offerOf(h).mode === 'OFF');
  const owned = vices.filter(h => availableUses(h) > 0);
  const colorOf = (h: BadHabit) => toRgb(h.customColor || attributes?.find(a => a.id === h.attribute)?.color);
  // No "deal of the day" on bad habits: passes always sell at their regular price.
  const quoteOf = (h: BadHabit) => passQuote(h, ledger, null);
  const cheapest = onSale.length ? Math.min(...onSale.map(h => quoteOf(h).price)) : null;

  // Shelf controls: what to show and in which order.
  const [shelfFilter, setShelfFilter] = useState<'ALL' | 'AFFORD' | 'PASSES'>('ALL');
  const [shelfSort, setShelfSort] = useState<'PRICE' | 'DAMAGE' | 'STREAK' | 'RECENT'>('PRICE');
  const shelf = useMemo(() => {
    const price = (h: BadHabit) => passQuote(h, ledger, null).price;
    // "Recent" = the vice you did most recently, first.
    const recent = (h: BadHabit) => lastDoneAt(h, ledger) ?? -1;
    const list = onSale.filter(h => (
      shelfFilter === 'AFFORD' ? vault >= price(h)
        : shelfFilter === 'PASSES' ? availableUses(h) > 0
          : true
    ));
    return [...list].sort((a, b) => (
      shelfSort === 'PRICE' ? price(a) - price(b)
        : shelfSort === 'DAMAGE' ? viceImpact(b) - viceImpact(a) || price(b) - price(a)
          : shelfSort === 'STREAK' ? streakAtStake(b) - streakAtStake(a)
            : recent(b) - recent(a)
    ));
  }, [onSale, shelfFilter, shelfSort, vault, ledger]);
  const passesOwned = vices.reduce((s, h) => s + (h.vicePasses || 0), 0);
  const daysAtStake = vices.reduce((s, h) => s + streakAtStake(h), 0);
  const spentThisWeek = ledger.filter(e => Date.now() - e.createdAt < 7 * DAY_MS).reduce((s, e) => s + e.price, 0);

  // Self-control rank (30 days): planned indulgences vs. falls.
  const control = useMemo(() => {
    const since = Date.now() - 30 * DAY_MS;
    const planned = ledger.filter(e => e.kind === 'PASS_USE' && e.createdAt >= since).length;
    const falls = vices.reduce((s, h) => s + (h.history || []).filter(d => new Date(d).getTime() >= since).length, 0);
    const score = planned + falls === 0 ? 1 : planned / (planned + falls);
    const rank = score >= 0.9 ? 'S' : score >= 0.75 ? 'A' : score >= 0.5 ? 'B' : score >= 0.25 ? 'C' : 'D';
    const rgb = { S: '251 191 36', A: '192 132 252', B: '56 189 248', C: '52 211 153', D: '244 63 94' }[rank];
    return { planned, falls, rank, rgb };
  }, [ledger, vices]);

  const ritualHabit = ritualId ? vices.find(h => h.id === ritualId) || null : null;
  const ritualQuote = ritualHabit ? quoteOf(ritualHabit) : null;
  const configHabit = configuring ? vices.find(h => h.id === configuring) || null : null;

  const useVice = (habitId: string) => {
    const entry = onSpendVicePass?.(habitId);
    if (!entry) return false;
    pulseWorld(window.innerWidth / 2, window.innerHeight / 2, '#f59e0b');
    toast.success(t('store.market.usedToast', 'Indulgencia registrada. Tu racha sigue intacta.'));
    return true;
  };

  const tabs = [
    { id: 'MARKET' as const, icon: Flame, label: t('store.tabs.market', 'Mercado') },
    { id: 'UPGRADES' as const, icon: Zap, label: t('store.tabs.upgrades', 'Mejoras') },
    { id: 'INVENTORY' as const, icon: Backpack, label: t('store.tabs.inventory', 'Inventario'), badge: passesOwned + inventory.reduce((s, i) => s + (i.quantity || 0), 0) },
    { id: 'LEDGER' as const, icon: ScrollText, label: t('store.tabs.ledger', 'Registro') },
  ];

  return (
    <div className="min-h-screen bg-transparent text-white pb-32 relative">
       <ConfirmationModal
            item={itemToBuy}
            isOpen={!!itemToBuy}
            onCancel={() => setItemToBuy(null)}
            onConfirm={confirmPurchase}
            disabled={isTransactionPending}
       />

       <PurchaseSuccessModal
            item={successItem}
            isOpen={!!successItem}
            onClose={() => setSuccessItem(null)}
            onGoToInventory={() => {
                setTab('INVENTORY');
                setSuccessItem(null);
            }}
       />

       <StreakRecoveryModal
            isOpen={isStreakModalOpen}
            onClose={() => setIsStreakModalOpen(false)}
            userGold={vault}
            userStats={streakStats || user?.stats || {}}
            habits={recoverableHabits || []}
            projects={recoverableProjects || []}
            onRestore={handleRestoreStreakAction}
       />

       <PurchaseRitual
            habit={ritualHabit}
            rgb={ritualHabit ? colorOf(ritualHabit) : '245 158 11'}
            price={ritualQuote?.price || 0}
            fullPrice={ritualQuote?.full || 0}
            inflation={ritualQuote?.inflation || 0}
            deal={!!ritualQuote?.deal}
            gold={vault}
            onBuy={() => (ritualId && onBuyVice ? onBuyVice(ritualId) : null)}
            onUseNow={() => (ritualId ? useVice(ritualId) : false)}
            onOpenLedger={() => { setRitualId(null); setTab('LEDGER'); }}
            onClose={() => setRitualId(null)}
       />

       <OfferConfigSheet
            habit={configHabit}
            rgb={configHabit ? colorOf(configHabit) : '245 158 11'}
            onSave={offer => configHabit && onUpdateViceOffer?.(configHabit.id, offer)}
            onClose={() => setConfiguring(null)}
       />

      <div className="relative z-10 w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 pt-4">

        {/* ── Shop front: awning, shopkeeper, purse ── */}
        <ShopFront
          gold={vault}
          cheapest={cheapest}
          vices={onSale.length}
          passesOwned={passesOwned}
          daysAtStake={daysAtStake}
          spentThisWeek={spentThisWeek}
          control={control}
        />

        {/* ── Sections ── */}
        <div className="sticky top-2 z-40 mb-4 flex gap-1 rounded-2xl bg-[#0e0e12]/95 border border-white/[0.07] p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]">
          {tabs.map(({ id, icon: Icon, label, badge }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(id)}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10.5px] font-bold"
              >
                {on && (
                  <motion.span layoutId="store-tab" className="absolute inset-0 rounded-xl bg-amber-400/15 border border-amber-400/30" transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
                    <span className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                  </motion.span>
                )}
                <Icon size={16} className={clsx('relative', on ? 'text-amber-300' : 'text-white/40')} />
                <span className={clsx('relative', on ? 'text-white' : 'text-white/45')}>{label}</span>
                {!!badge && badge > 0 && (
                  <span className="absolute right-1.5 top-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center">{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === 'MARKET' && (
              <div className="space-y-3.5">
                {/* shelf header */}
                <div className="lux-reveal flex items-end gap-3 px-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-black leading-tight text-white">{t('store.market.title', 'Estantes')}</div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-white/45">
                      {t('store.market.lead', 'Caer reinicia tu racha. Comprarlo con tu oro es una decisión: queda registrada y tu racha sigue.')}
                    </div>
                  </div>
                  {onCreateVice && onSale.length > 0 && (
                    <button
                      type="button"
                      onClick={onCreateVice}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 text-[11px] font-black uppercase tracking-[0.1em] text-amber-100 active:scale-95"
                    >
                      <Plus size={14} strokeWidth={3} /> {t('store.market.newShort', 'Nuevo')}
                    </button>
                  )}
                </div>

                {onSale.length > 1 && (
                  <div className="lux-reveal -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 no-scrollbar" role="toolbar">
                    {([
                      { id: 'ALL', label: t('store.shelf.all', 'Todo') },
                      { id: 'AFFORD', label: t('store.shelf.afford', 'Puedo pagar') },
                      { id: 'PASSES', label: t('store.shelf.owned', 'Con pase') },
                    ] as const).map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setShelfFilter(f.id)}
                        aria-pressed={shelfFilter === f.id}
                        className={clsx(
                          'h-8 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[11px] font-bold transition-colors',
                          shelfFilter === f.id ? 'border-amber-400/50 bg-amber-400/20 text-amber-100' : 'border-white/[0.08] bg-white/[0.03] text-white/50',
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                    <span className="mx-0.5 my-1.5 w-px shrink-0 bg-white/10" />
                    {([
                      { id: 'PRICE', label: t('store.shelf.sortPrice', 'Precio') },
                      { id: 'DAMAGE', label: t('store.shelf.sortDamage', 'Más dañino') },
                      { id: 'STREAK', label: t('store.shelf.sortStreak', 'Mayor racha') },
                      { id: 'RECENT', label: t('store.shelf.sortRecent', 'Más reciente') },
                    ] as const).map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setShelfSort(f.id)}
                        aria-pressed={shelfSort === f.id}
                        className={clsx(
                          'h-8 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[11px] font-bold transition-colors',
                          shelfSort === f.id ? 'border-white/30 bg-white/12 text-white' : 'border-white/[0.06] bg-transparent text-white/40',
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {vices.length === 0 ? (
                  <div className="lux-reveal rounded-[24px] border border-dashed border-amber-300/20 bg-amber-300/[0.03] px-6 py-10 text-center">
                    <div className="text-[34px]" aria-hidden>🦉</div>
                    <div className="mt-2 text-[14px] font-bold text-white/70">{t('store.market.emptyTitle', 'Los estantes están vacíos')}</div>
                    <div className="mt-1 text-[12px] text-white/40">{t('store.market.emptyCreate', 'Crea tu primer mal hábito: tendrá su rareza, su precio y su registro.')}</div>
                    {onCreateVice && (
                      <button
                        type="button"
                        onClick={onCreateVice}
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-black active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 0 24px rgba(245,158,11,0.4)' }}
                      >
                        <Plus size={15} strokeWidth={3} /> {t('store.market.newVice', 'Crear mal hábito')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-5 pt-1 md:grid-cols-3 lg:grid-cols-4">
                    {shelf.map(h => (
                      <ViceCard
                        key={h.id}
                        habit={h}
                        rgb={colorOf(h)}
                        quote={quoteOf(h)}
                        gold={vault}
                        lastAt={lastDoneAt(h, ledger)}
                        onBuy={() => setRitualId(h.id)}
                        onUse={() => useVice(h.id)}
                        onConfigure={() => setConfiguring(h.id)}
                      />
                    ))}

                    {shelf.length === 0 && onSale.length > 0 && (
                      <div className="col-span-full rounded-2xl border border-white/[0.06] bg-white/[0.02] py-8 text-center text-[12.5px] text-white/40">
                        {t('store.shelf.noMatch', 'Nada en este estante por ahora.')}
                      </div>
                    )}

                    {onCreateVice && onSale.length > 0 && (
                      <div className="shop-shelf lux-reveal">
                        <button
                          type="button"
                          onClick={onCreateVice}
                          className="flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-amber-300/25 bg-amber-300/[0.03] px-3 text-center active:scale-[0.98]"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-200">
                            <Plus size={22} strokeWidth={2.5} />
                          </span>
                          <span className="text-[12.5px] font-bold text-white/75">{t('store.market.newVice', 'Crear mal hábito')}</span>
                          <span className="text-[10.5px] leading-snug text-white/35">{t('store.market.newViceDesc', 'Entra al mercado con su rareza y su precio')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {offMarket.length > 0 && (
                  <div className="lux-reveal rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{t('store.market.offMarket', 'En el almacén')}</div>
                    <div className="mt-2 divide-y divide-white/[0.05]">
                      {offMarket.map(h => (
                        <div key={h.id} className="flex items-center gap-3 px-1 py-2.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: `rgb(${colorOf(h)})` }} />
                          <span className="flex-1 truncate text-[13px] text-white/60">{h.title}</span>
                          <button type="button" onClick={() => setConfiguring(h.id)} className="text-[11px] font-bold text-amber-300/80">
                            {t('store.market.sell', 'Poner a la venta')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'UPGRADES' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {storeItems.filter(item => item.category !== 'chest' && item.category !== 'frame').map(item => (
                  <div id={`store-item-${item.id}`} key={item.id} className="lux-reveal">
                    <StoreCard
                      item={item}
                      userGold={vault}
                      owned={inventory.find(i => i.itemId === item.id)?.quantity || 0}
                      onPurchase={() => initiatePurchase(item)}
                      disabled={isTransactionPending}
                    />
                  </div>
                ))}
              </div>
            )}

            {tab === 'INVENTORY' && (
              <div className="space-y-5">
                {owned.length > 0 && (
                  <div>
                    <div className="px-1 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{t('store.inventory.vices', 'Indulgencias pagadas')}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {owned.map(h => {
                        const rgb = colorOf(h);
                        const rarity = viceRarity(h);
                        return (
                          // A ticket: stub with the count, perforation, then the vice.
                          <div key={h.id} className="lux-reveal relative flex items-stretch rounded-2xl overflow-hidden border" style={{ borderColor: `rgb(${rgb} / 0.3)`, background: `linear-gradient(110deg, rgb(${rgb} / 0.16), rgba(10,10,13,0.92) 55%)` }}>
                            <div className="w-[72px] shrink-0 flex flex-col items-center justify-center py-3" style={{ background: `rgb(${rgb} / 0.14)` }}>
                              <Ticket size={18} style={{ color: `rgb(${rgb})` }} />
                              <span className="mt-1 text-[18px] font-black text-white tabular-nums leading-none">×{h.vicePasses || 0}</span>
                            </div>
                            <div className="relative w-0 border-l-2 border-dashed" style={{ borderColor: `rgb(${rgb} / 0.35)` }}>
                              <span className="absolute -top-2 -left-[9px] w-4 h-4 rounded-full bg-[#09090b]" />
                              <span className="absolute -bottom-2 -left-[9px] w-4 h-4 rounded-full bg-[#09090b]" />
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-3 px-3.5 py-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-bold text-white truncate">{h.title}</div>
                                <RarityTag rarity={rarity} className="mt-0.5" />
                              </div>
                              <button type="button" onClick={() => useVice(h.id)} className="shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-black" style={{ background: `rgb(${rgb})`, boxShadow: `0 0 14px rgb(${rgb} / 0.4)` }}>
                                {t('store.market.use', 'Usar')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="px-1 mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Marcos de rango</div>
                  <p className="px-1 mb-2.5 text-[11.5px] text-white/40">Ganas el marco de cada rango al alcanzarlo. Llevarlo en tu foto es opcional.</p>
                  <FrameInventory />
                </div>

                <div>
                  <div className="px-1 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{t('store.inventory.items', 'Objetos')}</div>
                  {inventory.some(i => storeItems.find(si => si.id === i.itemId)?.category !== 'frame') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inventory.map((invItem) => {
                        const storeItem = storeItems.find(si => si.id === invItem.itemId);
                        if (!storeItem || storeItem.category === 'frame') return null;
                        const Icon = IconMap[storeItem.iconName || 'ShoppingBag'] || ShoppingBag;
                        const rarity = itemRarity(storeItem.price);
                        return (
                          <div key={invItem.itemId} className="lux-reveal relative flex flex-col p-4 rounded-[20px] border" style={{ borderColor: `rgb(${rarity.rgb} / 0.25)`, background: `linear-gradient(160deg, rgb(${rarity.rgb} / 0.1), rgba(14,14,18,0.94) 50%)` }}>
                            <div className="flex justify-between items-start mb-3">
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `rgb(${rarity.rgb} / 0.14)`, color: `rgb(${rarity.rgb})` }}><Icon size={20} strokeWidth={2} /></div>
                              <div className="px-3 py-1.5 rounded-full bg-black/30 text-white font-black text-sm tabular-nums">×{invItem.quantity}</div>
                            </div>
                            <RarityTag rarity={rarity} />
                            <h3 className="mt-1 text-[16px] font-semibold text-white mb-1">{t(storeItem.name)}</h3>
                            <p className="text-[12.5px] text-white/50 leading-relaxed mb-4 flex-1">{t(storeItem.description)}</p>
                            <button
                              type="button"
                              onClick={() => handleConsume(invItem.itemId)}
                              disabled={isConsuming || isTransactionPending}
                              className="w-full py-2.5 rounded-xl font-black text-[13px] text-black disabled:bg-white/10 disabled:text-white/30"
                              style={{ background: `rgb(${rarity.rgb})` }}
                            >
                              {consumingItemId === invItem.itemId && (isConsuming || isTransactionPending)
                                ? <span className="inline-block w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                : t('store.inventory.use')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-10 text-center text-white/30">
                      <ShoppingBag className="mx-auto mb-2 opacity-40" size={30} strokeWidth={1.5} />
                      <p className="text-[12.5px] font-medium">{t('store.inventory.empty')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'LEDGER' && <ViceLedgerView ledger={ledger} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const StoreScreenComponent = (props: StoreScreenProps) => {
  return (
    <StoreContent {...props} />
  );
};

export const StoreScreen = React.memo(StoreScreenComponent);

