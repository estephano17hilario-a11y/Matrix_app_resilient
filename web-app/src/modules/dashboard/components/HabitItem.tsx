import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Check, Flame, MoreVertical, ChevronDown } from 'lucide-react';
import { Habit, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { QuantityUpdateModal } from './QuantityUpdateModal';
import { ChecklistModal } from './ChecklistModal';
import { LiquidProgressCircle } from './LiquidProgressCircle';

interface HabitItemProps {
  habit: Habit;
  attribute?: Attribute;
  onComplete: (e: React.MouseEvent, h: Habit) => void;
  onClick?: (habit: Habit) => void;
  onEdit?: (habit: Habit) => void;
  onUpdate?: (habitId: string, data: Partial<Habit>) => void;
  onShowActions?: (habit: Habit) => void;
  reduceMotion?: boolean;
}

export const HabitItem = React.memo(({ habit, attribute, onComplete, onClick, onEdit, onUpdate, onShowActions, reduceMotion }: HabitItemProps) => {
  const [isQuantityModalOpen, setIsQuantityModalOpen] = React.useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const CustomIcon = habit.iconName && (LucideIcons as any)[habit.iconName] 
      ? (LucideIcons as any)[habit.iconName] 
      : null;
  const Icon = CustomIcon || attribute?.icon;

  // Fallback color if none provided
  const baseColor = habit.customColor || attribute?.color || '#6366f1'; // Indigo default

  // Helper to format progress text
  const getProgressText = () => {
    if (habit.type === 'QUANTITY') {
      return `${habit.currentValue || 0}/${habit.targetValue} ${habit.unit || ''}`;
    }
    if (habit.type === 'CHECKLIST') {
      const total = habit.checklist?.length || 0;
      const completed = habit.checklist?.filter(i => i.completed).length || 0;
      return `${completed}/${total}`;
    }
    return habit.completedToday ? '1/1' : '0/1';
  };

  const handleChecklistToggle = (itemId: string, currentStatus: boolean) => {
    if (!onUpdate || !habit.checklist) return;
    const newChecklist = habit.checklist.map(item => 
        item.id === itemId ? { ...item, completed: !currentStatus } : item
    );
    
    // Auto-completion logic
    const allCompleted = newChecklist.every(item => item.completed);
    
    onUpdate(habit.id, { checklist: newChecklist });

    // Prepare updated habit for atomic completion
    const updatedHabit = { ...habit, checklist: newChecklist };

    // If all items are completed and habit is not, complete it.
    if (allCompleted && !habit.completedToday) {
        onComplete({ stopPropagation: () => {} } as React.MouseEvent, updatedHabit);
    } 
    // If habit is completed but not all items are checked, uncomplete it.
    else if (!allCompleted && habit.completedToday) {
         onComplete({ stopPropagation: () => {} } as React.MouseEvent, updatedHabit);
    }
  };

  // Helper for time display
  const getTimeDisplay = () => {
    if (!habit.reminderTime) return null;
    // Format simple time string if needed, or just return as is
    return habit.reminderTime;
  };

  const timeDisplay = getTimeDisplay();

  const Wrapper: React.ElementType = reduceMotion ? 'div' : motion.div;

  const wrapperStyle: React.CSSProperties = { contentVisibility: 'auto', containIntrinsicSize: '100px' };

  const handleWrapperClick = () => {
    if (habit.type === 'CHECKLIST') {
        setIsExpanded(!isExpanded);
    } else {
        onClick?.(habit);
    }
  };

  const percentage = React.useMemo(() => {
    if (habit.type === 'QUANTITY') {
        const target = habit.targetValue || 1;
        const current = habit.currentValue || 0;
        return Math.min(100, Math.max(0, (current / target) * 100));
    }
    if (habit.type === 'CHECKLIST') {
        const total = habit.checklist?.length || 0;
        if (total === 0) return habit.completedToday ? 100 : 0;
        const completed = habit.checklist?.filter(i => i.completed).length || 0;
        return Math.min(100, Math.max(0, (completed / total) * 100));
    }
    return habit.completedToday ? 100 : 0;
  }, [habit.type, habit.targetValue, habit.currentValue, habit.checklist, habit.completedToday]);

  const allChecklistCompleted = React.useMemo(() => {
    if (habit.type !== 'CHECKLIST' || !habit.checklist) return false;
    return habit.checklist.length > 0 && habit.checklist.every(i => i.completed);
  }, [habit.checklist, habit.type]);

  const wrapperProps = reduceMotion
    ? {
        onClick: handleWrapperClick,
        className: cn(
            "group relative bg-[#0b0b0d]/80 border shadow-sm rounded-[1.5rem] p-3 transition-all duration-300 cursor-pointer overflow-hidden hover:bg-[#15151a]/80 active:scale-95",
            allChecklistCompleted ? "border-emerald-500/30 shadow-emerald-500/10" : "border-white/10"
        ),
        style: wrapperStyle
      }
    : {
        whileTap: { scale: 0.98 },
        onClick: handleWrapperClick,
        className: cn(
            "group relative bg-[#0b0b0d]/80 border shadow-sm rounded-[1.5rem] p-3 transition-all duration-300 cursor-pointer overflow-hidden hover:bg-[#15151a]/80",
            allChecklistCompleted ? "border-emerald-500/30 shadow-emerald-500/10" : "border-white/10"
        ),
        style: wrapperStyle
      };

  return (
    <>
    <Wrapper
      {...wrapperProps}
    >
        {/* Subtle gradient background based on color - reduced opacity for premium feel */}
        <div 
            className="absolute inset-0 opacity-[0.05] group-hover:opacity-10 transition-opacity duration-500" 
            style={{ backgroundColor: baseColor }}
        />

      <div className="relative flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 border border-white/5"
          style={{ backgroundColor: `${baseColor}20` }}
        >
          {attribute && Icon && (
            <Icon size={18} style={{ color: baseColor }} strokeWidth={2} />
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h4 className="text-white font-bold text-[15px] leading-tight tracking-tight truncate flex items-center gap-2">
            {habit.title}
            {habit.streak > 0 && (
                <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border transition-colors",
                    habit.completedToday 
                        ? "text-orange-400 bg-orange-500/10 border-orange-500/20" 
                        : "text-zinc-400 bg-zinc-800/50 border-white/5"
                )}>
                    <Flame size={10} className={cn(
                        "transition-colors",
                        habit.completedToday ? "fill-orange-400" : "fill-zinc-500 text-zinc-500"
                    )} /> 
                    {habit.streak}
                </span>
            )}
          </h4>

          <div className="flex items-center gap-2">
            <span 
                onClick={(e) => {
                    if (habit.type === 'QUANTITY' && onUpdate) {
                        e.stopPropagation();
                        setIsQuantityModalOpen(true);
                    } else if (habit.type === 'CHECKLIST' && onUpdate) {
                        e.stopPropagation();
                        setIsChecklistModalOpen(true);
                    }
                }}
                className={cn(
                    "text-[13px] font-semibold tracking-wide opacity-90",
                    (habit.type === 'QUANTITY' || habit.type === 'CHECKLIST') && onUpdate ? "cursor-pointer hover:underline decoration-white/30 underline-offset-2 hover:text-white transition-colors" : ""
                )}
                style={{ color: baseColor }}
            >
                {getProgressText()}
            </span>

            {timeDisplay && (
                <span className="text-[11px] text-white/30 font-medium tracking-wider pl-1 border-l border-white/10 flex items-center gap-1">
                    {timeDisplay}
                </span>
            )}
            
            {habit.type === 'CHECKLIST' && (
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="text-white/40 ml-auto"
                >
                    <ChevronDown size={14} />
                </motion.div>
            )}
          </div>

          <AnimatePresence>
          {habit.type === 'CHECKLIST' && habit.checklist && onUpdate && isExpanded && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden w-full" 
                onClick={e => e.stopPropagation()}
            >
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                {habit.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-3 group/item cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => handleChecklistToggle(item.id, item.completed)}>
                        <div
                                className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                    item.completed 
                                        ? (allChecklistCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-indigo-500 border-indigo-500 text-white")
                                        : "bg-white/5 border-white/20 group-hover/item:border-white/40"
                                )}
                            >
                            {item.completed && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className={cn(
                            "text-sm transition-colors truncate flex-1 font-medium",
                            item.completed ? "text-white/30 line-through" : "text-white/80"
                        )}>
                            {item.text}
                        </span>
                    </div>
                ))}
                </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 h-10">
            <LiquidProgressCircle
                percentage={percentage}
                color={baseColor}
                isCompleted={habit.completedToday}
                size={36}
                onClick={(e) => {
                    e.stopPropagation();
                    if (habit.type === 'QUANTITY' && onUpdate) {
                        setIsQuantityModalOpen(true);
                    } else if (habit.type === 'CHECKLIST' && onUpdate) {
                        setIsChecklistModalOpen(true);
                    } else {
                        onComplete(e, habit);
                    }
                }}
            />

            <button 
                className="text-slate-500 hover:text-white transition-colors p-1"
                onClick={(e) => {
                    e.stopPropagation();
                    if (onShowActions) {
                        onShowActions(habit);
                    } else {
                        onEdit?.(habit);
                    }
                }}
            >
                <MoreVertical size={20} />
            </button>
        </div>
      </div>
    </Wrapper>

    {habit.type === 'QUANTITY' && onUpdate && (
        <QuantityUpdateModal 
            habit={habit}
            isOpen={isQuantityModalOpen}
            onClose={() => setIsQuantityModalOpen(false)}
            onUpdate={onUpdate}
        />
    )}

    {habit.type === 'CHECKLIST' && onUpdate && (
        <ChecklistModal
            habit={habit}
            isOpen={isChecklistModalOpen}
            onClose={() => setIsChecklistModalOpen(false)}
            onUpdate={onUpdate}
            onComplete={onComplete}
        />
    )}
    </>
  );
});
