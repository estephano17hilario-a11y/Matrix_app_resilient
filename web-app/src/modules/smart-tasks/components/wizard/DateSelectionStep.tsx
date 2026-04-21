import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { generateTimeBlocks, FractalStructure } from '../../../../utils/fractalTimeEngine';
import { cn } from '../../../../utils/cn';

interface DateSelectionStepProps {
  onStartProcess: (startDate: Date, endDate: Date) => void;
  activeColor: string;
}

export const DateSelectionStep: React.FC<DateSelectionStepProps> = ({ onStartProcess, activeColor: _activeColor }) => {
  const { t } = useTranslation();
  
  const [startDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(''); 
  const [inputType, setInputType] = useState<'date' | 'duration'>('date');
  const [duration, setDuration] = useState<{years: number, months: number, days: number}>({ years: 0, months: 0, days: 0 });
  const [activeField, setActiveField] = useState<'years' | 'months' | 'days' | null>(null);
  const [fractalPreview, setFractalPreview] = useState<FractalStructure | null>(null);

  // Debounced Fractal Preview
  useEffect(() => {
    const timer = setTimeout(() => {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end > start) {
          const preview = generateTimeBlocks(start, end);
          setFractalPreview(preview);
        } else {
          setFractalPreview(null);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [startDate, endDate]);

  // Duration Logic
  useEffect(() => {
      if (inputType === 'duration') {
          const start = new Date(startDate);
          const end = new Date(start);
          end.setFullYear(end.getFullYear() + (duration.years || 0));
          end.setMonth(end.getMonth() + (duration.months || 0));
          end.setDate(end.getDate() + (duration.days || 0));
          
          if (end > start) {
              setEndDate(end.toISOString().split('T')[0]);
          } else {
              setEndDate('');
          }
      }
  }, [duration, inputType, startDate]);

  const handleNext = () => {
      if (endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setDate(end.getDate() + 1); // Inclusive logic
          onStartProcess(start, end);
      }
  };

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full flex flex-col items-center"
    >
        <div className="space-y-2 text-center flex-shrink-0 mb-6">
            <h2 className="text-2xl font-medium text-white tracking-tight">
                <Trans i18nKey="smartTask.wizard.date.title" components={{ span: <span className="font-bold text-white drop-shadow-md" /> }} />
            </h2>
             <p className="text-white/50 text-sm font-medium">{t('smartTask.wizard.date.subtitle')}</p>
        </div>

        <div className="w-full max-w-lg mb-6">
            <div className="space-y-4 mx-auto w-full">
                {/* Tabs */}
                <div className="flex p-1 bg-[#1a1a1a] rounded-xl border border-white/5 shadow-md">
                     <button 
                        onClick={() => setInputType('date')}
                        className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", inputType === 'date' ? "bg-[#2a2a2a] text-white shadow-md" : "text-white/40 hover:text-white/80")}
                     >
                        {t('smartTask.wizard.date.mode.calendar')}
                     </button>
                     <button 
                        onClick={() => setInputType('duration')}
                        className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", inputType === 'duration' ? "bg-[#2a2a2a] text-white shadow-md" : "text-white/40 hover:text-white/80")}
                     >
                        {t('smartTask.wizard.date.mode.duration')}
                     </button>
                </div>

                <div className="p-5 bg-[#0f0f0f] rounded-2xl border border-white/5 shadow-md space-y-5 relative overflow-hidden">
                    {inputType === 'date' ? (
                         <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-wider text-white/50 font-bold">{t('common.endDate')}</label>
                                <div className="relative">
                                     <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                     <input 
                                         type="date" 
                                         min={startDate}
                                         value={endDate}
                                         onChange={(e) => setEndDate(e.target.value)}
                                         className="w-full pl-12 pr-4 py-3.5 bg-black/60 border border-white/5 rounded-xl text-white font-medium focus:outline-none focus:border-white/20 transition-colors shadow-md"
                                         style={{ colorScheme: 'dark' }}
                                     />
                                </div>
                            </div>
                         </div>
                    ) : (
                         <div className="grid grid-cols-3 gap-3">
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-white/50 text-center block uppercase tracking-wider">{t('common.time.years')}</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    value={activeField === 'years' && duration.years === 0 ? '' : duration.years} 
                                    onChange={(e) => setDuration({...duration, years: parseInt(e.target.value) || 0})} 
                                    onFocus={() => setActiveField('years')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-black/60 border border-white/5 rounded-xl py-3 text-lg font-bold text-center text-white focus:outline-none focus:border-white/20 transition-all shadow-md" 
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-white/50 text-center block uppercase tracking-wider">{t('common.time.months')}</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="11"
                                    value={activeField === 'months' && duration.months === 0 ? '' : duration.months} 
                                    onChange={(e) => setDuration({...duration, months: parseInt(e.target.value) || 0})} 
                                    onFocus={() => setActiveField('months')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-black/60 border border-white/5 rounded-xl py-3 text-lg font-bold text-center text-white focus:outline-none focus:border-white/20 transition-all shadow-md" 
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-white/50 text-center block uppercase tracking-wider">{t('common.time.days')}</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    value={activeField === 'days' && duration.days === 0 ? '' : duration.days} 
                                    onChange={(e) => setDuration({...duration, days: parseInt(e.target.value) || 0})} 
                                    onFocus={() => setActiveField('days')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-black/60 border border-white/5 rounded-xl py-3 text-lg font-bold text-center text-white focus:outline-none focus:border-white/20 transition-all shadow-md" 
                                />
                             </div>
                        </div>
                    )}
                </div>

                {/* Preview Section */}
                {fractalPreview && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="p-4 rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3"
                    >
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60 font-medium">{t('strategicMap.fractalStructure')}</span>
                            <span className="text-white font-mono text-[11px] bg-black/30 px-2 py-1 rounded-md">
                                {fractalPreview.drillDownPath.map(unit => t(`strategicMap.levels.${unit}`)).join(' > ')}
                            </span>
                        </div>
                         <div className="flex gap-1.5 h-2 w-full rounded-full overflow-hidden bg-black/40 p-0.5">
                            {fractalPreview.structure.map((_, i) => (
                                <div key={i} className="h-full bg-white/30 rounded-full" style={{ flex: 1, opacity: 0.4 + (i % 2) * 0.6 }} />
                            ))}
                         </div>
                    </motion.div>
                )}
            </div>
        </div>

        <div className="flex justify-center flex-shrink-0">
            <button
                type="button"
                disabled={!endDate}
                onClick={handleNext}
                className="px-8 py-3.5 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-base shadow-md shadow-white/10"
            >
                {t('smartTask.wizard.action.startJourney')} <ChevronRight size={18} />
            </button>
        </div>
    </motion.div>
  );
};
