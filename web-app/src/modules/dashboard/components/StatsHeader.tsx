import React, { useState } from 'react';
import { Settings, ToggleLeft, ToggleRight, ShoppingBag, Palette } from 'lucide-react';
import { THEMES } from '../constants';
import { AvatarWidget } from './AvatarWidget';

interface StatsHeaderProps {
  level: number;
  xp: number;
  nextXp: number;
  theme: string;
  onThemeToggle: (t: string) => void;
  isHidden: boolean;
  showProfile: boolean;
  onToggleProfile: (v: boolean) => void;
  hideAvatar?: boolean;
  onShowStore: () => void;
}

export const StatsHeader = React.memo(({ level, xp, nextXp, theme, onThemeToggle, isHidden, showProfile, onToggleProfile, hideAvatar, onShowStore }: StatsHeaderProps) => {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const isCompact = !showProfile && !hideAvatar;
  const shouldShowAvatar = showProfile && !hideAvatar;

  return (
    <header className={`flex justify-between items-center z-50 relative ${
        isCompact 
            ? 'mt-0 mb-0' 
            : 'mt-2'
    } ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-4 pointer-events-auto">
             {/* Settings Button */}
             <div className="relative">
                <button onClick={() => setSettingsOpen(!isSettingsOpen)} className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all ${isSettingsOpen ? 'bg-white text-black scale-110' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                    <Settings size={18} />
                </button>
                {/* Settings Menu */}
                {isSettingsOpen && (
                    <div className="absolute left-0 top-12 p-3 bg-[#121216]/90 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col gap-2 animate-in zoom-in-95 slide-in-from-top-2 shadow-2xl z-[60] min-w-[200px]">
                        <div className="flex items-center justify-between gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer" onClick={() => { onToggleProfile(!showProfile); }}>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Show Profile</span>
                            {showProfile ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} className="text-slate-500" />}
                        </div>
                    </div>
                )}
            </div>

            <div className={`transition-all duration-500 ${shouldShowAvatar ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                {shouldShowAvatar && <AvatarWidget level={level} xp={xp} nextXp={nextXp} />}
            </div>
        </div>
        
        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3 pointer-events-auto">
            {/* Store Button */}
            <button onClick={onShowStore} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 group">
                <ShoppingBag size={18} className="group-hover:text-yellow-400 transition-colors" />
            </button>

            {/* Theme Picker */}
            <div className="relative">
                <button onClick={() => setPickerOpen(!isPickerOpen)} className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all ${isPickerOpen ? 'bg-white text-black scale-110' : 'bg-white/5 text-slate-400 hover:text-white'}`}><Palette size={18} /></button>
                {isPickerOpen && (
                    <div className="absolute right-0 top-12 p-2 bg-[#121216]/90 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] flex gap-2 animate-in zoom-in-95 slide-in-from-top-2 shadow-2xl z-[60]">
                        {Object.entries(THEMES).map(([key, t]) => (
                            <button key={key} onClick={() => { onThemeToggle(key); setPickerOpen(false); }} className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-all shadow-lg relative" style={{ background: t.accent, borderColor: theme === key ? 'white' : 'transparent' }}>
                                {theme === key && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </header>
  );
});
