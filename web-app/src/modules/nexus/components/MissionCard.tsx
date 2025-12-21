import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { SmartProject } from '../../../types/SmartGoal';
import { cn } from '../../../utils/cn';

interface MissionCardProps {
  project: SmartProject;
  onClick: () => void;
  isActive?: boolean;
}

export const MissionCard: React.FC<MissionCardProps> = ({ project, onClick, isActive }) => {
  // Determine color theme based on project attribute or default
  // const themeColor = project.traitColor || 'cyan'; 
  
  // Calculate progress based on direct children of root node
  const totalNodes = project.rootNode.children.length;
  const completedNodes = project.rootNode.children.filter(n => n.isCompleted).length;
  
  const progress = totalNodes > 0 
    ? (completedNodes / totalNodes) * 100 
    : 0;

  const isCompleted = project.status === 'COMPLETED';

  return (
    <motion.div
      layoutId={`mission-card-${project.id}`}
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer overflow-hidden rounded-3xl",
        "bg-gray-900/40 backdrop-blur-xl border border-white/10",
        "hover:bg-gray-800/50 transition-colors duration-300",
        "h-[280px] flex flex-col justify-between p-6",
        isCompleted ? "shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)] border-yellow-500/30" : "shadow-lg hover:shadow-cyan-500/20"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background Ambient Glow */}
      <div className={cn(
        "absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] opacity-20",
        isCompleted ? "bg-yellow-500" : "bg-cyan-500"
      )} />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-start">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <Target className={cn("w-6 h-6", isCompleted ? "text-yellow-400" : "text-cyan-400")} />
        </div>
        
        {isActive && (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
            ACTIVE LINK
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 mt-auto">
        <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
          {project.mainGoal}
        </h3>
        <p className="text-white/50 text-sm line-clamp-1 font-medium">
          {project.totalTimeframe} PROTOCOL
        </p>

        {/* Progress Section */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs font-mono text-cyan-200/70">
            <span>SYNC STATUS</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              className={cn(
                "h-full rounded-full relative",
                isCompleted ? "bg-gradient-to-r from-yellow-600 to-yellow-400" : "bg-gradient-to-r from-cyan-900 to-cyan-400"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
