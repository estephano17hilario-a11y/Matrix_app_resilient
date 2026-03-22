import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Zap } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';

interface ProjectSimpleItemProps {
  project: Project;
  attribute?: Attribute;
  onStartSession: (e: React.MouseEvent, p: Project) => void;
  onClick?: (project: Project) => void;
  isActive?: boolean;
}

export const ProjectSimpleItem = React.memo(({ project, attribute, onStartSession, onClick, isActive }: ProjectSimpleItemProps) => {
  const baseColor = attribute?.color || '#6366f1'; 

  // Calculate Progress
  const goalMinutes = project.goalTarget || 60;
  
  // Calculate Relevant Time (Daily vs Lifetime)
  let relevantTime = project.totalTime;
  if (project.goalFrequency === 'DAILY' && project.sessions) {
      const now = new Date();
      const todayDate = now.getDate();
      const todayMonth = now.getMonth();
      const todayYear = now.getFullYear();
      relevantTime = project.sessions.filter(s => {
          const d = new Date(s.date);
          return d.getDate() === todayDate && d.getMonth() === todayMonth && d.getFullYear() === todayYear;
      }).reduce((acc, s) => acc + s.duration, 0);
  }

  const totalMinutes = Math.floor(relevantTime / 60);
  const progressPercent = (totalMinutes / goalMinutes) * 100;
  const visualPercent = Math.min(100, progressPercent);

  // Time formatting
  const currentHours = Math.floor(relevantTime / 3600);
  const currentMinutes = Math.floor((relevantTime % 3600) / 60);
  const goalHours = Math.floor(goalMinutes / 60);
  const goalRemainingMins = goalMinutes % 60;

  const toRgba = (hex: string, alpha: number) => {
      const normalized = hex.replace('#', '');
      if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`;
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const shadowColor = toRgba(baseColor, 0.2);
  const customBoxShadow = `0 10px 15px -3px ${shadowColor}, 0 4px 6px -4px ${shadowColor}`;

  return (
      <motion.div
         layout
         whileTap={{ scale: 0.98 }}
         onClick={() => onClick?.(project)}
         className="group relative bg-[#111113]/80 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] hover:border-white/[0.15] shadow-lg rounded-[2rem] p-4 transition-all duration-300 cursor-pointer overflow-hidden"
         style={{ boxShadow: customBoxShadow }}
       >
      <div className="relative flex items-center gap-5">
        {/* Left: Enter/Focus Button (Not Play) */}
        <button 
            onClick={(e) => {
                // DEBUG: Remove in production if annoying, but needed to verify click
                console.log("👆 ProjectSimpleItem: Enter Clicked", project.id);
                e.stopPropagation();
                e.preventDefault(); 
                onStartSession(e, project);
            }}
            onMouseDown={(e) => e.stopPropagation()} 
            onMouseUp={(e) => e.stopPropagation()}
            className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shrink-0 group/btn relative z-50 cursor-pointer",
                isActive 
                    ? "animate-pulse ring-2 ring-white/50" 
                    : "hover:scale-105 active:scale-95"
            )}
            style={{ 
                backgroundColor: baseColor,
                boxShadow: isActive ? `0 0 20px ${baseColor}60` : `0 4px 12px ${baseColor}40`
            }}
        >
            {isActive ? (
                <div className="relative pointer-events-none">
                    <div className="absolute inset-0 animate-ping opacity-50 rounded-full bg-white" />
                    <Zap size={28} className="text-white fill-white relative z-10" strokeWidth={0} />
                </div>
            ) : (
                <Zap size={28} className="text-white fill-white group-hover/btn:scale-110 transition-transform pointer-events-none" strokeWidth={0} />
            )}
        </button>
        
        {/* Middle: Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Header: Title + Chevron */}
          <div className="flex justify-between items-center">
             <h4 
                className="font-bold text-lg leading-tight tracking-tight truncate"
                style={{ color: baseColor }}
             >
                {project.title}
             </h4>
             <div className="flex items-center gap-2">
                 {isActive && (
                    <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-full animate-pulse">
                        LIVE
                    </span>
                 )}
                 <ChevronRight size={20} className="text-white/30 group-hover:text-white/60 transition-colors" />
             </div>
          </div>

          {/* Timer */}
          <div className="flex items-baseline gap-2 whitespace-nowrap">
             <span className="text-2xl font-bold text-white tracking-tighter">
                {currentHours}h {currentMinutes.toString().padStart(2, '0')}m
             </span>
             <span className="text-base text-white/30 font-medium">
                / {goalHours}h {goalRemainingMins.toString().padStart(2, '0')}m
             </span>
          </div>

          {/* Progress Bar Row */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-3 bg-black/60 rounded-full overflow-hidden relative">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${visualPercent}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    className="h-full rounded-full relative"
                    style={{ 
                        backgroundColor: baseColor,
                        boxShadow: progressPercent >= 100 ? `0 0 12px ${baseColor}90` : `0 0 8px ${baseColor}50`
                    }}
                >
                     {/* UNIFIED SHIMMER ANIMATION (Recycled from Focus Stats) */}
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </motion.div>
            </div>
            <span className={cn(
                "text-xs font-mono font-medium min-w-[3ch] text-right transition-all duration-300",
                progressPercent >= 100 ? "text-white font-black scale-110" : "text-white/40"
            )}
            style={progressPercent >= 100 ? { textShadow: `0 0 10px ${baseColor}` } : {}}
            >
                {progressPercent.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
