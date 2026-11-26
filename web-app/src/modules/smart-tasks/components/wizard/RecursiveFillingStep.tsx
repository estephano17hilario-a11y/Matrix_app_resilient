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

  return (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="cu-step"
        style={{ width: '100%' }}
    >
        <div className="cu-step-body">
            <div className="cu-step-head">
                <h2 className="cu-large-title">{getStepTitle()}</h2>
                <p className="cu-lead">{getStepDescription()}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {multiInputs.map((_, i) => i).reverse().map((idx) => {
                    const val = multiInputs[idx];
                    const info = getStepInfo(idx);
                    const filled = !!val.trim();
                    return (
                        <div key={idx}>
                            <div className="cu-caption">
                                <strong>{info.label}</strong>
                                <span>{formatDate(info.start)} – {formatDate(info.end)} · {info.durationStr}</span>
                            </div>
                            <div className="cu-group cu-field">
                                <div className="cu-row" style={{ minHeight: 56, gap: 12 }}>
                                    <span className={`cu-num-badge ${filled ? 'cu-on' : ''}`} style={filled ? { background: activeColor } : undefined}>{idx + 1}</span>
                                    <input
                                        type="text"
                                        className="cu-input"
                                        value={val}
                                        onChange={(e) => updateMultiInput(idx, e.target.value)}
                                        placeholder={t('dashboard.defineObjective')}
                                        aria-label={info.label}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && idx === 0) handleSubmit(e);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="cu-step-foot">
            <button
                type="button"
                className="cu-cta"
                disabled={!multiInputs.every(v => v.trim())}
                onPointerDown={handleSubmit}
            >
                {t('common.next')} <ChevronRight size={20} strokeWidth={2.6} />
            </button>
        </div>
    </motion.div>
  );
};
