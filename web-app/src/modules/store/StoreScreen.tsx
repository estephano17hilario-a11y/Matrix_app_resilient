import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMatrix } from '../../context/MatrixContext';
import { EconomyProvider, useEconomy } from '../../context/EconomyContext';
import { StoreCard } from './components/StoreCard';
import { AdShard } from './components/AdShard';
import { StoreItem } from '../../services/economyService';
import { 
    Coins, Zap, Palette, ShoppingBag, 
    Package, Check, Brain, ShieldAlert, Clock,
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
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
                    >
                        {/* Background Glow */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-indigo-500/10 blur-[50px] pointer-events-none" />

                        <div className="relative flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
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

interface FlyingIconProps {
    startPos: { x: number, y: number };
    endPos: { x: number, y: number };
    iconName: string;
    onComplete: () => void;
}

const FlyingIcon = ({ startPos, endPos, iconName, onComplete }: FlyingIconProps) => {
    const Icon = IconMap[iconName] || ShoppingBag;
    
    return (
        <motion.div
            initial={{ 
                position: 'fixed', 
                left: startPos.x, 
                top: startPos.y, 
                scale: 1,
                opacity: 1,
                zIndex: 9999
            }}
            animate={{ 
                left: endPos.x, 
                top: endPos.y, 
                scale: 0.2,
                opacity: 0
            }}
            transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1] // Apple-style ease
            }}
            onAnimationComplete={onComplete}
            className="pointer-events-none"
        >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg text-black">
                <Icon size={24} />
            </div>
        </motion.div>
    );
};

interface StoreScreenProps {
  onNavigate?: (view: string) => void;
}

const StoreContent = ({ onNavigate }: StoreScreenProps) => {
  const { user } = useMatrix();
  const { t } = useTranslation();
  const { purchase, watchAd, storeItems, isTransactionPending } = useEconomy();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Confirmation State
  const [itemToBuy, setItemToBuy] = useState<StoreItem | null>(null);
  
  // Animation State
  const [flyAnimation, setFlyAnimation] = useState<{ start: {x:number, y:number}, end: {x:number, y:number}, icon: string } | null>(null);
  
  const inventoryBtnRef = useRef<HTMLButtonElement>(null);

  // Generate Filters based on items
  // We want: All, Power Ups, Themes, Cosmetics, and then subcategories of Bad Habits
  const filters = [
      { id: 'all', label: 'store.filters.all' },
      { id: 'power_up', label: 'store.filters.power_up' },
      { id: 'theme', label: 'store.filters.theme' },
      { id: 'cosmetic', label: 'store.filters.cosmetic' },
      // Dynamically add categories? For now, let's hardcode the ones we know are important
      { id: 'digital_addiction', label: 'store.filters.digital_addiction' },
      { id: 'physical_neglect', label: 'store.filters.physical_neglect' },
      { id: 'mental_clutter', label: 'store.filters.mental_clutter' },
      { id: 'social_behavioral', label: 'store.filters.social_behavioral' }
  ];

  const filteredItems = storeItems.filter(item => {
      if (activeFilter === 'all') return true;
      if (item.category === activeFilter) return true;
      if (item.subCategory === activeFilter) return true;
      return false;
  });

  const initiatePurchase = (item: StoreItem) => {
      setItemToBuy(item);
  };

  const confirmPurchase = async () => {
      if (!itemToBuy) return;
      
      const item = itemToBuy;
      const result = await purchase(item); // purchase now returns bool
      
      setItemToBuy(null);

      if (result) {
          // Trigger Animation
          // Find the card element
          const cardEl = document.getElementById(`store-item-${item.id}`);
          const invBtnEl = inventoryBtnRef.current;

          if (cardEl && invBtnEl) {
              const cardRect = cardEl.getBoundingClientRect();
              const invRect = invBtnEl.getBoundingClientRect();

              setFlyAnimation({
                  start: { 
                      x: cardRect.left + cardRect.width / 2 - 24, // center - half icon size
                      y: cardRect.top + cardRect.height / 2 - 24
                  },
                  end: { 
                      x: invRect.left + invRect.width / 2 - 24,
                      y: invRect.top + invRect.height / 2 - 24
                  },
                  icon: item.iconName || 'ShoppingBag'
              });
          }
      }
  };

  return (
    <div className="min-h-screen bg-transparent text-white pb-32 relative overflow-hidden">
       {/* Minimal Ambient Glow */}
       <div className="fixed top-0 left-0 right-0 h-96 bg-indigo-500/5 blur-[100px] pointer-events-none" />

       {/* Confirmation Modal */}
       <ConfirmationModal 
            item={itemToBuy} 
            isOpen={!!itemToBuy} 
            onCancel={() => setItemToBuy(null)} 
            onConfirm={confirmPurchase}
       />

       {/* Flying Animation */}
       {flyAnimation && (
           <FlyingIcon 
                startPos={flyAnimation.start} 
                endPos={flyAnimation.end} 
                iconName={flyAnimation.icon} 
                onComplete={() => setFlyAnimation(null)} 
            />
       )}

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-6">
        
        {/* Header - Refined */}
        <div className="sticky top-4 z-50 mb-6">
            <div className="absolute inset-0 bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-white/5" />
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

                    {/* Inventory Button (Point 0) */}
                    <button 
                        ref={inventoryBtnRef}
                        onClick={() => onNavigate?.('INVENTORY')}
                        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/5 relative group"
                    >
                        <Package size={20} />
                        {/* Tooltip hint */}
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black px-2 py-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {t('store.inventory')}
                        </span>
                    </button>
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
            layout
            className="grid grid-cols-1 gap-3"
        >
            <AnimatePresence mode='popLayout'>
                {/* Ad Shard - Only when Power Ups or All are selected */}
                {(activeFilter === 'all' || activeFilter === 'power_up') && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AdShard onWatch={watchAd} />
                    </motion.div>
                )}

                {filteredItems.map((item) => (
                    <div id={`store-item-${item.id}`} key={item.id}>
                        <StoreCard 
                            item={item} 
                            userGold={user?.stats?.gold || 0}
                            onPurchase={() => initiatePurchase(item)} // Change to open modal
                            disabled={isTransactionPending}
                        />
                    </div>
                ))}
            </AnimatePresence>
            
            {filteredItems.length === 0 && (
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

export const StoreScreen = (props: StoreScreenProps) => {
  return (
    <EconomyProvider>
      <StoreContent {...props} />
    </EconomyProvider>
  );
};
