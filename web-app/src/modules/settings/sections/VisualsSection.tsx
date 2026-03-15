import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Eye, ChevronDown, Check, Sparkles, Briefcase, Zap, Layers, Rocket } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { THEMES } from '../../../config/themes';
import { cn } from '../../../utils/cn';

type DisplayCategory = 'all' | 'orbs' | 'minimal' | 'gradients' | 'holo' | 'cosmic';

export const VisualsSection = () => {
  const { 
    currentTheme, 
    setTheme, 
    vividMode, 
    toggleVividMode,
    dashboardStyle,
    setDashboardStyle,
  } = useSettings();
  const [openPanels, setOpenPanels] = useState({ layout: true, themes: true });
  const [selectedCategory, setSelectedCategory] = useState<DisplayCategory>('all');

  const togglePanel = (key: 'layout' | 'themes') => {
    setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const CATEGORIES: { id: DisplayCategory; label: string; icon: any }[] = [
    { id: 'all', label: 'All Reality', icon: Sparkles },
    { id: 'cosmic', label: 'Cosmic Void', icon: Rocket },
    { id: 'holo', label: 'Holographic', icon: Layers },
    { id: 'orbs', label: 'Living Orbs', icon: Zap },
    { id: 'minimal', label: 'Office & Focus', icon: Briefcase },
    { id: 'gradients', label: 'Gradients', icon: Palette },
  ];

  const filteredThemes = Object.values(THEMES).filter(theme => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'cosmic') return theme.category === 'cosmic';
    if (selectedCategory === 'holo') return theme.category === 'holo';
    if (selectedCategory === 'orbs') return theme.category === 'orbs';
    if (selectedCategory === 'minimal') return theme.category === 'minimal';
    if (selectedCategory === 'gradients') return theme.category === 'flow' || theme.category === 'nature';
    return true;
  });

  return (
    <div className="space-y-8 md:space-y-12 pb-24 max-w-2xl mx-auto">
      {/* HEADER */}
      <div className="space-y-2 md:space-y-4 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Palette className="text-indigo-400" size={24} />
          </div>
          <span className="text-xl md:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Visual Core</span>
        </h2>
        <p className="text-white/40 text-sm md:text-base md:pl-16 max-w-lg leading-relaxed">
          Customize your interface reality. Choose high-fidelity themes and physics designed for focus.
        </p>
      </div>

      <div className="space-y-8">
        {/* LAYOUT & DISPLAY */}
        <div className="space-y-3">
            <button
            onClick={() => togglePanel('layout')}
            className="w-full flex items-center justify-between group py-2"
            >
            <div className="flex items-center gap-3 text-white/80 font-medium text-sm md:text-base">
                <div className="w-1 h-4 rounded-full bg-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                Layout & Display
            </div>
            <div className={cn("p-1 rounded-full bg-white/5 text-white/40 transition-transform duration-300", openPanels.layout ? "rotate-180" : "")}>
                <ChevronDown size={16} />
            </div>
            </button>

            <AnimatePresence>
            {openPanels.layout && (
                <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden"
                >
                <div className="space-y-3 pt-1">
                    {/* Dashboard Style Selector */}
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 space-y-4 shadow-inner">
                        <div className="flex items-center justify-between">
                            <label className="text-xs md:text-sm font-medium text-white/70">Interface Style</label>
                            <span className={cn(
                                "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors",
                                dashboardStyle === 'GLASS' 
                                    ? "text-indigo-400/80 bg-indigo-500/10 border-indigo-500/20"
                                    : "text-emerald-400/80 bg-emerald-500/10 border-emerald-500/20"
                            )}>
                                GPU: {dashboardStyle === 'GLASS' ? 'HIGH' : 'LOW'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1 md:gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                            {['BORDER', 'LIQUID', 'GLASS'].map((style) => (
                                <button
                                key={style}
                                onClick={() => setDashboardStyle(style as any)}
                                className="relative group"
                                >
                                {dashboardStyle === style && (
                                    <motion.div
                                    layoutId="activeStyle"
                                    className="absolute inset-0 bg-white/10 rounded-lg border border-white/10 shadow-sm"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <div className={cn(
                                    "relative z-10 py-2 md:py-2.5 text-[10px] md:text-xs font-bold tracking-wider text-center transition-colors",
                                    dashboardStyle === style ? "text-white" : "text-white/40 group-hover:text-white/60"
                                )}>
                                    {style}
                                </div>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-white/30 px-1">
                            {dashboardStyle === 'GLASS' && "High-fidelity glassmorphism with real-time blur."}
                            {dashboardStyle === 'LIQUID' && "Fluid animations with optimized transparency."}
                            {dashboardStyle === 'BORDER' && "High performance wireframe aesthetic. Best for battery."}
                        </p>
                    </div>

                    {/* Vivid Mode */}
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-white/20 transition-colors shadow-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className={cn("transition-colors", vividMode ? "text-pink-400" : "text-white/40")} />
                                <span className="text-sm font-medium text-white/80">Vivid Mode</span>
                            </div>
                            <p className="text-[10px] text-white/40 max-w-[200px] hidden md:block">
                                Boosts saturation and contrast for OLED displays.
                            </p>
                        </div>
                        
                        <button
                            onClick={() => toggleVividMode(!vividMode)}
                            className={cn(
                            "w-12 h-7 rounded-full transition-all duration-300 relative border",
                            vividMode 
                                ? "bg-pink-500/20 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]" 
                                : "bg-black/40 border-white/10"
                            )}
                        >
                            <motion.div 
                            layout
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={cn(
                                "absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm",
                                vividMode ? "bg-pink-400 translate-x-5 shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "bg-white/20 translate-x-0"
                            )} 
                            />
                        </button>
                    </div>
                </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>

        {/* THEMES */}
        <div className="space-y-3">
            <button
            onClick={() => togglePanel('themes')}
            className="w-full flex items-center justify-between group py-2"
            >
            <div className="flex items-center gap-3 text-white/80 font-medium text-sm md:text-base">
                <div className="w-1 h-4 rounded-full bg-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                Themes
            </div>
            <div className={cn("p-1 rounded-full bg-white/5 text-white/40 transition-transform duration-300", openPanels.themes ? "rotate-180" : "")}>
                <ChevronDown size={16} />
            </div>
            </button>

            <AnimatePresence>
            {openPanels.themes && (
                <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6 pt-2"
                >
                {/* Category Tabs */}
                <div className="flex p-1 bg-black/30 border border-white/5 rounded-xl overflow-x-auto no-scrollbar gap-1">
                    {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                "relative flex items-center gap-2 px-3 py-2 md:px-4 rounded-lg text-xs font-medium transition-all duration-300 whitespace-nowrap flex-1 justify-center",
                                isSelected ? "text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                )}
                            >
                                {isSelected && (
                                <motion.div
                                    layoutId="activeCategory"
                                    className="absolute inset-0 bg-white/10 rounded-lg border border-white/10 shadow-sm"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <Icon size={14} />
                                    {cat.label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <motion.div 
                    className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-4"
                >
                    <AnimatePresence initial={false}>
                        {filteredThemes.map((theme) => {
                            const isActive = currentTheme === theme.id;
                            return (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                key={theme.id}
                                onClick={() => setTheme(theme.id)}
                                className={cn(
                                "relative group overflow-hidden rounded-xl border transition-all duration-300 text-left h-32 md:h-40 shadow-sm w-full",
                                isActive 
                                    ? "border-white/40 ring-1 ring-white/20 shadow-lg shadow-indigo-500/10" 
                                    : "border-white/5 hover:border-white/20 opacity-80 hover:opacity-100"
                                )}
                            >
                                {/* Gradient Background */}
                                <div 
                                className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" 
                                style={{ background: theme.gradient }} 
                                />
                                
                                {/* Fake Glass Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                
                                {/* Border Glow for Active */}
                                {isActive && <div className="absolute inset-0 border-2 border-white/20 rounded-xl" />}

                                {/* Content */}
                                <div className="absolute inset-0 p-3 flex flex-col justify-end">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white tracking-wider uppercase drop-shadow-md">
                                        {theme.name}
                                        </span>
                                        {isActive && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
                                        >
                                            <Check size={10} strokeWidth={4} />
                                        </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
