import React from 'react';
import { motion } from 'framer-motion';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { ChevronRight, Play, Flame } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDynamicDailyTarget } from '../../../utils/projectUtils';
import { useTranslation } from 'react-i18next';

interface ProjectCardMinimalProps {
    project: Project;
    attribute?: Attribute;
    onClick?: () => void;
    onStartFocus?: () => void;
}

export const ProjectCardMinimal: React.FC<ProjectCardMinimalProps> = ({ project, attribute, onClick, onStartFocus }) => {
    const { t, i18n } = useTranslation();
    const themeColor = project.color || attribute?.color || '#f43f5e';

    let goalMinutes = project.goalTarget || 0;
    let currentMinutesForProgress = Math.floor((project.totalTime || 0) / 60);
    const effectiveFrequency = project.uiFrequency || project.goalFrequency;

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

    const displayH = Math.floor(currentMinutesForProgress / 60);
    const displayM = Math.round(currentMinutesForProgress % 60);
    const timeString = `${displayH}h ${displayM.toString().padStart(2, '0')}m`;

    const goalH = Math.floor(goalMinutes / 60);
    const goalM = Math.round(goalMinutes % 60);
    const goalString = `${goalH}h ${goalM.toString().padStart(2, '0')}m`;

    // Fallback if no theme color is provided
    const displayColor = project.color || attribute?.color || '#3b82f6';

    // Calculate routine items for today
    const todayRoutineSteps = React.useMemo(() => {
        if (project.id === 'QUICK_FOCUS') return [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekdayIndex = today.getDay();

        const tempSaved = typeof window !== 'undefined' ? localStorage.getItem(`matrix_temp_routine_${project.id}_${todayStr}`) : null;
        if (tempSaved) {
            try { const p = JSON.parse(tempSaved); if (p && p.length) return p; } catch (e) {}
        }
        const weekdaySaved = typeof window !== 'undefined' ? localStorage.getItem(`matrix_project_routine_${project.id}_weekday_${weekdayIndex}`) : null;
        if (weekdaySaved) {
            try { const p = JSON.parse(weekdaySaved); if (p && p.length) return p; } catch (e) {}
        }
        if (project.focusRoutine && project.focusRoutine.length > 0) {
            if (!project.focusRoutineDays || project.focusRoutineDays.length === 0 || project.focusRoutineDays.includes(weekdayIndex)) {
                return project.focusRoutine;
            }
        }
        return [];
    }, [project]);

    const focusStepsCount = todayRoutineSteps.filter((s: any) => s.type === 'FOCUS').length;
    const completedFocusCountToday = React.useMemo(() => {
        if (!focusStepsCount) return 0;
        const todayStr = new Date().toDateString();
        const count = (project.sessions || [])
            .filter(s => new Date(s.date).toDateString() === todayStr && s.type === 'POMO').length;
        return Math.min(focusStepsCount, count);
    }, [project.sessions, focusStepsCount]);

    const isArchived = project.archived;
    const workingDays = project.workingDays;
    const today = new Date();
    const isWorkingDay = !workingDays || workingDays.length === 0 || workingDays.includes(today.getDay());
    const nextWorkingLabel = (() => {
        if (!workingDays || workingDays.length === 0) return '';
        for (let i = 1; i <= 7; i += 1) {
            const next = addDays(today, i);
            if (workingDays.includes(next.getDay())) {
                if (i === 1) return t('tomorrow');
                const label = format(next, 'EEEE', { locale: i18n.language === 'es' ? es : undefined });
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
                    onClick();
                }
            }}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            className={cn(
                "p-4 py-3 md:p-5 rounded-[24px] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 flex flex-row items-center gap-3 text-left cursor-pointer group",
                isArchived && "opacity-60 grayscale"
            )}
            style={{
                backgroundColor: displayColor.startsWith('#') ? `${displayColor}21` : displayColor,
                ...(!isArchived ? { boxShadow: `0 10px 25px -5px ${displayColor}66, 0 8px 10px -6px ${displayColor}66` } : {})
            }}
        >
            <button 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onStartFocus && !isArchived) onStartFocus();
                }}
                disabled={!!isArchived}
                className={cn(
                    "w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border border-white/20 shadow-md hover:scale-105 active:scale-95 transition-transform duration-75 relative overflow-hidden clickable",
                    isArchived && "opacity-50 cursor-not-allowed"
                )}
                style={{ 
                    background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)`
                }}
            >
                <div className="absolute inset-0 bg-white/10" />
                <Play size={24} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] ml-1 relative z-10" />
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <h3 
                        className="text-base md:text-lg font-bold leading-tight truncate flex items-center gap-2"
                        style={{ 
                            color: displayColor,
                            textShadow: `0 0 20px ${displayColor}40, 0 0 40px ${displayColor}20`
                        }}
                    >
                        <span className="truncate">{project.title}</span>
                        {project.streak !== undefined && project.streak > 0 && (
                            <span 
                                className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 border transition-all shrink-0 font-black",
                                    displayPercentage >= 100 
                                        ? "bg-orange-500/10 border-orange-500/30 animate-pulse text-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" 
                                        : "bg-white/5 border-white/10 text-white/40"
                                )}
                            >
                                <Flame size={10} className={cn(
                                    "transition-colors",
                                    displayPercentage >= 100 ? "fill-orange-500 text-orange-500" : "fill-transparent text-white/40"
                                )} /> 
                                {project.streak}
                            </span>
                        )}
                        {focusStepsCount > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                {Array.from({ length: focusStepsCount }).map((_, idx) => {
                                    const isDone = idx < completedFocusCountToday;
                                    return (
                                        <svg 
                                            key={idx} 
                                            width="19" 
                                            height="19" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            className={cn(
                                                "transition-all duration-300 shrink-0", 
                                                isDone ? "drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] scale-110" : "opacity-40 hover:opacity-75"
                                            )}
                                        >
                                            {/* Organic Green Tomato Leaves / Calyx */}
                                            <path 
                                                d="M12 2C11 3.8 9.5 4.8 7 4.5c1.8 1 3.5 1.5 4.5 2.5C12.5 6 14 5.5 17 4.5c-2.5.3-4-1.2-5-2.5z" 
                                                fill={isDone ? "#34d399" : "#6b7280"} 
                                            />
                                            <path 
                                                d="M12 2v2.5" 
                                                stroke={isDone ? "#059669" : "#4b5563"} 
                                                strokeWidth="1.2" 
                                                strokeLinecap="round" 
                                            />

                                            {/* Plump Organic Tomato Body */}
                                            <path 
                                                d="M12 21.5c-4.6 0-8.2-3.2-8.2-7.5 0-4.2 3.2-7.5 8.2-7.5s8.2 3.3 8.2 7.5c0 4.3-3.6 7.5-8.2 7.5z" 
                                                fill={isDone ? "url(#pomoRedGrad)" : "rgba(255,255,255,0.08)"} 
                                                stroke={isDone ? "#fb7185" : "rgba(255,255,255,0.3)"} 
                                                strokeWidth="1.4" 
                                            />

                                            {/* Integrated Kitchen Timer Dial Notches */}
                                            <line x1="12" y1="8" x2="12" y2="9.5" stroke={isDone ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)"} strokeWidth="1.2" strokeLinecap="round" />
                                            <line x1="17.8" y1="14" x2="19.2" y2="14" stroke={isDone ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)"} strokeWidth="1.2" strokeLinecap="round" />
                                            <line x1="12" y1="20" x2="12" y2="18.5" stroke={isDone ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)"} strokeWidth="1.2" strokeLinecap="round" />
                                            <line x1="6.2" y1="14" x2="4.8" y2="14" stroke={isDone ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)"} strokeWidth="1.2" strokeLinecap="round" />

                                            {/* Timer Hand & Dial Center */}
                                            <line x1="12" y1="14" x2="14.8" y2="10.5" stroke={isDone ? "#ffffff" : "rgba(255,255,255,0.7)"} strokeWidth="1.5" strokeLinecap="round" />
                                            <circle cx="12" cy="14" r="1.3" fill={isDone ? "#ffffff" : "#e5e7eb"} />

                                            {/* Glossy Organic Highlight */}
                                            <ellipse cx="8.5" cy="10.5" rx="1.8" ry="1" fill={isDone ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.06)"} transform="rotate(-25 8.5 10.5)" />

                                            <defs>
                                                <linearGradient id="pomoRedGrad" x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                                                    <stop offset="0%" stopColor="#f43f5e" />
                                                    <stop offset="60%" stopColor="#e11d48" />
                                                    <stop offset="100%" stopColor="#9f1239" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    );
                                })}
                            </div>
                        )}
                    </h3>
                    <ChevronRight size={16} className="text-white/20 shrink-0 group-hover:text-white/50 transition-colors" />
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                    <motion.span 
                        className="text-[22px] md:text-[24px] font-black text-white tracking-tighter tabular-nums leading-none"
                        animate={displayPercentage >= 100 ? { 
                            opacity: [1, 0.7, 1],
                            textShadow: [`0 0 10px ${themeColor}66`, `0 0 20px ${themeColor}99`, `0 0 10px ${themeColor}66`]
                        } : { 
                            opacity: 1,
                            textShadow: '0 0 0px transparent'
                        }}
                        transition={displayPercentage >= 100 ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
                    >
                        {timeString}
                    </motion.span>
                    {isWorkingDay && (
                        <span className="text-white/50 text-xs md:text-sm font-medium tabular-nums">
                            / {goalString}
                        </span>
                    )}
                </div>

                {isWorkingDay ? (
                    <div className="flex items-center gap-3 w-full">
                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                                
                                animate={{ width: `${progress}%` }}
                                className="h-full rounded-full"
                                style={{ 
                                    backgroundColor: themeColor,
                                    boxShadow: displayPercentage >= 100 ? `0 0 10px ${themeColor}` : 'none'
                                }}
                            />
                        </div>
                        <span className="text-[10px] font-bold tabular-nums text-white/70">
                            {displayPercentage}%
                        </span>
                    </div>
                ) : (
                    <div className="text-[11px] font-semibold text-white/50">
                        {nextWorkingLabel ? `Siguiente sesión: ${nextWorkingLabel}` : 'Siguiente sesión pronto'}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
