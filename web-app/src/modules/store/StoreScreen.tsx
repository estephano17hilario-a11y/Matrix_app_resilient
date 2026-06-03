import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLux } from '@/context/LuxContext';
import { useEconomy } from '@/context/EconomyContext';
import { StoreCard } from './components/StoreCard';
import { StoreItem } from '../../services/economyService';
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
    isOpen 
}: { 
    item: StoreItem | null, 
    onConfirm: () => void, 
    onCancel: () => void,
    isOpen: boolean
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
                        onClick={onCancel}
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
                                    className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5"
                                >
                                    {t('store.confirm.no')}
                                </button>
                                <button 
                                    onClick={onConfirm}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                                >
                                    <Check size={18} />
                                    {t('store.confirm.yes')}
                                </button>
                            </div>
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
  const { user } = useLux();
  const { t } = useTranslation();
  const { purchase, storeItems, isTransactionPending, inventory, consume } = useEconomy();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Confirmation State
  const [itemToBuy, setItemToBuy] = useState<StoreItem | null>(null);
  
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
      setItemToBuy(item);
  };

  const confirmPurchase = async () => {
      if (!itemToBuy) return;
      
      const item = itemToBuy;
      const result = await purchase(item); // purchase now returns bool
      
      setItemToBuy(null);

      if (result) {
          // Success Feedback (Haptic handled in provider)
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
                                    onClick={() => consume(invItem.itemId)}
                                    disabled={isTransactionPending}
                                    className="w-full py-2.5 rounded-xl font-semibold text-[13px] tracking-wide transition-all active:scale-[0.98] bg-white text-black hover:bg-white/90"
                                >
                                    {t('store.inventory.use')}
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

