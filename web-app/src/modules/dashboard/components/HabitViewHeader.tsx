import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Layers, Briefcase, Zap } from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

export type ViewMode = 'DAY' | 'WEEK' | 'MONTH';
export type GroupingMode = 'NONE' | 'BY_TRAIT' | 'BY_PROJECT';

interface HabitViewHeaderProps {
    viewMode: ViewMode;
    currentDate: Date;
    grouping: GroupingMode;
    onViewModeChange: (mode: ViewMode) => void;
    onDateChange: (date: Date) => void;
    onGroupingChange: (mode: GroupingMode) => void;
    onOpenDateModal: () => void;
    onCreateHabit: () => void;
}

export const HabitViewHeader: React.FC<HabitViewHeaderProps> = ({
    viewMode,
    currentDate,
    grouping,
    onGroupingChange,
    onDateChange,
    onOpenDateModal,
    onCreateHabit
}) => {
    const { t } = useTranslation();
    
    const handlePrev = () => {
        if (viewMode === 'DAY') onDateChange(subDays(currentDate, 1));
        else if (viewMode === 'WEEK') onDateChange(subWeeks(currentDate, 1));
        else if (viewMode === 'MONTH') onDateChange(subMonths(currentDate, 1));
    };

    const handleNext = () => {
        if (viewMode === 'DAY') onDateChange(addDays(currentDate, 1));
        else if (viewMode === 'WEEK') onDateChange(addWeeks(currentDate, 1));
        else if (viewMode === 'MONTH') onDateChange(addMonths(currentDate, 1));
    };

    const getDateFormat = () => {
        if (viewMode === 'DAY') return 'd MMMM yyyy';
        if (viewMode === 'WEEK') return "'" + t('dashboard.week') + "' w, yyyy";
        return 'MMMM yyyy';
    };

    return (
        <div data-tour="habits-header" className="flex flex-col gap-4 mb-6 px-1">
            {/* BOTTOM ROW: Date Navigation & Config */}
            <div className="flex items-center justify-between gap-3">
                
                {/* Left Group: Navigator + Blue Date Button */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    
                    {/* Navigator */}
                    <div className="flex items-center bg-[#1c1c1e] rounded-xl border border-white/10 p-1 shrink-0">
                        <button 
                            onClick={handlePrev}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <div className="px-3 min-w-[100px] text-center">
                            <span className="text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                                {format(currentDate, getDateFormat(), { locale: es })}
                            </span>
                        </div>

                        <button 
                            onClick={handleNext}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Blue Date Button (Now on the RIGHT of Navigator as requested) */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenDateModal}
                        className="h-10 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)] shrink-0"
                    >
                        <Calendar size={14} />
                        <span className="hidden sm:inline">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                    </motion.button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Right Group: View Configuration (Where Blue Button used to be) */}
                    <div className="flex bg-[#1c1c1e] p-1 rounded-xl border border-white/10 shrink-0">
                         <button
                            onClick={() => onGroupingChange('NONE')}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-lg transition-all relative",
                                grouping === 'NONE' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
                            )}
                            title={t('dashboard.groupingNone', 'No Division')}
                            >
                            <Layers size={14} />
                         </button>
                         <button 
                            onClick={() => onGroupingChange('BY_TRAIT')}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-lg transition-all relative",
                                grouping === 'BY_TRAIT' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-indigo-400"
                            )}
                            title={t('dashboard.groupingByTrait', 'By Trait')}
                         >
                            <Zap size={14} />
                         </button>
                         <button 
                            onClick={() => onGroupingChange('BY_PROJECT')}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-lg transition-all relative",
                                grouping === 'BY_PROJECT' ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 hover:text-emerald-400"
                            )}
                            title={t('dashboard.groupingByProject', 'By Project')}
                         >
                            <Briefcase size={14} />
                         </button>
                    </div>

                    <motion.button
                        data-tour="new-habit-btn"
                        whileTap={{ scale: 0.95 }}
                        onClick={onCreateHabit}
                        className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </motion.button>
                </div>

            </div>
        </div>
    );
};
