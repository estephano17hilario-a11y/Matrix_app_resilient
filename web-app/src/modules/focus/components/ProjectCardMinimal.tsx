import React from 'react';
import { motion } from 'framer-motion';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { ChevronRight, Play } from 'lucide-react';

interface ProjectCardMinimalProps {
    project: Project;
    attribute?: Attribute;
    onClick?: () => void;
    onStartFocus?: () => void;
}

export const ProjectCardMinimal: React.FC<ProjectCardMinimalProps> = ({ project, attribute, onClick, onStartFocus }) => {
    // Basic stats
    const totalHours = Math.floor((project.totalTime || 0) / 3600);
    const totalMinutes = Math.floor(((project.totalTime || 0) % 3600) / 60);
    const timeString = `${totalHours}h ${totalMinutes.toString().padStart(2, '0')}m`;
    
    // Theme color (Default to red/pink from image if no attribute)
    const themeColor = attribute?.color || '#f43f5e'; // rose-500
    
    // Progress
    const goalMinutes = project.goalTarget || 0; // stored in minutes? Let's check logic. Usually yes.
    // In ProjectModal: goalTarget: calculatedDailyGoal * 60 (minutes)
    // In FocusView: totalTime is seconds.
    // So currentMinutes = totalTime / 60.
    
    const currentMinutesTotal = Math.floor((project.totalTime || 0) / 60);
    const progress = goalMinutes > 0 ? Math.min(100, (currentMinutesTotal / goalMinutes) * 100) : 0;
    
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
    const glowColor = toRgba(themeColor, 0.15);
    const sheen = toRgba('#ffffff', 0.04);
    const topGlow = toRgba(themeColor, 0.08);

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
                "bg-black/25 border",
                "group transition-all duration-300"
            )}
            style={{ borderColor, boxShadow: `0 0 16px ${glowColor}`, background: `linear-gradient(180deg, ${sheen} 0%, rgba(255,255,255,0) 70%)` }}
        >
            <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4 w-full">
                    {/* Big Icon Circle - FOCUS TRIGGER */}
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onStartFocus) onStartFocus();
                        }}
                        className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_20px_-5px_currentColor] hover:scale-105 active:scale-95 transition-transform"
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
                            <span className="text-[26px] font-black text-white tracking-tighter tabular-nums leading-none">
                                {timeString}
                            </span>
                            <span className="text-xs font-medium text-white/30 tabular-nums">
                                / {goalString}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 mt-2 w-full">
                            <div className="h-2 flex-1 bg-[#1c1c1e] rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: themeColor }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-white/30 tabular-nums">{Math.round(progress)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
