import React, { useState, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Trash2, Check } from 'lucide-react';
import { Subtask } from '../../../types';
import { useSubtasks } from '../hooks/useSubtasks';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';
import { hapticService } from '../../../services/hapticService';

interface SubtaskManagerProps {
  taskId: string;
  initialSubtasks?: Subtask[];
  onCompletionChange?: (isComplete: boolean) => void;
  onSubtasksChange?: (subtasks: Subtask[]) => void;
}

export const SubtaskManager: React.FC<SubtaskManagerProps> = ({ taskId, initialSubtasks = [], onCompletionChange, onSubtasksChange }) => {
  const { t } = useTranslation();
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask, reorderSubtasks } = useSubtasks(taskId, initialSubtasks, onSubtasksChange);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isLiteList = subtasks.length > 20;
  const listRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 56;
  const OVERSCAN = 6;
  const [listHeight, setListHeight] = useState(0);
  const [listScrollTop, setListScrollTop] = useState(0);

  // Calculate Progress
  const total = subtasks.length;
  const completed = subtasks.filter(t => t.isCompleted).length;
  const progress = total === 0 ? 0 : (completed / total) * 100;
  const isComplete = total > 0 && progress === 100;

  React.useEffect(() => {
    if (onCompletionChange) {
      onCompletionChange(isComplete);
    }
  }, [isComplete, onCompletionChange]);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      setListScrollTop(el.scrollTop);
    });
  }, []);

  useLayoutEffect(() => {
    if (!isLiteList) return;
    const el = listRef.current;
    if (!el) return;
    const measure = () => setListHeight(el.clientHeight || 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', handleListScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', handleListScroll as any);
    };
  }, [isLiteList, handleListScroll]);

  const virtualCalc = useMemo(() => {
    if (!isLiteList) {
      return { start: 0, end: subtasks.length, offsetY: 0, totalHeight: subtasks.length * ITEM_HEIGHT };
    }
    const startIndex = Math.max(0, Math.floor(listScrollTop / ITEM_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil((listHeight || ITEM_HEIGHT) / ITEM_HEIGHT) + OVERSCAN * 2;
    const endIndex = Math.min(subtasks.length, startIndex + visibleCount);
    const offsetY = startIndex * ITEM_HEIGHT;
    return { start: startIndex, end: endIndex, offsetY, totalHeight: subtasks.length * ITEM_HEIGHT };
  }, [isLiteList, listScrollTop, listHeight, subtasks.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault(); // Prevent form submission if any
      addSubtask(inputValue.trim());
      setInputValue('');
      // Keep focus
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleToggle = (id: string) => {
    // 🔊 Haptic: light vibration for subtask complete
    hapticService.subtaskComplete();
    toggleSubtask(id);
  };

  const renderSubtaskContent = (task: Subtask) => (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
        className={cn(
          "relative w-5 h-5 rounded-full border transition-all duration-200 flex items-center justify-center shrink-0",
          task.isCompleted 
            ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-100" 
            : "border-white/30 bg-transparent hover:border-cyan-400/50 hover:bg-white/5"
        )}
      >
        {task.isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Check size={12} className="text-black stroke-[3]" />
          </motion.div>
        )}
      </button>

      <span 
        className={cn(
          "flex-1 text-sm font-medium transition-all duration-200 select-none cursor-pointer",
          task.isCompleted ? "text-white/30 line-through decoration-white/30" : "text-white/90"
        )}
        onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
      >
        {task.title}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); deleteSubtask(task.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/10 text-white/20 hover:text-red-400"
        aria-label="Delete subtask"
      >
        <Trash2 size={14} />
      </button>
    </>
  );

  return (
    <div className="w-full mt-4 flex flex-col gap-4">
      
      {/* HEADER & PROGRESS */}
      <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1">
             <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-white/40">
                <span>{t('quests.tacticalSteps', 'Tactical Steps')}</span>
                <span>{Math.round(progress)}%</span>
             </div>
            {/* Liquid Bar */}
            <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
               <motion.div 
                 className={cn(
                   "absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full origin-left will-change-transform",
                   isComplete && "from-emerald-400 to-emerald-500 shadow-[0_0_10px_#10b981]"
                 )}
                 initial={{ scaleX: 0 }}
                 animate={{ scaleX: (progress || 0) / 100 }}
                 transition={{ type: "spring", stiffness: 350, damping: 20 }}
                 style={{ width: '100%' }}
               />
            </div>
          </div>
      </div>

      {/* LISTA DE ITEMS (Physics-Based List) */}
      <div className="flex flex-col gap-2 min-h-[20px]">
        {isLiteList ? (
          <div ref={listRef} className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
            <div style={{ position: 'relative', height: virtualCalc.totalHeight }}>
              <div style={{ transform: `translateY(${virtualCalc.offsetY}px)`, willChange: 'transform' }} className="flex flex-col gap-2">
                {subtasks.slice(virtualCalc.start, virtualCalc.end).map((task) => (
                  <div key={task.id} className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors" style={{ height: ITEM_HEIGHT }}>
                    {renderSubtaskContent(task)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Reorder.Group axis="y" values={subtasks} onReorder={reorderSubtasks} className="flex flex-col gap-2">
            <AnimatePresence mode='popLayout'>
              {subtasks.map((task) => (
                <Reorder.Item 
                  key={task.id} 
                  value={task}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors cursor-grab active:cursor-grabbing"
                  style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  {renderSubtaskContent(task)}
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* INPUT TÁCTICO (Mejorado) */}
      <div className="relative group mt-1">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
        <div className="relative flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 focus-within:border-cyan-500/30 focus-within:bg-black/40 transition-all duration-200 w-full">
            <Plus size={16} className="text-white/30 group-focus-within:text-cyan-400 transition-colors shrink-0" />
            <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()} // Stop propagation here too just in case
            placeholder={t('components.subtaskManager.addStepPlaceholder', "Añadir paso táctico...")}
            className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-white/20 focus:outline-none min-w-0"
            />
            <button 
            onClick={(e) => {
                e.stopPropagation();
                if (inputValue.trim()) {
                    addSubtask(inputValue.trim());
                    setInputValue('');
                    inputRef.current?.focus();
                }
            }}
            className={cn(
                "p-1.5 rounded-lg transition-all duration-200 shrink-0",
                inputValue.trim() 
                    ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" 
                    : "bg-white/5 text-white/10 cursor-not-allowed"
            )}
            disabled={!inputValue.trim()}
            >
                <div className="text-[10px] font-bold uppercase px-1">{t('common.addUpper', 'ADD')}</div>
            </button>
        </div>
      </div>
    </div>
  );
};
