import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { 
  Monitor, 
  Cpu, 
  Brain, 
  UserCircle, 
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../../utils/cn';

// Sections - Lazy Loaded for Performance
const VisualsSection = lazy(() => import('./components/VisualsSection').then(module => ({ default: module.VisualsSection })));
const SystemSection = lazy(() => import('./components/SystemSection').then(module => ({ default: module.SystemSection })));
const NeuralSection = lazy(() => import('./components/NeuralSection').then(module => ({ default: module.NeuralSection })));
const AccountSection = lazy(() => import('./components/AccountSection').then(module => ({ default: module.AccountSection })));

// Types
import { ThemeId } from '../../../config/themes';
import { Attribute } from '../../../types';

interface SettingsHubProps {
  currentTheme: ThemeId | string;
  onThemeToggle: (theme: ThemeId) => void;
  showProfile: boolean;
  onToggleProfile: (show: boolean) => void;
  defaultChartMode: 'RADAR' | 'BAR';
  onSetDefaultChartMode: (mode: 'RADAR' | 'BAR') => void;
  attributes?: Attribute[];
  onUpdateAttribute?: (id: string, updates: Partial<Attribute>) => void;
  onAddAttribute?: (id: string) => void;
  onRemoveAttribute?: (id: string) => void;
  onClose: () => void;
  onShowPro?: () => void;
  isPro?: boolean;
  dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS';
  onDashboardStyleChange?: (style: 'BORDER' | 'LIQUID' | 'GLASS') => void;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onAvatarShapeChange?: (shape: 'CIRCLE' | 'SQUARE') => void;
  vividMode?: boolean;
  onToggleVividMode?: (enabled: boolean) => void;
  habitSectionControl?: 'VISIBLE' | 'HIDDEN';
  onUpdateHabitSectionControl?: (control: 'VISIBLE' | 'HIDDEN') => void;
  allowDockSectionSwitch?: boolean;
  onUpdateAllowDockSectionSwitch?: (allow: boolean) => void;
}

type SectionId = 'VISUALS' | 'SYSTEM' | 'NEURAL' | 'ACCOUNT';

export const SettingsHub = React.memo((props: SettingsHubProps) => {
  const [activeSection, setActiveSection] = useState<SectionId>('VISUALS');

  const navItems = [
    { id: 'VISUALS', label: 'Visual Core', icon: Monitor, color: 'text-cyan-400' },
    { id: 'SYSTEM', label: 'System BIOS', icon: Cpu, color: 'text-emerald-400' },
    { id: 'NEURAL', label: 'Neural Net', icon: Brain, color: 'text-purple-400' },
    { id: 'ACCOUNT', label: 'Identity', icon: UserCircle, color: 'text-amber-400' },
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-0 sm:p-8 md:p-12 lg:p-24 bg-black/90"
    >
      {/* MAIN CONTAINER - THE HUB */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full sm:w-[95%] md:w-[85%] lg:w-[75%] max-w-5xl h-full sm:h-[85vh] max-h-[900px] flex flex-col sm:flex-row overflow-hidden sm:rounded-3xl border-0 sm:border border-white/10 shadow-2xl shadow-indigo-500/10 bg-[#050505]"
      >
        
        {/* SIDEBAR NAVIGATION - "THE RAIL" */}
        <div className="w-full sm:w-64 h-auto sm:h-full flex flex-col sm:flex-col border-b sm:border-b-0 sm:border-r border-white/5 bg-black/40 relative z-20 shrink-0">
          
          {/* MOBILE HEADER: LOGO + CLOSE */}
          <div className="flex sm:hidden items-center justify-between p-4 border-b border-white/5 shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                   <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
                <span className="font-bold text-white tracking-widest text-sm">CONFIG_HUB</span>
             </div>
             <button 
               onClick={props.onClose}
               className="p-2 rounded-lg bg-white/5 text-white/60 border border-white/10 active:scale-95 transition-all"
             >
               <X size={18} />
             </button>
          </div>

          {/* DESKTOP HEADER: LOGO */}
          <div className="hidden sm:flex p-6 border-b border-white/5 items-center gap-3 shrink-0">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
             </div>
             <span className="font-bold text-white tracking-widest text-sm">CONFIG_HUB</span>
          </div>

          {/* NAV ITEMS */}
          <div className="w-full sm:flex-1 flex flex-row sm:flex-col p-2 sm:py-6 sm:px-3 gap-2 overflow-x-auto sm:overflow-visible no-scrollbar">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl transition-all duration-200 group relative overflow-hidden shrink-0",
                    isActive ? "bg-white/5 border border-white/10" : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-100 pointer-events-none"
                    />
                  )}

                  <div className={cn(
                    "relative z-10 p-2 rounded-lg transition-all duration-200",
                    isActive ? "bg-black/40 shadow-inner" : "bg-transparent"
                  )}>
                    <item.icon size={20} className={cn(
                      "transition-colors duration-200",
                      isActive ? item.color : "text-white/40 group-hover:text-white/70"
                    )} />
                  </div>
                  
                  {/* Label - Visible on Desktop */}
                  <div className="hidden sm:flex flex-col items-start relative z-10">
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      isActive ? "text-white" : "text-white/40 group-hover:text-white/70"
                    )}>
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-white/30 font-mono">
                        ::ACTIVE
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="absolute right-3 text-white/20 hidden sm:block">
                      <ChevronRight size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* DESKTOP FOOTER: CLOSE */}
          <div className="hidden sm:block p-4 border-t border-white/5 shrink-0">
            <button 
              onClick={props.onClose}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
            >
              <X size={18} />
              <span className="text-sm font-bold">CLOSE</span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA - "THE STAGE" */}
        <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
          {/* Static Background for Performance */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20" />
          </div>

          <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 md:p-12">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            }>
               {/* Direct conditional rendering without AnimatePresence for instant switching */}
               <div className="h-full animate-in fade-in duration-200 slide-in-from-bottom-2">
                  {activeSection === 'VISUALS' && <VisualsSection {...props} />}
                  {activeSection === 'SYSTEM' && <SystemSection {...props} />}
                  {activeSection === 'NEURAL' && <NeuralSection {...props} />}
                  {activeSection === 'ACCOUNT' && <AccountSection {...props} />}
               </div>
            </Suspense>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
});
