import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StrategicNode, TimeFrame } from '../../../../types/SmartGoal';
import { getContextDates, formatDate } from '../../../../utils/dateUtils';
import { differenceInDays, differenceInMonths } from 'date-fns';

interface RecursiveFillingStepProps {
  currentNode: StrategicNode;
  timeframeHierarchy: TimeFrame[];
  onSubmit: (answers: (string | { title: string, startDate?: Date, endDate?: Date })[]) => void;
  activeColor: string;
}

export const RecursiveFillingStep: React.FC<RecursiveFillingStepProps> = ({ currentNode, timeframeHierarchy, onSubmit, activeColor }) => {
  const { t } = useTranslation();
  
  // Logic to determine required inputs
  const getRequiredInputs = () => {
      if (!currentNode) return 0;
      const currentLevelIndex = timeframeHierarchy.indexOf(currentNode.level);
      const nextLevel = timeframeHierarchy[currentLevelIndex + 1];
      if (!nextLevel) return 0;
      const start = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
      const end = currentNode.dueDate ? currentNode.dueDate.toDate() : new Date();
      const days = differenceInDays(end, start); 
      const fuzzyCeil = (val: number) => Math.ceil(val - 0.1);
      
      switch (nextLevel) {
          case '5_YEARS': return fuzzyCeil(days / 1826) || 1;
          case 'YEAR': return fuzzyCeil(days / 365) || 1;
          case 'SEMESTER': return fuzzyCeil(days / 182) || 2; 
          case 'QUARTER': 
              if (currentNode.level === 'SEMESTER') return 2;
              return fuzzyCeil(days / 91) || 2;
          case 'MONTH': return fuzzyCeil(days / 30) || 1;
          case 'WEEK': return fuzzyCeil(days / 7) || 1;
          case 'DAY': return days || 1;
          default: return 0;
      }
  };

  const requiredCount = getRequiredInputs();
  const [multiInputs, setMultiInputs] = useState<string[]>([]);
  const [dateOverrides, setDateOverrides] = useState<Record<number, { start?: string, end?: string }>>({});

  useEffect(() => {
      if (requiredCount > 0) {
          setMultiInputs(Array(requiredCount).fill(''));
          setDateOverrides({});
      }
  }, [currentNode, requiredCount]);

  const updateMultiInput = (index: number, value: string) => {
      const newInputs = [...multiInputs];
      newInputs[index] = value;
      setMultiInputs(newInputs);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (multiInputs.every(val => val.trim())) {
          const answers = multiInputs.map((title, idx) => {
              const override = dateOverrides[idx];
              if (override?.start && override?.end) {
                  return {
                      title,
                      startDate: new Date(override.start),
                      endDate: new Date(override.end)
                  };
              }
              return title;
          });
          onSubmit(answers);
      }
  };

  const getStepInfo = (index: number) => {
      const startDate = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
      const endDate = currentNode.dueDate ? currentNode.dueDate.toDate() : new Date(startDate.getTime() + 31536000000);
      const { label, start, end } = getContextDates(startDate, endDate, currentNode.level, index, requiredCount);
      
      const nextLevel = timeframeHierarchy[timeframeHierarchy.indexOf(currentNode.level) + 1];
      let durationStr = '';
      
      if (['YEAR', '5_YEARS', '10_YEARS'].includes(nextLevel)) {
          const months = differenceInMonths(end, start);
          durationStr = `${months} Meses`;
      } else {
          const days = differenceInDays(end, start);
          durationStr = `${days} Días`;
      }

      return { label, start, end, durationStr };
  };
  
  const getStepTitle = () => {
      switch (currentNode.level) {
          case 'YEAR': return t('smartTask.wizard.stepTitle.year');
          case 'SEMESTER': return t('smartTask.wizard.stepTitle.semester');
          case 'QUARTER': return t('smartTask.wizard.stepTitle.quarter');
          case 'MONTH': return t('smartTask.wizard.stepTitle.month');
          case 'WEEK': return t('smartTask.wizard.stepTitle.week');
          default: return '';
      }
  };

  const getStepDescription = () => {
       if (currentNode.level === 'YEAR') return t('smartTask.wizard.stepDescription.year', { title: currentNode.title });
       if (currentNode.level === 'SEMESTER') return t('smartTask.wizard.stepDescription.semester', { title: currentNode.title });
       return t('smartTask.wizard.stepDescription.generic', { title: currentNode.title, count: requiredCount });
  };

  // Determine density mode based on item count
  const isHighDensity = requiredCount > 4;

  return (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full h-full flex flex-col"
    >
        <div className="space-y-2 mb-4 flex-shrink-0 text-center relative z-20">
             <h2 className="text-2xl font-light text-white">
                <span className="font-bold">{getStepTitle()}</span>
            </h2>
            <p className="text-white/40 text-sm">{getStepDescription()}</p>
        </div>

        {/* Scroll Container - Removed mask to fix "black box" issue and improved scrolling */}
        <div 
            className={`flex-1 overflow-y-auto min-h-0 px-2 pb-24 flex flex-col justify-start pt-4 relative z-10 ${isHighDensity ? 'space-y-3' : 'space-y-6'}`}
        >
             {multiInputs.map((_, i) => i).reverse().map((idx) => {
                 const val = multiInputs[idx];
                 const info = getStepInfo(idx);
                 
                 return (
                 <div key={idx} className="relative group w-full max-w-xl mx-auto">
                     {/* Info Header */}
                     <div className={`flex justify-between items-end px-1 ${isHighDensity ? 'mb-1' : 'mb-2'}`}>
                        <div className="flex items-center gap-2">
                             <span className={`font-bold text-white/90 ${isHighDensity ? 'text-xs' : 'text-sm'}`}>{info.label}</span>
                             <div className="h-px w-8 bg-white/10" />
                        </div>
                        <span className={`font-mono text-white/50 bg-white/5 px-2 rounded-md border border-white/5 ${isHighDensity ? 'text-[9px] py-0.5' : 'text-[10px] py-1'}`}>
                            {formatDate(info.start)} - {formatDate(info.end)} 
                            <span className="text-white/20 mx-2">|</span> 
                            <span className="text-white/70">{info.durationStr}</span>
                        </span>
                     </div>

                     <div 
                        className="absolute -inset-0.5 rounded-xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur"
                        style={{ background: `linear-gradient(to right, ${activeColor}, transparent)` }} 
                     />
                     <div className={`relative flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors ${isHighDensity ? 'min-h-[42px]' : ''}`}>
                        <div className={`text-white/30 font-mono text-xs ${isHighDensity ? 'px-3' : 'px-4'}`}>{idx + 1}</div>
                        <input
                            type="text"
                            value={val}
                            onChange={(e) => updateMultiInput(idx, e.target.value)}
                            placeholder="Define el objetivo..."
                            className={`flex-1 bg-transparent text-white placeholder:text-white/20 focus:outline-none text-sm font-medium ${isHighDensity ? 'py-2.5 px-1' : 'py-4 px-2'}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && idx === 0) {
                                    handleSubmit(e);
                                }
                            }}
                        />
                     </div>
                 </div>
             )})}
        </div>

        <div className="flex justify-center pt-4 pb-4 flex-shrink-0">
            <button
                type="button"
                disabled={!multiInputs.every(v => v.trim())}
                onPointerDown={handleSubmit}
                className="px-8 py-3 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all flex items-center gap-2"
            >
                {t('common.next')} <ChevronRight size={16} />
            </button>
        </div>
    </motion.div>
  );
};
