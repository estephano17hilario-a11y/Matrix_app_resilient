import React from 'react';
import { motion } from 'framer-motion';
import { Play, MoreVertical, Target, Clock } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';

interface ProjectSimpleItemProps {
  project: Project;
  attribute?: Attribute;
  onStartSession: (e: React.MouseEvent, p: Project) => void;
  onClick?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  isActive?: boolean;
}

export const ProjectSimpleItem = React.memo(({ project, attribute, onStartSession, onClick, onEdit, isActive }: ProjectSimpleItemProps) => {
  const Icon = attribute?.icon;
  const baseColor = attribute?.color || '#6366f1'; 

  // Calculate Progress
  const goalMinutes = project.goalTarget || 60;
  const totalMinutes = Math.floor(project.totalTime / 60);
  const progressPercent = Math.min(100, (totalMinutes / goalMinutes) * 100);

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(project)}
      className="group relative bg-gray-900/80 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-[1.5rem] p-4 transition-all duration-300 cursor-pointer overflow-hidden hover:bg-gray-800/80"
    >
        <div 
            className="absolute inset-0 opacity-[0.05] group-hover:opacity-10 transition-opacity duration-500" 
            style={{ backgroundColor: baseColor }}
        />

      <div className="relative flex items-center gap-4">
        {/* Left: Icon Box */}
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 border border-white/5"
          style={{ backgroundColor: `${baseColor}20` }}
        >
          {attribute && Icon && (
            <Icon size={24} style={{ color: baseColor }} strokeWidth={2} />
          )}
        </div>
        
        {/* Middle: Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Title */}
          <h4 className="text-white font-bold text-[17px] leading-tight tracking-tight truncate flex items-center gap-2">
            {project.title}
            {isActive && (
                <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-green-500/20 animate-pulse">
                    ACTIVE
                </span>
            )}
          </h4>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            <div 
                className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-white/5"
                style={{ 
                    backgroundColor: `${baseColor}10`, 
                    color: baseColor 
                }}
            >
                {attribute?.label || 'Project'}
            </div>

            <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border border-white/5"
                style={{ 
                    backgroundColor: `${baseColor}15`, 
                    color: '#e2e8f0' 
                }}
            >
                <Clock size={12} strokeWidth={2.5} />
                {Math.floor(project.totalTime / 3600)}h {Math.floor((project.totalTime % 3600) / 60)}m
            </div>

             {/* Progress Badge */}
             <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border border-white/5"
                style={{ 
                    backgroundColor: progressPercent >= 100 ? '#22c55e15' : `${baseColor}10`,
                    color: progressPercent >= 100 ? '#4ade80' : baseColor
                }}
            >
                <Target size={12} strokeWidth={2.5} />
                {progressPercent.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
             {/* Play Button */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onStartSession(e, project);
                }}
                className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 group/play",
                    isActive
                    ? "bg-transparent border-transparent" 
                    : "border-slate-600 hover:border-white/50 bg-transparent"
                )}
                style={isActive ? {
                    backgroundColor: baseColor,
                    borderColor: baseColor,
                    boxShadow: `0 0 15px ${baseColor}60`
                } : undefined}
            >
                <Play size={18} className={cn("text-slate-400 group-hover/play:text-white transition-colors", isActive && "text-white fill-white")} strokeWidth={3} style={isActive ? { fill: 'currentColor' } : undefined} />
            </button>

            {/* Menu Button */}
            <button 
                className="text-slate-500 hover:text-white transition-colors p-1"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(project);
                }}
            >
                <MoreVertical size={20} />
            </button>
        </div>
      </div>
      
      {/* Progress Bar Line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className="h-full transition-all duration-500"
            style={{ 
                width: `${progressPercent}%`,
                backgroundColor: baseColor,
                boxShadow: `0 0 10px ${baseColor}`
            }}
          />
      </div>
    </motion.div>
  );
});
