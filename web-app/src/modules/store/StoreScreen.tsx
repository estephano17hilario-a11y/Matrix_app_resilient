import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useMatrix } from '../../context/MatrixContext';
import { EconomyProvider, useEconomy } from '../../context/EconomyContext';
import { StoreCard } from './components/StoreCard';
import { AdShard } from './components/AdShard';
import { Coins, Zap, Palette, Sparkles, Ghost, ShoppingBag } from 'lucide-react';
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

const StoreContent = () => {
  const { user } = useMatrix();
  const { purchase, watchAd, storeItems, isTransactionPending } = useEconomy();
  const [activeTab, setActiveTab] = useState<'power_up' | 'theme' | 'cosmetic' | 'bad_habit'>('power_up');

  // Filter items
  const items = storeItems.filter(item => item.category === activeTab);

  const tabs = [
    { id: 'power_up', label: 'Mejoras', icon: Zap },
    { id: 'theme', label: 'Temas', icon: Palette },
    { id: 'cosmetic', label: 'Cosméticos', icon: Sparkles },
    { id: 'bad_habit', label: 'Malos Hábitos', icon: Ghost },
  ] as const;

  const subCategoryColors: Record<string, string> = {
    'Adicción Digital': 'text-cyan-400 border-cyan-500/30 bg-cyan-900/10',
    'Negligencia Física': 'text-rose-400 border-rose-500/30 bg-rose-900/10',
    'Desorden Mental': 'text-purple-400 border-purple-500/30 bg-purple-900/10',
    'Social/Comportamiento': 'text-emerald-400 border-emerald-500/30 bg-emerald-900/10',
  };

  const groupedItems = activeTab === 'bad_habit' 
    ? items.reduce((acc, item) => {
        const key = item.subCategory || 'Otros';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, typeof items>)
    : null;

  return (
    <div className="min-h-screen bg-transparent text-white pb-32 relative overflow-hidden">
       {/* Removed black background to allow global Aurora to show through */}
       
       {/* Minimal Ambient Glow (Very subtle) */}
       <div className="fixed top-0 left-0 right-0 h-96 bg-indigo-500/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-6">
        
        {/* Header - Minimal & Clean */}
        <div className="sticky top-4 z-50 mb-8">
            <div className="absolute inset-0 bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-white/5" />
            <div className="relative flex justify-between items-center px-5 py-3.5">
                <div className="flex items-center gap-3">
                    <h1 className="text-[22px] font-semibold tracking-tight text-white">Tienda</h1>
                </div>

                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                    <Coins className="text-yellow-400" size={16} fill="currentColor" />
                    <span className="font-semibold text-white text-[15px]">
                        <GoldCounter value={user?.stats?.gold || 0} />
                    </span>
                </div>
            </div>
        </div>

        {/* Apple-style Segmented Control */}
        <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6 border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 relative py-2 text-[13px] font-medium z-10 transition-all duration-200"
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#3a3a3c] rounded-[9px] shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={clsx(
                "flex items-center justify-center gap-1.5 relative transition-colors duration-200",
                activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/60"
              )}>
                {/* Icons are optional in segmented controls, maybe just text is cleaner? Keeping small icons for now. */}
                <tab.icon size={14} />
                <span className="capitalize">{tab.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div 
            layout
            className="grid grid-cols-1 gap-3"
        >
            <AnimatePresence mode='popLayout'>
                {/* Ad Shard - Only in Power Up */}
                {activeTab === 'power_up' && (
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

                {activeTab === 'bad_habit' && groupedItems ? (
                   Object.entries(groupedItems).map(([category, catItems]) => (
                     <motion.div 
                        key={category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`mb-4 rounded-2xl border p-3 ${subCategoryColors[category]?.split(' ').slice(1).join(' ') || 'border-white/5 bg-white/5'}`}
                     >
                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 pl-1 ${subCategoryColors[category]?.split(' ')[0] || 'text-white/50'}`}>
                            {category}
                        </h3>
                        <div className="space-y-3">
                            {catItems.map((item) => (
                                <StoreCard 
                                    key={item.id} 
                                    item={item} 
                                    userGold={user?.stats?.gold || 0}
                                    onPurchase={purchase}
                                    disabled={isTransactionPending}
                                />
                            ))}
                        </div>
                     </motion.div>
                   ))
                ) : (
                    items.map((item) => (
                        <StoreCard 
                            key={item.id} 
                            item={item} 
                            userGold={user?.stats?.gold || 0}
                            onPurchase={purchase}
                            disabled={isTransactionPending}
                        />
                    ))
                )}
            </AnimatePresence>
            
            {items.length === 0 && activeTab !== 'power_up' && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-center py-20 text-white/20"
                >
                    <ShoppingBag className="mx-auto mb-3 opacity-30" size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">Colección Vacía</p>
                </motion.div>
            )}
        </motion.div>
      </div>
    </div>
  );
};

export const StoreScreen = () => {
  return (
    <EconomyProvider>
      <StoreContent />
    </EconomyProvider>
  );
};
