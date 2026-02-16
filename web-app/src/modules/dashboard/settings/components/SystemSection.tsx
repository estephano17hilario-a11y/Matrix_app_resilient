import { 
  Cpu, 
  Globe, 
  Sliders, 
  Eye, 
  EyeOff,
  Dock,
  ArrowLeftRight
} from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface SystemSectionProps {
  habitSectionControl?: 'VISIBLE' | 'HIDDEN';
  onUpdateHabitSectionControl?: (control: 'VISIBLE' | 'HIDDEN') => void;
  allowDockSectionSwitch?: boolean;
  onUpdateAllowDockSectionSwitch?: (allow: boolean) => void;
  stickyHud?: boolean;
  onUpdateStickyHud?: (sticky: boolean) => void;
}

export const SystemSection = ({
  habitSectionControl,
  onUpdateHabitSectionControl,
  allowDockSectionSwitch,
  onUpdateAllowDockSectionSwitch,
  stickyHud,
  onUpdateStickyHud
}: SystemSectionProps) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Cpu className="text-emerald-400" size={32} />
          System BIOS
        </h2>
        <p className="text-white/40 text-lg max-w-2xl">
          Core system configurations, language processing, and input/output handling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LANGUAGE & LOCALIZATION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Localization
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                   <span className="text-white font-medium flex items-center gap-2">
                    <Globe size={16} className="text-emerald-400" />
                    System Language
                  </span>
                  <p className="text-xs text-white/40">Select primary communication protocol</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => changeLanguage('en')}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    i18n.language === 'en' 
                      ? "bg-emerald-500/10 border-emerald-500/50 text-white" 
                      : "bg-black/20 border-white/5 text-white/40 hover:border-white/10"
                  )}
                >
                  <div className="text-lg font-bold mb-1">English</div>
                  <div className="text-xs opacity-50">System Default</div>
                </button>

                <button
                  onClick={() => changeLanguage('es')}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    i18n.language === 'es' 
                      ? "bg-emerald-500/10 border-emerald-500/50 text-white" 
                      : "bg-black/20 border-white/5 text-white/40 hover:border-white/10"
                  )}
                >
                  <div className="text-lg font-bold mb-1">Español</div>
                  <div className="text-xs opacity-50">Traducción Neural</div>
                </button>
             </div>
          </div>
        </div>

        {/* NAVIGATION CONTROLS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Navigation Controls
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            
            {/* Show Section Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
               <div className="space-y-1">
                 <span className="text-white font-medium flex items-center gap-2">
                  <Sliders size={16} className="text-emerald-400" />
                  Section Visibility
                </span>
                <p className="text-xs text-white/40">Show explicit navigation buttons</p>
              </div>
              
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-full sm:w-auto">
                 <button 
                    onClick={() => onUpdateHabitSectionControl?.('VISIBLE')}
                    className={cn(
                      "flex-1 sm:flex-none p-2 rounded-md text-white/40 transition-all flex justify-center", 
                      habitSectionControl === 'VISIBLE' ? "bg-white/10 text-white shadow-sm" : "hover:text-white/60"
                    )}
                    title="Visible"
                 >
                    <Eye size={16} />
                 </button>
                 <button 
                    onClick={() => onUpdateHabitSectionControl?.('HIDDEN')}
                    className={cn(
                      "flex-1 sm:flex-none p-2 rounded-md text-white/40 transition-all flex justify-center", 
                      habitSectionControl === 'HIDDEN' ? "bg-white/10 text-white shadow-sm" : "hover:text-white/60"
                    )}
                    title="Hidden"
                 >
                    <EyeOff size={16} />
                 </button>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Dock Switching */}
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <span className="text-white font-medium flex items-center gap-2">
                  <Dock size={16} className="text-emerald-400" />
                  Dock Integration
                </span>
                <p className="text-xs text-white/40">Allow section switching via Dock</p>
              </div>
              
              <button 
                onClick={() => onUpdateAllowDockSectionSwitch?.(!allowDockSectionSwitch)}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative shrink-0",
                  allowDockSectionSwitch ? "bg-emerald-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  allowDockSectionSwitch ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

             <div className="h-px bg-white/5" />

            {/* Sticky HUD */}
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <span className="text-white font-medium flex items-center gap-2">
                  <ArrowLeftRight size={16} className="text-emerald-400" />
                  Sticky HUD
                </span>
                <p className="text-xs text-white/40">Keep stats visible on scroll</p>
              </div>
              
              <button 
                onClick={() => onUpdateStickyHud?.(!stickyHud)}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative shrink-0",
                  stickyHud ? "bg-emerald-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  stickyHud ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
