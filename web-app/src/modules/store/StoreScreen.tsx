import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLux } from '@/context/LuxContext';
import { useEconomy } from '@/context/EconomyContext';
import { StoreCard } from './components/StoreCard';
import { StreakRecoveryModal } from './components/StreakRecoveryModal';
import { StoreItem, InventoryItem } from '../../services/economyService';
import confetti from 'canvas-confetti';
import { 
    Coins, Zap, Palette, ShoppingBag, 
    Check, Brain, ShieldAlert, Clock,
    Smartphone, Code, Square, Image, User, Share2, Bell, Gamepad, Newspaper,
    Coffee, Armchair, Moon, UserX, Droplet, Layers, Frown, CloudRain, Target,
    MicOff, Watch, MessageSquare, CreditCard, Trash
} from 'lucide-react';
import clsx from 'clsx';

// --- COMPONENTS ---

const GoldCounter = ({ value }: { value: number }) => {
  const spring = useSpring(value, { stiffness: 50, damping: 20 });
  const displayValue = useTransform(spring, (current) => Math.round(current));
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
    const unsubscribe = displayValue.on("change", (latest) => {
      setDisplay(latest);
    });
    return () => unsubscribe();
  }, [value, spring, displayValue]);

  return <span>{display}</span>;
};

// Icon Map (Should be shared but keeping simple for now)
const IconMap: Record<string, React.ElementType> = {
    Zap, Brain, Palette, User, ShieldAlert, ShoppingBag, Clock, Code, Smartphone,
    Square, Image, Share2, Bell, Gamepad, Newspaper, Coffee, Armchair, Moon, UserX,
    Droplet, Layers, Frown, CloudRain, Target, MicOff, Watch, MessageSquare, CreditCard, Trash
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
}

const StoreContent = ({ }: StoreScreenProps) => {
  const { user, updateLuxLocally } = useLux();
  const { t } = useTranslation();
  const { purchase, storeItems, isTransactionPending, inventory, consume } = useEconomy();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Confirmation State
  const [itemToBuy, setItemToBuy] = useState<StoreItem | null>(null);
  const [successItem, setSuccessItem] = useState<StoreItem | null>(null);
  const [consumingItemId, setConsumingItemId] = useState<string | null>(null);
  const [isConsuming, setIsConsuming] = useState<boolean>(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState<boolean>(false);
  
  // Generate Filters based on items
  // We want: All, Power Ups, Themes
  const filters = useMemo(() => ([
      { id: 'all', label: 'store.filters.all' },
      { id: 'power_up', label: 'store.filters.power_up' },
      { id: 'inventory', label: 'store.filters.inventory' }
  ]), []);

  const filteredItems = useMemo(() => {
      return storeItems.filter(item => {
          if (activeFilter === 'all') return true;
          if (item.category === activeFilter) return true;
          if (item.subCategory === activeFilter) return true;
          return false;
      });
  }, [storeItems, activeFilter]);

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

  return (
    <div className="min-h-screen bg-transparent text-white pb-24 relative overflow-hidden">
       {/* Minimal Ambient Glow - Optimized */}
       <div 
            className="fixed top-0 left-0 right-0 h-96 opacity-10 pointer-events-none" 
            style={{ background: 'radial-gradient(circle at 50% 0%, #6366f1 0%, transparent 70%)' }}
       />

       {/* Confirmation Modal */}
       <ConfirmationModal 
            item={itemToBuy} 
            isOpen={!!itemToBuy} 
            onCancel={() => setItemToBuy(null)} 
            onConfirm={confirmPurchase}
            disabled={isTransactionPending}
       />

       {/* Purchase Success Modal */}
       <PurchaseSuccessModal 
            item={successItem} 
            isOpen={!!successItem} 
            onClose={() => setSuccessItem(null)} 
            onGoToInventory={() => {
                setActiveFilter('inventory');
                setSuccessItem(null);
            }}
       />

       {/* Streak Recovery Interactive Modal */}
       <StreakRecoveryModal
            isOpen={isStreakModalOpen}
            onClose={() => setIsStreakModalOpen(false)}
            userGold={user?.stats?.gold || 0}
            userStats={user?.stats || {}}
            habits={(user as any)?.habits || []}
            projects={(user as any)?.projects || []}
            onRestore={handleRestoreStreakAction}
       />

      <div className="relative z-10 w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 pt-6">

        {/* Header - Refined */}
        <div data-tour="store-header" className="sticky top-4 z-50 mb-6">
            <div className="absolute inset-0 bg-[#1c1c1e]/95 rounded-[24px] shadow-sm border border-white/5" />
            <div className="relative flex justify-between items-center px-5 py-3.5">
                <div className="flex items-center gap-3">
                    <h1 className="text-[22px] font-semibold tracking-tight text-white">{t('store.title')}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                        <Coins className="text-yellow-400" size={16} fill="currentColor" />
                        <span className="font-semibold text-white text-[15px]">
                            <GoldCounter value={user?.stats?.gold || 0} />
                        </span>
                    </div>

                    {/* Inventory Button REMOVED */}
                </div>
            </div>
        </div>

        {/* Filter Chips (Point 1 - Refined Tags) */}
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mask-gradient-right">
            {filters.map(filter => (
                <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={clsx(
                        "px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border",
                        activeFilter === filter.id 
                            ? "bg-white text-black border-white shadow-lg shadow-white/10" 
                            : "bg-[#1c1c1e] text-white/60 border-white/5 hover:bg-[#2c2c2e] hover:text-white"
                    )}
                >
                    {t(filter.label)}
                </button>
            ))}
        </div>

        {/* Grid */}
        <motion.div 
            data-tour="store-items"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            <AnimatePresence initial={false}>
                {activeFilter !== 'inventory' ? (
                    filteredItems.map((item) => (
                        <div id={`store-item-${item.id}`} key={item.id}>
                            <StoreCard 
                                item={item} 
                                userGold={user?.stats?.gold || 0}
                                onPurchase={() => initiatePurchase(item)} // Change to open modal
                                disabled={isTransactionPending}
                            />
                        </div>
                    ))
                ) : (
                    inventory.length > 0 ? inventory.map((invItem) => {
                        const storeItem = storeItems.find(si => si.id === invItem.itemId);
                        if (!storeItem) return null;
                        const Icon = IconMap[storeItem.iconName || 'ShoppingBag'] || ShoppingBag;
                        return (
                            <motion.div
                                key={invItem.itemId}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={clsx(
                                    "relative flex flex-col p-4 rounded-[20px] overflow-hidden transition-all duration-200",
                                    "bg-[#1c1c1e]/80 bg-gradient-to-b from-white/5 to-transparent",
                                    "border border-white/5 shadow-sm"
                                )}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2.5 rounded-xl flex items-center justify-center bg-white/10 text-white">
                                        <Icon size={20} strokeWidth={2} />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 text-white font-bold text-sm">
                                        x{invItem.quantity}
                                    </div>
                                </div>
                                <div className="flex-1 mb-4">
                                    <h3 className="text-[17px] font-semibold text-white mb-1 leading-snug tracking-tight">
                                        {t(storeItem.name)}
                                    </h3>
                                    <p className="text-[13px] text-white/50 leading-relaxed font-medium">
                                        {t(storeItem.description)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleConsume(invItem.itemId)}
                                    disabled={isConsuming || isTransactionPending}
                                    className={clsx(
                                        "w-full py-2.5 rounded-xl font-semibold text-[13px] tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-1.5",
                                        (isConsuming || isTransactionPending) 
                                            ? "bg-white/10 text-white/30 cursor-not-allowed" 
                                            : "bg-white text-black hover:bg-white/90"
                                    )}
                                >
                                    {consumingItemId === invItem.itemId && (isConsuming || isTransactionPending) ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        t('store.inventory.use')
                                    )}
                                </button>
                            </motion.div>
                        );
                    }) : (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="text-center py-20 text-white/20"
                        >
                            <ShoppingBag className="mx-auto mb-3 opacity-30" size={40} strokeWidth={1.5} />
                            <p className="text-sm font-medium">{t('store.inventory.empty')}</p>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
            
            {activeFilter !== 'inventory' && filteredItems.length === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-center py-20 text-white/20"
                >
                    <ShoppingBag className="mx-auto mb-3 opacity-30" size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">{t('store.emptyCategory')}</p>
                </motion.div>
            )}
        </motion.div>
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

