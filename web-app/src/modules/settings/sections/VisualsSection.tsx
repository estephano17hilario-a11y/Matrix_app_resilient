import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Eye, Check, Sparkles, Briefcase, Zap, Layers, Rocket, Coins, Hexagon, ChevronDown, Brain, Dumbbell, Wallet, Target, Users, Crown, Lock } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { THEMES, ThemeId, THEME_PRICES, DEFAULT_UNLOCKED_THEMES, ThemeConfig, ThemeCategory } from '../../../config/themes';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useEconomy } from '@/context/EconomyContext';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { TraitRadarChart } from '../../dashboard/components/TraitRadarChart';
import { Attribute } from '../../../types';
import { supabase } from '@/services/supabase';

type DisplayCategory = 'all' | 'orbs' | 'minimal' | 'gradients' | 'holo' | 'cosmic';

const CATEGORIES: { id: DisplayCategory; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'cosmic', label: 'Cosmic', icon: Rocket },
  { id: 'holo', label: 'Holo', icon: Layers },
  { id: 'orbs', label: 'Orbs', icon: Zap },
  { id: 'minimal', label: 'Office', icon: Briefcase },
  { id: 'gradients', label: 'Gradients', icon: Palette },
];

interface RadarColorOption {
  value: string;
  label: string;
  colorHex?: string;
  isRainbow?: boolean;
  priceGold?: number;
  isDeluxeOnly?: boolean;
}

const COLOR_OPTIONS: RadarColorOption[] = [
  { value: '#ffffff', label: 'Cristal Blanco', colorHex: '#ffffff', priceGold: 0 },
  { value: 'multicolor', label: '🌈 Arcoíris', isRainbow: true, isDeluxeOnly: true },
  { value: '#6366f1', label: 'Índigo', colorHex: '#6366f1', priceGold: 1250 },
  { value: '#06b6d4', label: 'Cyan', colorHex: '#06b6d4', priceGold: 1250 },
  { value: '#10b981', label: 'Esmeralda', colorHex: '#10b981', priceGold: 1250 },
  { value: '#8b5cf6', label: 'Violeta', colorHex: '#8b5cf6', priceGold: 1250 },
  { value: '#f43f5e', label: 'Rosa', colorHex: '#f43f5e', priceGold: 1250 },
  { value: '#f59e0b', label: 'Ámbar', colorHex: '#f59e0b', priceGold: 1250 },
  { value: '#0ea5e9', label: 'Cielo', colorHex: '#0ea5e9', priceGold: 1250 },
  { value: '#ef4444', label: 'Carmesí', colorHex: '#ef4444', priceGold: 1250 },
  { value: '#ec4899', label: 'Neón Pink', colorHex: '#ec4899', priceGold: 1250 },
  { value: '#84cc16', label: 'Lime', colorHex: '#84cc16', priceGold: 1250 },
  { value: '#f97316', label: 'Naranja Fuego', colorHex: '#f97316', priceGold: 1250 },
];

const DEMO_ATTRIBUTES: Attribute[] = [
  { id: 'MENTAL', label: 'Mental', icon: Brain, level: 8, xp: 40, maxXp: 100, color: '#06b6d4' },
  { id: 'FISICO', label: 'Físico', icon: Dumbbell, level: 6, xp: 75, maxXp: 100, color: '#ef4444' },
  { id: 'FINANZAS', label: 'Finanzas', icon: Wallet, level: 9, xp: 20, maxXp: 100, color: '#10b981' },
  { id: 'CREATIVIDAD', label: 'Creatividad', icon: Palette, level: 7, xp: 85, maxXp: 100, color: '#f59e0b' },
  { id: 'DISCIPLINA', label: 'Disciplina', icon: Target, level: 10, xp: 50, maxXp: 100, color: '#3b82f6' },
  { id: 'SOCIAL', label: 'Social', icon: Users, level: 5, xp: 30, maxXp: 100, color: '#ec4899' },
];

export const VisualsSection = () => {
  const { t } = useTranslation();
  const { profile, updateProfileLocally } = useAuth();
  const { purchase } = useEconomy();
  const { currentTheme, setTheme, vividMode, toggleVividMode, radarConfig, updateRadarConfig, isPro, showProModal } = useSettings();
  const { previewTheme, setPreviewTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<DisplayCategory>('all');
  const [isRadarConfigOpen, setIsRadarConfigOpen] = useState(false);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  
  // Theme purchase modal state
  const [themeToPurchase, setThemeToPurchase] = useState<ThemeConfig | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Radar color purchase modal state
  const [colorToPurchase, setColorToPurchase] = useState<RadarColorOption | null>(null);

  const handlePreview = (e: React.MouseEvent, themeId: ThemeId) => {
    e.stopPropagation();
    setPreviewTheme(themeId);
  };

  const handleExitPreview = () => {
    setPreviewTheme(null);
  };

  useEffect(() => {
    if (previewTheme) {
      document.body.classList.add('theme-preview-active');
    } else {
      document.body.classList.remove('theme-preview-active');
    }
    return () => {
      document.body.classList.remove('theme-preview-active');
    };
  }, [previewTheme]);

  useEffect(() => {
    if (themeToPurchase || colorToPurchase) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [themeToPurchase, colorToPurchase]);

  const unlockedItems = profile?.unlocked_store_items || profile?.unlockedStoreItems || [];
  const unlockedRadarColors: string[] = profile?.preferences?.unlockedRadarColors || ['#ffffff'];

  const isColorUnlocked = (opt: RadarColorOption): boolean => {
    if (opt.priceGold === 0) return true;
    if (opt.isDeluxeOnly) return isPro;
    if (isPro) return true;
    return unlockedRadarColors.includes(opt.value);
  };

  const handleSelectColorOption = (opt: RadarColorOption) => {
    setIsColorDropdownOpen(false);

    if (opt.isDeluxeOnly && !isPro) {
      showProModal();
      return;
    }

    if (isColorUnlocked(opt)) {
      updateRadarConfig({ fillColor: opt.value });
      return;
    }

    // Locked color costs 1250 Gold
    setColorToPurchase(opt);
  };

  const handleConfirmColorPurchase = async () => {
    if (!colorToPurchase || !profile?.stats) return;
    const price = colorToPurchase.priceGold || 1250;
    const currentGold = profile.stats.gold || 0;

    if (currentGold < price) {
      toast.error(t('store.insufficientFunds', 'Fondos insuficientes (Oro)'));
      return;
    }

    setIsPurchasing(true);
    try {
      const storeItem = {
        id: `radar_color_${colorToPurchase.value.replace('#', '')}`,
        name: `Color Radar (${colorToPurchase.label})`,
        description: `Desbloquea el color ${colorToPurchase.label} para el gráfico radar`,
        price: price,
        category: 'radar_color' as const
      };

      const success = await purchase(storeItem);
      if (success) {
        const newUnlockedColors = [...unlockedRadarColors, colorToPurchase.value];
        const newPrefs = { ...(profile.preferences || {}), unlockedRadarColors: newUnlockedColors };
        
        updateProfileLocally({ preferences: newPrefs });
        if (profile.id) {
          await supabase.from('users').update({ preferences: newPrefs }).eq('id', profile.id);
        }

        updateRadarConfig({ fillColor: colorToPurchase.value });
        setColorToPurchase(null);
        toast.success(`¡Color ${colorToPurchase.label} desbloqueado!`);
        confetti({ particleCount: 40, spread: 45, origin: { y: 0.8 } });
      }
    } catch (err) {
      console.error("Failed to purchase radar color:", err);
      toast.error(t('store.purchaseError', 'Error al realizar la compra'));
    } finally {
      setIsPurchasing(false);
    }
  };

  const getThemeDisplayPrice = (themeId: ThemeId, category: ThemeCategory): number => {
    if (DEFAULT_UNLOCKED_THEMES.includes(themeId)) return 0;
    return THEME_PRICES[category] || 0;
  };

  const filteredThemes = Object.values(THEMES).filter(theme => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'cosmic') return theme.category === 'cosmic';
    if (selectedCategory === 'holo') return theme.category === 'holo';
    if (selectedCategory === 'orbs') return theme.category === 'orbs';
    if (selectedCategory === 'minimal') return theme.category === 'minimal';
    if (selectedCategory === 'gradients') return theme.category === 'flow' || theme.category === 'nature';
    return true;
  });

  const sortedThemes = [...filteredThemes].sort((a, b) => {
    const priceA = getThemeDisplayPrice(a.id, a.category);
    const priceB = getThemeDisplayPrice(b.id, b.category);
    if (priceA !== priceB) return priceA - priceB;
    return a.name.localeCompare(b.name);
  });

  const handleSelectTheme = (theme: ThemeConfig) => {
    const isUnlocked = DEFAULT_UNLOCKED_THEMES.includes(theme.id) || unlockedItems.includes(theme.id);
    if (isUnlocked) {
      setTheme(theme.id);
    } else {
      setThemeToPurchase(theme);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!themeToPurchase || !profile?.stats) return;
    const price = THEME_PRICES[themeToPurchase.category] || 0;
    const currentGold = profile.stats.gold || 0;

    if (currentGold < price) {
      toast.error(t('store.insufficientFunds', 'Fondos insuficientes (Oro)'));
      return;
    }

    setIsPurchasing(true);
    try {
      const themeStoreItem = {
        id: themeToPurchase.id,
        name: themeToPurchase.name,
        description: themeToPurchase.description,
        price: price,
        category: 'theme' as const
      };

      const success = await purchase(themeStoreItem);
      if (success) {
        setTheme(themeToPurchase.id);
        setThemeToPurchase(null);
        toast.success(t('store.purchaseSuccess', '¡Tema adquirido con éxito!'));
        confetti({ particleCount: 50, spread: 45, origin: { y: 0.8 } });
      }
    } catch (err) {
      console.error("Failed to purchase theme:", err);
      toast.error(t('store.purchaseError', 'Error al realizar la compra'));
    } finally {
      setIsPurchasing(false);
    }
  };

  const currentSelectedColorOpt = COLOR_OPTIONS.find(o => o.value === radarConfig.fillColor) || COLOR_OPTIONS[0];

  return (
    <div className="space-y-8 pb-4 relative select-none">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">{t('settings.tabs.design', 'Visual')}</h2>
        <p className="text-white/40 text-sm">{t('settings.visualDesc', 'Customize themes and display settings.')}</p>
      </div>

      <div className="space-y-4">
        {/* Vivid Mode */}
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-4 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
          <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
            style={{ 
              background: `radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)`,
              willChange: 'opacity'
            }} 
          />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Eye size={16} className="text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight">{t('settings.vividMode', 'Vivid Mode')}</div>
                <div className="text-[11px] text-white/40 font-medium">{t('settings.vividModeDesc', 'Boost saturation for OLED displays')}</div>
              </div>
            </div>
            <button
              onClick={() => toggleVividMode(!vividMode)}
              className={cn(
                "w-11 h-6 rounded-full transition-all relative shadow-md border border-white/5",
                vividMode ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-black/50"
              )}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.3)]",
                  vividMode ? "bg-white left-[20px]" : "bg-white/40 left-0.5"
                )}
              />
            </button>
          </div>
        </div>

        {/* ─── RADAR CHART CUSTOMIZATION SECTION (COMPACT & COLLAPSIBLE) ─── */}
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Hexagon size={16} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Gráfico Radar / Araña</h3>
                <p className="text-[11px] text-white/40 font-medium">Personaliza figura interior, puntos y opacidad</p>
              </div>
            </div>
            <button
              onClick={() => setIsRadarConfigOpen(!isRadarConfigOpen)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10 active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <span>{isRadarConfigOpen ? 'Ocultar' : 'Personalizar'}</span>
              <ChevronDown size={14} className={cn("transition-transform duration-200", isRadarConfigOpen && "rotate-180")} />
            </button>
          </div>

          <AnimatePresence>
            {isRadarConfigOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-visible pt-3 space-y-3 border-t border-white/10 mt-3"
              >
                {/* Live Preview */}
                <div className="bg-black/50 rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center relative shadow-inner">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Vista Previa</span>
                  <TraitRadarChart attributes={DEMO_ATTRIBUTES} radarConfig={radarConfig} />
                </div>

                {/* 1. COLOR INTERIOR (FREE, 1250 GOLD OR DELUXE) */}
                <div className="relative space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/80">
                    <span>Color Interior</span>
                    <span className="text-[10px] text-white/40 font-normal">Gratis / 1250 Oro / Deluxe</span>
                  </div>
                  
                  {/* Custom Sleek Dropdown Trigger */}
                  <button
                    onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                    className="w-full bg-zinc-900/90 border border-white/15 rounded-xl p-2.5 flex items-center justify-between hover:border-white/30 transition-all text-xs font-bold text-white shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {currentSelectedColorOpt.isRainbow ? (
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500 shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-sm" style={{ backgroundColor: currentSelectedColorOpt.colorHex }} />
                      )}
                      <span className="truncate">{currentSelectedColorOpt.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentSelectedColorOpt.isDeluxeOnly && (
                        <span className="text-[9px] font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                          <Crown size={9} /> DELUXE
                        </span>
                      )}
                      <ChevronDown size={14} className={cn("transition-transform duration-200 text-white/50", isColorDropdownOpen && "rotate-180")} />
                    </div>
                  </button>

                  {/* Dropdown Menu Options */}
                  <AnimatePresence>
                    {isColorDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 top-full mt-1.5 z-[500] bg-zinc-950/95 border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl max-h-56 overflow-y-auto custom-scrollbar space-y-1"
                      >
                        {COLOR_OPTIONS.map(opt => {
                          const unlocked = isColorUnlocked(opt);
                          const isSelected = radarConfig.fillColor === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleSelectColorOption(opt)}
                              className={cn(
                                "w-full p-2 rounded-xl flex items-center justify-between text-xs font-bold transition-all text-left",
                                isSelected ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {opt.isRainbow ? (
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500 shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: opt.colorHex }} />
                                )}
                                <span className="truncate">{opt.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {opt.isDeluxeOnly ? (
                                  <span className="text-[9px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Crown size={9} /> DELUXE
                                  </span>
                                ) : opt.priceGold === 0 ? (
                                  <span className="text-[9px] font-bold text-emerald-400">GRATIS</span>
                                ) : unlocked ? (
                                  <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                                    <Check size={10} /> ADQUIRIDO
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                                    <Coins size={10} className="text-yellow-400" />
                                    <span className="text-[10px] font-black text-yellow-300">1250</span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ─── ALL OTHER CONTROLS (REQUIRE DELUXE / PRO 👑 🔒) ─── */}

                {/* 2. FILL OPACITY (DELUXE) */}
                <div 
                  onClick={() => { if (!isPro) showProModal(); }}
                  className={cn("space-y-1 p-2 rounded-xl border border-white/5 transition-all", !isPro && "cursor-pointer hover:border-amber-500/30 bg-amber-500/[0.02]")}
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white/80">Opacidad Relleno Interior</span>
                      {!isPro && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                          <Crown size={8} /> DELUXE <Lock size={8} />
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-indigo-400 font-bold">{radarConfig.fillOpacity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={radarConfig.fillOpacity} 
                    onChange={(e) => {
                      if (!isPro) { showProModal(); return; }
                      updateRadarConfig({ fillOpacity: Number(e.target.value) });
                    }}
                    disabled={!isPro}
                    className="w-full accent-indigo-500 bg-white/10 rounded-lg h-1.5 cursor-pointer disabled:opacity-50"
                  />
                </div>

                {/* 3. DOT SIZE (DELUXE) */}
                <div 
                  onClick={() => { if (!isPro) showProModal(); }}
                  className={cn("space-y-1 p-2 rounded-xl border border-white/5 transition-all", !isPro && "cursor-pointer hover:border-amber-500/30 bg-amber-500/[0.02]")}
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white/80">Tamaño de Puntos</span>
                      {!isPro && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                          <Crown size={8} /> DELUXE <Lock size={8} />
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-indigo-400 font-bold">{radarConfig.dotSize ?? 4.5}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="8" 
                    step="0.5"
                    value={radarConfig.dotSize ?? 4.5} 
                    onChange={(e) => {
                      if (!isPro) { showProModal(); return; }
                      updateRadarConfig({ dotSize: Number(e.target.value) });
                    }}
                    disabled={!isPro}
                    className="w-full accent-indigo-500 bg-white/10 rounded-lg h-1.5 cursor-pointer disabled:opacity-50"
                  />
                </div>

                {/* 4. LINE COLOR MODE (DELUXE) */}
                <div 
                  onClick={() => { if (!isPro) showProModal(); }}
                  className={cn("flex items-center justify-between gap-2 p-2 rounded-xl border border-white/5 transition-all", !isPro && "cursor-pointer hover:border-amber-500/30 bg-amber-500/[0.02]")}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white/80">Color Líneas (Borde)</span>
                    {!isPro && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                        <Crown size={8} /> DELUXE <Lock size={8} />
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                    <button
                      onClick={() => {
                        if (!isPro) { showProModal(); return; }
                        updateRadarConfig({ lineColorMode: 'gradient' });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                        (radarConfig.lineColorMode ?? 'gradient') === 'gradient' ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
                      )}
                    >
                      Degradado
                    </button>
                    <button
                      onClick={() => {
                        if (!isPro) { showProModal(); return; }
                        updateRadarConfig({ lineColorMode: 'fill' });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                        radarConfig.lineColorMode === 'fill' ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
                      )}
                    >
                      Relleno
                    </button>
                  </div>
                </div>

                {/* 5. DOT COLOR MODE (DELUXE) */}
                <div 
                  onClick={() => { if (!isPro) showProModal(); }}
                  className={cn("flex items-center justify-between gap-2 p-2 rounded-xl border border-white/5 transition-all", !isPro && "cursor-pointer hover:border-amber-500/30 bg-amber-500/[0.02]")}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white/80">Color Puntos</span>
                    {!isPro && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                        <Crown size={8} /> DELUXE <Lock size={8} />
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                    <button
                      onClick={() => {
                        if (!isPro) { showProModal(); return; }
                        updateRadarConfig({ dotColorMode: 'trait' });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                        radarConfig.dotColorMode === 'trait' ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
                      )}
                    >
                      Traits
                    </button>
                    <button
                      onClick={() => {
                        if (!isPro) { showProModal(); return; }
                        updateRadarConfig({ dotColorMode: 'fill' });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                        radarConfig.dotColorMode === 'fill' ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
                      )}
                    >
                      Relleno
                    </button>
                  </div>
                </div>

                {/* 5. DOT OPACITY (DELUXE) */}
                <div 
                  onClick={() => { if (!isPro) showProModal(); }}
                  className={cn("space-y-1 p-2 rounded-xl border border-white/5 transition-all", !isPro && "cursor-pointer hover:border-amber-500/30 bg-amber-500/[0.02]")}
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white/80">Opacidad Puntos</span>
                      {!isPro && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                          <Crown size={8} /> DELUXE <Lock size={8} />
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-indigo-400 font-bold">{radarConfig.dotOpacity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={radarConfig.dotOpacity} 
                    onChange={(e) => {
                      if (!isPro) { showProModal(); return; }
                      updateRadarConfig({ dotOpacity: Number(e.target.value) });
                    }}
                    disabled={!isPro}
                    className="w-full accent-indigo-500 bg-white/10 rounded-lg h-1.5 cursor-pointer disabled:opacity-50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Themes Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <h3 className="text-sm font-bold text-white tracking-wide">{t('settings.visualTheme', 'Themes')}</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            {profile?.stats && (
              <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full shrink-0 shadow-sm">
                <Coins size={12} className="text-yellow-400 animate-pulse" />
                <span className="text-xs font-black text-yellow-300 tracking-tight">
                  {profile.stats.gold || 0}
                </span>
              </div>
            )}
          </div>

          {/* Clean Theme Preview Portal */}
          {previewTheme && typeof document !== 'undefined' && createPortal(
            <div 
              className="theme-preview-portal fixed inset-0 z-[999999] flex flex-col items-center justify-end pb-24 cursor-pointer gpu-accelerated"
              onClick={handleExitPreview}
            >
              <style>{`
                body.theme-preview-active #root > div > .relative.z-10,
                body.theme-preview-active > div:not(.theme-preview-portal):not(#root) {
                  opacity: 0 !important;
                  pointer-events: none !important;
                  transition: opacity 0.15s ease-out !important;
                }
              `}</style>
              
              <div 
                className="bg-black/90 border border-white/20 px-8 py-3.5 rounded-full shadow-2xl flex flex-col items-center gap-0.5 animate-enter-view hover:bg-black transition-colors"
              >
                <span className="text-white font-bold tracking-widest text-xs uppercase">{t('settings.tapToExit', 'Tap anywhere to exit')}</span>
                <span className="text-white/50 text-[9px] uppercase tracking-wider">{t('settings.previewMode', 'Preview Mode')}</span>
              </div>
            </div>,
            document.body
          )}

          <div className="flex p-1 bg-black/40 rounded-xl overflow-x-auto gap-1 border border-white/[0.05] shadow-md custom-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    isSelected ? "bg-white/[0.15] text-white shadow-md" : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
                  )}
                >
                  <Icon size={14} className={cn("transition-transform", isSelected && "scale-110")} />
                  {t(`settings.categories.${cat.id}`, cat.label)}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5">
            {sortedThemes.map((theme) => {
              const isActive = currentTheme === theme.id;
              const isUnlocked = DEFAULT_UNLOCKED_THEMES.includes(theme.id) || unlockedItems.includes(theme.id);
              const price = getThemeDisplayPrice(theme.id, theme.category);

              return (
                <div 
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme)}
                  className="flex flex-col group cursor-pointer"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative aspect-[16/11] rounded-[16px] overflow-hidden border transition-all text-left shadow-md",
                      isActive ? "border-white/50 ring-2 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.15)]" : "border-white/[0.05] hover:border-white/30"
                    )}
                  >
                    <div className="absolute inset-0 transition-transform duration-200 group-hover:scale-110" style={{ background: theme.gradient }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    
                    {isActive && <div className="absolute inset-0 border-[2px] border-white/20 rounded-[16px]" />}

                    {/* Eye Preview Button */}
                    <button
                      onClick={(e) => handlePreview(e, theme.id)}
                      className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-white/20 hover:scale-110 shadow-lg z-20"
                      title={t('settings.previewTheme', 'Preview Theme')}
                    >
                      <Eye size={14} className="text-white" />
                    </button>
                    
                    {/* Checkmark for Active Theme */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-[0_2px_5px_rgba(0,0,0,0.5)] z-10"
                      >
                        <Check size={12} strokeWidth={4} className="text-black" />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Metadata below card */}
                  <div className="mt-2 px-1 flex flex-col">
                    <span className="text-xs font-bold text-white truncate group-hover:text-white/90 transition-colors">
                      {theme.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {isUnlocked ? (
                        <span className="text-[10px] font-bold text-emerald-400">
                          {isActive ? t('settings.themeActive', 'Activo') : t('settings.themeUnlocked', 'Adquirido')}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Coins size={10} className="text-yellow-400 animate-pulse" />
                          <span className="text-[10px] font-black text-yellow-400">
                            {price}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Radar Color Purchase Confirmation Modal */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {colorToPurchase && (
            <motion.div 
              key="color-purchase-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto overflow-hidden"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-gradient-to-b from-[#18181b] to-[#09090b] border border-white/10 rounded-[32px] p-6 shadow-2xl text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-lg">
                  <Hexagon size={28} />
                </div>

                <h3 className="text-xl font-black text-white tracking-tight mb-1">
                  Desbloquear Color
                </h3>
                <p className="text-xs text-white/50 mb-6">
                  {colorToPurchase.label} para el relleno del gráfico radar
                </p>

                <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/5 rounded-2xl py-3 px-5 w-fit mx-auto mb-6 shadow-sm">
                  <Coins size={20} className="text-yellow-400 animate-bounce" />
                  <span className="text-xl font-black text-yellow-300 tracking-tight">1250</span>
                  <span className="text-xs font-bold text-white/40 uppercase">Oro</span>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleConfirmColorPurchase}
                    disabled={isPurchasing}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-xs uppercase tracking-widest hover:from-yellow-600 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isPurchasing ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Comprar Color'
                    )}
                  </button>
                  <button
                    onClick={() => setColorToPurchase(null)}
                    disabled={isPurchasing}
                    className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs uppercase tracking-widest transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Theme Purchase Confirmation Modal */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {themeToPurchase && (
            <motion.div 
              key="theme-purchase-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[120000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto overflow-hidden touch-none"
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="w-full max-w-sm bg-gradient-to-b from-[#18181b] to-[#09090b] border border-white/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden text-center"
              >
                <div 
                  className="absolute -top-12 -left-12 w-40 h-40 rounded-full opacity-20 pointer-events-none filter blur-2xl"
                  style={{ background: themeToPurchase.gradient }}
                />
                
                <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-inner mb-5 relative flex items-center justify-center group">
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110" style={{ background: themeToPurchase.gradient }} />
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
                  <span className="relative z-10 text-white font-black tracking-widest text-lg uppercase drop-shadow-md">
                    {themeToPurchase.name}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white tracking-tight mb-2">
                  {t('settings.unlockTheme', 'Unlock Theme')}
                </h3>
                <p className="text-sm text-white/50 mb-6 px-2 leading-relaxed">
                  {themeToPurchase.description}
                </p>

                <div className="flex items-center justify-center gap-3 bg-white/5 border border-white/5 rounded-2xl py-3.5 px-5 w-fit mx-auto mb-8 shadow-sm">
                  <Coins size={22} className="text-yellow-400 animate-bounce" />
                  <span className="text-2xl font-black text-yellow-300 tracking-tight">
                    {THEME_PRICES[themeToPurchase.category]}
                  </span>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    {t('economy.gold', 'Gold')}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleConfirmPurchase}
                    disabled={isPurchasing}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-xs uppercase tracking-widest hover:from-yellow-600 hover:to-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
                  >
                    {isPurchasing ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      t('store.buyNow', 'Confirm Purchase')
                    )}
                  </button>
                  <button
                    onClick={() => setThemeToPurchase(null)}
                    disabled={isPurchasing}
                    className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs uppercase tracking-widest transition-all border border-white/5 active:scale-[0.98]"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
