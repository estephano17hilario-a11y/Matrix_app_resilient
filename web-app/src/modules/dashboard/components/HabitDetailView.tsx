import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Share2, Crown, MoreVertical, X } from 'lucide-react';
import { Habit } from '../../types';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';

interface HabitDetailViewProps {
    habit: Habit | null;
    onClose: () => void;
}

type TimeRange = 'WEEK' | '8_WEEKS' | 'MONTH' | 'YEAR';
type SummaryScope = 'TODAY' | 'WEEK' | 'TOTAL';

// --- ANIMATION VARIANTS ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { 
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    };

    const barVariants = {
        hidden: { scaleY: 0 },
        visible: { 
            scaleY: 1,
            transition: { type: "spring", stiffness: 300, damping: 30 }
        }
    };

export const HabitDetailView: React.FC<HabitDetailViewProps> = ({ habit, onClose }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('WEEK');
    const [summaryScope, setSummaryScope] = useState<SummaryScope>('WEEK');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading for skeleton effect
    useEffect(() => {
        if (habit) {
            setIsLoading(true);
            const timer = setTimeout(() => setIsLoading(false), 400);
            return () => clearTimeout(timer);
        }
    }, [habit]);

    // Prevent scroll when modal is open
    useEffect(() => {
        if (habit) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [habit]);

    const isQuantity = habit?.type === 'QUANTITY';

    // --- DATA CALCULATION ENGINE ---
    const { chartData, totalValue, averageValue, bestDayValue, totalSessions, dateRangeLabel, summaryValue, goalValue } = useMemo(() => {
        if (!habit) {
            return {
                chartData: [],
                totalValue: 0,
                averageValue: 0,
                bestDayValue: 0,
                totalSessions: 0,
                dateRangeLabel: '',
                summaryValue: 0,
                goalValue: 0
            };
        }

        let start: Date, end: Date, dataPoints: any[] = [];

        // 1. Determine Date Range for Bar Chart
        if (timeRange === 'WEEK') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });
            
            dataPoints = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isCompleted = habit.history?.some(h => h.startsWith(dateStr));
                const value = isCompleted ? (isQuantity ? (habit.targetValue || 1) : 1) : 0; 

                return {
                    label: format(day, 'EEE', { locale: es }).toUpperCase().slice(0, 1),
                    fullDate: dateStr,
                    value: value,
                    isToday: isSameDay(day, new Date())
                };
            });
        } else {
            // Placeholder for other ranges
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });
            dataPoints = days.map(day => ({
                label: format(day, 'd'),
                value: Math.random() * 5,
                isToday: isSameDay(day, new Date())
            }));
        }

        const total = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
        const avg = total / (dataPoints.length || 1);
        const best = Math.max(...dataPoints.map(d => d.value));
        const sessions = dataPoints.filter(d => d.value > 0).length;

        // 2. Summary Scope Calculation
        let calculatedSummaryValue = 0;
        let calculatedGoalValue = 0;
        
        if (summaryScope === 'TODAY') {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isTodayDone = habit.history?.some(h => h.startsWith(todayStr));
            calculatedSummaryValue = isTodayDone ? (habit.targetValue || 1) : 0;
            calculatedGoalValue = habit.targetValue || 1;
        } else if (summaryScope === 'WEEK') {
            calculatedSummaryValue = total; // Reuse weekly total
            calculatedGoalValue = (habit.targetValue || 1) * 7;
        } else {
            calculatedSummaryValue = (habit.history?.length || 0) * (habit.targetValue || 1); // Rough total
            calculatedGoalValue = 1000; // Arbitrary long term goal
        }

        return {
            chartData: dataPoints,
            totalValue: total,
            averageValue: avg,
            bestDayValue: best,
            totalSessions: sessions,
            dateRangeLabel: `${format(start, 'd MMM')} - ${format(end, 'd MMM, yyyy')}`,
            summaryValue: calculatedSummaryValue,
            goalValue: calculatedGoalValue
        };

    }, [habit, timeRange, currentDate, summaryScope]);


    // --- UI COMPONENTS ---
    const StatCard = ({ label, value, sub, icon: Icon, isGold }: any) => (
        <motion.div 
            variants={itemVariants}
            className="bg-zinc-900/60 backdrop-blur-md rounded-[24px] p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-zinc-800/60 transition-colors border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
        >
            <div className="flex justify-between items-start relative z-10">
                {isGold ? (
                     <div className="flex flex-col items-center w-full gap-2">
                        <span className="text-zinc-400 text-xs font-medium">{label}</span>
                        <Icon size={20} className="text-yellow-500 fill-yellow-500" />
                     </div>
                ) : (
                    <div className="flex flex-col items-center w-full gap-2">
                        <span className="text-zinc-400 text-xs font-medium">{label}</span>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col items-center gap-1 relative z-10 mt-auto">
                {isLoading ? (
                    <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
                ) : (
                    <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                )}
            </div>
        </motion.div>
    );

    const SegmentedControl = ({ options, selected, onChange }: { options: { value: string, label: string }[], selected: string, onChange: (val: any) => void }) => (
        <div className="bg-black/20 p-1 rounded-xl flex w-full border border-white/5">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex-1 py-1.5 text-[13px] font-medium rounded-[8px] transition-all duration-300",
                        selected === opt.value 
                            ? "bg-zinc-700/80 text-white shadow-sm ring-1 ring-white/10" 
                            : "text-zinc-400 hover:text-zinc-200"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );

    if (!habit) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="fullscreen-habit-view"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[100] bg-[#000000] text-white flex flex-col overflow-hidden"
            >
                {/* Background Atmosphere */}
                <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-[40%] left-[30%] w-[60%] h-[60%] bg-pink-500/10 blur-[120px] rounded-full pointer-events-none" />

                {/* Header */}
                <div className="relative z-20 flex items-center justify-between px-6 py-5 pt-safe-top">
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-1 text-blue-400 font-medium active:opacity-70 transition-opacity"
                    >
                        <ChevronLeft size={24} />
                        <span className="text-[17px]">Atrás</span>
                    </button>
                    
                    <h2 className="text-[17px] font-bold text-white tracking-tight absolute left-1/2 -translate-x-1/2">
                        {habit.title}
                    </h2>

                    <button className="text-blue-400 active:opacity-70 transition-opacity">
                        <MoreVertical size={24} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 pb-20 scrollbar-hide">
                    
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4 max-w-md mx-auto"
                    >
                        {/* 1. TOP SUMMARY CARD */}
                        <motion.div variants={itemVariants} className="bg-zinc-900/60 backdrop-blur-lg rounded-[28px] p-5 border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                            <SegmentedControl 
                                options={[
                                    { value: 'TODAY', label: 'Hoy' },
                                    { value: 'WEEK', label: 'Esta semana' },
                                    { value: 'TOTAL', label: 'Total' }
                                ]}
                                selected={summaryScope}
                                onChange={setSummaryScope}
                            />
                            
                            <div className="mt-8 mb-4 text-center">
                                <motion.div 
                                    key={summaryScope}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="text-5xl font-bold text-white tracking-tighter"
                                >
                                    {summaryValue}{isQuantity ? '' : 'h'} <span className="text-3xl text-zinc-500 font-normal">00m</span>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* 2. GOAL SUMMARY (Line Chart) */}
                        <motion.div variants={itemVariants} className="bg-zinc-900/60 backdrop-blur-lg rounded-[28px] p-6 border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                            <h3 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide mb-6">RESUMEN DE METAS</h3>
                            
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-[13px] text-zinc-400">Trabajado en este período</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight ml-4">{summaryValue}h 00m</div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                        <span className="text-[13px] text-zinc-400">Meta hoy</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight mr-4">{goalValue}h 00m</div>
                                </div>
                            </div>

                            {/* Line Chart SVG */}
                            <div className="h-40 w-full relative">
                                <div className="absolute right-0 top-0 text-xs text-zinc-600">{goalValue}h 00m</div>
                                <div className="absolute left-0 bottom-0 text-xs text-zinc-500">2 feb</div>
                                <div className="absolute right-0 bottom-0 text-xs text-zinc-500">8 feb</div>

                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    {/* Grid Line */}
                                    <line x1="0" y1="20" x2="100" y2="20" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                                    
                                    {/* Projected Goal Line (Grey) */}
                                    <path d="M0,100 L100,80" fill="none" stroke="#3f3f46" strokeWidth="2" />
                                    
                                    {/* Actual Progress Line (Blue) */}
                                    <motion.path 
                                        d="M0,100 L60,40 L60,100" // Simulated progress up to "today"
                                        fill="none" 
                                        stroke="#3b82f6" 
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1.5, ease: "easeInOut" }}
                                    />
                                    
                                    {/* Current Point Dot */}
                                    <motion.circle 
                                        cx="60" cy="40" r="3" fill="#000" stroke="#3b82f6" strokeWidth="2" 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1 }}
                                    />

                                    {/* Today Line Indicator */}
                                    <line x1="60" y1="40" x2="60" y2="100" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                                </svg>
                            </div>
                        </motion.div>

                        {/* 3. WORKED HOURS (Bar Chart) */}
                        <motion.div variants={itemVariants} className="bg-zinc-900/60 backdrop-blur-lg rounded-[28px] p-6 border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide">HORAS TRABAJADAS</h3>
                                <button className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors">
                                    <Share2 size={14} />
                                    Compartir
                                </button>
                            </div>

                            <div className="mb-6">
                                <SegmentedControl 
                                    options={[
                                        { value: 'WEEK', label: 'Semana' },
                                        { value: '8_WEEKS', label: '8 Semanas' },
                                        { value: 'MONTH', label: 'Mes' },
                                        { value: 'YEAR', label: 'Año' }
                                    ]}
                                    selected={timeRange}
                                    onChange={setTimeRange}
                                />
                            </div>

                            <div className="flex items-center justify-between mb-8 px-2 bg-black/20 border border-white/5 rounded-xl py-2">
                                <button 
                                    onClick={() => setCurrentDate(subDays(currentDate, 7))} 
                                    className="w-8 h-8 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white active:scale-95 transition-transform"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-white text-[15px] font-medium tracking-wide">{dateRangeLabel}</span>
                                <button 
                                    onClick={() => setCurrentDate(addDays(currentDate, 7))} 
                                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[#0ea5e9] active:scale-95 transition-transform"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <div className="flex justify-between px-8 mb-8">
                                <div className="text-center">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Total</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        {totalValue}{isQuantity ? '' : 'h'} <span className="text-base font-normal text-zinc-500">00m</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Promedio</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        {Math.round(averageValue)}{isQuantity ? '' : 'h'} <span className="text-base font-normal text-zinc-500">00m</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="h-56 flex items-end justify-between gap-2 relative pl-2 pr-8">
                                {/* Y-Axis Labels (Right Side) */}
                                <div className="absolute right-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-zinc-500 text-right w-6">
                                    <span>26 h</span>
                                    <span>13 h</span>
                                    <span>0 h</span>
                                </div>

                                {/* Grid Lines */}
                                <div className="absolute inset-0 right-8 bottom-6 flex flex-col justify-between pointer-events-none z-0">
                                    <div className="w-full h-[1px] bg-white/5" />
                                    <div className="w-full h-[1px] bg-white/5" />
                                    <div className="w-full h-[1px] bg-white/5" />
                                </div>

                                {chartData.map((data: any, i: number) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3 z-10 h-full justify-end group cursor-pointer pb-6">
                                        <div className="w-full max-w-[32px] h-[85%] relative flex items-end">
                                            {data.value > 0 && (
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    {data.value}h
                                                </div>
                                            )}
                                            <motion.div 
                                                variants={barVariants}
                                                style={{ height: `${(data.value / 10) * 100}%`, originY: 1 }}
                                                className={cn(
                                                    "w-full rounded-t-[4px] relative overflow-hidden",
                                                    data.isToday 
                                                        ? "bg-[#0ea5e9]" 
                                                        : "bg-[#0ea5e9]"
                                                )}
                                            />
                                        </div>
                                        <span className="absolute bottom-0 text-[10px] font-bold uppercase text-zinc-500">{data.label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* 4. STATS GRID */}
                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                            <StatCard 
                                label="Sesiones" 
                                value={totalSessions} 
                                icon={Crown}
                            />
                            <StatCard 
                                label="Días trabajados" 
                                value={habit.streak} 
                            />
                            <StatCard 
                                label="Sesión promedio" 
                                value={`${Math.round(averageValue)}h`} 
                                icon={Crown}
                                isGold 
                            />
                            <StatCard 
                                label="Sesión más larga" 
                                value={`${bestDayValue}h`} 
                                icon={Crown}
                                isGold 
                            />
                            <StatCard 
                                label="Promedio diario" 
                                value={`${Math.round(averageValue)}h`} 
                                icon={Crown}
                                isGold 
                            />
                            <StatCard 
                                label="Mejor día" 
                                value={`${bestDayValue}h`} 
                                icon={Crown}
                                isGold 
                            />
                        </motion.div>
                        
                        {/* Bottom Spacer */}
                        <div className="h-10" />
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
