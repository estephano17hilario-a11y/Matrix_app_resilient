import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Palette, Eye, Check, Sparkles, Briefcase, Zap, Layers, Rocket } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTheme } from '../../../context/ThemeContext';
import { THEMES, ThemeId } from '../../../config/themes';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

type DisplayCategory = 'all' | 'orbs' | 'minimal' | 'gradients' | 'holo' | 'cosmic';

const CATEGORIES: { id: DisplayCategory; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'cosmic', label: 'Cosmic', icon: Rocket },
  { id: 'holo', label: 'Holo', icon: Layers },
  { id: 'orbs', label: 'Orbs', icon: Zap },
  { id: 'minimal', label: 'Office', icon: Briefcase },
  { id: 'gradients', label: 'Gradients', icon: Palette },
];

export const VisualsSection = () => {
  const { t } = useTranslation();
  const { currentTheme, setTheme, vividMode, toggleVividMode, dashboardStyle, setDashboardStyle } = useSettings();
  const { previewTheme, setPreviewTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<DisplayCategory>('all');

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
    <div className="space-y-8 pb-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">{t('settings.tabs.design', 'Visual')}</h2>
        <p className="text-white/40 text-sm">{t('settings.visualDesc', 'Customize themes and display settings.')}</p>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
          <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
            style={{ 
              background: `radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)`,
              willChange: 'opacity'
            }} 
          />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Eye size={18} className="text-amber-400" />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">{t('settings.vividMode', 'Vivid Mode')}</div>
                <div className="text-xs text-white/40 font-medium">{t('settings.vividModeDesc', 'Boost saturation for OLED displays')}</div>
              </div>
            </div>
            <button
              onClick={() => toggleVividMode(!vividMode)}
              className={cn(
                "w-12 h-7 rounded-full transition-all relative shadow-inner border border-white/5",
                vividMode ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-black/50"
              )}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "absolute top-0.5 w-6 h-6 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.3)]",
                  vividMode ? "bg-white left-[22px]" : "bg-white/40 left-0.5"
                )}
              />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 space-y-5 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
          <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
            style={{ 
              background: `radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)`,
              willChange: 'opacity'
            }} 
          />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Layers size={18} className="text-blue-400" />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">{t('settings.dashboardStyle', 'Interface Style')}</div>
                <div className="text-xs text-white/40 font-medium">{t('settings.dashboardStyleDesc', 'Select UI style')}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/40 rounded-xl border border-white/[0.05] relative z-10 shadow-inner">
            {['BORDER', 'LIQUID', 'GLASS'].map((style) => (
              <button
                key={style}
                onClick={() => setDashboardStyle(style as any)}
                className={cn(
                  "relative py-2.5 rounded-lg text-[10px] font-bold tracking-widest transition-all",
                  dashboardStyle === style ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)] border border-blue-500/30" : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
                )}
              >
                {style === 'BORDER' ? t('settings.styleBorder', 'BORDER') : style === 'LIQUID' ? t('settings.styleLiquid', 'LIQUID') : t('settings.styleGlass', 'GLASS')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide">{t('settings.visualTheme', 'Themes')}</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

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
                className="bg-black/90 border border-white/20 px-8 py-4 rounded-full shadow-lg flex flex-col items-center gap-1 animate-enter-view hover:bg-black transition-colors"
              >
                <span className="text-white font-bold tracking-widest text-sm uppercase">{t('settings.tapToExit', 'Tap anywhere to exit')}</span>
                <span className="text-white/50 text-[10px] uppercase tracking-wider">{t('settings.previewMode', 'Preview Mode')}</span>
              </div>
            </div>,
            document.body
          )}

          <div className="flex p-1 bg-black/40 rounded-xl overflow-x-auto gap-1 border border-white/[0.05] shadow-inner custom-scrollbar">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredThemes.map((theme) => {
              const isActive = currentTheme === theme.id;
              return (
                <motion.button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative aspect-[4/3] rounded-[16px] overflow-hidden border transition-all text-left group shadow-md",
                    isActive ? "border-white/50 ring-2 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.15)]" : "border-white/[0.05] hover:border-white/30"
                  )}
                >
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ background: theme.gradient }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  {isActive && <div className="absolute inset-0 border-[2px] border-white/20 rounded-[16px]" />}
                  
                  <div className="absolute inset-0 p-3 flex flex-col justify-end">
                    <span className="text-xs font-bold text-white tracking-wider uppercase drop-shadow-md">
                      {theme.name}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handlePreview(e, theme.id)}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-white/20 hover:scale-110 shadow-lg z-20"
                    title={t('settings.previewTheme', 'Preview Theme')}
                  >
                    <Eye size={14} className="text-white" />
                  </button>
                  
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
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
