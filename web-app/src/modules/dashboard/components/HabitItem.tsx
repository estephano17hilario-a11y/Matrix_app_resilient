import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Check, Flame, MoreVertical, ChevronDown } from 'lucide-react';
import { Habit, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { QuantityUpdateModal } from './QuantityUpdateModal';
import { ChecklistModal } from './ChecklistModal';
import { LiquidProgressCircle } from './LiquidProgressCircle';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { useTranslation } from 'react-i18next';

interface HabitItemProps {
  habit: Habit;
  attribute?: Attribute;
  onComplete: (e: React.MouseEvent, h: Habit) => void;
  onClick?: (habit: Habit) => void;
  onEdit?: (habit: Habit) => void;
  onUpdate?: (habitId: string, data: Partial<Habit>) => void;
  onShowActions?: (habit: Habit) => void;
  reduceMotion?: boolean;
  isDue?: boolean;
  completedOverride?: boolean;
}

export const HabitItem = React.memo(({ habit, attribute, onComplete, onEdit, onUpdate, onShowActions, reduceMotion, isDue = true, completedOverride }: HabitItemProps) => {
  const { t } = useTranslation();
  const [isQuantityModalOpen, setIsQuantityModalOpen] = React.useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const CustomIcon = React.useMemo(() => {
    if (!habit.iconName) return null;
    return (LucideIcons as any)[habit.iconName] || null;
  }, [habit.iconName]);
  const Icon = CustomIcon || attribute?.icon;

  // Fallback color if none provided
  const baseColor = habit.customColor || attribute?.color || '#6366f1'; // Indigo default

  // Helper to format progress text
  const isCompletedToday = completedOverride ?? habit.completedToday;

  const progressText = React.useMemo(() => {
    if (habit.frequency === 'MONTHLY' && habit.monthlyType === 'FLEXIBLE_COUNT' && habit.monthlyFlexibleCount) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const completions = habit.history?.filter(d => d.startsWith(currentMonth)).length || 0;
        return `${completions}/${habit.monthlyFlexibleCount} este mes`;
    }

    if (habit.type === 'QUANTITY') {
      return `${habit.currentValue || 0}/${habit.targetValue} ${habit.unit || ''}`;
    }
    if (habit.type === 'CHECKLIST') {
      const total = habit.checklist?.length || 0;
      const completed = habit.checklist?.filter(i => i.completed).length || 0;
      return `${completed}/${total}`;
    }
    return isCompletedToday ? '1/1' : '0/1';
  }, [
    habit.frequency,
    habit.monthlyType,
    habit.monthlyFlexibleCount,
    habit.history,
    habit.type,
    habit.currentValue,
    habit.targetValue,
    habit.unit,
    habit.checklist,
    isCompletedToday
  ]);

  const handleChecklistToggle = (itemId: string, currentStatus: boolean) => {
    if (!onUpdate || !habit.checklist || !isDue) return;
    const newChecklist = habit.checklist.map(item => 
        item.id === itemId ? { ...item, completed: !currentStatus } : item
    );
    
    // Auto-completion logic
    const allCompleted = newChecklist.every(item => item.completed);
    
    onUpdate(habit.id, { checklist: newChecklist });

    // Prepare updated habit for atomic completion
    const updatedHabit = { ...habit, checklist: newChecklist };

    // If all items are completed and habit is not, complete it.
    if (allCompleted && !isCompletedToday) {
        onComplete({ stopPropagation: () => {} } as React.MouseEvent, updatedHabit);
    } 
    // If habit is completed but not all items are checked, uncomplete it.
    else if (!allCompleted && isCompletedToday) {
         onComplete({ stopPropagation: () => {} } as React.MouseEvent, updatedHabit);
    }
  };

  // Helper for time display
  const getTimeDisplay = () => {
    if (!habit.reminderTime) return null;
    // Format simple time string if needed, or just return as is
    return habit.reminderTime;
  };

  const timeDisplay = React.useMemo(() => getTimeDisplay(), [habit.reminderTime]);

  const Wrapper: React.ElementType = reduceMotion ? 'div' : motion.div;

  // Removed containIntrinsicSize to fix dynamic height issues
  const wrapperStyle: React.CSSProperties = { contentVisibility: 'auto' };

  const handleWrapperClick = () => {
    // Expand for ALL habits to show details (description, frequency, rewards, etc.)
    setIsExpanded(!isExpanded);
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
    return isCompletedToday ? 100 : 0;
  }, [habit.type, habit.targetValue, habit.currentValue, habit.checklist, isCompletedToday]);

  const allChecklistCompleted = React.useMemo(() => {
    if (habit.type !== 'CHECKLIST' || !habit.checklist) return false;
    return habit.checklist.length > 0 && habit.checklist.every(i => i.completed);
  }, [habit.checklist, habit.type]);

  const wrapperProps = reduceMotion
    ? {
        onClick: handleWrapperClick,
        className: cn(
            "group relative bg-[#0b0b0d] border shadow-sm rounded-[1.5rem] p-3 transition-colors duration-300 cursor-pointer overflow-hidden hover:bg-[#15151a] active:scale-95", // REMOVED opacity-80 and blurs for performance
            allChecklistCompleted ? "border-emerald-500/30 shadow-emerald-500/10" : "border-white/10",
            !isDue && "opacity-60 grayscale" // Slightly more visible when inactive
        ),
        style: wrapperStyle
      }
    : {
        whileTap: { scale: 0.98 }, // Removed isDue check to allow expand animation
        onClick: handleWrapperClick,
        className: cn(
            "group relative bg-[#0b0b0d] border shadow-sm rounded-[1.5rem] p-3 transition-colors duration-300 cursor-pointer overflow-hidden hover:bg-[#15151a]", // REMOVED opacity-80 and blurs
            allChecklistCompleted ? "border-emerald-500/30 shadow-emerald-500/10" : "border-white/10",
            !isDue && "opacity-60 grayscale"
        ),
        style: wrapperStyle
      };

  // Pre-calculate Rewards Display (Dynamic based on habit properties)
  const rewards = React.useMemo(() => {
      // Calculate based on estimated time and impact
      const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, habit.streak);
      return { xp: prediction.xp, gold: prediction.coins, traitXp: prediction.traitXp };
  }, [habit.estimatedTime, habit.impact, habit.streak]);

  return (
    <>
    <Wrapper
      {...wrapperProps}
    >
        {/* Subtle gradient background based on color - reduced opacity for premium feel */}
        <div 
            className="absolute inset-0 opacity-[0.05] group-hover:opacity-10 transition-opacity duration-200" 
            style={{ backgroundColor: baseColor }}
        />

      <div className="relative flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-white/5"
          style={{ backgroundColor: `${baseColor}20` }}
        >
          {attribute && Icon && (
            <Icon size={21} style={{ color: baseColor }} strokeWidth={2} />
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h4 className="text-white font-bold text-[15px] leading-tight tracking-tight truncate flex items-center gap-2">
            {habit.title}
            {habit.streak > 0 && (
                <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border transition-colors",
                    isCompletedToday 
                        ? "text-orange-400 bg-orange-500/10 border-orange-500/20" 
                        : "text-zinc-400 bg-zinc-800/50 border-white/5"
                )}>
                    <Flame size={10} className={cn(
                        "transition-colors",
                        isCompletedToday ? "fill-orange-400" : "fill-zinc-500 text-zinc-500"
                    )} /> 
                    {habit.streak}
                </span>
            )}
          </h4>

          <div className="flex items-center gap-2">
            <span 
                onClick={(e) => {
                    // Prevent detail toggle when clicking progress
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
                {progressText}
            </span>

            {timeDisplay && (
                <span className="text-[11px] text-white/30 font-medium tracking-wider pl-1 border-l border-white/10 flex items-center gap-1">
                    {timeDisplay}
                </span>
            )}
            
            <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-white/40 ml-auto"
            >
                <ChevronDown size={14} />
            </motion.div>
          </div>

          <AnimatePresence>
          {isExpanded && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                    
                    {/* 1. Description */}
                    {habit.description && (
                        <p className="text-white/60 text-xs italic leading-relaxed">
                            "{habit.description}"
                        </p>
                    )}

                    {/* 2. Metadata Grid (Trait, Freq, Rewards) */}
                    <div className="grid grid-cols-2 gap-2">
                         {/* Trait */}
                         <div className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                             {attribute?.icon && <attribute.icon size={14} style={{ color: attribute.color }} />}
                             <div className="flex flex-col">
                                 <span className="text-[9px] text-white/40 uppercase tracking-wider">Trait</span>
                                 <span className="text-[11px] text-white font-medium">{attribute ? t(attribute.label, attribute.label.replace('traits.', '')) : 'Neutral'}</span>
                             </div>
                         </div>
                         
                         {/* Rewards */}
                         <div className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                             <div className="flex gap-1 flex-wrap">
                                 <span className="text-fuchsia-400 font-bold text-xs flex items-center gap-0.5"><LucideIcons.Zap size={10} /> +{rewards.xp}</span>
                                 <span className="text-amber-400 font-bold text-xs flex items-center gap-0.5"><LucideIcons.Coins size={10} /> +{rewards.gold}</span>
                                 {attribute && (
                                     <span className="text-cyan-400 font-bold text-xs flex items-center gap-0.5" style={{ color: attribute.color }}>
                                         <LucideIcons.BrainCircuit size={10} /> +{rewards.traitXp}
                                     </span>
                                 )}
                             </div>
                         </div>
                    </div>

                    {/* 3. Frequency */}
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                         <LucideIcons.CalendarClock size={12} />
                         <span>
                             {habit.frequency === 'DAILY' ? 'Every Day' : 
                              habit.frequency === 'WEEKLY' ? `${habit.frequencyDays?.length || 0} days / week` : 
                              habit.frequency}
                         </span>
                    </div>

                    {/* 4. Subtasks (If Checklist) */}
                    {habit.type === 'CHECKLIST' && habit.checklist && (
                        <div className="pt-2 border-t border-white/5 space-y-1">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Subtasks</span>
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
                    )}
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
                    if (!isDue) return;
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
                className="text-slate-500 hover:text-white transition-colors p-1 pointer-events-auto"
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
