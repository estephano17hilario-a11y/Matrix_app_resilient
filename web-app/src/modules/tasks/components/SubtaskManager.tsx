import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Trash2, Check } from 'lucide-react';
import { Subtask } from '../../../types';
import { useSubtasks } from '../hooks/useSubtasks';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface SubtaskManagerProps {
  taskId: string;
  initialSubtasks?: Subtask[];
}

export const SubtaskManager: React.FC<SubtaskManagerProps> = ({ taskId, initialSubtasks = [] }) => {
  const { t } = useTranslation();
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask, reorderSubtasks } = useSubtasks(taskId, initialSubtasks);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate Progress
  const total = subtasks.length;
  const completed = subtasks.filter(t => t.isCompleted).length;
  const progress = total === 0 ? 0 : (completed / total) * 100;
  const isComplete = total > 0 && progress === 100;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      addSubtask(inputValue.trim());
      setInputValue('');
      // Keep focus
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleToggle = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(10); // Light haptic
    toggleSubtask(id);
  };

  return (
    <div className="w-full mt-4 flex flex-col gap-4">
      {/* A. La Barra de Progreso (Liquid Bar) */}
      <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={cn(
            "absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all duration-500 ease-out rounded-full",
            isComplete && "shadow-[0_0_10px_#06b6d4]"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* C. La Lista de Items (Physics-Based List) */}
      <div className="flex flex-col gap-2">
        <Reorder.Group axis="y" values={subtasks} onReorder={reorderSubtasks} className="flex flex-col gap-2">
          <AnimatePresence mode='popLayout'>
            {subtasks.map((task) => (
              <Reorder.Item 
                key={task.id} 
                value={task}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing"
              >
                {/* Custom Checkbox */}
                <button
                  onClick={() => handleToggle(task.id)}
                  className={cn(
                    "relative w-5 h-5 rounded-full border transition-all duration-300 flex items-center justify-center shrink-0",
                    task.isCompleted 
                      ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-100" 
                      : "border-white/30 bg-transparent hover:border-cyan-400/50"
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

                {/* Text */}
                <span 
                  className={cn(
                    "flex-1 text-sm font-medium transition-all duration-300",
                    task.isCompleted ? "text-white/50 line-through" : "text-white/90"
                  )}
                >
                  {task.title}
                </span>

                {/* Delete Action (Hover only) */}
                <button
                  onClick={() => deleteSubtask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/10 text-red-400/80 hover:text-red-400"
                  aria-label="Delete subtask"
                >
                  <Trash2 size={14} />
                </button>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* B. El Input de Creación (Input Táctico) */}
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('components.subtaskManager.addStepPlaceholder')}
          className="w-full bg-transparent border-b border-white/10 py-2 pl-0 pr-8 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
        />
        <button 
          onClick={() => {
            if (inputValue.trim()) {
              addSubtask(inputValue.trim());
              setInputValue('');
              inputRef.current?.focus();
            }
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-white/30 hover:text-cyan-400 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};
