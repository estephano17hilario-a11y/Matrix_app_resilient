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
import { triggerFlyingIcon } from './FlyingIcon';
import { toLocalISOString, getHistoryDateKey, getCompletedCountThisPeriod } from '../../../utils/dateUtils';

interface HabitItemProps {
  habit: Habit;
  attribute?: Attribute;
  onComplete: (e: React.MouseEvent, h: Habit, targetDate?: Date) => void;
  onClick?: (habit: Habit) => void;
  onEdit?: (habit: Habit) => void;
  onUpdate?: (habitId: string, data: Partial<Habit>, targetDate?: Date) => void;
  onShowActions?: (habit: Habit) => void;
  reduceMotion?: boolean;
  isDue?: boolean;
  completedOverride?: boolean;
  viewPreference?: 'DEFAULT' | 'CHRONOLOGICAL';
  weekStartDay?: 0 | 1;
  currentDate?: Date;
}

export const HabitItem = React.memo(({ habit, attribute, onComplete, onClick, onEdit, onUpdate, onShowActions, isDue = true, completedOverride, viewPreference = 'DEFAULT', currentDate }: HabitItemProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = React.useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = React.useState(false);
  
  const today = (currentDate || new Date()).getDay();
  const subTrait = React.useMemo(() => {
    return attribute?.subTraits?.find(st => st.id === habit.subAttribute);
  }, [attribute?.subTraits, habit.subAttribute]);

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
    if (habit.frequency === 'WEEKLY' && habit.weeklyType === 'FLEXIBLE_COUNT' && habit.weeklyFlexibleCount) {
        const now = currentDate || new Date();
        // Calculate start of week and end of week (assuming Monday as start)
        const day = now.getDay() || 7; // Convert Sunday (0) to 7
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - day + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const completions = habit.history?.filter(d => {
            const date = new Date(d);
            return date >= startOfWeek && date <= now;
        }).length || 0;
        return `${completions}/${habit.weeklyFlexibleCount} ${t('common.thisWeek', 'This week')}`;
    }

    if (habit.frequency === 'MONTHLY' && habit.monthlyType === 'FLEXIBLE_COUNT' && habit.monthlyFlexibleCount) {
        const now = currentDate || new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const completions = habit.history?.filter(d => d.startsWith(currentMonth)).length || 0;
        return `${completions}/${habit.monthlyFlexibleCount} ${t('common.thisMonth')}`;
    }

    if (habit.type === 'QUANTITY') {
      return `${habit.currentValue || 0}/${habit.targetValue} ${habit.unit || ''}`;
    }
    if (habit.type === 'CHECKLIST') {
      const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));
      const visibleItems = habit.checklist?.filter(item => {
        if (item.deleted) return false;
        if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
          const isDoneToday = item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
          if (isDoneToday) return true;
          
          const doneCount = getCompletedCountThisPeriod(item, item.intervalType, currentDate);
          return doneCount < (item.intervalCount || 1);
        }
        return !item.days || item.days.length === 0 || item.days.includes(today);
      }) || [];
      const total = visibleItems.length;
      const completed = visibleItems.filter(item => {
        if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
          return item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
        }
        return item.completed;
      }).length;
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
    isCompletedToday,
    currentDate,
    today
  ]);

  const handleChecklistToggle = (itemId: string, currentStatus: boolean) => {
    if (!onUpdate || !habit.checklist || !isDue) return;
    
    // If completing, we remove today's skip if any
    const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));
    const newChecklist = habit.checklist.map(item => {
        if (item.id === itemId) {
            const skippedHistory = (item.skippedHistory || []).filter(d => d !== todayKey);
            return { ...item, completed: !currentStatus, skippedHistory };
        }
        return item;
    });
    
    onUpdate(habit.id, { checklist: newChecklist }, currentDate);
  };

  const handleChecklistSkip = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate || !habit.checklist || !isDue) return;
    const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));
    const newChecklist = habit.checklist.map(item => {
        if (item.id === itemId) {
            const skippedHistory = item.skippedHistory || [];
            const isSkippedToday = skippedHistory.includes(todayKey);
            const newSkippedHistory = isSkippedToday 
                ? skippedHistory.filter(d => d !== todayKey) 
                : [...skippedHistory, todayKey];
            
            let newHistory = item.history || [];
            if (!isSkippedToday) {
                newHistory = newHistory.filter(d => d !== todayKey);
            }
            return { 
                ...item, 
                skippedHistory: newSkippedHistory, 
                completed: !isSkippedToday ? false : item.completed,
                history: newHistory
            };
        }
        return item;
    });
    
    onUpdate(habit.id, { checklist: newChecklist }, currentDate);
  };

  // Helper for time display
  const getTimeDisplay = () => {
    if (habit.type === 'QUANTITY' && habit.isDivided) {
        if (habit.dividedMode === 'FIXED' && habit.dividedTimes && habit.dividedTimes.length > 0) {
            const times = [...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time));
            let accumulated = 0;
            let nextTime = null;
            for (const t of times) {
                accumulated += t.amount;
                if ((habit.currentValue || 0) < accumulated) {
                    nextTime = t.time;
                    break;
                }
            }
            if (nextTime && !habit.completedToday) {
                return `Próx: ${nextTime}`;
            }
        } else if (habit.nextInstanceTime) {
            const nextDate = new Date(habit.nextInstanceTime);
            const targetDate = currentDate || new Date();
            if (nextDate.getDate() === targetDate.getDate() && nextDate.getMonth() === targetDate.getMonth()) {
                const hours = nextDate.getHours().toString().padStart(2, '0');
                const minutes = nextDate.getMinutes().toString().padStart(2, '0');
                return `Próx: ${hours}:${minutes}`;
            }
        }
    }
    if (!habit.reminderTime) return null;
    return habit.reminderTime;
  };

  const timeDisplay = React.useMemo(() => getTimeDisplay(), [habit.reminderTime, habit.nextInstanceTime, habit.isDivided, habit.type, currentDate]);

  // Removed containIntrinsicSize to fix dynamic height issues
  const wrapperStyle: React.CSSProperties = { contentVisibility: 'auto' };

  const handleWrapperClick = () => {
    if (onClick) {
      onClick(habit);
    }
  };

  const percentage = React.useMemo(() => {
    if (habit.type === 'QUANTITY') {
        const target = habit.targetValue || 1;
        const current = habit.currentValue || 0;
        return Math.min(100, Math.max(0, (current / target) * 100));
    }
    if (habit.type === 'CHECKLIST') {
        const visibleItems = habit.checklist?.filter(i => !i.deleted && (!i.days || i.days.length === 0 || i.days.includes(today))) || [];
        const total = visibleItems.length;
        if (total === 0) return habit.completedToday ? 100 : 0;
        const completed = visibleItems.filter(i => i.completed).length;
        return Math.min(100, Math.max(0, (completed / total) * 100));
    }
    return isCompletedToday ? 100 : 0;
  }, [habit.type, habit.targetValue, habit.currentValue, habit.checklist, isCompletedToday]);

  const allChecklistCompleted = React.useMemo(() => {
    if (habit.type !== 'CHECKLIST' || !habit.checklist) return false;
    const activeItems = habit.checklist.filter(i => !i.deleted);
    return activeItems.length > 0 && activeItems.every(i => i.completed);
  }, [habit.checklist, habit.type]);

  const wrapperProps = {
        role: "button",
        tabIndex: 0,
        onClick: handleWrapperClick,
        className: cn(
          "group relative bg-[#050505]/90 border rounded-[24px] pl-5 pr-4 py-3 w-[102%] -translate-x-[1%] transition-all duration-200 cursor-pointer overflow-hidden hover:bg-[#0a0a0a] hover:border-white/10 active:scale-95 clickable",
          allChecklistCompleted ? "border-emerald-500/30" : "border-white/5",
          !isDue && "opacity-60 grayscale",
          isCompletedToday ? "opacity-60 grayscale-[0.3]" : ""
        ),
        style: wrapperStyle
      };

  // Pre-calculate Rewards Display (Dynamic based on habit properties)
  const rewards = React.useMemo(() => {
      // If habit is already completed today, show the reward they actually received.
      if (isCompletedToday && typeof habit.rewardedXp === 'number' && typeof habit.rewardedGold === 'number') {
          // Calculate trait XP based on rewarded XP (it's the same base calculation in the engine)
          const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, habit.streak - 1, 'HABIT');
          return { xp: habit.rewardedXp, gold: habit.rewardedGold, traitXp: prediction.traitXp };
      }

      // Calculate based on estimated time and impact
      const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, habit.streak, 'HABIT');
      return { xp: prediction.xp, gold: prediction.coins, traitXp: prediction.traitXp };
  }, [habit.estimatedTime, habit.impact, habit.streak, habit.rewardedXp, habit.rewardedGold, isCompletedToday]);

  return (
    <>
      <div 
        {...wrapperProps}
      >
        {/* Animated Background Progress for partial checklists */}
        {habit.type === 'CHECKLIST' && percentage > 0 && percentage < 100 && (
          <div 
            className="absolute left-0 bottom-0 top-0 opacity-[0.03] transition-all duration-200 ease-out z-0"
            style={{ width: `${percentage}%`, backgroundColor: baseColor }}
          />
        )}

        {/* Subtle gradient background based on color - reduced opacity for premium feel */}
        <div 
            className="absolute inset-0 opacity-[0.09] group-hover:opacity-[0.14] transition-opacity duration-200" 
            style={{ backgroundColor: baseColor }}
        />

        {/* Radial Gradient Blur Background */}
        <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-[0.50] pointer-events-none group-hover:opacity-[0.60] transition-opacity duration-200" 
            style={{ 
                background: `radial-gradient(circle, ${baseColor} 0%, transparent 70%)`
            }} 
        />

      <div className="relative flex items-start gap-3 z-10">
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
                <span 
                    className="text-[11px] text-white/30 font-medium tracking-wider pl-1 border-l border-white/10 flex items-center gap-1 cursor-pointer hover:text-white/60 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) {
                            onEdit({ ...habit, _initialTab: 'alarm' } as any);
                        }
                    }}
                    title={t('common.changeAlarm', 'Cambiar alarma')}
                >
                    {timeDisplay}
                </span>
            )}
            
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                }}
                className="ml-auto p-1 text-white/30 hover:text-white/60 transition-colors"
            >
                <ChevronDown size={16} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
            </button>
          </div>

          {/* Inline Subtasks for Chronological View */}
          {viewPreference === 'CHRONOLOGICAL' && habit.type === 'CHECKLIST' && habit.checklist && (
              <div className="mt-3 space-y-1" onClick={e => e.stopPropagation()}>
                  {habit.checklist.filter(item => {
                      if (item.deleted) return false;
                      if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
                          const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));
                          const isDoneToday = item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
                          if (isDoneToday) return true;
                          
                          const doneCount = getCompletedCountThisPeriod(item, item.intervalType, currentDate);
                          return doneCount < (item.intervalCount || 1);
                      }
                      return !item.days || item.days.length === 0 || item.days.includes(today);
                  }).map(item => {
                      const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));
                      const isCompleted = !!(item.completed || item.history?.includes(todayKey));
                      const isSkipped = item.skippedHistory?.includes(todayKey);
                      const isDoneOrSkipped = isCompleted || isSkipped;
                      
                      return (
                          <div key={item.id} className="flex items-center gap-3 group/item cursor-pointer py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5" onClick={() => handleChecklistToggle(item.id, isCompleted)}>
                              <div
                                      className={cn(
                                          "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                          isDoneOrSkipped 
                                              ? (allChecklistCompleted ? "border-transparent text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-transparent text-white")
                                              : "bg-black/20 border-white/20 group-hover/item:border-white/40"
                                      )}
                                      style={{
                                          backgroundColor: isDoneOrSkipped ? (isSkipped ? '#d97706' : (item.color || (allChecklistCompleted ? '#10b981' : baseColor))) : undefined,
                                          borderColor: isDoneOrSkipped ? 'transparent' : (item.color || baseColor)
                                      }}
                                  >
                                  {isCompleted && <Check size={10} strokeWidth={3} />}
                                  {isSkipped && <LucideIcons.ChevronsRight size={10} className="text-white" />}
                              </div>
                              <span className={cn(
                                  "text-xs transition-colors truncate flex-1 font-medium",
                                  isDoneOrSkipped ? "text-white/30 line-through" : "text-white/80"
                              )}>
                                  {item.text}
                                  {item.intervalType && item.intervalType !== 'NONE' && (
                                      <span className="text-[9px] text-cyan-400 font-mono ml-1.5 font-bold">
                                          ({Math.max(0, (item.intervalCount ?? 0) - getCompletedCountThisPeriod(item, item.intervalType, currentDate || new Date()))} / {item.intervalCount ?? 0})
                                      </span>
                                  )}
                                  {isSkipped && (
                                      <span className="text-[9px] text-amber-500 font-bold ml-1.5 uppercase tracking-wider">(Saltado)</span>
                                  )}
                              </span>
                              {item.allowSkip && !isDoneOrSkipped && (
                                  <button
                                      onClick={(e) => handleChecklistSkip(item.id, e)}
                                      className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[9px] font-bold border border-amber-500/20 transition-all flex items-center gap-0.5"
                                  >
                                      Saltar
                                  </button>
                              )}
                              {item.reminderTime && (
                                  <span 
                                      className={cn(
                                          "text-[10px] font-bold tracking-wider flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                                          isDoneOrSkipped ? "text-white/20" : "text-orange-400"
                                      )}
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          if (onEdit) {
                                              onEdit({ ...habit, _initialTab: 'checklist', _targetSubtaskId: item.id } as any);
                                          }
                                      }}
                                      title={t('common.changeAlarm', 'Cambiar alarma')}
                                  >
                                      <LucideIcons.AlertCircle size={10} /> {item.reminderTime}
                                  </span>
                              )}
                          </div>
                      );
                  })}
              </div>
          )}

          <AnimatePresence>
          {isExpanded && (
            <motion.div 
                key="expanded-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full" 
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
                                  <span className="text-[9px] text-white/40 uppercase tracking-wider">{t('habits.trait', 'Trait')}</span>
                                  <span className="text-[11px] text-white font-medium">
                                      {attribute 
                                          ? `${t(attribute.label, attribute.label.replace('traits.', ''))}${subTrait ? ` › ${subTrait.name}` : ''}` 
                                          : 'Neutral'}
                                  </span>
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
                    {habit.type === 'CHECKLIST' && habit.checklist && viewPreference !== 'CHRONOLOGICAL' && (
                        <div className="pt-2 border-t border-white/5 space-y-1">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{t('habits.subtasks', 'Subtasks')}</span>
                            {habit.checklist.filter(item => {
                                if (item.deleted) return false;
                                if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
                                    const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));
                                    const isDoneToday = item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
                                    if (isDoneToday) return true;
                                    
                                    const doneCount = getCompletedCountThisPeriod(item, item.intervalType, currentDate);
                                    return doneCount < (item.intervalCount || 1);
                                }
                                return !item.days || item.days.length === 0 || item.days.includes(today);
                            }).map(item => {
                                const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));
                                const isCompleted = !!(item.completed || item.history?.includes(todayKey));
                                const isSkipped = item.skippedHistory?.includes(todayKey);
                                const isDoneOrSkipped = isCompleted || isSkipped;
                                
                                return (
                                    <div key={item.id} className="flex items-center gap-3 group/item cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => handleChecklistToggle(item.id, isCompleted)}>
                                        <div
                                                className={cn(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                                    isDoneOrSkipped 
                                                        ? (allChecklistCompleted ? "border-transparent text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-transparent text-white")
                                                        : "bg-white/5 border-white/20 group-hover/item:border-white/40"
                                                )}
                                                style={{
                                                    backgroundColor: isDoneOrSkipped ? (isSkipped ? '#d97706' : (item.color || (allChecklistCompleted ? '#10b981' : baseColor))) : undefined,
                                                    borderColor: isDoneOrSkipped ? 'transparent' : (item.color || baseColor)
                                                }}
                                            >
                                            {isCompleted && <Check size={12} strokeWidth={3} />}
                                            {isSkipped && <LucideIcons.ChevronsRight size={12} className="text-white" />}
                                        </div>
                                        <span className={cn(
                                            "text-sm transition-colors truncate flex-1 font-medium",
                                            isDoneOrSkipped ? "text-white/30 line-through" : "text-white/80"
                                        )}>
                                            {item.text}
                                            {item.intervalType && item.intervalType !== 'NONE' && (
                                                <span className="text-[10px] text-cyan-400 font-mono ml-2 font-bold">
                                                    ({Math.max(0, (item.intervalCount ?? 0) - getCompletedCountThisPeriod(item, item.intervalType, currentDate || new Date()))} / {item.intervalCount ?? 0})
                                                </span>
                                            )}
                                            {isSkipped && (
                                                <span className="text-[10px] text-amber-500 font-bold ml-2 uppercase tracking-wider">(Saltado)</span>
                                            )}
                                        </span>
                                        {item.allowSkip && !isDoneOrSkipped && (
                                            <button
                                                onClick={(e) => handleChecklistSkip(item.id, e)}
                                                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/20 transition-all flex items-center gap-0.5"
                                            >
                                                Saltar
                                            </button>
                                        )}
                                        {item.reminderTime && (
                                            <span className="text-[10px] text-white/30 font-medium tracking-wider flex items-center gap-1">
                                                <LucideIcons.AlertCircle size={10} /> {item.reminderTime}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 4.5. Fixed Times (If Quantity + Divided + Fixed) */}
                    {habit.type === 'QUANTITY' && habit.isDivided && habit.dividedMode === 'FIXED' && habit.dividedTimes && viewPreference !== 'CHRONOLOGICAL' && (
                        <div className="pt-2 border-t border-white/5 space-y-1">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{t('habits.scheduledSchedules', 'Horarios Programados')}</span>
                            {[...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time)).map((item, index) => {
                                const times = [...habit.dividedTimes!].sort((a, b) => a.time.localeCompare(b.time));
                                let accumulated = 0;
                                for (let i = 0; i <= index; i++) {
                                    accumulated += times[i].amount;
                                }
                                const isItemCompleted = (habit.currentValue || 0) >= accumulated || habit.completedToday;
                                
                                return (
                                    <div 
                                        key={item.id} 
                                        className="flex items-center justify-between group/item p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!onUpdate) return;
                                            
                                            // Si está completado, al hacer click le restamos su cantidad (lo desmarcamos)
                                            // Si no está completado, le sumamos su cantidad (lo marcamos)
                                            // Pero para mantener consistencia, simplemente vamos al valor acumulado o al anterior.
                                            // Es mejor simplemente: si está completado, bajamos a (accumulated - amount). 
                                            // Si no está completado, subimos a (accumulated).
                                            if (isItemCompleted) {
                                                const newValue = Math.max(0, accumulated - item.amount);
                                                onUpdate(habit.id, { currentValue: newValue });
                                            } else {
                                                const newValue = accumulated;
                                                onUpdate(habit.id, { currentValue: newValue });
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                                    isItemCompleted 
                                                        ? "border-transparent text-white"
                                                        : "bg-white/5 border-white/20 group-hover/item:border-white/40"
                                                )}
                                                style={{
                                                    backgroundColor: isItemCompleted ? baseColor : undefined,
                                                    borderColor: isItemCompleted ? 'transparent' : baseColor
                                                }}
                                            >
                                                {isItemCompleted && <Check size={12} strokeWidth={3} />}
                                            </div>
                                            <span className={cn(
                                                "text-sm transition-colors font-medium flex items-center gap-2",
                                                isItemCompleted ? "text-white/30 line-through" : "text-white/80"
                                            )}>
                                                <span>{item.time}</span>
                                                <span className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                    isItemCompleted ? "bg-white/5 text-white/30" : "bg-emerald-400/10 text-emerald-400"
                                                )}>
                                                    +{item.amount} {habit.unit}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 h-11">
            <div className="translate-x-[2px]">
                <LiquidProgressCircle
                    percentage={percentage}
                    color={baseColor}
                    isCompleted={habit.completedToday}
                    size={44}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isDue) return;
                        if (habit.type === 'QUANTITY' && onUpdate) {
                            setIsQuantityModalOpen(true);
                        } else if (habit.type === 'CHECKLIST' && onUpdate) {
                            setIsChecklistModalOpen(true);
                        } else {
                            if (!isCompletedToday) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (rewards.gold > 0) {
                                    triggerFlyingIcon(rect, "gold-counter-pill", <LucideIcons.Coins size={24} className="text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,1)]" />, 0);
                                }
                                if (rewards.xp > 0) {
                                    triggerFlyingIcon(rect, "xp-bar-container", <LucideIcons.Zap size={24} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,1)]" />, 0.15);
                                }
                                if (rewards.traitXp > 0 && attribute && Icon) {
                                    triggerFlyingIcon(rect, "xp-bar-container", <Icon size={24} style={{ color: baseColor }} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />, 0.3);
                                }
                            }
                            onComplete(e, habit, currentDate);
                        }
                    }}
                />
            </div>

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
    </div>

    {habit.type === 'QUANTITY' && onUpdate && (
        <QuantityUpdateModal 
            habit={habit}
            isOpen={isQuantityModalOpen}
            onClose={() => setIsQuantityModalOpen(false)}
            onUpdate={onUpdate}
            currentDate={currentDate}
        />
    )}

    {habit.type === 'CHECKLIST' && onUpdate && (
        <ChecklistModal
            habit={habit}
            isOpen={isChecklistModalOpen}
            onClose={() => setIsChecklistModalOpen(false)}
            onUpdate={onUpdate}
            currentDate={currentDate}
        />
    )}
    </>
  );
});
