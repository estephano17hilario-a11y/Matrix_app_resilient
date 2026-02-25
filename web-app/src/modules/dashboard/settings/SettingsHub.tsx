import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Cpu, 
  Brain, 
  UserCircle, 
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../../utils/cn';

// Sections
import { VisualsSection } from './components/VisualsSection';
import { SystemSection } from './components/SystemSection';
import { NeuralSection } from './components/NeuralSection';
import { AccountSection } from './components/AccountSection';

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

export const SettingsHub = (props: SettingsHubProps) => {
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
      className="fixed inset-0 z-[2000] flex items-center justify-center p-8 sm:p-16 md:p-24 bg-black/80 backdrop-blur-lg"
    >
      {/* MAIN CONTAINER - THE HUB */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-[95%] md:w-[85%] lg:w-[75%] max-w-4xl h-[85vh] sm:h-[80vh] max-h-[800px] flex flex-col sm:flex-row overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#050505]/95"
      >
        
        {/* SIDEBAR NAVIGATION - "THE RAIL" */}
        <div className="w-full sm:w-64 h-auto sm:h-full flex flex-col sm:flex-col border-b sm:border-b-0 sm:border-r border-white/5 bg-black/20 relative z-20 shrink-0">
          
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
                    "flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl transition-all duration-300 group relative overflow-hidden shrink-0",
                    isActive ? "bg-white/5 border border-white/10" : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-glow"
                      className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-100"
                    />
                  )}

                  <div className={cn(
                    "relative z-10 p-2 rounded-lg transition-all duration-300",
                    isActive ? "bg-black/40 shadow-inner" : "bg-transparent"
                  )}>
                    <item.icon size={20} className={cn(
                      "transition-colors duration-300",
                      isActive ? item.color : "text-white/40 group-hover:text-white/70"
                    )} />
                  </div>
                  
                  {/* Label - Visible on Desktop, Hidden on Mobile unless we want labels? keeping hidden to save space */}
                  <div className="hidden sm:flex flex-col items-start relative z-10">
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      isActive ? "text-white" : "text-white/40 group-hover:text-white/70"
                    )}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-white/30 font-mono"
                      >
                        ::ACTIVE
                      </motion.span>
                    )}
                  </div>

                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-arrow"
                      className="absolute right-3 text-white/20 hidden sm:block"
                    >
                      <ChevronRight size={14} />
                    </motion.div>
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
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-900/20 to-black">
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-60"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-60"
              style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 70%)' }}
            />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
          </div>

          <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-8 sm:p-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full"
              >
                {activeSection === 'VISUALS' && <VisualsSection {...props} />}
                {activeSection === 'SYSTEM' && <SystemSection {...props} />}
                {activeSection === 'NEURAL' && <NeuralSection {...props} />}
                {activeSection === 'ACCOUNT' && <AccountSection {...props} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};
