import React from 'react';
import { Heart, Zap, Flame, Coins, Settings, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { DailyLimits } from '@/types/User';
import { GoldCounter } from '@/modules/store/components/GoldCounter';
import { getAvatarPath, getAvatarConfig } from '@/config/avatars';
import { calculateXpForLevel } from '@/utils/leveling';
import { StreakStatusModal } from './StreakStatusModal';
import { useTranslation } from 'react-i18next';

interface AvatarWidgetProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  maxHealth?: number;
  streak: number;
  lastStreakDate?: string;
  gold?: number;
  dailyLimits?: DailyLimits;
  displayName?: string | null;
  email?: string | null;
  isPro?: boolean;
  avatarId?: string;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  isHabitsCompleted?: boolean;
  productivityScore?: number;
  onNavigate?: (view: string) => void;
  onShowPro?: () => void;
  onShowSettingsWithTab?: (tab: string) => void;
}

const MiniLiquidBar = ({  value, 
  max, 
  color, 
  icon: Icon 
}: { 
  value: number; 
  max: number; 
  color: 'health' | 'xp';
  icon: React.ElementType;
}) => {
  // 🛡️ CÓDIGO BLINDADO (SAFE CALCULATION)
  const safeValue = typeof value === 'number' ? Math.round(value) : 0;
  const safeMax = (typeof max === 'number' && max > 0) ? Math.round(max) : 1;
  
  const rawPercent = (safeValue / safeMax) * 100;
  const percent = Number.isFinite(rawPercent) 
    ? Math.min(100, Math.max(0, rawPercent)) 
    : 0;
  
  const themes = {
    health: {
      gradient: 'from-rose-500 via-red-500 to-rose-600',
      shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      iconColor: 'text-rose-400',
      bg: 'bg-rose-950/20',
      track: 'bg-rose-950/40'
    },
    xp: {
      gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
      shadow: 'shadow-[0_0_10px_rgba(34,211,238,0.4)]',
      iconColor: 'text-cyan-400',
      bg: 'bg-cyan-950/20',
      track: 'bg-cyan-950/40'
    }
  };

  const theme = themes[color];

  return (
    <div className="flex items-center gap-2 sm:gap-3 w-full transition-all group/bar">
        <div className="flex items-center justify-center w-5 h-5 shrink-0">
            <Icon size={14} className={theme.iconColor} />
        </div>
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center justify-between px-0.5">
                 <span className={`text-[9px] font-bold tracking-wider uppercase ${theme.iconColor} opacity-80 truncate`}>{color}</span>
                 <span className="text-[9px] font-mono text-white/50 tabular-nums shrink-0 ml-2">{safeValue}/{safeMax}</span>
            </div>
            <div className={`h-1.5 w-full ${theme.track} rounded-full overflow-hidden relative border border-white/5`}>
                 <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: percent / 100 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    style={{ originX: 0, willChange: 'transform' }}
                    className={`h-full absolute left-0 top-0 w-full rounded-full bg-gradient-to-r ${theme.gradient} ${theme.shadow}`}
                 />
            </div>
        </div>
    </div>
  );
};

export const AvatarWidget = React.memo(({ level, xp, nextXp, health, maxHealth, streak, lastStreakDate, gold = 0, dailyLimits, displayName, email, isPro, avatarId, avatarShape = 'CIRCLE', isHabitsCompleted = false, productivityScore = 0, onNavigate, onShowPro, onShowSettingsWithTab }: AvatarWidgetProps) => {
    const { i18n } = useTranslation();
    const isSpanish = i18n.language?.startsWith('es');
    const deluxeText = isSpanish ? 'SÉ DELUX' : 'GO DELUX';
    
    const [showStreakModal, setShowStreakModal] = React.useState(false);
    const avatarPath = getAvatarPath(avatarId);
    const avatarConfig = getAvatarConfig(avatarId);
    const themeColor = avatarConfig?.themeColor;
    const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80";
    const [imgSrc, setImgSrc] = React.useState<string>(avatarPath || defaultAvatar);

    React.useEffect(() => {
        setImgSrc(avatarPath || defaultAvatar);
    }, [avatarPath]);

    const shapeClass = avatarShape === 'SQUARE' ? 'rounded-2xl' : 'rounded-full';

    // Dynamic styles for Aura - Performant
    const auraStyle = React.useMemo(() => {
        if (!themeColor) return {};
        if (isPro) {
            return {
                boxShadow: `0 0 20px 0px ${themeColor}80, inset 0 0 10px 0px ${themeColor}40`,
                border: `2px solid ${themeColor}`,
            };
        }
        return {
            boxShadow: `0 0 25px -5px ${themeColor}`,
        };
    }, [themeColor, isPro]);

    // Calculate relative XP for display
    // If xp is cumulative, subtract base XP for current level
    // Special Case: Level 1 starts at 0 XP for UI purposes, even if formula says 20
    const currentLevelBaseXp = level === 1 ? 0 : calculateXpForLevel(level);
    // If XP is less than base (e.g. data migration or error), clamp to 0
    // If XP is greater than nextXp (e.g. ready to level up), clamp to nextXp
    const relativeXp = Math.max(0, xp - currentLevelBaseXp);
    const relativeNextXp = Math.max(1, nextXp - currentLevelBaseXp);

    // 🛡️ NAME LOGIC: If displayName is an email, extract username. If missing, use email username.
    const formattedName = React.useMemo(() => {
        if (displayName && !displayName.includes('@')) return displayName;
        if (displayName && displayName.includes('@')) return displayName.split('@')[0];
        if (email) return email.split('@')[0];
        return 'Neo';
    }, [displayName, email]);

    const scoreVal = typeof productivityScore === 'number' ? productivityScore : 0;

    return (
    <>
    <div className="flex items-center gap-3 sm:gap-4 opacity-100 translate-x-0 w-full pl-1">
        {/* AVATAR - RESTORED & CENTERED */}
        <div 
            className="relative group active:scale-95 transition-transform shrink-0 cursor-pointer" 
            onClick={(e) => {
                e.stopPropagation();
                if (onShowSettingsWithTab) {
                    onShowSettingsWithTab('account');
                }
            }}
        >
            {/* Productivity Score Badge */}
            <div 
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a0a1a]/95 border border-cyan-500/25 px-2 py-[2px] rounded-md text-[9px] font-black font-mono text-cyan-400 select-none whitespace-nowrap z-20 tracking-wide shadow-[0_2px_12px_rgba(0,0,0,0.6),0_0_6px_rgba(34,211,238,0.15)]"
                title={`Daily Score: ${scoreVal.toFixed(1)}%`}
            >
                {scoreVal.toFixed(1)}%
            </div>

            <div 
                className={`w-14 h-14 ${shapeClass} overflow-hidden shadow-md ${isPro ? '' : 'ring-1 ring-white/10 shadow-black/50'}`}
                style={auraStyle}
            >
                <img 
                    src={imgSrc} 
                    alt="Avatar" 
                    onError={(e) => {
                        if (e.currentTarget.src !== defaultAvatar) {
                            setImgSrc(defaultAvatar);
                        }
                    }}
                    className={`w-full h-full object-cover object-[50%_20%] transform transition-transform duration-700 group-hover:scale-110`} 
                />
                
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
            
            {/* Level Badge - Minimalist Corner Circle */}
            <div 
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg group-hover:scale-110 ${
                    isPro 
                        ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 border border-white/40 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                        : 'bg-[#050510] border border-white/20'
                }`}
            >
                 <span className="text-[12px] font-black text-white font-mono leading-none drop-shadow-md">{level}</span>
            </div>
        </div>

        {/* STATS COLUMN - PREMIUM APPLE STYLE */}
        <div className="flex flex-col gap-2 relative flex-1 min-w-0">

            {/* HEADER: NAME + STREAK + DELUX */}
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 shrink-0 min-w-0">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onShowSettingsWithTab) {
                                onShowSettingsWithTab('account');
                            }
                        }}
                        className={`text-xs sm:text-sm tracking-tight truncate max-w-[100px] sm:max-w-[140px] transition-all cursor-pointer ${
                            isPro 
                            ? 'font-black text-galactic drop-shadow-[0_0_8px_rgba(217,70,239,0.5)] hover:scale-105' 
                            : 'font-bold text-white drop-shadow-md hover:text-cyan-400'
                        }`}
                    >
                        {formattedName}
                    </button>
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowStreakModal(true);
                        }}
                        data-tour="streak-display"
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all duration-500 cursor-pointer hover:bg-white/10 shrink-0 ${
                        isHabitsCompleted 
                            ? "bg-orange-500/10 border-orange-500/20 shadow-[0_0_10px_-3px_rgba(249,115,22,0.4)]" 
                            : "bg-white/5 border-white/10"
                    }`}>
                        <Flame 
                            size={10} 
                            className={`transition-all duration-500 ${
                                isHabitsCompleted 
                                    ? "text-orange-400 fill-orange-400 animate-pulse drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]" 
                                    : "text-white/20 fill-none"
                            }`} 
                        />
                        <span className={`text-[9px] font-mono font-bold transition-colors duration-500 ${
                            isHabitsCompleted ? "text-orange-400" : "text-white/40"
                        }`}>{streak}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* GO DELUXE BUTTON - COSMIC & PERFORMANT */}
                    {!isPro && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onShowPro) {
                                    onShowPro();
                                } else {
                                    window.dispatchEvent(new CustomEvent('open-pro-modal'));
                                }
                            }}
                            className="relative group shrink-0 transition-transform active:scale-95 rounded-full p-[1px] shadow-[0_0_13px_-2px_rgba(217,70,239,0.4)] hover:shadow-[0_0_20px_0px_rgba(217,70,239,0.8)]"
                        >
                            {/* Animated Cosmic Border (Faster Pulse) */}
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-[pulse_2.5s_ease-in-out_infinite] opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{ willChange: 'opacity' }} />
                            
                            {/* Inner Button */}
                            <div className="relative bg-[#050510] px-2.5 py-[2px] rounded-full flex items-center justify-center overflow-hidden">
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                                
                                {/* Text */}
                                <span className="text-[9px] font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 uppercase tracking-widest drop-shadow-[0_0_7px_rgba(217,70,239,0.7)] group-hover:from-indigo-200 group-hover:via-purple-200 group-hover:to-pink-200 transition-all duration-300">
                                    {deluxeText}
                                </span>
                            </div>
                        </button>
                    )}
                    
                    {/* Gold Pill - Premium Look */}
                    <div id="gold-counter-pill" data-tour="gold-counter" className="flex items-center gap-1.5 bg-amber-500/10 px-2 sm:px-3 py-1 rounded-full border border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)] shrink-0">
                        <Coins size={12} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        <span className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                            <GoldCounter value={gold} />
                        </span>
                    </div>
                </div>
            </div>

            {/* BARS AND QUICK ACTIONS */}
            <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-2">
                     <div id="health-bar-container" className="w-full">
                        <MiniLiquidBar value={health} max={maxHealth || 100} color="health" icon={Heart} />
                     </div>
                     <div id="xp-bar-container" data-tour="xp-counter" className="w-full">
                        <MiniLiquidBar value={relativeXp} max={relativeNextXp} color="xp" icon={Zap} />
                     </div>
                </div>

                {/* Quick Actions (Settings & Store) */}
                  <div className="flex items-center gap-2 shrink-0">
                       <button 
                           onClick={(e) => {
                               e.stopPropagation();
                               if (onNavigate) {
                                   onNavigate('SETTINGS');
                               }
                           }}
                           className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 hover:shadow-[0_0_10px_-2px_rgba(255,255,255,0.2)]"
                       >
                           <Settings size={16} className="sm:w-5 sm:h-5" />
                       </button>
                       <button 
                           onClick={(e) => {
                               e.stopPropagation();
                               if (onNavigate) {
                                   onNavigate('STORE');
                               }
                           }}
                           className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 hover:shadow-[0_0_10px_-2px_rgba(255,255,255,0.2)] group"
                       >
                           <ShoppingBag size={16} className="sm:w-5 sm:h-5 group-hover:text-amber-400 transition-colors" />
                       </button>
                   </div>
            </div>
        </div>
    </div>
    {dailyLimits && (
        <StreakStatusModal
            isOpen={showStreakModal}
            onClose={() => setShowStreakModal(false)}
            dailyLimits={dailyLimits}
            onNavigate={onNavigate}
            streak={streak}
            lastStreakDate={lastStreakDate}
        />
    )}
    </>
  );
});
