import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, ChevronsRight } from 'lucide-react';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { useTranslation } from 'react-i18next';
import { toLocalISOString, getHistoryDateKey, getCompletedCountThisPeriod } from '../../../utils/dateUtils';

interface ChecklistModalProps {
 habit: Habit;
 isOpen: boolean;
 onClose: () => void;
 onUpdate: (habitId: string, data: Partial<Habit>, targetDate?: Date) => void;
 currentDate?: Date;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({ habit, isOpen, onClose, onUpdate, currentDate }) => {
 const { t } = useTranslation();
 
 // Lock body scroll when modal is open
 useEffect(() => {
 if (isOpen) {
 const originalStyle = window.getComputedStyle(document.body).overflow;
 document.body.style.overflow = 'hidden';
 document.body.style.overscrollBehavior = 'none';
 return () => {
 document.body.style.overflow = originalStyle;
 document.body.style.overscrollBehavior = 'auto';
 };
 }
 }, [isOpen]);

  const today = (currentDate || new Date()).getDay();
  const todayKey = getHistoryDateKey(toLocalISOString(currentDate || new Date()));

  const visibleItems = React.useMemo(() => {
    return habit.checklist?.filter(item => {
        if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
            const isDoneToday = item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
            if (isDoneToday) return true;
            
            const doneCount = getCompletedCountThisPeriod(item, item.intervalType, currentDate);
            return doneCount < (item.intervalCount || 1);
        }
        return !item.days || item.days.length === 0 || item.days.includes(today);
    }) || [];
  }, [habit.checklist, today, currentDate, todayKey]);

  const rewards = React.useMemo(() => {
  if (habit.completedToday && typeof habit.rewardedXp === 'number') {
  return { xp: habit.rewardedXp };
  }
  const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, habit.streak, 'HABIT');
  return { xp: prediction.xp };
  }, [habit.estimatedTime, habit.impact, habit.streak, habit.completedToday, habit.rewardedXp]);

  const handleChecklistToggle = (itemId: string, currentStatus: boolean) => {
    if (!onUpdate || !habit.checklist) return;
    
    // Vibrate for physical feedback on mobile if supported
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }

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
    if (!onUpdate || !habit.checklist) return;
    
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }

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

  // Calculate progress percentage
  const completedCount = visibleItems.filter(item => {
      if (item.intervalType === 'WEEKLY' || item.intervalType === 'MONTHLY') {
          return item.history?.includes(todayKey) || item.skippedHistory?.includes(todayKey);
      }
      return item.completed;
  }).length;
  const totalCount = visibleItems.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
 
 // Base color of the habit for the tint
 const habitColor = habit.customColor || '#6366f1'; // fallback to indigo if no color

 return createPortal(
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
 {/* Safe blur for mobile performance: extremely light blur, mostly opacity for contrast */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.15, ease: "easeOut" }}
 onClick={onClose}
 className="absolute inset-0 bg-[#000]/80 "
 style={{ willChange: 'opacity' }}
 />

 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.85, y: 40 }}
 transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
 className="relative w-full max-w-[380px] bg-[#0c0c0e]/95 border border-white/[0.12] rounded-[32px] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] z-10 flex flex-col max-h-[85vh] overflow-hidden"
 style={{ willChange: 'transform, opacity' }}
 onClick={e => e.stopPropagation()}
 >
 {/* Dynamic Background Glow - GPU Friendly */}
 <div 
 className="absolute -top-[20%] -right-[20%] w-[80%] h-[60%] opacity-20 pointer-events-none transition-all duration-200 will-change-transform"
 style={{ 
 background: `radial-gradient(circle, ${habitColor} 0%, transparent 70%)`
 }}
 />

 {/* Elegant Habit Color Tint when 100% Complete */}
 <motion.div 
 className="absolute inset-0 pointer-events-none z-0"
 animate={{ 
 backgroundColor: progressPercent === 100 ? `${habitColor}15` : 'rgba(0,0,0,0)'
 }}
 transition={{ duration: 1, ease: "easeInOut" }}
 />

 {/* Content Container (above the tint) */}
 <div className="relative z-10 flex flex-col h-full">
 {/* Visionary Header */}
 <div className="p-7 pb-5 flex items-start justify-between border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent">
 <div className="flex flex-col gap-2 pr-4">
 <h3 className="text-2xl font-[1000] text-white tracking-tight leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
 {habit.title}
 </h3>
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[9px] font-black uppercase tracking-[0.15em] text-white/50">
 <Zap size={10} className="text-yellow-400" />
 +{rewards.xp} XP
 </div>
 </div>
 </div>
 <button 
 onClick={onClose} 
 className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5"
 >
 <X size={20} strokeWidth={2.5} />
 </button>
 </div>

 {/* Elegant List - Enhanced Interactions */}
 <div className="p-4 space-y-1.5 overflow-y-auto no-scrollbar flex-1">
  {visibleItems.map((item, index) => {
  const itemColor = item.color || habitColor;
  const isCompleted = item.completed || item.history?.includes(todayKey);
  const isSkipped = item.skippedHistory?.includes(todayKey);
  const isDoneOrSkipped = isCompleted || isSkipped;
  
  return (
  <React.Fragment key={item.id}>
  <motion.div 
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.05, duration: 0.15 }}
  className={cn(
  "group flex items-center gap-4 p-4 rounded-[20px] transition-all duration-200 cursor-pointer border border-transparent",
  isDoneOrSkipped 
  ? "bg-white/[0.02] border-white/[0.02]" 
  : "hover:bg-white/[0.05] hover:border-white/[0.05] active:scale-[0.98]"
  )}
  onClick={() => handleChecklistToggle(item.id, isCompleted)}
  >
  <div 
  className={cn(
  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
  isDoneOrSkipped 
  ? "border-transparent shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
  : "opacity-60 group-hover:opacity-100"
  )}
  style={{
  backgroundColor: isDoneOrSkipped ? (isSkipped ? '#d97706' : itemColor) : 'transparent',
  borderColor: isDoneOrSkipped ? 'transparent' : itemColor,
  }}
  >
  <AnimatePresence>
  {isCompleted && (
  <motion.div
  initial={{ scale: 0, rotate: -45 }}
  animate={{ scale: 1, rotate: 0 }}
  exit={{ scale: 0, rotate: 45 }}
  transition={{ type: "spring", stiffness: 500, damping: 25 }}
  >
  <Check size={14} strokeWidth={4} className="text-white" />
  </motion.div>
  )}
  {isSkipped && (
  <motion.div
  initial={{ scale: 0, rotate: -45 }}
  animate={{ scale: 1, rotate: 0 }}
  exit={{ scale: 0, rotate: 45 }}
  transition={{ type: "spring", stiffness: 500, damping: 25 }}
  >
  <ChevronsRight size={14} strokeWidth={4} className="text-white" />
  </motion.div>
  )}
  </AnimatePresence>
  </div>
  
  <span className={cn(
  "text-[16px] transition-all duration-200 flex-1 leading-snug tracking-tight",
  isDoneOrSkipped 
  ? "text-white/20 line-through decoration-white/10 italic" 
  : "text-white/90 font-bold group-hover:translate-x-1"
  )}>
  {item.text}
  {item.intervalType && item.intervalType !== 'NONE' && (
      <span className="text-xs text-cyan-400 font-mono ml-2 font-black">
          ({Math.max(0, item.intervalCount - getCompletedCountThisPeriod(item, item.intervalType, currentDate || new Date()))} / {item.intervalCount})
      </span>
  )}
  {isSkipped && (
      <span className="text-xs text-amber-500 font-black ml-2 uppercase tracking-[0.1em]">(Saltado)</span>
  )}
  </span>

  {item.allowSkip && !isDoneOrSkipped && (
      <button
          onClick={(e) => handleChecklistSkip(item.id, e)}
          className="px-3 py-1.5 rounded-[12px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-black border border-amber-500/20 transition-all flex items-center gap-1"
      >
          Saltar
      </button>
  )}
  </motion.div>
 {index < visibleItems.length - 1 && (
 <div className="h-[1px] w-[90%] mx-auto bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
 )}
 </React.Fragment>
 );
 })}
 
 {visibleItems.length === 0 && (
 <div className="text-center py-16 flex flex-col items-center gap-3 text-white/10">
 <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05]">
 <Check size={32} className="opacity-20" />
 </div>
 <span className="text-[11px] font-black uppercase tracking-[0.2em]">
 {t('dashboard.noTasksForToday', 'Completado')}
 </span>
 </div>
 )}
 </div>

 {/* Visionary Footer Progress */}
 <div className="px-7 py-6 border-t border-white/[0.06] bg-black/20">
 <div className="flex justify-between items-end mb-3">
 <div className="flex flex-col">
 <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{t('checklist.protocolStatus', 'Estatus del Protocolo')}</span>
 <span className="text-sm font-[1000] text-white">
 {progressPercent === 100 ? 'OBJETIVO LOGRADO' : `${Math.round(progressPercent)}% COMPLETADO`}
 </span>
 </div>
 <span className="text-[10px] font-black text-white/40 tabular-nums">
 {completedCount} <span className="text-white/10">/</span> {totalCount}
 </span>
 </div>
 
 {/* Advanced Progress Bar */}
 <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.05]">
 <motion.div 
 className="h-full rounded-full relative"
 
 animate={{ width: `${progressPercent}%` }}
 transition={{ type: "spring", stiffness: 80, damping: 15 }}
 style={{
 backgroundColor: habitColor
 }}
 >
 {/* Pulse Effect */}
 <motion.div 
 animate={{ opacity: [0.2, 0.5, 0.2] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="absolute inset-0 bg-white/30"
 />
 </motion.div>
 </div>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 );
}
