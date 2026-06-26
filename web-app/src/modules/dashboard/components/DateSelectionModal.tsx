import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
    format, 
    addMonths, 
    subMonths, 
    addYears, 
    subYears, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isSameDay, 
    isSameMonth, 
    isSameYear,
    isWithinInterval
} from 'date-fns';
import { startOfWeek, endOfWeek, getWeekStartDay } from '../../../utils/dateUtils';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';

export type DateSelectionMode = 'WEEK' | 'MONTH' | 'YEAR' | 'DAY';

interface DateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    mode: DateSelectionMode;
    currentDate?: Date;
}

export const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    mode,
    currentDate = new Date()
}) => {
    const { t } = useTranslation();
    const [viewDate, setViewDate] = useState(currentDate);

    // Reset view date when opening
    React.useEffect(() => {
        if (isOpen) {
            setViewDate(currentDate);
        }
    }, [isOpen, currentDate]);

    const handleSelect = (date: Date) => {
        const selection = mode === 'WEEK' ? startOfWeek(date) : date;
        onSelect(selection);
        onClose();
    };

    // --- RENDERERS ---

    const renderYearView = () => {
        const currentYear = viewDate.getFullYear();
        const startYear = currentYear - 6;
        const endYear = currentYear + 5;
        const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

        return (
            <div className="grid grid-cols-3 gap-3">
                {years.map(year => {
                    const isSelected = year === currentDate.getFullYear();
                    const isCurrent = year === new Date().getFullYear();
                    
                    return (
                        <button
                            key={year}
                            onClick={() => handleSelect(new Date(year, 0, 1))}
                            className={cn(
                                "h-12 rounded-xl text-sm font-bold transition-all relative overflow-hidden group",
                                isSelected 
                                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <span className="relative z-10">{year}</span>
                            {isCurrent && !isSelected && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderMonthView = () => {
        const months = Array.from({ length: 12 }, (_, i) => i);

        return (
            <div className="space-y-4">
                {/* Year Navigation */}
                <div className="flex items-center justify-between px-2">
                    <button 
                        onClick={() => setViewDate(d => subYears(d, 1))}
                        className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-lg font-bold text-white tracking-tight">
                        {viewDate.getFullYear()}
                    </span>
                    <button 
                        onClick={() => setViewDate(d => addYears(d, 1))}
                        className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {months.map(month => {
                        const date = new Date(viewDate.getFullYear(), month, 1);
                        const isSelected = isSameMonth(date, currentDate) && isSameYear(date, currentDate);
                        const isCurrent = isSameMonth(date, new Date());
                        
                        return (
                            <button
                                key={month}
                                onClick={() => handleSelect(date)}
                                className={cn(
                                    "h-10 rounded-xl text-xs font-bold uppercase tracking-wide transition-all relative",
                                    isSelected 
                                        ? "bg-white text-black shadow-lg" 
                                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {format(date, 'MMM', { locale: es })}
                                {isCurrent && !isSelected && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCalendarView = () => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(viewDate);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const weekDaysRawResult = t('common.weekdays.initials', { returnObjects: true });
        const weekDaysRaw = Array.isArray(weekDaysRawResult) ? weekDaysRawResult : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        const weekStart = getWeekStartDay();
        const weekDays = weekStart === 1 ? [...weekDaysRaw.slice(1), weekDaysRaw[0]] : weekDaysRaw;

        // Calculate selected week range
        const selectedStart = startOfWeek(currentDate);
        const selectedEnd = endOfWeek(currentDate);

        return (
            <div className="space-y-4">
                 {/* Month Navigation */}
                 <div className="flex items-center justify-between px-2">
                    <button 
                        onClick={() => setViewDate(d => subMonths(d, 1))}
                        className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-lg font-bold text-white tracking-tight capitalize">
                        {format(viewDate, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button 
                        onClick={() => setViewDate(d => addMonths(d, 1))}
                        className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div>
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map((day, i) => (
                            <div key={`${day}-${i}`} className="text-center text-[10px] font-bold text-slate-500">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                        {days.map((day) => {
                            const isSelected = mode === 'WEEK' 
                                ? isWithinInterval(day, { start: selectedStart, end: selectedEnd })
                                : isSameDay(day, currentDate);
                            
                            const isCurrentMonth = isSameMonth(day, viewDate);
                            const isToday = isSameDay(day, new Date());

                            // Styling for range selection visual
                            const isRangeStart = mode === 'WEEK' && isSameDay(day, selectedStart);
                            const isRangeEnd = mode === 'WEEK' && isSameDay(day, selectedEnd);

                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => handleSelect(day)}
                                    className={cn(
                                        "h-8 relative flex items-center justify-center text-xs font-medium rounded-md transition-all",
                                        !isCurrentMonth && "opacity-30",
                                        isSelected ? "text-white bg-white/10" : "text-slate-300 hover:bg-white/5",
                                        (isRangeStart || isRangeEnd) && "bg-indigo-500 text-white shadow-sm font-bold",
                                        (mode === 'DAY' && isSelected) && "bg-indigo-500 text-white shadow-sm font-bold",
                                        isToday && !isSelected && "text-emerald-400 font-bold"
                                    )}
                                >
                                    {format(day, 'd')}
                                    {isToday && (
                                        <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#000]/90 z-[9999]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-end justify-center z-[10000] pointer-events-none p-0 md:p-4">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-[#111111] border-t md:border border-white/10 rounded-t-[28px] md:rounded-[32px] w-full max-w-sm p-6 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] pointer-events-auto relative overflow-hidden will-change-transform"
                        >
                            {/* Glass Effect */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                        <Calendar size={18} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white leading-none">
                                            {mode === 'WEEK' ? t('dashboard.selectWeek') : mode === 'MONTH' ? t('dashboard.selectMonth') : mode === 'DAY' ? t('dashboard.selectDay') : t('dashboard.selectYear')}
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Viaja en el tiempo
                                        </p>
                                    </div>
                                </div>
                                <button 
                                     onClick={onClose}
                                     className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="relative z-10 min-h-[280px]">
                                {mode === 'YEAR' && renderYearView()}
                                {mode === 'MONTH' && renderMonthView()}
                                {(mode === 'WEEK' || mode === 'DAY') && renderCalendarView()}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
