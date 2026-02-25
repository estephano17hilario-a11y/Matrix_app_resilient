import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeId, THEMES, ThemeCategory } from '../../../../config/themes';
import { cn } from '../../../../utils/cn';
import { 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Leaf, 
  Droplets, 
  Layout, 
  Sparkles,
  Monitor,
  Layers
} from 'lucide-react';

interface VisualsSectionProps {
  currentTheme: ThemeId | string;
  onThemeToggle: (theme: ThemeId) => void;
  dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS';
  onDashboardStyleChange?: (style: 'BORDER' | 'LIQUID' | 'GLASS') => void;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onAvatarShapeChange?: (shape: 'CIRCLE' | 'SQUARE') => void;
  vividMode?: boolean;
  onToggleVividMode?: (enabled: boolean) => void;
}

const CATEGORY_CONFIG: Record<ThemeCategory, { label: string; icon: React.ElementType; color: string }> = {
  orbs: { label: 'Ethereal Orbs', icon: Zap, color: 'text-indigo-400' },
  minimal: { label: 'Minimalist', icon: Layout, color: 'text-slate-400' },
  nature: { label: 'Organic Nature', icon: Leaf, color: 'text-emerald-400' },
  flow: { label: 'Fluid Flow', icon: Droplets, color: 'text-cyan-400' },
  holo: { label: 'Holographic', icon: Layers, color: 'text-fuchsia-400' },
};

export const VisualsSection = ({
  currentTheme,
  onThemeToggle,
  dashboardStyle,
  onDashboardStyleChange,
  avatarShape,
  onAvatarShapeChange,
  vividMode,
  onToggleVividMode
}: VisualsSectionProps) => {
  
  // Group themes by category
  const themesByCategory = useMemo(() => {
    const groups: Record<ThemeCategory, ThemeId[]> = {
      orbs: [],
      minimal: [],
      nature: [],
      flow: [],
      holo: []
    };
    
    Object.values(THEMES).forEach(theme => {
      if (groups[theme.category]) {
        groups[theme.category].push(theme.id);
      }
    });
    
    return groups;
  }, []);

  // State for expanded categories (default to category of current theme)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const currentThemeConfig = THEMES[currentTheme as ThemeId];
    const initialCategory = currentThemeConfig?.category || 'orbs';
    return { [initialCategory]: true };
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="space-y-12 pb-24 max-w-5xl mx-auto">
      <div className="space-y-4">
        <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-4">
            <Monitor className="text-cyan-400" size={36} />
            Visual Core
        </h2>
        <p className="text-white/40 text-lg max-w-2xl leading-relaxed">
          Customize your reality interface. High-performance rendering engine designed for focus and clarity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT COLUMN: THEME SELECTOR (Takes 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Theme Core
            </div>

            <div className="space-y-4">
                {(Object.keys(themesByCategory) as ThemeCategory[]).map((category) => {
                    const isOpen = expandedCategories[category];
                    const config = CATEGORY_CONFIG[category];
                    const themes = themesByCategory[category];
                    
                    if (themes.length === 0) return null;

                    return (
                        <div key={category} className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden transition-all duration-300">
                            <button 
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg bg-white/5", config.color)}>
                                        <config.icon size={18} />
                                    </div>
                                    <span className="font-bold text-white text-lg tracking-wide">{config.label}</span>
                                    <span className="text-xs font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                                        {themes.length}
                                    </span>
                                </div>
                                {isOpen ? <ChevronUp className="text-white/40" /> : <ChevronDown className="text-white/40" />}
                            </button>

                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    >
                                        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {themes.map(themeId => {
                                                const theme = THEMES[themeId];
                                                const isActive = currentTheme === themeId;
                                                
                                                return (
                                                    <button
                                                        key={themeId}
                                                        onClick={() => onThemeToggle(themeId)}
                                                        className={cn(
                                                            "relative group flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden",
                                                            isActive 
                                                                ? "bg-white/10 border-white/30 shadow-lg shadow-black/20" 
                                                                : "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/20"
                                                        )}
                                                    >
                                                        {/* Preview Circle */}
                                                        <div 
                                                            className={cn(
                                                                "w-12 h-12 rounded-full shrink-0 border border-white/10 shadow-inner relative overflow-hidden",
                                                                isActive ? "ring-2 ring-white/20 ring-offset-2 ring-offset-black/50" : ""
                                                            )}
                                                            style={{ background: theme.gradient }}
                                                        >
                                                            {!theme.isSolid && (
                                                                <div className="absolute inset-0 bg-white/20 blur-md scale-150 animate-pulse-slow" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 z-10">
                                                            <div className={cn(
                                                                "font-bold truncate transition-colors",
                                                                isActive ? "text-white" : "text-white/70 group-hover:text-white"
                                                            )}>
                                                                {theme.name}
                                                            </div>
                                                            <div className="text-xs text-white/30 truncate group-hover:text-white/50 transition-colors">
                                                                {theme.description}
                                                            </div>
                                                        </div>

                                                        {isActive && (
                                                            <motion.div 
                                                                layoutId="activeThemeCheck"
                                                                className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center shrink-0"
                                                            >
                                                                <Sparkles size={10} className="text-white" />
                                                            </motion.div>
                                                        )}
                                                        
                                                        {/* Active Glow Background (Fake Glass) */}
                                                        {isActive && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* RIGHT COLUMN: CONTROLS (Takes 1 col) */}
        <div className="space-y-8">
          <div className="space-y-6 sticky top-0">
            <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                Interface Physics
            </div>

            {/* CONTROL PANEL CARD */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-8">
                
                {/* Dashboard Style */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-sm">Navigation Style</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded">Layout</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                        <button
                            onClick={() => onDashboardStyleChange?.('BORDER')}
                            className={cn(
                                "py-2.5 rounded-lg text-[10px] font-bold transition-all border",
                                dashboardStyle === 'BORDER' 
                                    ? "bg-white/10 border-white/20 text-white shadow-sm" 
                                    : "bg-transparent border-transparent text-white/40 hover:text-white/60"
                            )}
                        >
                            BORDER
                        </button>
                        <button
                            onClick={() => onDashboardStyleChange?.('LIQUID')}
                            className={cn(
                                "py-2.5 rounded-lg text-[10px] font-bold transition-all border",
                                dashboardStyle === 'LIQUID' 
                                    ? "bg-white/10 border-white/20 text-white shadow-sm" 
                                    : "bg-transparent border-transparent text-white/40 hover:text-white/60"
                            )}
                        >
                            LIQUID
                        </button>
                        <button
                            onClick={() => onDashboardStyleChange?.('GLASS')}
                            className={cn(
                                "py-2.5 rounded-lg text-[10px] font-bold transition-all border",
                                dashboardStyle === 'GLASS' 
                                    ? "bg-white/10 border-white/20 text-white shadow-sm" 
                                    : "bg-transparent border-transparent text-white/40 hover:text-white/60"
                            )}
                        >
                            GLASS
                        </button>
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Avatar Shape */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-sm">Avatar Geometry</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded">Shape</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                        <button
                            onClick={() => onAvatarShapeChange?.('CIRCLE')}
                            className={cn(
                                "py-2.5 rounded-lg text-xs font-bold transition-all border",
                                avatarShape === 'CIRCLE' 
                                    ? "bg-white/10 border-white/20 text-white shadow-sm" 
                                    : "bg-transparent border-transparent text-white/40 hover:text-white/60"
                            )}
                        >
                            CIRCLE
                        </button>
                        <button
                            onClick={() => onAvatarShapeChange?.('SQUARE')}
                            className={cn(
                                "py-2.5 rounded-lg text-xs font-bold transition-all border",
                                avatarShape === 'SQUARE' 
                                    ? "bg-white/10 border-white/20 text-white shadow-sm" 
                                    : "bg-transparent border-transparent text-white/40 hover:text-white/60"
                            )}
                        >
                            SQUARE
                        </button>
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Vivid Mode */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-white font-bold text-sm block">Vivid Mode (OLED)</span>
                        <p className="text-xs text-white/40">Boosts saturation & contrast</p>
                    </div>
                    <button
                        onClick={() => onToggleVividMode?.(!vividMode)}
                        className={cn(
                            "w-12 h-7 rounded-full transition-colors relative border border-white/5",
                            vividMode ? "bg-cyan-500 shadow-[0_0_15px_-3px_rgba(6,182,212,0.5)]" : "bg-black/40"
                        )}
                    >
                        <div
                            className={cn(
                                "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                                vividMode ? "translate-x-5" : "translate-x-0"
                            )}
                        />
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
