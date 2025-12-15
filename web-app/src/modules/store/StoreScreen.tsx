import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useMatrix } from '../../context/MatrixContext';
import { EconomyProvider, useEconomy } from '../../context/EconomyContext';
import { StoreCard } from './components/StoreCard';
import { AdShard } from './components/AdShard';
import { Coins, Zap, Sparkles, Ghost, ShoppingBag } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'boost' | 'cosmetic' | 'black_market'>('boost');

  // Filter items
  const items = storeItems.filter(item => item.category === activeTab);

  return (
    <div className="min-h-screen bg-[#020204] text-white pb-20 relative overflow-hidden">
       {/* Background Ambience (The Aurora System) */}
       <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-6">
        
        {/* Sticky Header */}
        <div className="sticky top-4 z-50 mb-8">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/5" />
            <div className="relative flex justify-between items-center p-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <ShoppingBag size={20} />
                    </div>
                    <span className="font-semibold text-lg tracking-tight">Matrix Armory</span>
                </div>

                <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
                    <Coins className="text-yellow-500" size={16} />
                    <span className="font-mono font-bold text-yellow-400 text-lg">
                        <GoldCounter value={user?.stats?.gold || 0} />
                    </span>
                </div>
            </div>
        </div>

        {/* Tabs (iOS Segmented Control) */}
        <div className="flex bg-gray-800/50 p-1 rounded-xl mb-8 backdrop-blur-md border border-white/5 relative">
          {(['boost', 'cosmetic', 'black_market'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 relative py-2 text-sm font-medium z-10 transition-colors duration-200"
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10 rounded-lg shadow-sm border border-white/10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={clsx(
                "flex items-center justify-center gap-2 relative",
                activeTab === tab ? "text-white" : "text-white/40"
              )}>
                {tab === 'boost' && <Zap size={14} />}
                {tab === 'cosmetic' && <Sparkles size={14} />}
                {tab === 'black_market' && <Ghost size={14} />}
                <span className="capitalize">{tab.replace('_', ' ')}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div 
            layout
            className="grid grid-cols-1 gap-4"
        >
            <AnimatePresence mode='popLayout'>
                {/* Ad Shard - Only in Boosts or always first? Let's put in Boosts */}
                {activeTab === 'boost' && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <AdShard onWatch={watchAd} />
                    </motion.div>
                )}

                {items.map((item) => (
                    <StoreCard 
                        key={item.id} 
                        item={item} 
                        userGold={user?.stats?.gold || 0}
                        onPurchase={purchase}
                        disabled={isTransactionPending}
                    />
                ))}
            </AnimatePresence>
            
            {items.length === 0 && activeTab !== 'boost' && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-center py-20 text-white/30"
                >
                    <Ghost className="mx-auto mb-4 opacity-50" size={40} />
                    <p>No items available in this sector.</p>
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
