import React from 'react';
import { Settings, ShoppingBag, Crown, RefreshCw } from 'lucide-react';
import { AvatarWidget } from './AvatarWidget';

interface StatsHeaderProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  maxHealth?: number;
  streak: number;
  gold: number;
  isHabitsCompleted?: boolean;
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
  onShowStreak?: () => void;
  avatarId?: string;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onUpdateLevel?: (newLevel: number) => void;
}

export const StatsHeader = React.memo(({ level, xp, nextXp, health, maxHealth, streak, gold, isHabitsCompleted, isHidden, showProfile, hideAvatar, isSyncing, onShowStore, onShowPro, onShowSettings, onToggleProfile, displayName, email, currentView, isPro, avatarId, avatarShape, onUpdateLevel }: StatsHeaderProps) => {
  const isCompact = !showProfile;
  const shouldShowAvatar = showProfile && !hideAvatar;

  return (
    <header className={`flex justify-between items-center z-[100] relative ${
        isCompact 
            ? 'mt-0 mb-0' 
            : 'mt-6'
    } ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
        <div className={`flex items-center gap-4 ${!isHidden ? 'pointer-events-auto' : ''}`}>
             {/* Avatar Widget - MOVED FIRST */}
            <div 
                id="profile-avatar-target"
                className={`transition-all duration-500 cursor-pointer hover:scale-105 active:scale-95 ${shouldShowAvatar ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}
            >
                {shouldShowAvatar && (
                  <div onClick={() => {
                     // If clicking on level badge (propagated), stop it?
                     // Actually, let AvatarWidget handle its internal clicks.
                     // The parent onClick toggles profile.
                     // If we click level, we don't want to toggle profile.
                     onToggleProfile && onToggleProfile();
                  }}>
                    <AvatarWidget 
                      level={level} 
                      xp={xp} 
                      nextXp={nextXp} 
                      health={health} 
                      maxHealth={maxHealth} 
                      streak={streak} 
                      gold={gold} 
                      displayName={displayName} 
                      email={email} 
                      isPro={isPro} 
                      avatarId={avatarId} 
                      avatarShape={avatarShape}
                      onUpdateLevel={onUpdateLevel}
                      isHabitsCompleted={isHabitsCompleted}
                    />
                  </div>
                )}
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
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                    ? 'bg-theme-avatar/10 text-theme-avatar border-theme-avatar/30 shadow-[0_0_15px_-3px_rgba(var(--color-avatar-accent),0.3)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
            >
                <ShoppingBag size={18} className={`${currentView === 'STORE' ? 'text-theme-avatar' : 'group-hover:text-theme-avatar'} transition-colors`} />
            </button>
        </div>
    </header>
  );
});
