import React from 'react';
import { Settings, ShoppingBag, Crown } from 'lucide-react';
import { AvatarWidget } from './AvatarWidget';

interface StatsHeaderProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  streak: number;
  isHidden: boolean;
  showProfile: boolean;
  hideAvatar?: boolean;
  onShowStore: () => void;
  onShowPro?: () => void;
  onShowSettings?: () => void;
  displayName?: string | null;
  email?: string | null;
}

export const StatsHeader = React.memo(({ level, xp, nextXp, health, streak, isHidden, showProfile, hideAvatar, onShowStore, onShowPro, onShowSettings, displayName, email }: StatsHeaderProps) => {
  const isCompact = !showProfile;
  const shouldShowAvatar = showProfile && !hideAvatar;

  return (
    <header className={`flex justify-between items-center z-50 relative ${
        isCompact 
            ? 'mt-0 mb-0' 
            : 'mt-2'
    } ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-4 pointer-events-auto">
             {/* Avatar Widget - MOVED FIRST */}
            <div className={`transition-all duration-500 ${shouldShowAvatar ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                {shouldShowAvatar && <AvatarWidget level={level} xp={xp} nextXp={nextXp} health={health} streak={streak} displayName={displayName} email={email} />}
            </div>
        </div>
        
        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3 pointer-events-auto">
             {/* PRO Button */}
             <button onClick={onShowPro} className="w-10 h-10 rounded-full border border-yellow-500/20 flex items-center justify-center transition-all bg-gradient-to-br from-yellow-500/10 to-amber-500/10 text-yellow-500 hover:text-yellow-400 hover:border-yellow-500/50 hover:shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] active:scale-95 group relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Crown size={18} className="group-hover:scale-110 transition-transform relative z-10" />
            </button>

             {/* Settings Button - Updated to trigger view */}
             <div className="relative">
                <button onClick={onShowSettings} data-tour="settings-trigger" className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all bg-white/5 text-slate-400 hover:text-white hover:bg-white/10`}>
                    <Settings size={18} />
                </button>
            </div>

            {/* Store Button */}
            <button onClick={onShowStore} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 group">
                <ShoppingBag size={18} className="group-hover:text-yellow-400 transition-colors" />
            </button>
        </div>
    </header>
  );
});
