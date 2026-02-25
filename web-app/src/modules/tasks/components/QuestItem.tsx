import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, Trash2, Edit2, Target, Coins, Zap } from 'lucide-react';
import { Quest, Attribute, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { cn } from '../../../utils/cn';
import { SubtaskManager } from './SubtaskManager';
import { triggerFlyingIcon } from '../../dashboard/components/FlyingIcon';

interface QuestItemProps {
  quest: Quest;
  attribute?: Attribute;
  project?: Project;
  smartProject?: SmartProject;
  onComplete: (e: React.MouseEvent, q: Quest) => void;
  onDelete?: (id: string) => void;
  onEdit?: (quest: Quest) => void;
  onFocusProject?: (projectId: string) => void;
  onOpenNexus?: (smartProjectId: string) => void;
  isLite?: boolean;
}

export const QuestItem = React.memo(({ quest, attribute, project, smartProject, onComplete, onDelete, onEdit, onFocusProject, isLite }: QuestItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const Icon = attribute?.icon;

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quest.completed) {
      const rect = e.currentTarget.getBoundingClientRect();

      // Coins
      if (coins > 0) {
        triggerFlyingIcon(rect, "gold-counter-pill", <Coins size={24} className="text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,1)]" />, 0);
      }
      
      // XP
      triggerFlyingIcon(rect, "xp-bar-container", <Zap size={24} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,1)]" />, 0.15);
      
      // Trait
      if (attribute && Icon) {
        triggerFlyingIcon(rect, "xp-bar-container", <Icon size={24} style={{ color: themeColor }} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />, 0.3);
      }

      setIsCompleting(true);
      // Wait for animation to float up before actually completing
      setTimeout(() => {
        onComplete(e, quest);
        // We don't reset isCompleting to prevent flickering before unmount
      }, 800); 
    } else {
      onComplete(e, quest);
    }
  };

  const difficultyColors: Record<string, string> = {
    S: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
    A: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    B: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
    C: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10', 
  };

  const diffColor = difficultyColors[quest.difficulty] || 'text-slate-400 border-slate-400/20';
  const xp = quest.xpReward;
  const coins = quest.gold || 0;
  const isSmart = quest.isSmartQuest;
  const themeColor = attribute?.color || '#ffffff';

  const Container: any = isLite ? 'div' : motion.div;

  return (
    <Container
      {...(isLite ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, scale: 0.95 } })}
      className={cn(
        "relative rounded-[1.25rem] transition-all duration-300 mb-3 group overflow-hidden",
        expanded ? "z-10" : "hover:z-10"
      )}
      style={{ 
        // VisionOS "Hyper-Glass" Base
        background: 'rgba(20, 20, 25, 0.7)', // Slightly darker for better contrast and less blur need
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: expanded 
            ? `0 0 0 1px ${themeColor}40, 0 20px 40px -10px rgba(0,0,0,0.5)` // Active state glow
            : `inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` // Idle state
      }}
    >
      {/* Dynamic Attribute Glow Gradient (Top Left) - OPTIMIZED: Using radial gradient for zero GPU blur cost */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 0% 0%, ${themeColor}, transparent 70%)` }}
      />
      
      {/* Smart Quest Special Glow - OPTIMIZED */}
      {isSmart && (
         <div 
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: `radial-gradient(circle at 100% 100%, #6366f1, transparent 70%)` }}
         />
      )}

      <div 
        className="relative z-10 p-3 cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3.5">
          {/* VISIONOS CHECKBOX / ICON CONTAINER */}
          <button 
            onClick={handleComplete} 
            disabled={isCompleting}
            className={cn(
              "w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 transition-all duration-300 relative overflow-hidden group/icon",
              quest.completed ? "bg-emerald-500/20" : "bg-white/5 hover:bg-white/10"
            )}
            style={{
                borderColor: quest.completed ? 'transparent' : 'rgba(255,255,255,0.1)',
                borderWidth: '1px',
                boxShadow: quest.completed 
                    ? `inset 0 0 15px rgba(16,185,129,0.2)` 
                    : 'inset 0 1px 0 0 rgba(255,255,255,0.05)'
            }}
          >
             {/* Background glow for icon */}
             {!quest.completed && (
                <div 
                    className="absolute inset-0 opacity-0 group-hover/icon:opacity-20 transition-opacity duration-300" 
                    style={{ background: themeColor }}
                />
             )}

             {quest.completed ? (
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                >
                    <CheckCircle2 size={22} strokeWidth={3} />
                </motion.div>
             ) : (
                 Icon ? (
                    <Icon 
                        size={20} 
                        style={{ color: themeColor }} 
                        className="opacity-90 group-hover/icon:scale-110 transition-transform duration-300 drop-shadow-lg"
                        strokeWidth={2}
                    />
                 ) : (
                    <div className={cn("w-3.5 h-3.5 rounded-full border-2", isSmart ? "border-indigo-400" : "border-white/20")} />
                 )
             )}
          </button>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-start">
              <h3 className={cn(
                "text-[15px] font-semibold truncate pr-2 leading-tight tracking-tight transition-all duration-300",
                quest.completed ? "text-white/30 line-through" : "text-white/95 drop-shadow-md"
              )}>
                {quest.title}
              </h3>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
                 {/* Trait Badge (Glass Capsule) */}
                {attribute && (
                    <div 
                        className="flex items-center gap-1 px-1.5 py-[2px] rounded-md bg-white/5 border border-white/5"
                        style={{ borderColor: `${themeColor}20` }}
                    >
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-90" style={{ color: themeColor }}>
                            {smartProject ? smartProject.mainGoal : attribute.label}
                        </span>
                    </div>
                )}
                
                {/* Difficulty Badge */}
                <span className={cn("text-[9px] px-1.5 py-[2px] rounded-md font-bold border uppercase tracking-wide opacity-80", diffColor)}>
                    {quest.difficulty}
                </span>

                {isSmart && (
                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-wider bg-indigo-500/10 px-1.5 py-[2px] rounded border border-indigo-500/20">
                        SMART
                    </span>
                )}
            </div>
          </div>
          
          {/* RIGHT SIDE: Rewards & Actions */}
          <div className="flex items-center gap-3">
             <AnimatePresence mode="wait">
                {(expanded || isSmart) && !quest.completed && (
                     <motion.div 
                        initial={{ opacity: 0, x: 10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex flex-col items-end gap-0.5 text-[10px] font-mono font-medium"
                     >
                        <span className="text-emerald-400 drop-shadow-sm">+{Math.floor(xp)} XP</span>
                        {coins > 0 && <span className="text-yellow-400 drop-shadow-sm">+{coins} G</span>}
                     </motion.div>
                )}
             </AnimatePresence>

             <div className={cn(
                 "flex items-center gap-1 transition-all duration-300",
                 expanded ? "opacity-100" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
             )}>
                {/* EDIT */}
                {onEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(quest); }}
                        className="p-1.5 rounded-lg text-white/40 hover:text-indigo-300 hover:bg-white/5 transition-colors"
                    >
                        <Edit2 size={14} />
                    </button>
                )}

                {/* DELETE */}
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(quest.id); }}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
             </div>

             <ChevronDown 
                size={16} 
                className={cn(
                "text-white/20 transition-transform duration-300",
                expanded ? "rotate-180 text-white/60" : ""
                )} 
            />
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-1 pl-[3.75rem]"> {/* Indent to align with text */}
                
                {/* Description */}
                {quest.description && (
                  <div className="text-[13px] text-white/60 leading-relaxed font-medium mb-4 border-l-2 border-white/10 pl-3">
                    {quest.description}
                  </div>
                )}

                {project && onFocusProject && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onFocusProject(project.id); 
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500/20 transition-colors"
                    >
                        <Target size={12} />
                        Focus Mode
                    </button>
                )}

                <SubtaskManager taskId={quest.id} initialSubtasks={quest.subtasks} />

                {quest.deadline && (
                   <div className={cn(
                      "flex items-center gap-2 mt-3 font-mono text-[10px]",
                      isSmart ? "text-indigo-400" : "text-rose-400"
                   )}>
                      <span className="opacity-50 uppercase tracking-widest">Deadline</span>
                      <span className="font-bold">{quest.deadline}</span>
                   </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


    </Container>
  );
});
