import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, Trash2, Edit2, Target } from 'lucide-react';
import { Quest, Attribute, Project } from '../../../types';
import { cn } from '../../../utils/cn';
import { SubtaskManager } from './SubtaskManager';

interface QuestItemProps {
  quest: Quest;
  attribute?: Attribute;
  project?: Project;
  onComplete: (e: React.MouseEvent, q: Quest) => void;
  onDelete?: (id: string) => void;
  onEdit?: (quest: Quest) => void;
  onFocusProject?: (projectId: string) => void;
  onOpenNexus?: (smartProjectId: string) => void;
  isLite?: boolean;
}

export const QuestItem = React.memo(({ quest, attribute, project, onComplete, onDelete, onEdit, onFocusProject, isLite }: QuestItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const Icon = attribute?.icon;

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quest.completed) {
      setIsCompleting(true);
      // Wait for animation to float up before actually completing
      setTimeout(() => {
        onComplete(e, quest);
        // We don't reset isCompleting to prevent flickering before unmount
      }, 600); 
    } else {
      onComplete(e, quest);
    }
  };

  const difficultyColors: Record<string, string> = {
    S: 'text-purple-500 border-purple-500/20 bg-purple-500/5',
    A: 'text-rose-500 border-rose-500/20 bg-rose-500/5',
    B: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
    C: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5', 
  };

  const diffColor = difficultyColors[quest.difficulty] || 'text-slate-400 border-slate-400/20';
  const xp = quest.xpReward;
  const coins = quest.gold || 0;
  const isSmart = quest.isSmartQuest;

  const Container: any = isLite ? 'div' : motion.div;

  return (
    <Container
      {...(isLite ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, scale: 0.95 } })}
      className={cn(
        "relative rounded-[1.25rem] transition-all duration-300 mb-3 group",
        expanded ? "z-10 ring-1 ring-white/10" : "hover:bg-white/5",
        isSmart && "ring-1 ring-indigo-500/30 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]"
      )}
      style={{ 
        contentVisibility: 'auto',
        containIntrinsicSize: '100px',
        padding: '1px', 
        background: isSmart 
            ? `linear-gradient(145deg, ${attribute?.color || '#333'}40 0%, rgba(99,102,241,0.1) 40%, transparent 100%)`
            : `linear-gradient(145deg, ${attribute?.color || '#333'}20 0%, rgba(255,255,255,0.05) 40%, transparent 100%)` 
      }}
    >
      <div 
        className="relative rounded-[1.2rem] overflow-hidden"
        style={{
            background: attribute?.color 
                ? `linear-gradient(180deg, ${attribute.color}15 0%, rgba(18, 18, 22, 0.95) 100%)` 
                : 'rgba(18, 18, 22, 0.95)'
        }}
      >
        {isSmart && (
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                <div 
                    className="w-24 h-24 rounded-full" 
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)' }}
                />
            </div>
        )}
        <div 
          className="relative z-10 p-4 cursor-pointer" 
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={handleComplete} 
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 active:scale-90",
                quest.completed 
                  ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-95" 
                  : isSmart 
                    ? "bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-400/50 hover:bg-indigo-500/20"
                    : "bg-white/5 border border-white/10 hover:border-theme-avatar/50 hover:bg-theme-avatar/10"
              )}
            >
              {quest.completed ? (
                <CheckCircle2 size={20} strokeWidth={3.5} />
              ) : (
                <div className={cn("w-3 h-3 rounded-full", isSmart ? "bg-indigo-400/40" : "bg-white/20")} />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className={cn(
                  "text-[15px] font-bold truncate pr-2 leading-tight tracking-tight transition-colors",
                  quest.completed ? "text-slate-500 line-through" : "text-white"
                )}>
                  {quest.title}
                </h3>
                <div className="flex items-center gap-2">
                    {isSmart && (
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                            SMART
                        </span>
                    )}
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-[4px] font-black border uppercase tracking-wide", diffColor)}>
                      {quest.difficulty}
                    </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {attribute && Icon && (
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} style={{ color: attribute.color }} strokeWidth={2.5} />
                    <span className="text-[11px] font-bold tracking-wide" style={{ color: attribute.color }}>
                      {attribute.label}
                    </span>
                  </div>
                )}
                <AnimatePresence>
                  {(expanded || isSmart) && (
                     <motion.div 
                        initial={{ opacity: 0, x: -5 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-[10px] font-medium"
                     >
                        <span className="text-emerald-400">+{Math.floor(xp)} XP</span>
                        {coins > 0 && <span className="text-yellow-400">+{coins} G</span>}
                     </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* EDIT BUTTON (Visible on Expand or Hover) */}
            {onEdit && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(quest); }}
                    className={cn(
                        "p-2 rounded-lg text-white/20 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors",
                        expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                >
                    <Edit2 size={16} />
                </button>
            )}

            {/* DELETE BUTTON (Visible on Expand or Hover) - Allowed for all tasks */}
            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(quest.id); }}
                    className={cn(
                        "p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors",
                        expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                >
                    <Trash2 size={16} />
                </button>
            )}

            <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-white/30 tracking-widest">
                    {expanded ? '2/2' : '1/2'}
                </span>
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
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden origin-top"
              >
                <div className="pt-4 pb-1">
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />
                  
                  {project && onFocusProject && (
                      <button 
                          onClick={(e) => { e.stopPropagation(); onFocusProject(project.id); }}
                          className="w-full flex items-center justify-center gap-2 py-2 mb-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-xs uppercase tracking-widest hover:bg-indigo-500/20 transition-colors"
                      >
                          <Target size={14} />
                          Focus Mode
                      </button>
                  )}

                  {quest.description && (
                    <div className="text-[13px] text-slate-400 leading-relaxed px-1 font-medium mb-3">
                      "{quest.description}"
                    </div>
                  )}

                  <SubtaskManager taskId={quest.id} initialSubtasks={quest.subtasks} />

                  {quest.deadline && (
                     <div className={cn(
                        "text-right mt-2 font-mono",
                        isSmart ? "text-xs font-bold text-indigo-400" : "text-[10px] text-rose-400"
                     )}>
                        {isSmart ? `TARGET: ${quest.deadline}` : `DUE: ${quest.deadline}`}
                     </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FLOATING REWARDS ANIMATION */}
      {!isLite && (
        <AnimatePresence>
          {isCompleting && (
              <motion.div
                  className="absolute left-10 top-0 z-50 pointer-events-none flex flex-col items-start gap-1"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                      opacity: [0, 1, 1, 0], 
                      y: -100, 
                      scale: 1 
                  }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
              >
                  <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <span className="text-emerald-400 font-black text-sm">+{Math.floor(xp)} XP</span>
                  </div>
                  
                  {attribute && (
                      <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-white/10"
                           style={{ borderColor: `${attribute.color}40`, boxShadow: `0 0 15px ${attribute.color}30` }}>
                          <Icon size={12} style={{ color: attribute.color }} />
                          <span style={{ color: attribute.color }} className="font-bold text-sm">
                              +{Math.floor(xp)} {attribute.label}
                          </span>
                      </div>
                  )}

                  {coins > 0 && (
                      <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                          <span className="text-yellow-400 font-bold text-sm">+{coins} G</span>
                      </div>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      )}
    </Container>
  );
});
