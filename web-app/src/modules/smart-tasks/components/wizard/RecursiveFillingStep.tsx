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
          durationStr = `${days} ${t('common.days', 'Days')}`;
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full flex flex-col items-center h-full max-h-screen"
    >
        <div className="space-y-2 mb-6 flex-shrink-0 text-center relative z-20">
             <h2 className="text-2xl font-medium text-white tracking-tight">
                <span className="font-bold text-white drop-shadow-md">{getStepTitle()}</span>
            </h2>
            <p className="text-white/50 text-sm font-medium">{getStepDescription()}</p>
        </div>

        {/* Scroll Container */}
        <div 
            className={`w-full max-w-xl flex-1 overflow-y-auto min-h-0 px-2 pb-6 flex flex-col justify-start pt-2 relative z-10 custom-scrollbar ${isHighDensity ? 'space-y-3' : 'space-y-5'}`}
        >
             {multiInputs.map((_, i) => i).reverse().map((idx) => {
                 const val = multiInputs[idx];
                 const info = getStepInfo(idx);
                 
                 return (
                 <div key={idx} className="relative group w-full mx-auto">
                     {/* Info Header */}
                     <div className={`flex justify-between items-end px-2 ${isHighDensity ? 'mb-1.5' : 'mb-2'}`}>
                        <div className="flex items-center gap-2">
                             <span className={`font-bold text-white/80 tracking-wide ${isHighDensity ? 'text-[11px]' : 'text-xs'}`}>{info.label}</span>
                             <div className="h-px w-6 bg-white/10" />
                        </div>
                        <span className={`font-mono text-white/50 bg-black px-2.5 rounded-md border border-white/5 shadow-md ${isHighDensity ? 'text-[9px] py-0.5' : 'text-[10px] py-1'}`}>
                            {formatDate(info.start)} - {formatDate(info.end)} 
                            <span className="text-white/20 mx-1.5">|</span> 
                            <span className="text-white/80 font-semibold">{info.durationStr}</span>
                        </span>
                     </div>

                     <div className={`relative flex items-center bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 ${isHighDensity ? 'min-h-[44px]' : 'min-h-[52px]'}`}
                          style={{
                              '--active-color': activeColor,
                              boxShadow: `0 4px 20px -10px rgba(0,0,0,0.5)`
                          } as React.CSSProperties}
                          onFocus={(e) => {
                              e.currentTarget.style.borderColor = activeColor;
                              e.currentTarget.style.boxShadow = `0 0 25px -5px ${activeColor}50, inset 0 0 10px -5px ${activeColor}30`;
                              e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${activeColor} 3%, #0A0A0A 97%)`;
                              e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.boxShadow = `0 4px 20px -10px rgba(0,0,0,0.5)`;
                              e.currentTarget.style.backgroundColor = '#0A0A0A';
                              e.currentTarget.style.transform = 'translateY(0)';
                          }}
                     >
                        <div 
                            className={`font-mono text-[11px] font-bold h-full flex items-center justify-center border-r border-white/5 transition-colors duration-300 ${isHighDensity ? 'px-3' : 'px-4'}`}
                            style={{ 
                                color: val.trim() ? activeColor : 'rgba(255,255,255,0.3)',
                                backgroundColor: val.trim() ? `${activeColor}10` : 'rgba(255,255,255,0.02)'
                            }}
                        >
                            {idx + 1}
                        </div>
                        <input
                            type="text"
                            value={val}
                            onChange={(e) => updateMultiInput(idx, e.target.value)}
                            placeholder={t('dashboard.defineObjective')}
                            className={`flex-1 bg-transparent text-white placeholder:text-white/20 focus:outline-none text-base font-medium ${isHighDensity ? 'py-2 px-3' : 'py-3 px-4'}`}
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

        <div className="flex justify-center flex-shrink-0 mt-4 mb-2">
            <button
                type="button"
                disabled={!multiInputs.every(v => v.trim())}
                onPointerDown={handleSubmit}
                className="px-8 py-3.5 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-base shadow-md shadow-white/10"
            >
                {t('common.next')} <ChevronRight size={18} />
            </button>
        </div>
    </motion.div>
  );
};
