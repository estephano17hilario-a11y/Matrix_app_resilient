import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isSameDay, 
    isSameMonth
} from 'date-fns';
import { startOfWeek, endOfWeek, getWeekStartDay, toLocalISOString } from '../../../utils/dateUtils';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';
import { DailyFeedEntry } from '../../../types/DailyFeedEntry';
import { useTranslation } from 'react-i18next';

interface FeedCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    feedEntries: DailyFeedEntry[];
    onSelectDate: (dateStr: string) => void;
}

export const FeedCalendarModal: React.FC<FeedCalendarModalProps> = ({
    isOpen,
    onClose,
    feedEntries,
    onSelectDate
}) => {
    const { t, i18n } = useTranslation();
    const [viewDate, setViewDate] = useState(new Date());

    React.useEffect(() => {
        if (isOpen) {
            setViewDate(new Date());
        }
    }, [isOpen]);

    const handleSelect = (date: Date) => {
        const dateStr = toLocalISOString(date);
        onSelectDate(dateStr);
        onClose();
    };

    const renderCalendarView = () => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(viewDate);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const weekDays = i18n.language === 'es' ? ['D', 'L', 'M', 'M', 'J', 'V', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const weekStartSetting = getWeekStartDay(); // 1 = Monday, 0 = Sunday
        const weekDaysHeader = weekStartSetting === 1 ? [...weekDays.slice(1), weekDays[0]] : weekDays;

        return (
            <div className="space-y-4">
                 {/* Month Navigation */}
                 <div className="flex items-center justify-between px-2">
                    <button 
                        onClick={() => setViewDate(d => subMonths(d, 1))}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5 bg-white/5"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-black text-white tracking-tight capitalize">
                        {format(viewDate, 'MMMM yyyy', { locale: i18n.language === 'es' ? es : undefined })}
                    </span>
                    <button 
                        onClick={() => setViewDate(d => addMonths(d, 1))}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5 bg-white/5"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div>
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {weekDaysHeader.map((day, i) => (
                            <div key={`${day}-${i}`} className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                        {days.map((day) => {
                            const dateStr = toLocalISOString(day);
                            const entry = feedEntries.find(e => e.date === dateStr);
                            const isCurrentMonth = isSameMonth(day, viewDate);
                            const isToday = isSameDay(day, new Date());
                            
                            let score = entry?.score;
                            
                            // Color Coding based on score
                            let cellStyle = "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10";
                            
                            if (score !== undefined) {
                                if (score >= 80) {
                                    cellStyle = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]";
                                } else if (score >= 40) {
                                    cellStyle = "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20";
                                } else {
                                    cellStyle = "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20";
                                }
                            }

                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => handleSelect(day)}
                                    className={cn(
                                        "h-12 flex flex-col items-center justify-center rounded-xl border text-xs transition-all duration-300 relative group active:scale-95",
                                        !isCurrentMonth && "opacity-25 hover:opacity-50",
                                        cellStyle,
                                        isToday && "ring-1 ring-indigo-500/40"
                                    )}
                                >
                                    <span className="font-extrabold text-[11px]">{day.getDate()}</span>
                                    {score !== undefined && (
                                        <span className="text-[8px] font-black opacity-80 mt-0.5 tracking-tighter">
                                            {Math.round(score)}%
                                        </span>
                                    )}
                                    {isToday && (
                                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
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
                        className="fixed inset-0 bg-[#000]/95 z-[9999] backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none p-4"
                    >
                        <div className="bg-[#0c0c0e] border border-white/10 rounded-[32px] w-full max-w-sm p-6 shadow-2xl pointer-events-auto relative overflow-hidden">
                            {/* Glass overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-white/5 shadow-inner">
                                        <Calendar size={18} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-white leading-none">
                                            {t('feed.calendar.title')}
                                        </h2>
                                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                                            {t('feed.calendar.subtitle')}
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
                            <div className="relative z-10 min-h-[300px]">
                                {renderCalendarView()}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
