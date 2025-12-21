import React from 'react';
import { Settings, ShoppingBag, Crown, RefreshCw } from 'lucide-react';
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
  isSyncing?: boolean;
  onShowStore: () => void;
  onShowPro?: () => void;
  onShowSettings?: () => void;
  onToggleProfile?: () => void;
  displayName?: string | null;
  email?: string | null;
  currentView?: string;
  isPro?: boolean;
}

export const StatsHeader = React.memo(({ level, xp, nextXp, health, streak, isHidden, showProfile, hideAvatar, isSyncing, onShowStore, onShowPro, onShowSettings, onToggleProfile, displayName, email, currentView, isPro }: StatsHeaderProps) => {
  const isCompact = !showProfile;
  const shouldShowAvatar = showProfile && !hideAvatar;

  return (
    <header className={`flex justify-between items-center z-50 relative ${
        isCompact 
            ? 'mt-0 mb-0' 
            : 'mt-2'
    } ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-none'}`}>
        <div className={`flex items-center gap-4 ${!isHidden ? 'pointer-events-auto' : ''}`}>
             {/* Avatar Widget - MOVED FIRST */}
            <div 
                id="profile-avatar-target"
                onClick={onToggleProfile}
                className={`transition-all duration-500 cursor-pointer hover:scale-105 active:scale-95 ${shouldShowAvatar ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}
            >
                {shouldShowAvatar && <AvatarWidget level={level} xp={xp} nextXp={nextXp} health={health} streak={streak} displayName={displayName} email={email} isPro={isPro} />}
            </div>
        </div>
        
        {/* RIGHT ACTIONS */}
        <div className={`flex items-center gap-1 sm:gap-3 ${!isHidden ? 'pointer-events-auto' : ''}`}>
             {/* Sync Indicator */}
             <div className={`transition-all duration-500 flex items-center justify-center ${isSyncing ? 'opacity-100 w-5' : 'opacity-0 w-0 overflow-hidden'}`}>
                <RefreshCw size={14} className="text-emerald-400 animate-spin" />
             </div>

             {/* PRO Button - Only show if NOT Pro */}
             {!isPro && (
             <button onClick={onShowPro} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-yellow-500/20 flex items-center justify-center transition-all bg-gradient-to-br from-yellow-500/10 to-amber-500/10 text-yellow-500 hover:text-yellow-400 hover:border-yellow-500/50 hover:shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] active:scale-95 group relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Crown size={18} className="group-hover:scale-110 transition-transform relative z-10" />
            </button>
            )}

             {/* Settings Button - Updated to trigger view */}
             <div className="relative">
                <button 
                    onClick={onShowSettings} 
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all ${
                        currentView === 'SETTINGS' 
                        ? 'bg-white/10 text-white border-white/30 shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)]' 
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* Store Button */}
            <button 
                onClick={onShowStore} 
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group ${
                    currentView === 'STORE'
                    ? 'bg-pink-500/10 text-pink-400 border-pink-500/30 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
            >
                <ShoppingBag size={18} className={`${currentView === 'STORE' ? 'text-pink-400' : 'group-hover:text-pink-400'} transition-colors`} />
            </button>
        </div>
    </header>
  );
});
