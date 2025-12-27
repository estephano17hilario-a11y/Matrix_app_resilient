import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMatrix } from '../../context/MatrixContext';
import { EconomyProvider, useEconomy } from '../../context/EconomyContext';
import { StoreItem } from '../../services/economyService';
import { 
  Search, Package, X, 
  Box, Zap, Ghost, Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { 
    Zap as IconZap, Brain, Palette, User, ShieldAlert, ShoppingBag as IconShoppingBag, Clock, Code, Smartphone, 
    Square, Image, Share2, Bell, Gamepad, Newspaper, Coffee, Armchair, Moon, UserX, 
    Droplet, Layers, Frown, CloudRain, Target, MicOff, Watch, MessageSquare, CreditCard, Trash 
} from 'lucide-react';

// Icon Map (Duplicated from StoreCard for now, should be shared but keeping simple)
const IconMap: Record<string, React.ElementType> = {
    Zap: IconZap, Brain, Palette, User, ShieldAlert, ShoppingBag: IconShoppingBag, Clock, Code, Smartphone,
    Square, Image, Share2, Bell, Gamepad, Newspaper, Coffee, Armchair, Moon, UserX,
    Droplet, Layers, Frown, CloudRain, Target, MicOff, Watch, MessageSquare, CreditCard, Trash
};

const InventoryItemCard = ({ 
    item, 
    count, 
    onUse 
}: { 
    item: StoreItem, 
    count: number, 
    onUse: (item: StoreItem) => void 
}) => {
    const { t } = useTranslation();
    const Icon = IconMap[item.iconName || 'ShoppingBag'] || IconShoppingBag;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative flex flex-col p-4 rounded-[20px] bg-[#1c1c1e]/80 backdrop-blur-md border border-white/5 overflow-hidden active:scale-[0.98] transition-all"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="p-2.5 rounded-xl bg-white/10 text-white">
                    <Icon size={20} strokeWidth={2} />
                </div>
                <div className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-bold text-white/80">
                    x{count}
                </div>
            </div>

            <div className="flex-1 mb-3">
                <h3 className="text-[15px] font-semibold text-white mb-1 leading-snug tracking-tight">
                    {t(item.name)}
                </h3>
                <p className="text-[12px] text-white/40 leading-relaxed line-clamp-2">
                    {t(item.description)}
                </p>
            </div>

            <button 
                onClick={() => onUse(item)}
                className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[12px] font-medium transition-colors border border-white/5"
            >
                {item.category === 'power_up' ? t('inventory.use') : t('inventory.equip')}
            </button>
        </motion.div>
    );
};

const InventoryContent = () => {
    const { user } = useMatrix();
    const { t } = useTranslation();
    const { storeItems, consume } = useEconomy();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'power_up' | 'cosmetic' | 'bad_habit'>('all');

    const inventory = user?.inventory || {};

    // Filter Logic
    const inventoryItems = useMemo(() => {
        // Get all items that are in user's inventory and have a quantity > 0
        const ownedItemIds = Object.keys(inventory).filter(id => inventory[id] > 0);
        
        let items = ownedItemIds.map(id => {
            const itemDef = storeItems.find(i => i.id === id);
            return itemDef ? { ...itemDef, count: inventory[id] } : null;
        }).filter((item): item is StoreItem & { count: number } => item !== null);

        // Exclude Themes as requested (or maybe show them now?)
        // items = items.filter(item => item.category !== 'theme');

        // Apply Category Filter
        if (activeFilter !== 'all') {
            items = items.filter(item => item.category === activeFilter);
        }

        // Apply Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(item => 
                item.name.toLowerCase().includes(q) || 
                item.description.toLowerCase().includes(q)
            );
        }

        return items;
    }, [inventory, storeItems, activeFilter, searchQuery]);

    const handleUse = async (item: StoreItem) => {
        if (item.category === 'theme') {
            // Placeholder for cosmetic logic
            console.log('Viewing cosmetic:', item.name);
            if (navigator.vibrate) navigator.vibrate(20);
            return;
        }

        // Consume Power Ups
        if (window.confirm(t('inventory.confirmUse', { item: t(item.name) }))) {
            const success = await consume(item.id);
            if (success) {
                if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            }
        }
    };

    const filters = [
        { id: 'all', label: 'inventory.filters.all', icon: Box },
        { id: 'power_up', label: 'inventory.filters.power_up', icon: Zap },
        { id: 'cosmetic', label: 'inventory.filters.cosmetic', icon: Sparkles },
        { id: 'bad_habit', label: 'inventory.filters.bad_habit', icon: Ghost },
    ] as const;

    return (
        <div className="min-h-screen bg-black text-white pb-32 relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 bg-[#000000]" />
            <div className="fixed top-0 left-0 right-0 h-96 bg-indigo-500/5 blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-lg mx-auto px-4 pt-6">
                
                {/* Header */}
                <div className="sticky top-4 z-50 mb-6">
                     <div className="absolute inset-0 bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-white/5" />
                     <div className="relative flex flex-col px-5 py-4 gap-4">
                        <div className="flex justify-between items-center">
                            <h1 className="text-[22px] font-semibold tracking-tight text-white">{t('inventory.title')}</h1>
                            <div className="bg-white/10 p-2 rounded-full">
                                <Package size={18} className="text-white/80" />
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('inventory.searchPlaceholder')}
                                className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-black/40 focus:border-white/10 transition-all"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                     </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                    {filters.map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border",
                                activeFilter === filter.id 
                                    ? "bg-white text-black border-white" 
                                    : "bg-[#1c1c1e] text-white/60 border-white/5 hover:bg-[#2c2c2e]"
                            )}
                        >
                            <filter.icon size={14} />
                            {t(filter.label)}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <motion.div layout className="grid grid-cols-2 gap-3">
                    <AnimatePresence mode='popLayout'>
                        {inventoryItems.map(item => (
                            <InventoryItemCard 
                                key={item.id} 
                                item={item} 
                                count={item.count} 
                                onUse={handleUse} 
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* Empty State */}
                {inventoryItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-[#1c1c1e] rounded-full flex items-center justify-center mb-4 border border-white/5">
                            <Package size={24} className="text-white/20" />
                        </div>
                        <h3 className="text-white/40 font-medium mb-1">{t('inventory.emptyTitle')}</h3>
                        <p className="text-white/20 text-xs">{t('inventory.emptyDesc')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const InventoryScreen = () => {
  return (
    <EconomyProvider>
      <InventoryContent />
    </EconomyProvider>
  );
};
