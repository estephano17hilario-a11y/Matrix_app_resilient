import React, { useState, useMemo, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X, ChevronDown, Palette, ArrowDown, ListFilter, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface IconPickerProps {
    selectedIcon: string | null;
    onSelectIcon: (iconName: string | null) => void;
    selectedColor: string | undefined;
    onSelectColor: (color: string | undefined) => void;
    onToggle?: (isOpen: boolean) => void;
}

const COLOR_PALETTE = {
    'Rojos': ['#ef4444', '#f87171', '#dc2626', '#b91c1c', '#991b1b'],
    'Rosas': ['#ec4899', '#f472b6', '#db2777', '#be185d', '#831843'],
    'Naranjas': ['#f97316', '#fb923c', '#ea580c', '#c2410c', '#7c2d12'],
    'Amarillos': ['#eab308', '#facc15', '#ca8a04', '#a16207', '#713f12'],
    'Marrones': ['#78350f', '#92400e', '#b45309', '#d97706', '#5d4037', '#795548', '#8d6e63', '#a1887f', '#4e342e'],
    'Verdes': ['#22c55e', '#4ade80', '#16a34a', '#15803d', '#14532d', '#84cc16', '#65a30d', '#3f6212'],
    'Cianes': ['#06b6d4', '#22d3ee', '#0891b2', '#0e7490', '#155e75', '#38bdf8', '#0ea5e9', '#0284c7'],
    'Azules': ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af', '#6366f1', '#818cf8', '#4f46e5'],
    'Violetas': ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#5b21b6', '#d946ef', '#e879f9', '#c026d3'],
    'Grises': ['#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b']
};

import { ICON_CATEGORIES } from '../constants/iconCategories';

export const IconPicker = ({ selectedIcon, onSelectIcon, selectedColor, onSelectColor, onToggle }: IconPickerProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayLimit, setDisplayLimit] = useState(100);
    const [activeTab, setActiveTab] = useState<'icons' | 'colors'>('icons');
    const [activeCategory, setActiveCategory] = useState('All');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showScrollIndicator, setShowScrollIndicator] = useState(true);
    
    // Reset scroll indicator when tab changes
    useEffect(() => {
        setShowScrollIndicator(true);
    }, [activeTab]);

    // Filter valid icons from Lucide exports AND restrict to our categories
    const iconList = useMemo(() => {
        const allIcons = new Set<string>();
        Object.values(ICON_CATEGORIES).forEach(icons => {
            icons.forEach(icon => allIcons.add(icon));
        });
        
        // Validate against Lucide library to prevent crashes if an icon name is wrong
        return Array.from(allIcons)
            .filter(name => (LucideIcons as any)[name])
            .sort();
    }, []);

    // Filter icons based on search or category
    const filteredIcons = useMemo(() => {
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            return iconList.filter(name => name.toLowerCase().includes(lowerTerm));
        }
        
        if (activeCategory === 'All') {
            return iconList;
        }

        // Return curated icons for category, but ensure they exist in Lucide
        return ICON_CATEGORIES[activeCategory]?.filter(icon => iconList.includes(icon)) || [];
    }, [iconList, searchTerm, activeCategory]);

    const displayedIcons = useMemo(() => {
        return filteredIcons.slice(0, displayLimit);
    }, [filteredIcons, displayLimit]);

    // Handle scroll to load more
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
            setDisplayLimit(prev => Math.min(prev + 50, filteredIcons.length));
        }
        
        // Hide scroll indicator if scrolled down a bit
        if (scrollTop > 20) {
            setShowScrollIndicator(false);
        }
    };

    const SelectedIconComponent = selectedIcon && (LucideIcons as any)[selectedIcon] 
        ? (LucideIcons as any)[selectedIcon] 
        : null;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/30 uppercase pl-1">{t('habits.customizationOptional', 'Customization (Optional)')}</span>
                {selectedIcon && (
                    <button 
                        onClick={() => { onSelectIcon(null); onSelectColor(undefined); }}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* Trigger Button */}
            <button
                onClick={() => {
                    const newState = !isOpen;
                    setIsOpen(newState);
                    onToggle?.(newState);
                }}
                className={cn(
                    "w-full h-14 rounded-xl border flex items-center justify-between px-4 transition-all relative group",
                    selectedIcon || isOpen ? "bg-white/5 border-white/10" : "bg-black/20 border-dashed border-white/10 hover:border-white/30"
                )}
            >
                <div className="flex items-center gap-4">
                    {SelectedIconComponent ? (
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/40 border border-white/5"
                            style={{ color: selectedColor || '#ffffff' }}
                        >
                            <SelectedIconComponent size={20} />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 text-white/20">
                            <Palette size={20} />
                        </div>
                    )}
                    <div className="flex flex-col items-start gap-0.5">
                        <span className={cn("text-sm font-bold", selectedIcon ? "text-white" : "text-white/30")}>
                            {selectedIcon ? selectedIcon : t('habits.selectIconColor', 'Select Icon & Color')}
                        </span>
                        <span className="text-[10px] text-white/40 font-medium">
                            {selectedIcon ? t('common.clickToChange') : t('common.customizeHabit')}
                        </span>
                    </div>
                </div>
                <ChevronDown size={18} className={cn("text-white/30 transition-transform", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative z-10"
                    >
                        <div className="p-4 bg-[#151516] rounded-2xl border border-white/10 shadow-2xl space-y-4 mt-2">
                            
                            {/* Tabs */}
                            <div className="flex p-1 bg-black/40 rounded-xl">
                                <button 
                                    onClick={() => setActiveTab('icons')}
                                    className={cn(
                                        "flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                        activeTab === 'icons' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                                    )}
                                >
                                    {t('habits.picker.icons', 'ICONS')}
                                </button>
                                <button 
                                    onClick={() => setActiveTab('colors')}
                                    className={cn(
                                        "flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                        activeTab === 'colors' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                                    )}
                                >
                                    {t('habits.picker.colors', 'COLORS')}
                                </button>
                            </div>

                            {/* Content */}
                            <div className="h-[400px] flex flex-col relative">
                                {activeTab === 'icons' ? (
                                    <div className="h-full flex flex-col gap-3">
                                        {/* Search */}
                                        <div className="relative shrink-0">
                                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input 
                                                type="text"
                                                placeholder={t('common.searchIcon', 'Search icon...')}
                                                value={searchTerm}
                                                onChange={(e) => { setSearchTerm(e.target.value); setDisplayLimit(100); setActiveCategory('All'); }}
                                                className="w-full h-10 bg-black/40 rounded-xl pl-10 pr-3 text-sm text-white placeholder:text-white/20 border border-white/5 focus:border-white/20 outline-none transition-colors"
                                            />
                                            {searchTerm && (
                                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Categories */}
                                        {!searchTerm && (
                                            <div className="flex gap-2 w-full items-start relative z-20">
                                                {/* Dropdown Trigger */}
                                                <div className="relative shrink-0">
                                                    <button
                                                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                                        className={cn(
                                                            "w-8 h-[29px] rounded-lg flex items-center justify-center transition-all border",
                                                            showCategoryDropdown 
                                                                ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                                                                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10 hover:text-white"
                                                        )}
                                                        title={t('common.viewAllCategories', 'View all categories')}
                                                    >
                                                        <ListFilter size={16} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {showCategoryDropdown && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                                                className="absolute top-full left-0 mt-2 w-48 bg-[#151516] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col p-1 max-h-60 overflow-y-auto"
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveCategory('All');
                                                                        setShowCategoryDropdown(false);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full px-3 py-2 rounded-lg text-xs font-bold text-left flex items-center justify-between transition-colors shrink-0",
                                                                        activeCategory === 'All' ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white"
                                                                    )}
                                                                >
                                                                    <span>{t('habits.categories.all', 'ALL')}</span>
                                                                    {activeCategory === 'All' && <Check size={12} />}
                                                                </button>
                                                                <div className="h-px bg-white/5 my-1 mx-2 shrink-0" />
                                                                {Object.keys(ICON_CATEGORIES).map(cat => (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={() => {
                                                                            setActiveCategory(cat);
                                                                            setShowCategoryDropdown(false);
                                                                        }}
                                                                        className={cn(
                                                                            "w-full px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors shrink-0",
                                                                            activeCategory === cat ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white"
                                                                        )}
                                                                    >
                                                                        <span>{t(`habits.categories.${cat.toLowerCase()}`, cat)}</span>
                                                                        {activeCategory === cat && <Check size={12} />}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 shrink-0 flex-1 touch-pan-x">
                                                    <button
                                                        onClick={() => setActiveCategory('All')}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors border shrink-0",
                                                            activeCategory === 'All' ? "bg-white text-black border-white" : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
                                                        )}
                                                    >
                                                        {t('habits.categories.all', 'ALL')}
                                                    </button>
                                                    {Object.keys(ICON_CATEGORIES).map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setActiveCategory(cat)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors border shrink-0",
                                                                activeCategory === cat ? "bg-white text-black border-white" : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
                                                            )}
                                                        >
                                                            {t(`habits.categories.${cat.toLowerCase()}`, cat)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Grid */}
                                        <div 
                                            className="flex-1 overflow-y-auto overflow-x-hidden grid grid-cols-6 gap-2 p-1 min-h-0"
                                            onScroll={handleScroll}
                                        >
                                            {displayedIcons.map(iconName => {
                                                const Icon = (LucideIcons as any)[iconName];
                                                const isSelected = selectedIcon === iconName;
                                                return (
                                                    <button
                                                        key={iconName}
                                                        onClick={() => onSelectIcon(iconName)}
                                                        className={cn(
                                                            "aspect-square rounded-xl flex items-center justify-center transition-all hover:bg-white/10 relative",
                                                            isSelected ? "bg-white/20 text-white ring-1 ring-white/50" : "text-white/40 hover:text-white"
                                                        )}
                                                        title={iconName}
                                                    >
                                                        <Icon size={20} />
                                                        {isSelected && (
                                                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                            {displayedIcons.length === 0 && (
                                                <div className="col-span-6 text-center py-12 text-white/30 text-xs flex flex-col items-center gap-2">
                                                    <Search size={24} className="opacity-50" />
                                                    <span>{t('habits.picker.noIconsFound', 'No icons found')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full overflow-y-auto p-1 space-y-6" onScroll={handleScroll}>
                                        {Object.entries(COLOR_PALETTE).map(([groupName, colors]) => (
                                            <div key={groupName} className="space-y-2">
                                                <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">{t(`habits.categories.${groupName.toLowerCase()}`, groupName)}</h4>
                                                <div className="grid grid-cols-8 gap-2">
                                                    {colors.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => onSelectColor(color)}
                                                            className={cn(
                                                                "w-full aspect-square rounded-full transition-all hover:scale-110",
                                                                selectedColor === color ? "ring-2 ring-white scale-110 z-10" : "opacity-70 hover:opacity-100"
                                                            )}
                                                            style={{ 
                                                                background: color, 
                                                                boxShadow: selectedColor === color ? `0 0 15px ${color}80` : 'none' 
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Scroll Indicator Bubble */}
                                <AnimatePresence>
                                    {showScrollIndicator && (activeTab === 'colors' || filteredIcons.length > 12) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                                            className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
                                        >
                                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                                            <motion.div
                                                animate={{ y: 6 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20, repeat: Infinity, repeatType: 'reverse' }}
                                                className="relative mx-auto mb-3 w-fit rounded-full px-3 py-2 border border-white/20 bg-black/60 shadow-md flex items-center gap-2"
                                            >
                                                <ArrowDown size={16} className="text-white/90" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{t('habits.picker.swipe', 'Swipe')}</span>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
