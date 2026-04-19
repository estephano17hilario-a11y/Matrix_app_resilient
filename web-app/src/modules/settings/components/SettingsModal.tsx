import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, Hexagon, Cpu, User } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

import { VisualsSection } from '../sections/VisualsSection';
import { SystemSection } from '../sections/SystemSection';
import { AccountSection } from '../sections/AccountSection';
import { NeuralSection } from '../sections/NeuralSection';

const getTabs = (t: any) => [
  { id: 'visuals', label: t('settings.tabs.design', 'Design'), icon: Palette },
  { id: 'neural', label: t('settings.tabs.stats', 'Stats'), icon: Hexagon },
  { id: 'system', label: t('settings.tabs.prefs', 'Prefs'), icon: Cpu },
  { id: 'account', label: t('settings.tabs.profile', 'Profile'), icon: User },
];

export const SettingsModal = () => {
  const { t } = useTranslation();
  const { closeSettings, activeTab, setActiveTab } = useSettings();

  const renderContent = () => {
    switch (activeTab) {
      case 'visuals': return <VisualsSection />;
      case 'neural': return <NeuralSection />;
      case 'system': return <SystemSection />;
      case 'account': return <AccountSection />;
      default: return <VisualsSection />;
    }
  };

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
        style={{ willChange: "opacity" }}
      >
      <div className="absolute inset-0 bg-black/80" onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSettings();
      }} />

      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
        className="relative z-10 w-full max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden rounded-[24px] bg-gradient-to-br from-[#121212] to-[#050505] border border-white/[0.08] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
        style={{ willChange: "transform, opacity" }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04] shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{t('settings.title', 'Settings')}</h2>
            <p className="text-[11px] text-white/40 uppercase tracking-widest mt-0.5">{t('settings.subtitle', 'System Configuration')}</p>
          </div>
          <button
            onClick={closeSettings}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] hover:scale-105 transition-all active:scale-95 bg-white/[0.02] border border-white/[0.05]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex px-1 pt-2 pb-0 gap-1 overflow-x-auto no-scrollbar border-b border-white/[0.04] bg-white/[0.01] w-full">
          {getTabs(t).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(tab.id);
                }}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-bold transition-all rounded-t-xl group flex-1",
                  isActive ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-white/[0.08] to-transparent pointer-events-none rounded-t-xl" />
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 w-full">
                    <Icon size={16} className={cn("transition-transform shrink-0", isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "group-hover:scale-110")} />
                    <span className={cn(
                      "tracking-wide text-center truncate", 
                      tab.label.length > 5 ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs"
                    )}>{tab.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="settingsActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-gradient-to-r from-white/40 via-white to-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black/20 relative">
          <div className="p-6 min-h-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ type: "tween", ease: "easeInOut", duration: 0.15 }}
                className="h-full"
                style={{ willChange: "transform, opacity" }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
