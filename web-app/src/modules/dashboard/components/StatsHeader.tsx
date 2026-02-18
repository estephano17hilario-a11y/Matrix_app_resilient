import React from 'react';
import { Settings, ShoppingBag, RefreshCw } from 'lucide-react';
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
  dailyLimits?: any; // Using any temporarily to avoid deep type imports if not needed, but better to use DailyLimits
}

export const StatsHeader = React.memo(({ level, xp, nextXp, health, maxHealth, streak, gold, isHabitsCompleted, isHidden, showProfile, hideAvatar, isSyncing, onShowStore, onShowSettings, onToggleProfile, displayName, email, currentView, isPro, avatarId, avatarShape, onUpdateLevel, dailyLimits }: StatsHeaderProps) => {
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
                      dailyLimits={dailyLimits}
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

            {/* PRO Button - REMOVED */}


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
