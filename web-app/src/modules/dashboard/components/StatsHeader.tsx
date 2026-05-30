import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AvatarWidget } from './AvatarWidget';

interface StatsHeaderProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  maxHealth?: number;
  streak: number;
  lastStreakDate?: string;
  gold: number;
  isHabitsCompleted?: boolean;
  isHidden: boolean;
  showProfile: boolean;
  isSyncing?: boolean;
  onShowStore: () => void;
  onShowPro?: () => void;
  onShowSettings?: () => void;
  onShowSettingsWithTab?: (tab: string) => void;
  displayName?: string | null;
  email?: string | null;
  isPro?: boolean;
  onShowStreak?: () => void;
  avatarId?: string;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  dailyLimits?: any;
  productivityScore?: number;
  onNavigate?: (view: string) => void;
}

export const StatsHeader = React.memo(({ 
  level, xp, nextXp, health, maxHealth, streak, lastStreakDate, gold, isHabitsCompleted, isHidden, showProfile, 
  isSyncing, onShowStore, onShowPro, onShowSettings, onShowSettingsWithTab, displayName, email, isPro, avatarId, avatarShape, dailyLimits, productivityScore, onNavigate 
}: StatsHeaderProps) => {
  const isCompact = !showProfile;
  const shouldShowAvatar = showProfile;

  return (
    <header className={`flex justify-between items-center z-[100] relative w-full gap-2 ${
        isCompact 
            ? 'mt-0 mb-0' 
            : 'mt-1 sm:mt-1.5'
    } ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
    style={{ contain: 'layout style', willChange: 'opacity, transform' }}
    >
        <div className={`flex items-center gap-2 sm:gap-4 flex-1 min-w-0 ${!isHidden ? 'pointer-events-auto' : ''}`}>
             {/* Avatar Widget - MOVED FIRST */}
            <div 
                id="profile-avatar-target"
                className={`transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 w-full ${shouldShowAvatar ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 h-0 overflow-hidden'}`}
            >
                {shouldShowAvatar && (
                  <div onClick={(e) => {
                     // Prevent navigation when clicking the avatar container
                     e.stopPropagation();
                  }}>
                    <AvatarWidget 
                      level={level} 
                      xp={xp} 
                      nextXp={nextXp} 
                      health={health} 
                      maxHealth={maxHealth} 
                      streak={streak} 
                      lastStreakDate={lastStreakDate}
                      gold={gold} 
                      displayName={displayName} 
                      email={email} 
                      isPro={isPro} 
                      avatarId={avatarId} 
                      avatarShape={avatarShape}
                      isHabitsCompleted={isHabitsCompleted}
                      dailyLimits={dailyLimits}
                      productivityScore={productivityScore}
                      onShowPro={onShowPro}
                      onShowSettingsWithTab={onShowSettingsWithTab}
                      onNavigate={(view) => {
                          if (view === 'SETTINGS' && onShowSettings) {
                              onShowSettings();
                          } else if (view === 'STORE' && onShowStore) {
                              onShowStore();
                          } else if (onNavigate) {
                              onNavigate(view);
                          }
                      }}
                    />
                  </div>
                )}
            </div>
        </div>
        
        {/* RIGHT ACTIONS */}
        <div className={`flex items-center gap-1 sm:gap-3 ${!isHidden ? 'pointer-events-auto' : ''}`}>
             {/* Sync Indicator */}
             <div className={`transition-all duration-200 flex items-center justify-center ${isSyncing ? 'opacity-100 w-5' : 'opacity-0 w-0 overflow-hidden'}`}>
                <RefreshCw size={14} className="text-emerald-400 animate-spin" />
             </div>
             
             {/* Note: Settings and Store buttons have been moved into AvatarWidget */}
        </div>
    </header>
  );
});
