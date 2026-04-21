import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { ChevronLeft, ChevronRight, Lock, Plus } from 'lucide-react';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, startOfYear, addMonths, isSameMonth, addWeeks, addYears, subMonths, subYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart } from '../../../components/charts/LineChart';
import { DateSelectionModal, DateSelectionMode } from './DateSelectionModal';
import { useTranslation } from 'react-i18next';

interface HabitTrendChartProps {
    habit: Habit;
    color?: string;
    isPro?: boolean;
    onOpenPro?: () => void;
}

type TimeFrame = 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';

export const HabitTrendChart: React.FC<HabitTrendChartProps> = ({ habit, color = '#6366f1', isPro, onOpenPro }) => {
    const { t } = useTranslation();
    const [timeframe, setTimeframe] = useState<TimeFrame>('WEEK');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

    const handleTabClick = (tf: TimeFrame) => {
        if (!isPro && (tf === '3_MONTHS' || tf === 'YEAR' || tf === 'TOTAL')) {
            if (onOpenPro) onOpenPro();
            return;
        }
        if (timeframe === tf) {
            setIsDateModalOpen(true);
        } else {
            setTimeframe(tf);
            setCurrentDate(new Date());
        }
    };

    const navigateDate = (dir: -1 | 1) => {
        if (timeframe === 'WEEK') setCurrentDate(d => addWeeks(d, dir));
        else if (timeframe === 'MONTH') setCurrentDate(d => addMonths(d, dir));
        else if (timeframe === 'YEAR') setCurrentDate(d => addYears(d, dir));
    };

    const { datasets, labels, max, dateRangeLabel, isCurrentRange } = useMemo(() => {
        const today = new Date();
        const historySet = new Set(habit.history?.map(h => h.split('T')[0].substring(0, 10)) || []);
        
        let rawData: number[] = [];
        let lbls: string[] = [];
        let rangeLabel = '';
        const currentLocale = t('locale') === 'es' ? es : undefined;

        if (timeframe === 'WEEK') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            for (let i = 0; i < 7; i++) {
                const d = addDays(start, i);
                const dateStr = format(d, 'yyyy-MM-dd');
                rawData.push(historySet.has(dateStr) ? 1 : 0);
                lbls.push(format(d, 'EEE', { locale: currentLocale }).charAt(0).toUpperCase());
            }
            rangeLabel = `${format(start, 'd MMM', { locale: currentLocale })} - ${format(addDays(start, 6), 'd MMM', { locale: currentLocale })}`;
        } else if (timeframe === 'MONTH') {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            const days = eachDayOfInterval({ start, end });
            
            days.forEach(d => {
                const dateStr = format(d, 'yyyy-MM-dd');
                rawData.push(historySet.has(dateStr) ? 1 : 0);
                const dayNum = d.getDate();
                lbls.push([1, 7, 14, 21, 28].includes(dayNum) ? dayNum.toString() : '');
            });
            rangeLabel = format(start, 'MMMM yyyy', { locale: currentLocale });
            rangeLabel = rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1);
        } else if (timeframe === '3_MONTHS') {
            const start = startOfMonth(subMonths(currentDate, 2));
            const end = endOfMonth(currentDate);
            const days = eachDayOfInterval({ start, end });
            
            days.forEach((d, i) => {
                const dateStr = format(d, 'yyyy-MM-dd');
                rawData.push(historySet.has(dateStr) ? 1 : 0);
                lbls.push(i % 14 === 0 ? format(d, 'd MMM', { locale: currentLocale }) : '');
            });
            rangeLabel = `${format(start, 'MMM', { locale: currentLocale })} - ${format(end, 'MMM yyyy', { locale: currentLocale })}`;
        } else if (timeframe === 'YEAR') {
            const start = startOfYear(currentDate);
            for (let i = 0; i < 12; i++) {
                const monthDate = addMonths(start, i);
                const daysInMonth = eachDayOfInterval({
                    start: startOfMonth(monthDate),
                    end: endOfMonth(monthDate)
                });
                
                let completions = 0;
                daysInMonth.forEach(d => {
                    if (historySet.has(format(d, 'yyyy-MM-dd'))) completions++;
                });
                
                rawData.push(completions);
                lbls.push(format(monthDate, 'MMM', { locale: currentLocale }).charAt(0).toUpperCase());
            }
            rangeLabel = format(start, 'yyyy');
        } else {
            // TOTAL
            const start = subYears(currentDate, 2); // Show last 2 years for total
            for (let i = 0; i < 24; i++) {
                const monthDate = addMonths(start, i);
                const daysInMonth = eachDayOfInterval({
                    start: startOfMonth(monthDate),
                    end: endOfMonth(monthDate)
                });
                
                let completions = 0;
                daysInMonth.forEach(d => {
                    if (historySet.has(format(d, 'yyyy-MM-dd'))) completions++;
                });
                
                rawData.push(completions);
                lbls.push(i % 3 === 0 ? format(monthDate, 'MMM yyyy', { locale: currentLocale }).charAt(0).toUpperCase() : '');
            }
            rangeLabel = 'TOTAL';
        }

        // We want a cumulative line or a consistency line?
        // Let's do a smoothed cumulative or completion count
        let plotData = [...rawData];
        
        // For WEEK/MONTH/3_MONTHS, it's 0 or 1. Let's plot cumulative for the period to show progress.
        if (timeframe === 'WEEK' || timeframe === 'MONTH' || timeframe === '3_MONTHS') {
            let sum = 0;
            // Solo sumar hasta el día actual si estamos en el periodo actual
            plotData = rawData.map((val, idx) => {
                let d: Date;
                if (timeframe === 'WEEK') {
                    d = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), idx);
                } else if (timeframe === 'MONTH') {
                    d = addDays(startOfMonth(currentDate), idx);
                } else {
                    d = addDays(startOfMonth(subMonths(currentDate, 2)), idx);
                }
                
                const dStr = format(d, 'yyyy-MM-dd');
                const todayStr = format(today, 'yyyy-MM-dd');

                // Si el día es en el futuro (después de hoy)
                if (d > today && dStr !== todayStr) {
                     return null as any; // Retornar null para que Chart.js no dibuje la línea en el futuro
                }
                
                sum += val;
                return sum;
            });
        }

        // Remove nulls from max calculation
        const validPlotData = plotData.filter(v => v !== null && v !== undefined);

        return {
            datasets: [{ data: plotData, color, label: timeframe === 'YEAR' ? t('habits.completed', 'Completados') : t('habits.accumulated', 'Acumulado') }],
            labels: lbls,
            max: Math.max(...validPlotData, timeframe === 'WEEK' ? 7 : timeframe === 'MONTH' ? 31 : 31),
            dateRangeLabel: rangeLabel,
            isCurrentRange: timeframe === 'WEEK' ? (today >= startOfWeek(currentDate, { weekStartsOn: 1 }) && today <= addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6)) :
                           timeframe === 'MONTH' ? isSameMonth(currentDate, today) :
                           currentDate.getFullYear() === today.getFullYear()
        };
    }, [habit, timeframe, currentDate, color]);

    return (
        <div className="w-full relative overflow-visible">
            <div className="absolute top-0 right-0 w-32 h-32 -z-10 pointer-events-none opacity-20"
                style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
            />
            
            <div className="flex flex-nowrap items-center justify-center gap-2 sm:gap-4 mb-3 w-full relative z-20">
                {/* Time Controls (Compact with Dropdown) */}
                <div className="flex items-center p-1 rounded-full bg-black/40 border border-white/5 relative shadow-sm shrink-0">
                    <button
                        className="relative px-4 py-1.5 rounded-full text-[10px] font-bold text-white z-10 flex items-center justify-center gap-1.5"
                    >
                        <div className="absolute inset-0 bg-white/10 rounded-full border border-white/5" />
                        <span className="text-[11px] font-black text-white uppercase tracking-wider relative z-10 flex items-center gap-2">
                            {timeframe === 'WEEK' ? t('dashboard.week', 'SEM') : timeframe === 'MONTH' ? t('dashboard.month', 'MES') : timeframe === '3_MONTHS' ? '3 MES' : timeframe === 'YEAR' ? t('dashboard.year', 'AÑO') : 'TOTAL'}
                        </span>
                    </button>
                    
                    <button
                        onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 ml-0.5"
                    >
                        <Plus size={14} className={cn("transition-transform duration-200", isTimeDropdownOpen && "rotate-45")} />
                    </button>

                    <AnimatePresence>
                        {isTimeDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-md overflow-hidden z-[100] min-w-[110px] p-1.5"
                            >
                                {(['WEEK', 'MONTH', '3_MONTHS', 'YEAR', 'TOTAL'] as TimeFrame[]).map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => {
                                            handleTabClick(tf);
                                            setIsTimeDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-between group",
                                            timeframe === tf ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/80"
                                        )}
                                    >
                                        <span>{tf === 'WEEK' ? t('dashboard.week', 'SEM') : tf === 'MONTH' ? t('dashboard.month', 'MES') : tf === '3_MONTHS' ? '3 MES' : tf === 'YEAR' ? t('dashboard.year', 'AÑO') : 'TOTAL'}</span>
                                        {!isPro && (tf === '3_MONTHS' || tf === 'YEAR' || tf === 'TOTAL') && <Lock size={10} className="text-yellow-400/80 group-hover:text-yellow-400 transition-colors" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Date Navigation Controls */}
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 shadow-sm">
                    <button 
                        onClick={() => navigateDate(-1)} 
                        className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        onClick={() => setIsDateModalOpen(true)}
                        className="px-3 h-7 flex items-center justify-center text-[10px] font-bold text-white hover:text-white/80 whitespace-nowrap transition-colors"
                    >
                        {dateRangeLabel}
                    </button>
                    <button 
                        onClick={() => navigateDate(1)} 
                        className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors"
                        disabled={isCurrentRange}
                    >
                        <ChevronRight size={14} className={isCurrentRange ? "opacity-30" : ""} />
                    </button>
                </div>
            </div>

            <div className="pt-4 w-full px-1 sm:px-2">
                <LineChart 
                    datasets={datasets}
                    labels={labels}
                    height={190}
                    max={max}
                    showGrid={true}
                    showBackground={false}
                    yTicks={timeframe === 'WEEK' ? [0, 2, 4, 7] : [0, Math.ceil(max / 2), max]}
                    paddingTop="top-2"
                />
            </div>

            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={(d) => setCurrentDate(d)}
                mode={timeframe as DateSelectionMode}
                currentDate={currentDate}
            />
        </div>
    );
};