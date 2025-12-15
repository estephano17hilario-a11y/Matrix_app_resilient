import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { Quest, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';

interface QuestItemProps {
  quest: Quest;
  attribute?: Attribute;
  onComplete: (e: React.MouseEvent, q: Quest) => void;
}

export const QuestItem = React.memo(({ quest, attribute, onComplete }: QuestItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = attribute?.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "relative rounded-[1.25rem] transition-all duration-300 mb-3 group",
        expanded ? "z-10 ring-1 ring-white/10" : "hover:bg-white/5"
      )}
      style={{ 
        padding: '1px', 
        background: `linear-gradient(145deg, ${attribute?.color || '#333'}20 0%, rgba(255,255,255,0.05) 40%, transparent 100%)` 
      }}
    >
      <div className="relative bg-[#121216]/80 backdrop-blur-xl rounded-[1.2rem] overflow-hidden">
        <div 
          className="relative z-10 p-4 cursor-pointer" 
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); onComplete(e, quest); }} 
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 active:scale-90",
                quest.completed 
                  ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-95" 
                  : "bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-cyan-400/10"
              )}
            >
              {quest.completed ? (
                <CheckCircle2 size={20} strokeWidth={3.5} />
              ) : (
                <div className="w-3 h-3 rounded-full bg-white/20" />
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
                <span className="text-[9px] px-1.5 py-0.5 rounded-[4px] font-black border uppercase tracking-wide text-white/50 border-white/10">
                  RANK {quest.difficulty}
                </span>
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
                  {expanded && (
                     <motion.span 
                        initial={{ opacity: 0, x: -5 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[10px] text-slate-500 font-medium"
                     >
                        + {quest.xpReward} XP
                     </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <ChevronDown 
              size={16} 
              className={cn(
                "text-white/20 transition-transform duration-300",
                expanded ? "rotate-180 text-white/60" : ""
              )} 
            />
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-1">
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />
                  {quest.description && (
                    <div className="text-[13px] text-slate-400 leading-relaxed px-1 font-medium mb-3">
                      "{quest.description}"
                    </div>
                  )}
                  {quest.deadline && (
                     <div className="text-[10px] text-rose-400 font-mono text-right mt-2">
                        DUE: {quest.deadline}
                     </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});
