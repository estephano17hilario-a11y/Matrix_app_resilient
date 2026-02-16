import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Check, Flame, MoreVertical } from 'lucide-react';
import { Habit, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { QuantityUpdateModal } from './QuantityUpdateModal';

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
    onUpdate(habit.id, { checklist: newChecklist });
  };

  // Helper for time display
  const getTimeDisplay = () => {
    if (!habit.reminderTime) return null;
    // Format simple time string if needed, or just return as is
    return habit.reminderTime;
  };

  const timeDisplay = getTimeDisplay();

  const Wrapper: React.ElementType = reduceMotion ? 'div' : motion.div;

  const wrapperStyle: React.CSSProperties = { contentVisibility: 'auto', containIntrinsicSize: '120px' };

  const wrapperProps = reduceMotion
    ? {
        onClick: () => onClick?.(habit),
        className: "group relative bg-[#0b0b0d]/80 border border-white/10 shadow-sm rounded-[1.5rem] p-3 transition-all duration-300 cursor-pointer overflow-hidden hover:bg-[#15151a]/80 active:scale-95",
        style: wrapperStyle
      }
    : {
        whileTap: { scale: 0.98 },
        onClick: () => onClick?.(habit),
        className: "group relative bg-[#0b0b0d]/80 border border-white/10 shadow-sm rounded-[1.5rem] p-3 transition-all duration-300 cursor-pointer overflow-hidden hover:bg-[#15151a]/80",
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

      <div className="relative flex items-center gap-3">
        {/* Left: Icon Box */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0 border border-white/5"
          style={{ backgroundColor: `${baseColor}20` }}
        >
          {attribute && Icon && (
            <Icon size={20} style={{ color: baseColor }} strokeWidth={2} />
          )}
        </div>
        
        {/* Middle: Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          {/* Title */}
          <h4 className="text-white font-bold text-[16px] leading-tight tracking-tight truncate flex items-center gap-2">
            {habit.title}
            {habit.streak > 0 && (
                <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-500/20">
                    <Flame size={10} className="fill-orange-400" /> {habit.streak}
                </span>
            )}
          </h4>

          {/* Stats Row */}
          <div className="flex items-center gap-2">
            {/* Progress Text */}
            <span 
                onClick={(e) => {
                    if (habit.type === 'QUANTITY' && onUpdate) {
                        e.stopPropagation();
                        setIsQuantityModalOpen(true);
                    }
                }}
                className={cn(
                    "text-[13px] font-semibold tracking-wide opacity-90",
                    habit.type === 'QUANTITY' && onUpdate ? "cursor-pointer hover:underline decoration-white/30 underline-offset-2 hover:text-white transition-colors" : ""
                )}
                style={{ color: baseColor }}
            >
                {getProgressText()}
            </span>

             {/* Time Display - Tiny */}
             {timeDisplay && (
                <span className="text-[11px] text-white/30 font-medium tracking-wider pl-1 border-l border-white/10 flex items-center gap-1">
                    {timeDisplay}
                </span>
            )}
          </div>

          {/* CHECKLIST CONTROLS */}
          {habit.type === 'CHECKLIST' && habit.checklist && onUpdate && (
            <div className="mt-2 space-y-1.5 w-full" onClick={e => e.stopPropagation()}>
                {habit.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group/item cursor-pointer" onClick={() => handleChecklistToggle(item.id, item.completed)}>
                        <div
                            className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                item.completed 
                                    ? "bg-indigo-500 border-indigo-500 text-white" 
                                    : "bg-white/5 border-white/20 group-hover/item:border-white/40"
                            )}
                        >
                            {item.completed && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className={cn(
                            "text-xs transition-colors truncate",
                            item.completed ? "text-white/30 line-through" : "text-white/80"
                        )}>
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
             {/* Circle Checkbox */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (habit.type === 'QUANTITY' && onUpdate) {
                        setIsQuantityModalOpen(true);
                    } else {
                        onComplete(e, habit);
                    }
                }}
                className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    habit.completedToday 
                    ? "bg-transparent border-transparent" // Filled state handled below
                    : "border-slate-600 hover:border-slate-500 bg-transparent"
                )}
                style={habit.completedToday ? {
                    backgroundColor: baseColor,
                    borderColor: baseColor,
                    boxShadow: `0 0 15px ${baseColor}60`
                } : undefined}
            >
                {habit.completedToday && (
                    <Check size={20} className="text-white" strokeWidth={3} />
                )}
            </button>

            {/* Menu Button */}
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
    </>
  );
});
