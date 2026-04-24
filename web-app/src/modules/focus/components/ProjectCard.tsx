import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Play } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Project } from '../../../types';
import { cn } from '../../../utils/cn';
import { getDynamicDailyTarget } from '../../../utils/projectUtils';
import { useTranslation } from 'react-i18next';

interface ProjectCardProps {
    project: Project;
    onFocus: (e: React.MouseEvent, project: Project) => void;
    onClick: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onFocus, onClick }) => {
    const { t, i18n } = useTranslation();
    // Calculate progress
    let goalMinutes = project.goalTarget || 0;
    // Let's verify unit. In FocusStats: Math.floor(currentMinutes / 60)h...
    // In HabitDetailView: value = sessionEntries.reduce... (s.duration / 60).
    // Session duration seems to be in seconds.
    // Project.totalTime: let's assume it's seconds based on session aggregation, but let's check.
    // In FocusView: onCompleteSession(id, duration, type).
    
    // Let's look at a helper. For now, assuming seconds for totalTime is safer if summing sessions.
    // Actually, in FocusStats: `currentMinutes` comes from `generateFocusData` which returns minutes.
    
    // Let's assume project.totalTime is in SECONDS.
    let currentMinutes = Math.floor((project.totalTime || 0) / 60);
    
    const effectiveFrequency = project.uiFrequency || project.goalFrequency;
    if (effectiveFrequency === 'DAILY') {
        const todayStr = new Date().toDateString();
        const todaySeconds = (project.sessions || [])
            .filter(s => new Date(s.date).toDateString() === todayStr)
            .reduce((acc, s) => {
                const duration = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
                return acc + duration;
            }, 0);
        currentMinutes = Math.floor(todaySeconds / 60);
    } else if (effectiveFrequency === 'WEEKLY' || effectiveFrequency === 'MONTHLY') {
        goalMinutes = getDynamicDailyTarget(project);
        
        const todayStr = new Date().toDateString();
        const todaySeconds = (project.sessions || [])
            .filter(s => new Date(s.date).toDateString() === todayStr)
            .reduce((acc, s) => {
                const duration = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
                return acc + duration;
            }, 0);
        currentMinutes = Math.floor(todaySeconds / 60);
    }

    currentMinutes = Math.max(0, currentMinutes);
    goalMinutes = Math.max(0, goalMinutes);

    const progress = goalMinutes > 0 ? (currentMinutes / goalMinutes) * 100 : 0;
    const cappedProgress = Math.min(100, Math.max(0, progress));
    const displayPercentage = Math.round(Math.max(0, progress));

    const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h === 0) return `${m}m`;
        if (m === 0 && h === 0) return `0m`; // Handle 0
        if (m === 0) return `${h}h`;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    };

    const themeColor = '#f43f5e';
    const toRgba = (hex: string, alpha: number) => {
        const normalized = hex.replace('#', '');
        if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`;
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const shadowColor = toRgba(themeColor, 0.2);
    const customBoxShadow = `0 10px 15px -3px ${shadowColor}, 0 4px 6px -4px ${shadowColor}`;

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
            layoutId={`project-card-${project.id}`}
            onClick={() => onClick(project)}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative group overflow-hidden rounded-[24px] p-4 cursor-pointer",
                "bg-[#111113]/80 bg-gradient-to-br from-white/[0.04] to-transparent",
                "border border-white/[0.08] hover:border-white/[0.15]",
                "shadow-lg transition-all duration-200"
            )}
            style={{ boxShadow: customBoxShadow }}
        >
            {/* Top Row: Icon/Button and Title */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-5 w-full">
                     {/* Play Button - Bigger & Bolder */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => onFocus(e, project)}
                        className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center shrink-0",
                            "bg-rose-500 text-white shadow-[0_0_28px_-4px_rgba(244,63,94,0.75)]",
                            "hover:bg-rose-400 hover:scale-105 transition-all duration-200",
                            "border-2 border-white/10"
                        )}
                    >
                        <Play size={28} fill="currentColor" className="ml-1" />
                    </motion.button>

                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-1">
                             <h3 className="text-base font-bold text-rose-500 tracking-tight leading-none truncate">
                                {project.title}
                            </h3>
                             {/* Chevron absolute right */}
                            <div className="text-white/20 group-hover:text-white/50 transition-colors absolute right-0 top-1">
                                <ChevronRight size={18} />
                            </div>
                        </div>
                       
                        <div className="flex items-baseline gap-2 leading-none">
                            <motion.span 
                                className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none"
                                animate={displayPercentage >= 100 ? { 
                                    opacity: [1, 0.5, 1],
                                    textShadow: ['0 0 10px rgba(244,63,94,0.4)', '0 0 25px rgba(244,63,94,0.7)', '0 0 10px rgba(244,63,94,0.4)']
                                } : { 
                                    opacity: 1,
                                    textShadow: '0 0 0px transparent'
                                }}
                                transition={displayPercentage >= 100 ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
                            >
                                {formatTime(currentMinutes)}
                            </motion.span>
                            {isWorkingDay && (
                                <span className="text-xs text-white/30 font-bold tabular-nums">
                                    / {formatTime(goalMinutes)}
                                </span>
                            )}
                        </div>

                        {isWorkingDay ? (
                            <div className="flex items-center gap-3 mt-2 w-full">
                                <div className="h-2.5 flex-1 bg-black/60 rounded-full overflow-hidden">
                                    <motion.div 
                                        
                                        animate={displayPercentage >= 100 ? { 
                                            width: `${cappedProgress}%`,
                                            opacity: [1, 0.5, 1],
                                            boxShadow: ['0 0 5px rgba(244,63,94,0.3)', '0 0 15px rgba(244,63,94,0.6)', '0 0 5px rgba(244,63,94,0.3)']
                                        } : { 
                                            width: `${cappedProgress}%`,
                                            opacity: 1,
                                            boxShadow: '0 0 10px rgba(244,63,94,0.3)'
                                        }}
                                        transition={displayPercentage >= 100 ? { 
                                            duration: 3, repeat: Infinity, ease: "easeInOut",
                                            width: { duration: 0 } // Don't animate width on breathing
                                        } : { 
                                            type: "spring", stiffness: 350, damping: 20 
                                        }}
                                        className="h-full bg-rose-500 rounded-full"
                                    />
                                </div>
                                <motion.span 
                                    className="text-[10px] font-bold tabular-nums text-white"
                                    animate={displayPercentage >= 100 ? { 
                                        opacity: [0.95, 0.5, 0.95],
                                        textShadow: ['0 0 5px rgba(244,63,94,0.4)', '0 0 15px rgba(244,63,94,0.8)', '0 0 5px rgba(244,63,94,0.4)']
                                    } : { 
                                        opacity: 0.3,
                                        textShadow: '0 0 0px transparent'
                                    }}
                                    transition={displayPercentage >= 100 ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
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
