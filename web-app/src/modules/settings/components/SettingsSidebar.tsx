import { motion } from 'framer-motion';
import { Palette, Cpu, User, Monitor, LogOut, Hexagon } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { cn } from '../../../utils/cn';

const TABS = [
  { id: 'visuals', label: 'Design', icon: Palette, color: 'text-indigo-400' },
  { id: 'neural', label: 'Stats', icon: Hexagon, color: 'text-cyan-400' },
  { id: 'system', label: 'Prefs', icon: Cpu, color: 'text-emerald-400' },
  { id: 'account', label: 'Profile', icon: User, color: 'text-pink-400' },
];

export const SettingsSidebar = () => {
  const { activeTab, setActiveTab, logout } = useSettings();

  return (
    <div className="w-full md:w-64 h-auto md:h-full border-b md:border-b-0 md:border-r border-white/5 bg-black/50 md:bg-black/30 flex flex-row md:flex-col p-1 md:p-6 gap-1 md:space-y-8 z-20 shrink-0 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-mandatory">
      
      {/* HEADER - Desktop Only */}
      <div className="hidden md:flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-white/10">
            <Monitor size={16} className="text-white" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Settings</h2>
            <p className="text-xs text-white/30 font-mono">v2.4.0-matrix</p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 flex flex-row md:flex-col gap-1 md:space-y-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center justify-center md:justify-start gap-1.5 md:gap-3 px-2 py-2 md:px-4 md:py-3 rounded-xl transition-all duration-300 group overflow-hidden whitespace-nowrap snap-start flex-1 md:flex-none",
                isActive 
                  ? "text-white shadow-sm" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              {/* ACTIVE GLOW BACKGROUND */}
              {isActive && (
                <motion.div 
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl z-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              {/* ICON */}
              <div className={cn(
                "relative z-10 p-1 md:p-1.5 rounded-md transition-colors duration-300",
                isActive ? "text-white bg-white/10" : "text-white/30 group-hover:text-white/60"
              )}>
                <Icon size={16} className={cn("md:w-[18px] md:h-[18px]", isActive ? tab.color : "")} />
              </div>
              
              {/* LABEL */}
              <span className="relative z-10 font-medium text-xs md:text-sm tracking-wide md:inline hidden">
                {tab.label}
              </span>
              {/* Mobile Label */}
              <span className="relative z-10 font-medium text-xs md:text-sm tracking-wide md:hidden inline">
                {tab.label}
              </span>

              {/* ACTIVE INDICATOR DOT - Desktop Only */}
              {isActive && (
                <motion.div 
                  layoutId="activeDot"
                  className={cn("hidden md:block absolute right-4 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]")}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* FOOTER ACTIONS - Desktop Only */}
      <div className="hidden md:block pt-6 border-t border-white/5 space-y-2">
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium group"
        >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
            Disconnect
        </button>
      </div>

    </div>
  );
};
