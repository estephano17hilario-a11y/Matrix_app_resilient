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
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full h-full flex flex-col"
    >
        <div className="space-y-2 text-center flex-shrink-0 mb-6">
            <h2 className="text-2xl font-light text-white">
                <Trans i18nKey="smartTask.wizard.date.title" components={{ span: <span className="font-bold" /> }} />
            </h2>
             <p className="text-white/40 text-sm">{t('smartTask.wizard.date.subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-4">
            <div className="space-y-6 max-w-lg mx-auto w-full">
                {/* Tabs */}
                <div className="flex p-1 bg-white/10 rounded-xl">
                     <button 
                        onClick={() => setInputType('date')}
                        className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all", inputType === 'date' ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white")}
                     >
                        {t('smartTask.wizard.date.mode.calendar')}
                     </button>
                     <button 
                        onClick={() => setInputType('duration')}
                        className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all", inputType === 'duration' ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white")}
                     >
                        {t('smartTask.wizard.date.mode.duration')}
                     </button>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
                    {inputType === 'date' ? (
                         <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-white/50 font-bold">{t('common.endDate')}</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                                    <input 
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={startDate}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors text-center"
                                    />
                                </div>
                            </div>
                         </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                             <div className="space-y-2">
                                <label className="text-xs text-white/50 text-center block">{t('common.time.years')}</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    value={activeField === 'years' && duration.years === 0 ? '' : duration.years} 
                                    onChange={(e) => setDuration({...duration, years: parseInt(e.target.value) || 0})} 
                                    onFocus={() => setActiveField('years')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2 text-center text-white focus:outline-none focus:border-white/30 transition-colors" 
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs text-white/50 text-center block">{t('common.time.months')}</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    value={activeField === 'months' && duration.months === 0 ? '' : duration.months} 
                                    onChange={(e) => setDuration({...duration, months: parseInt(e.target.value) || 0})} 
                                    onFocus={() => setActiveField('months')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2 text-center text-white focus:outline-none focus:border-white/30 transition-colors" 
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs text-white/50 text-center block">{t('common.time.days')}</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    value={activeField === 'days' && duration.days === 0 ? '' : duration.days} 
                                    onChange={(e) => setDuration({...duration, days: parseInt(e.target.value) || 0})} 
                                    onFocus={() => setActiveField('days')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2 text-center text-white focus:outline-none focus:border-white/30 transition-colors" 
                                />
                             </div>
                        </div>
                    )}
                </div>

                {/* Preview Section */}
                {fractalPreview && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3"
                    >
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/50">{t('strategicMap.fractalStructure')}</span>
                            <span className="text-white font-mono text-xs md:text-sm">
                                {fractalPreview.drillDownPath.map(unit => t(`strategicMap.levels.${unit}`)).join(' > ')}
                            </span>
                        </div>
                         <div className="flex gap-1 h-2 w-full rounded-full overflow-hidden bg-white/5">
                            {fractalPreview.structure.map((_, i) => (
                                <div key={i} className="h-full bg-white/20" style={{ flex: 1, opacity: 0.5 + (i % 2) * 0.5 }} />
                            ))}
                         </div>
                    </motion.div>
                )}
            </div>
        </div>

        <div className="flex justify-center pt-4 pb-4 flex-shrink-0">
            <button
                type="button"
                disabled={!endDate}
                onClick={handleNext}
                className="px-8 py-3 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all flex items-center gap-2"
            >
                {t('smartTask.wizard.action.startJourney')} <ChevronRight size={16} />
            </button>
        </div>
    </motion.div>
  );
};
