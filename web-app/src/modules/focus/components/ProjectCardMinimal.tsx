import React from 'react';
import { motion } from 'framer-motion';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { ChevronRight, Play } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDynamicDailyTarget } from '../../../utils/projectUtils';

interface ProjectCardMinimalProps {
    project: Project;
    attribute?: Attribute;
    onClick?: () => void;
    onStartFocus?: () => void;
}

export const ProjectCardMinimal: React.FC<ProjectCardMinimalProps> = ({ project, attribute, onClick, onStartFocus }) => {
    // Theme color (Default to red/pink from image if no attribute)
    const themeColor = attribute?.color || '#f43f5e'; // rose-500
    
    // Progress
    let goalMinutes = project.goalTarget || 0; 
    
    // Calculate progress based on frequency (Daily vs Total)
    let currentMinutesForProgress = Math.floor((project.totalTime || 0) / 60);

    const effectiveFrequency = project.uiFrequency || project.goalFrequency;

    // If Daily Goal, use Today's Sessions only for the progress bar AND the display text
    if (effectiveFrequency === 'DAILY') {
        const todayStr = new Date().toDateString();
        const todaySeconds = (project.sessions || [])
            .filter(s => new Date(s.date).toDateString() === todayStr)
            .reduce((acc, s) => {
                const duration = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
                return acc + duration;
            }, 0);
        currentMinutesForProgress = Math.floor(todaySeconds / 60);
    } else if (effectiveFrequency === 'WEEKLY' || effectiveFrequency === 'MONTHLY') {
        goalMinutes = getDynamicDailyTarget(project);
        
        const todayStr = new Date().toDateString();
        const todaySeconds = (project.sessions || [])
            .filter(s => new Date(s.date).toDateString() === todayStr)
            .reduce((acc, s) => {
                const duration = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
                return acc + duration;
            }, 0);
        currentMinutesForProgress = Math.floor(todaySeconds / 60);
    }

    currentMinutesForProgress = Math.max(0, currentMinutesForProgress);
    goalMinutes = Math.max(0, goalMinutes);

    const rawProgress = goalMinutes > 0 ? (currentMinutesForProgress / goalMinutes) * 100 : 0;
    const progress = Math.min(100, Math.max(0, rawProgress));
    const displayPercentage = Math.round(Math.max(0, rawProgress));

    // Format Display Time (Matches progress bar logic)
    const displayH = Math.floor(currentMinutesForProgress / 60);
    const displayM = currentMinutesForProgress % 60;
    const timeString = `${displayH}h ${displayM.toString().padStart(2, '0')}m`;

    // Format Goal Time
    const goalH = Math.floor(goalMinutes / 60);
    const goalM = goalMinutes % 60;
    const goalString = `${goalH}h ${goalM.toString().padStart(2, '0')}m`;

    const toRgba = (hex: string, alpha: number) => {
        const normalized = hex.replace('#', '');
        if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`;
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const borderColor = toRgba(themeColor, 0.2);
    const glowColor = toRgba(themeColor, 0.22); // Reduced slightly (-5%)
    const sheen = toRgba('#ffffff', 0.04);

    const isArchived = project.archived;

    const workingDays = project.workingDays;
    const today = new Date();
    const isWorkingDay = !workingDays || workingDays.length === 0 || workingDays.includes(today.getDay());
    const nextWorkingLabel = (() => {
        if (!workingDays || workingDays.length === 0) return '';
        for (let i = 1; i <= 7; i += 1) {
            const next = addDays(today, i);
            if (workingDays.includes(next.getDay())) {
                if (i === 1) return 'Mañana';
                const label = format(next, 'EEEE', { locale: es });
                return label.charAt(0).toUpperCase() + label.slice(1);
            }
        }
        return '';
    })();

    return (
        <motion.div
            onClick={(e) => {
                if (onClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Card clicked:", project.id);
                    onClick();
                }
            }}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            className={cn(
                "relative overflow-hidden rounded-[32px] px-5 py-3 cursor-pointer select-none",
                isArchived ? "bg-white/5 border-white/10 opacity-60 grayscale" : "bg-black/25 border",
                "group transition-all duration-300"
            )}
            style={isArchived ? {} : { borderColor, boxShadow: `0 0 20px ${glowColor}`, background: `linear-gradient(180deg, ${sheen} 0%, rgba(255,255,255,0) 70%)` }}
        >
            <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4 w-full">
                    {/* Big Icon Circle - FOCUS TRIGGER */}
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onStartFocus && !isArchived) onStartFocus();
                        }}
                        disabled={!!isArchived}
                        className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_22px_-4px_currentColor] hover:scale-105 active:scale-95 transition-transform",
                            isArchived && "opacity-50 cursor-not-allowed shadow-none"
                        )}
                        style={{ backgroundColor: themeColor, color: themeColor }}
                    >
                        <Play size={24} className="text-white fill-white ml-1" />
                    </button>

                    <div className="flex flex-col min-w-0 flex-1">
                        {/* Title Row */}
                        <div className="flex justify-between items-center mb-0.5">
                            <h3 
                                className="text-base font-bold truncate tracking-tight"
                                style={{ color: themeColor }}
                            >
                                {project.title}
                            </h3>
                            <ChevronRight size={16} className="text-white/20" />
                        </div>
                        
                        {/* Time Row */}
                        <div className="flex items-baseline gap-2">
                            <motion.span 
                                className="text-[26px] font-black text-white tracking-tighter tabular-nums leading-none"
                                animate={displayPercentage >= 100 ? { 
                                    opacity: [1, 0.5, 1],
                                    textShadow: [`0 0 10px ${themeColor}66`, `0 0 25px ${themeColor}99`, `0 0 10px ${themeColor}66`]
                                } : { 
                                    opacity: 1,
                                    textShadow: '0 0 0px transparent'
                                }}
                                transition={displayPercentage >= 100 ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                            >
                                {timeString}
                            </motion.span>
                            {isWorkingDay && (
                                <span className="text-xs font-medium text-white/30 tabular-nums">
                                    / {goalString}
                                </span>
                            )}
                        </div>

                        {isWorkingDay ? (
                            <div className="flex items-center gap-3 mt-2 w-full">
                                <div className="h-2 flex-1 bg-[#1c1c1e] rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={displayPercentage >= 100 ? { 
                                            width: `${progress}%`,
                                            opacity: [1, 0.5, 1],
                                            boxShadow: [`0 0 5px ${themeColor}4D`, `0 0 15px ${themeColor}99`, `0 0 5px ${themeColor}4D`]
                                        } : { 
                                            width: `${progress}%`,
                                            opacity: 1,
                                            boxShadow: 'none'
                                        }}
                                        transition={displayPercentage >= 100 ? { 
                                            duration: 3, repeat: Infinity, ease: "easeInOut",
                                            width: { duration: 0 }
                                        } : { 
                                            type: "spring", stiffness: 50, damping: 15 
                                        }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: themeColor }}
                                    />
                                </div>
                                <motion.span 
                                    className="text-[10px] font-bold tabular-nums text-white"
                                    animate={displayPercentage >= 100 ? { 
                                        opacity: [0.95, 0.5, 0.95],
                                        textShadow: [`0 0 5px ${themeColor}4D`, `0 0 15px ${themeColor}CC`, `0 0 5px ${themeColor}4D`]
                                    } : { 
                                        opacity: 0.3,
                                        textShadow: '0 0 0px transparent'
                                    }}
                                    transition={displayPercentage >= 100 ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                                >
                                    {displayPercentage}%
                                </motion.span>
                            </div>
                        ) : (
                            <div className="mt-2 text-[11px] font-semibold text-white/60">
                                {nextWorkingLabel ? `Siguiente sesión: ${nextWorkingLabel}` : 'Siguiente sesión pronto'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
