import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Share2, MoreVertical, Edit2, Archive, Trash2, Plus, Check, Lock } from 'lucide-react';
import { Habit, Project, Attribute } from '../../../types';
import { format, subDays, isSameDay, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears, isWithinInterval, differenceInDays, differenceInWeeks, startOfDay, endOfDay, addDays, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek, endOfWeek, eachWeekOfInterval, eachDayOfInterval } from '../../../utils/dateUtils';
import { cn } from '../../../utils/cn';
import { getDynamicDailyTarget, getWeeklyGoalMinutes, getMonthlyGoalMinutes } from '../../../utils/projectUtils';
import { DateSelectionModal, DateSelectionMode } from './DateSelectionModal';
import { HabitGoalChart } from './HabitGoalChart';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';

interface HabitDetailViewProps {
 habit?: Habit | null;
 project?: Project | null;
 attributeColor?: string;
 onClose: () => void;
 onEdit?: (item: Habit | Project) => void;
 onDelete?: (itemId: string) => void;
 onArchive?: (item: Habit | Project) => void;
 isPro?: boolean;
 onOpenPro?: () => void;
 weekStartDay?: 0 | 1;
}

type TimeRange = 'TODAY' | 'WEEK' | '8_WEEKS' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';

// --- HELPERS ---
const formatDuration = (minutes: number) => {
 const h = Math.floor(minutes / 60);
 const m = Math.round(minutes % 60);
 return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const formatValue = (value: number, type: Habit['type'] | undefined, unit: string = '', isDuration: boolean = false) => {
 if (isDuration) return formatDuration(value);
 if (type === 'BOOLEAN' || type === 'SIMPLE') return `${value}`;
 return `${value} ${unit}`;
};

const FormattedValue = ({ value, type, unit, isDuration, className }: { value: number, type: Habit['type'] | undefined, unit: string, isDuration: boolean, className?: string }) => {
 if (isDuration) {
 const h = Math.floor(value / 60);
 const m = Math.round(value % 60);
 
 return (
 <div className={cn("flex items-baseline whitespace-nowrap", className)}>
 <span>{h}</span>
 <span className="text-[0.6em] font-medium text-white/50 ml-0.5 mr-1.5">h</span>
 <span className="text-[0.8em] text-white/80">{m.toString().padStart(2, '0')}</span>
 <span className="text-[0.5em] font-medium text-white/50 ml-0.5">m</span>
 </div>
 );
 }
 
 if (type === 'BOOLEAN' || type === 'SIMPLE') return <span className={className}>{value}</span>;
 
 return (
 <div className={cn("flex items-baseline whitespace-nowrap", className)}>
 <span>{value}</span>
 {unit && <span className="text-[0.5em] font-medium text-white/50 ml-1">{unit}</span>}
 </div>
 );
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
 hidden: { opacity: 0 },
 visible: { 
 opacity: 1,
 transition: { 
 staggerChildren: 0.05,
 delayChildren: 0.1
 }
 }
};

const itemVariants: Variants = {
 hidden: { opacity: 0, y: 20 },
 visible: { 
 opacity: 1, 
 y: 0,
 transition: { type: "spring", stiffness: 450, damping: 24 }
 }
};

const barVariants: Variants = {
 hidden: { scaleY: 0 },
 visible: { 
 scaleY: 1,
 transition: { type: "spring", stiffness: 450, damping: 25 }
 }
};

interface HabitDetailViewProps {
 habit?: Habit | null;
 project?: Project | null;
 attribute?: Attribute | null;
 attributeColor?: string;
 onClose: () => void;
 onEdit?: (item: Habit | Project) => void;
 onDelete?: (itemId: string) => void;
 onArchive?: (item: Habit | Project) => void;
 isPro?: boolean;
 onOpenPro?: () => void;
 weekStartDay?: 0 | 1;
}

export const HabitDetailView: React.FC<HabitDetailViewProps> = ({ habit, project, attribute, attributeColor, onClose, onEdit, onDelete, onArchive, isPro, onOpenPro, weekStartDay = 1 }) => {
 const { t } = useTranslation();
 const themeColor = useMemo(() => habit?.customColor || project?.color || attributeColor || '#0ea5e9', [habit?.customColor, project?.color, attributeColor]);

 const [timeRange, setTimeRange] = useState<TimeRange>('WEEK');
 const [pinnedRanges, setPinnedRanges] = useState<TimeRange[]>(['TODAY', 'WEEK', 'MONTH']);
 const [isConfigOpen, setIsConfigOpen] = useState(false);
 const [currentDate, setCurrentDate] = useState(new Date());
 const [selectedSubTraitId, setSelectedSubTraitId] = useState<string>('ALL');
 const [isDateModalOpen, setIsDateModalOpen] = useState(false);
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
 const [isScrolled, setIsScrolled] = useState(false);
 
 const ALL_RANGES = useMemo(() => [
 { value: 'TODAY' as TimeRange, label: t('dashboard.today') },
 { value: 'WEEK' as TimeRange, label: t('dashboard.week') },
 { value: '8_WEEKS' as TimeRange, label: `8 ${t('dashboard.week')}s` },
 { value: 'MONTH' as TimeRange, label: t('dashboard.month') },
 { value: '3_MONTHS' as TimeRange, label: `3 ${t('dashboard.month')}s` },
 { value: 'YEAR' as TimeRange, label: t('dashboard.year') },
 { value: 'TOTAL' as TimeRange, label: 'Total' }
 ], [t]);
 
 const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
 setIsScrolled(e.currentTarget.scrollTop > 20);
 };

 const handleTabClick = (tabValue: TimeRange) => {
 if (!isPro && ['MONTH', '3_MONTHS', 'YEAR', 'TOTAL'].includes(tabValue)) {
 if (onOpenPro) onOpenPro();
 return;
 }

 // If clicking on a tab that is not in pinned ranges (from config menu),
 // we might want to swap it into the pinned list or just set it active.
 // User requested: "3 pinned + 1 config".
 // Let's assume selecting from config just sets it active.
 // But visually, the user wants 3 slots + "+".
 // So if I select "YEAR", it should probably replace the last slot or be visible?
 // Let's implement logic: if not pinned, replace the 3rd slot.
 if (!pinnedRanges.includes(tabValue)) {
 setPinnedRanges(prev => {
 const newPinned = [...prev];
 newPinned[2] = tabValue; // Replace 3rd slot
 return newPinned;
 });
 }

 if (timeRange === tabValue) {
 // For ranges that support date selection, open modal
 if (['WEEK', 'MONTH', 'YEAR'].includes(tabValue)) {
 setIsDateModalOpen(true);
 }
 } else {
 setTimeRange(tabValue);
 // Reset date to today when switching ranges, unless it's total
 if (tabValue !== 'TOTAL') {
 setCurrentDate(new Date());
 }
 }
 setIsConfigOpen(false);
 };

 const [isLoading, setIsLoading] = useState(true);
 const activeItem = habit || project || null;

 // Removed fake loading to ensure 0 delay as requested
 useEffect(() => {
 if (activeItem) {
 setIsLoading(false);
 }
 }, [activeItem]);

 // Prevent scroll when modal is open
 useEffect(() => {
 if (activeItem) {
 const originalStyle = window.getComputedStyle(document.body).overflow;
 document.body.style.overflow = 'hidden';
 document.body.style.overscrollBehavior = 'none';
 return () => {
 document.body.style.overflow = originalStyle;
 document.body.style.overscrollBehavior = 'auto';
 };
 }
 }, [activeItem]);

 const isQuantity = habit?.type === 'QUANTITY';
 const isTimeBased = habit ? (habit.estimatedTime || 0) > 0 : true;
 const unitLabel = isTimeBased ? 'h' : (habit?.unit || '');

 // --- DATA CALCULATION ENGINE ---
 const { chartData, totalValue, averageValue, bestDayValue, totalSessions, dateRangeLabel, summaryValue, goalValue, unfilteredSummaryValue, unfilteredGoalValue, maxChartValue, streakDays } = useMemo(() => {
 if (!habit && !project) {
 return {
 chartData: [],
 totalValue: 0,
 averageValue: 0,
 bestDayValue: 0,
 totalSessions: 0,
 dateRangeLabel: '',
 summaryValue: 0,
 goalValue: 0,
 unfilteredSummaryValue: 0,
 unfilteredGoalValue: 0,
 maxChartValue: 10,
 streakDays: 0
 };
 }

 const isTimeBasedItem = habit ? (habit.estimatedTime || 0) > 0 : true;
 const baseValue = habit 
 ? (isTimeBasedItem ? habit.estimatedTime! : (isQuantity ? (habit.targetValue || 1) : 1))
 : 0;
 
 let unfilteredSessionEntries: any[] = [];
 if (project && project.sessions) {
 unfilteredSessionEntries = project.sessions
 .map(s => ({ ...s, dateObj: new Date(s.date) }))
 .filter(s => !isNaN(s.dateObj.getTime()));
 }
 const sessionEntries = (project && selectedSubTraitId !== 'ALL')
 ? unfilteredSessionEntries.filter(s => s.subTraitId === selectedSubTraitId)
 : unfilteredSessionEntries;

 const goalTargetMinutes = project?.goalTarget || 0;
 const workingDaysCount = Math.max(1, project?.workingDays?.length || 7);
 const effectiveFrequency = project?.uiFrequency || project?.goalFrequency;
 const weeklyGoalMinutes = project ? getWeeklyGoalMinutes(project) : 0;
 const monthlyGoalMinutes = project ? getMonthlyGoalMinutes(project) : 0;
 const dailyGoalMinutes = effectiveFrequency === 'WEEKLY'
 ? (weeklyGoalMinutes / workingDaysCount)
 : effectiveFrequency === 'MONTHLY'
 ? (monthlyGoalMinutes / (workingDaysCount * 4))
 : goalTargetMinutes;

 let start: Date, end: Date;
 let dataPoints: any[] = [];
 let calculatedGoalValue = 0;

 const getVal = (entries: any[], blockStart: Date, blockEnd: Date) => {
 return entries.reduce((acc, s) => {
 if (s.dateObj >= blockStart && s.dateObj < blockEnd) {
 return acc + (s.duration / 60);
 }
 return acc;
 }, 0);
 };
 const getValDay = (entries: any[], day: Date) => {
 return entries.reduce((acc, s) => isSameDay(s.dateObj, day) ? acc + (s.duration / 60) : acc, 0);
 };
 const getValInterval = (entries: any[], start: Date, end: Date) => {
 return entries.reduce((acc, s) => isWithinInterval(s.dateObj, { start, end }) ? acc + (s.duration / 60) : acc, 0);
 };

 if (timeRange === 'TODAY') {
 start = startOfDay(currentDate);
 end = endOfDay(currentDate);
 calculatedGoalValue = habit ? baseValue : (effectiveFrequency === 'WEEKLY' || effectiveFrequency === 'MONTHLY') && project ? getDynamicDailyTarget(project) : dailyGoalMinutes;

 if (project) {
 const blocks = [];
 for (let i = 0; i < 24; i += 3) {
 blocks.push(addHours(start, i));
 }
 dataPoints = blocks.map(blockStart => {
 const blockEnd = addHours(blockStart, 3);
 const value = getVal(sessionEntries, blockStart, blockEnd);
 const unfilteredValue = getVal(unfilteredSessionEntries, blockStart, blockEnd);
 return {
 label: format(blockStart, 'HH:mm'),
 fullDate: format(blockStart, 'yyyy-MM-dd HH:mm'),
 value,
 unfilteredValue,
 isToday: true,
 date: blockStart
 };
 });
 } else if (habit) {
 const dateStr = format(currentDate, 'yyyy-MM-dd');
 const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
 const value = completions * baseValue;
 dataPoints = [{
 label: t('dashboard.today'),
 fullDate: dateStr,
 value,
 unfilteredValue: value,
 isToday: true,
 date: currentDate
 }];
 }

 } else if (timeRange === 'WEEK') {
 start = startOfWeek(currentDate);
 end = endOfWeek(currentDate);
 const days = eachDayOfInterval({ start, end });
 
 calculatedGoalValue = habit ? (baseValue * 7) : (dailyGoalMinutes * 7);
 if (effectiveFrequency === 'WEEKLY') calculatedGoalValue = weeklyGoalMinutes;

 dataPoints = days.map(day => {
 const dateStr = format(day, 'yyyy-MM-dd');
 let value = 0;
 let unfilteredValue = 0;
 if (project) {
 value = getValDay(sessionEntries, day);
 unfilteredValue = getValDay(unfilteredSessionEntries, day);
 } else if (habit) {
 const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
 value = completions * baseValue;
 unfilteredValue = value;
 }

 return {
 label: format(day, 'EEE', { locale: es }).toUpperCase().slice(0, 1),
 fullDate: dateStr,
 value,
 unfilteredValue,
 isToday: isSameDay(day, new Date()),
 date: day
 };
 });

 } else if (timeRange === '8_WEEKS') {
 end = endOfWeek(currentDate);
 start = subWeeks(end, 7);
 start = startOfWeek(start);
 const weeks = eachWeekOfInterval({ start, end });

 calculatedGoalValue = (habit ? (baseValue * 7) : (dailyGoalMinutes * 7)) * 8;

 dataPoints = weeks.map(weekStart => {
 const weekEnd = endOfWeek(weekStart);
 let weeklyValue = 0;
 let unfilteredWeeklyValue = 0;
 
 if (project) {
 weeklyValue = getValInterval(sessionEntries, weekStart, weekEnd);
 unfilteredWeeklyValue = getValInterval(unfilteredSessionEntries, weekStart, weekEnd);
 } else if (habit) {
 const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
 daysInWeek.forEach(day => {
 const dateStr = format(day, 'yyyy-MM-dd');
 const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
 weeklyValue += completions * baseValue;
 });
 unfilteredWeeklyValue = weeklyValue;
 }

 return {
 label: format(weekStart, 'd/M'),
 value: weeklyValue,
 unfilteredValue: unfilteredWeeklyValue,
 isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
 date: weekStart
 };
 });

 } else if (timeRange === 'MONTH') {
 start = startOfMonth(currentDate);
 end = endOfMonth(currentDate);
 const days = eachDayOfInterval({ start, end });
 
 calculatedGoalValue = habit ? (baseValue * 30) : (dailyGoalMinutes * 30);
 if (effectiveFrequency === 'MONTHLY') calculatedGoalValue = monthlyGoalMinutes;

 dataPoints = days.map(day => {
 const dateStr = format(day, 'yyyy-MM-dd');
 let value = 0;
 let unfilteredValue = 0;
 if (project) {
 value = getValDay(sessionEntries, day);
 unfilteredValue = getValDay(unfilteredSessionEntries, day);
 } else if (habit) {
 const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
 value = completions * baseValue;
 unfilteredValue = value;
 }

 const showLabel = [6, 14, 21, 28].includes(day.getDate());

 return {
 label: showLabel ? format(day, 'd') : '',
 fullDate: dateStr,
 value,
 unfilteredValue,
 isToday: isSameDay(day, new Date()),
 date: day
 };
 });

 } else if (timeRange === '3_MONTHS') {
 end = endOfMonth(currentDate);
 start = subMonths(startOfMonth(end), 2);
 const weeks = eachWeekOfInterval({ start, end });

 calculatedGoalValue = (habit ? (baseValue * 7) : (dailyGoalMinutes * 7)) * 13;

 dataPoints = weeks.map(weekStart => {
 const weekEnd = endOfWeek(weekStart);
 let weeklyValue = 0;
 let unfilteredWeeklyValue = 0;
 
 if (project) {
 weeklyValue = getValInterval(sessionEntries, weekStart, weekEnd);
 unfilteredWeeklyValue = getValInterval(unfilteredSessionEntries, weekStart, weekEnd);
 } else if (habit) {
 const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
 daysInWeek.forEach(day => {
 const dateStr = format(day, 'yyyy-MM-dd');
 const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
 weeklyValue += completions * baseValue;
 });
 unfilteredWeeklyValue = weeklyValue;
 }

 return {
 label: format(weekStart, 'd/M'),
 value: weeklyValue,
 unfilteredValue: unfilteredWeeklyValue,
 isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
 date: weekStart
 };
 });

 } else if (timeRange === 'YEAR') {
 start = startOfYear(currentDate);
 end = endOfYear(currentDate);
 const months = eachMonthOfInterval({ start, end });
 
 calculatedGoalValue = (habit ? (baseValue * 30) : (dailyGoalMinutes * 30)) * 12;

 dataPoints = months.map(monthStart => {
 const monthEnd = endOfMonth(monthStart);
 let monthlyValue = 0;
 let unfilteredMonthlyValue = 0;
 
 if (project) {
 monthlyValue = getValInterval(sessionEntries, monthStart, monthEnd);
 unfilteredMonthlyValue = getValInterval(unfilteredSessionEntries, monthStart, monthEnd);
 } else if (habit) {
 const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
 daysInMonth.forEach(day => {
 const dateStr = format(day, 'yyyy-MM-dd');
 const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
 monthlyValue += completions * baseValue;
 });
 unfilteredMonthlyValue = monthlyValue;
 }

 return {
 label: format(monthStart, 'MMM', { locale: es }).toUpperCase().slice(0, 3),
 value: monthlyValue,
 unfilteredValue: unfilteredMonthlyValue,
 isToday: isWithinInterval(new Date(), { start: monthStart, end: monthEnd }),
 date: monthStart
 };
 });

 } else {
 let minDate = new Date();
 if (project && unfilteredSessionEntries.length > 0) {
 minDate = unfilteredSessionEntries.reduce((min, s) => s.dateObj < min ? s.dateObj : min, unfilteredSessionEntries[0].dateObj);
 } else if (habit && habit.history && habit.history.length > 0) {
 const dates = habit.history.map(d => new Date(d));
 minDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
 }
 start = startOfWeek(minDate);
 end = new Date();

 const daysDiff = differenceInDays(end, start);
 
 if (daysDiff > 365) {
 const months = eachMonthOfInterval({ start, end });
 dataPoints = months.map(monthStart => {
 const monthEnd = endOfMonth(monthStart);
 let monthlyValue = 0;
 let unfilteredMonthlyValue = 0;
 if (project) {
 monthlyValue = getValInterval(sessionEntries, monthStart, monthEnd);
 unfilteredMonthlyValue = getValInterval(unfilteredSessionEntries, monthStart, monthEnd);
 } else if (habit) {
 const prefix = format(monthStart, 'yyyy-MM');
 const completions = habit.history?.filter((h: string) => h.startsWith(prefix)).length || 0;
 monthlyValue = completions * baseValue;
 unfilteredMonthlyValue = monthlyValue;
 }
 return {
 label: format(monthStart, 'MMM', { locale: es }),
 value: monthlyValue,
 unfilteredValue: unfilteredMonthlyValue,
 isToday: isWithinInterval(new Date(), { start: monthStart, end: monthEnd }),
 date: monthStart
 };
 });
 } else {
 const weeks = eachWeekOfInterval({ start, end });
 dataPoints = weeks.map(weekStart => {
 const weekEnd = endOfWeek(weekStart);
 let weeklyValue = 0;
 let unfilteredWeeklyValue = 0;
 if (project) {
 weeklyValue = getValInterval(sessionEntries, weekStart, weekEnd);
 unfilteredWeeklyValue = getValInterval(unfilteredSessionEntries, weekStart, weekEnd);
 } else if (habit) {
 const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
 daysInWeek.forEach(day => {
 const dateStr = format(day, 'yyyy-MM-dd');
 const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
 weeklyValue += completions * baseValue;
 });
 unfilteredWeeklyValue = weeklyValue;
 }
 return {
 label: format(weekStart, 'd/M'),
 value: weeklyValue,
 unfilteredValue: unfilteredWeeklyValue,
 isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
 date: weekStart
 };
 });
 }

 if (project) {
 const totalDurationWeeks = differenceInWeeks(end, start) || 1;
 calculatedGoalValue = totalDurationWeeks * (effectiveFrequency === 'WEEKLY' ? weeklyGoalMinutes : dailyGoalMinutes * 7);
 } else if (habit) {
 const totalDurationDays = differenceInDays(end, start) || 1;
 calculatedGoalValue = totalDurationDays * baseValue;
 }
 }

 const total = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
 const sessionCountInRange = project
 ? sessionEntries.filter(s => isWithinInterval(s.dateObj, { start, end })).length
 : 0;
 const avg = project
 ? (sessionCountInRange > 0 ? total / sessionCountInRange : 0)
 : (total / (dataPoints.length || 1));
 const best = Math.max(...dataPoints.map(d => d.value), 0);
 const sessionsCount = project ? sessionCountInRange : dataPoints.filter(d => d.value > 0).length;
 const maxVal = Math.max(best, 1);

 const unfilteredSummaryValue = dataPoints.reduce((acc, curr) => acc + curr.unfilteredValue, 0);

 let rangeLabel = '';
 if (timeRange === 'TODAY') {
 rangeLabel = format(currentDate, 'd MMMM yyyy', { locale: es });
 } else if (timeRange === 'MONTH') {
 rangeLabel = format(start, 'MMMM yyyy', { locale: es });
 rangeLabel = rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1);
 } else if (timeRange === '3_MONTHS') {
 rangeLabel = `${format(start, 'MMM')} - ${format(end, 'MMM yyyy', { locale: es })}`;
 rangeLabel = rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1);
 } else if (timeRange === 'YEAR') {
 rangeLabel = format(start, 'yyyy');
 } else if (timeRange === 'TOTAL') {
 rangeLabel = 'Histórico Completo';
 } else {
 rangeLabel = `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
 }

 let streak = 0;
 if (habit) streak = habit.streak;
 else if (project) {
 const uniqueDays = Array.from(new Set(sessionEntries.map(s => format(s.dateObj, 'yyyy-MM-dd'))));
 const sortedDays = uniqueDays.sort((a, b) => b.localeCompare(a));
 let cursor = new Date();
 while (sortedDays.includes(format(cursor, 'yyyy-MM-dd'))) {
 streak += 1;
 cursor = subDays(cursor, 1);
 }
 }

 return {
 chartData: dataPoints,
 totalValue: total,
 averageValue: avg,
 bestDayValue: best,
 totalSessions: sessionsCount,
 dateRangeLabel: rangeLabel,
 summaryValue: total,
 goalValue: calculatedGoalValue,
 unfilteredSummaryValue,
 unfilteredGoalValue: calculatedGoalValue,
 maxChartValue: maxVal,
 streakDays: streak
 };

 }, [habit, project, selectedSubTraitId, timeRange, currentDate, isQuantity, weekStartDay]);

 const summaryRatio = goalValue > 0 ? summaryValue / goalValue : 0;
 const summaryBarValue = Math.min(Math.max(summaryRatio, 0), 1);
 const summaryPercentage = Math.round(Math.max(summaryRatio, 0) * 100);

 const StatCard = ({ label, value, onClick }: { label: React.ReactNode; value: string | number; onClick?: () => void }) => (
 <motion.div 
 variants={itemVariants}
 whileTap={onClick ? { scale: 0.96 } : undefined}
 onClick={onClick}
 className={cn(
 "relative group bg-[#18181b]/80 rounded-[28px] p-6 border border-white/[0.06] flex flex-col items-center justify-center gap-2 transition-all duration-200 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
 onClick ? "cursor-pointer hover:bg-white/[0.04] hover:border-white/20 active:bg-white/[0.08]" : "hover:border-white/[0.12]"
 )}
 >
 <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
 
 <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] text-center relative z-10 group-hover:text-white/50 transition-colors">
 {label}
 </span>
 
 <div className="relative z-10 flex flex-col items-center group-hover:scale-110 transition-transform duration-200">
 {isLoading ? (
 <div className="h-8 w-16 bg-white/5 rounded-lg animate-pulse" />
 ) : (
 <span className={`font-[1000] text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] whitespace-nowrap ${String(value).length > 4 ? 'text-lg' : 'text-2xl'}`}>
 {value}
 </span>
 )}
 </div>
 </motion.div>
 );
 if (!activeItem) return null;

 return createPortal(
 <AnimatePresence mode="wait">
  <motion.div
  key={`detail-${activeItem.id}`}
  initial={{ y: '100vh', opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: '100vh', opacity: 0 }}
  transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.3 }}
  style={{ willChange: 'transform, opacity', transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}
  className="fixed inset-0 z-[9999] bg-[#000000] text-white flex flex-col overflow-hidden"
  >
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <motion.div 
 animate={{ 
 scale: [1, 1.1, 1],
 opacity: [0.15, 0.25, 0.15]
 }}
 transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
 className="absolute -top-[15%] -left-[10%] w-[80%] h-[60%] rounded-full"
 style={{ 
 background: `radial-gradient(circle, ${themeColor} 0%, transparent 60%)`, 
 willChange: 'transform, opacity'
 }} 
 />
 <motion.div 
 animate={{ 
 scale: [1.1, 1, 1.1],
 opacity: [0.1, 0.2, 0.1]
 }}
 transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
 className="absolute -bottom-[10%] -right-[10%] w-[80%] h-[60%] rounded-full"
 style={{ 
 background: `radial-gradient(circle, ${themeColor} 0%, transparent 60%)`, 
 willChange: 'transform, opacity'
 }} 
 />
 </div>

 <div className="relative z-[10000] flex items-center justify-between px-6 pt-10 pb-1.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent ">
 <button 
 onClick={onClose} 
 className="group flex items-center gap-1 text-white/60 hover:text-white font-semibold active:scale-95 transition-all"
 >
 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
 <ChevronLeft size={20} />
 </div>
 <span className="text-[16px] tracking-tight">{t('common.back', 'Back')}</span>
 </button>
 
 <div className="absolute left-1/2 -translate-x-1/2 text-center mt-1">
 <h2 className="text-[17px] font-[900] text-white tracking-[-0.02em] leading-tight drop-shadow-md">
 {habit?.title || project?.title}
 </h2>
 <div className="flex items-center justify-center gap-1.5 opacity-60">
 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}` }} />
 <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/90">Análisis Detallado</span>
 </div>
 </div>

 <div className="relative flex items-center gap-1 z-[10000]">
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setIsMenuOpen(!isMenuOpen);
 }}
 className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all bg-white/5 rounded-full hover:bg-white/10"
 >
 <MoreVertical size={22} />
 </button>

 <AnimatePresence>
 {isMenuOpen && (
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 10 }}
 className="absolute right-0 top-full mt-2 w-48 bg-[#09090b] border border-white/10 rounded-xl shadow-md overflow-hidden z-[10000]"
 >
 {onEdit && (
 <button 
 onClick={() => {
 onEdit(habit || project!);
 setIsMenuOpen(false);
 }}
 className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
 >
 <Edit2 size={16} className="text-blue-400" />
 Editar
 </button>
 )}
 
 {onArchive && (
 <button 
 onClick={() => {
 onArchive(habit || project!);
 setIsMenuOpen(false);
 }}
 className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
 >
 <Archive size={16} className="text-amber-400" />
 {habit?.archived || project?.archived ? 'Desarchivar' : 'Archivar'}
 </button>
 )}

 {onDelete && (
 <button 
 onClick={() => {
 setIsMenuOpen(false);
 setShowDeleteConfirmation(true);
 }}
 className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors border-t border-white/5"
 >
 <Trash2 size={16} />
 {t('common.delete')}
 </button>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 <motion.div 
 initial={{ opacity: 0, y: -20 }}
 animate={{ 
 opacity: 1, 
 y: 0,
 paddingBottom: isScrolled ? 4 : 16 
 }}
 transition={{ delay: 0.2 }}
 className="relative z-50 px-4 sm:px-6 pt-0 -mt-1"
 >
 <motion.div 
 className="flex flex-col items-center mx-auto transition-all duration-200 origin-top border border-white/[0.1] shadow-[0_15px_30px_rgba(0,0,0,0.6)] relative z-50 w-full max-w-[360px]"
 animate={{
 borderRadius: isScrolled ? 28 : 32,
 padding: isScrolled ? "10px 12px" : "14px 16px",
 gap: isScrolled ? 4 : 12
 }}
 style={{ 
 background: `linear-gradient(180deg, rgba(20,20,22,0.7) 0%, rgba(10,10,12,0.8) 100%)`,
 boxShadow: `0 8px 32px ${themeColor}20, 0 0 0 1px rgba(255,255,255,0.08) inset` 
 }}
 >
 <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
 <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
 <div 
 className="absolute -top-[40%] -left-[20%] w-[140%] h-[100%] rounded-[100%] pointer-events-none"
 style={{ background: `radial-gradient(ellipse at center, ${themeColor}25 0%, transparent 60%)`, willChange: 'opacity' }} 
 />
 </div>

 <div className="flex items-center gap-1.5 relative z-10">
 <AnimatePresence>
 {pinnedRanges.map((range, index) => {
 const isActive = timeRange === range;
 const label = ALL_RANGES.find((r: { value: TimeRange, label: string }) => r.value === range)?.label || range;
 const isLocked = !isPro && ['MONTH', '3_MONTHS', 'YEAR', 'TOTAL'].includes(range);
 
 return (
 <motion.button
 key={`pinned-tab-${index}`}
 layout
 onClick={() => handleTabClick(range)}
 className={cn(
 "px-4 py-2 rounded-full text-[11px] font-black transition-all relative flex items-center gap-1.5",
 isActive 
 ? "text-black z-10" 
 : "text-white/40 hover:text-white/80 hover:bg-white/[0.03]"
 )}
 >
 <span className="relative z-10 tracking-tight">{label}</span>
 {isLocked && <Lock size={10} className="relative z-10 text-yellow-500/80" />}
 {isActive && (
 <motion.div
 layoutId={`habitDetailActiveTab-${activeItem.id}`}
 className="absolute inset-0 bg-white shadow-[0_4px_12px_rgba(255,255,255,0.3)]"
 style={{ borderRadius: 999 }}
 initial={false}
 transition={{ type: "spring", stiffness: 400, damping: 25 }}
 />
 )}
 </motion.button>
 );
 })}
 </AnimatePresence>

 <div className="w-[1px] h-4 bg-white/[0.08] mx-1" />

 <div className="relative">
 <button
 onClick={() => setIsConfigOpen(!isConfigOpen)}
 className={cn(
 "w-8 h-8 rounded-full flex items-center justify-center transition-all",
 isConfigOpen 
 ? "bg-white text-black rotate-45" 
 : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
 )}
 >
 <Plus size={16} strokeWidth={3} />
 </button>

 <AnimatePresence>
 {isConfigOpen && (
 <motion.div
 initial={{ opacity: 0, scale: 0.98, y: 5, x: "-50%" }}
 animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
 exit={{ opacity: 0, scale: 0.98, y: 5, x: "-50%" }}
 transition={{ duration: 0.15, ease: "easeOut" }}
 className="absolute left-1/2 top-full mt-2 w-40 bg-[#121214]/95 border border-white/10 rounded-xl shadow-md overflow-hidden z-[100] p-1"
 >
 <div className="flex flex-col gap-0.5">
 {ALL_RANGES.map((option) => {
 const isPinned = pinnedRanges.includes(option.value);
 const isSelected = timeRange === option.value;
 const isLocked = !isPro && ['MONTH', '3_MONTHS', 'YEAR', 'TOTAL'].includes(option.value);
 
 return (
 <button
 key={option.value}
 onClick={() => handleTabClick(option.value)}
 className={cn(
 "w-full px-2 py-1.5 rounded-lg text-left text-[10px] font-bold flex items-center justify-between group transition-all",
 isSelected 
 ? "bg-white text-black shadow-md" 
 : "text-zinc-400 hover:text-white hover:bg-white/5"
 )}
 >
 <div className="flex items-center gap-1.5">
 <span>{option.label}</span>
 {isLocked && <Lock size={10} className="text-yellow-400/80" />}
 </div>
 {isSelected && <Check size={10} className="text-black" />}
 {isPinned && !isSelected && (
 <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
 )}
 </button>
 );
 })}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 <motion.div 
 className="flex items-center justify-between w-full px-2 mt-[1px]"
 animate={{
 opacity: 1,
 scale: isScrolled ? 0.95 : 1
 }}
 >
 <button 
 onClick={() => {
 if (timeRange === 'TODAY') setCurrentDate(d => subDays(d, 1));
 if (timeRange === 'WEEK') setCurrentDate(d => subWeeks(d, 1));
 if (timeRange === '8_WEEKS') setCurrentDate(d => subWeeks(d, 8));
 if (timeRange === 'MONTH') setCurrentDate(d => subMonths(d, 1));
 if (timeRange === '3_MONTHS') setCurrentDate(d => subMonths(d, 3));
 if (timeRange === 'YEAR') setCurrentDate(d => subYears(d, 1));
 }}
 disabled={timeRange === 'TOTAL'}
 className={cn(
 "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-75",
 timeRange === 'TOTAL' ? "opacity-0 pointer-events-none" : "bg-white/[0.03] text-white/30 hover:text-white hover:bg-white/10 border border-white/[0.05]"
 )}
 >
 <ChevronLeft size={18} strokeWidth={2.5} />
 </button>
 
 <motion.div 
 key={dateRangeLabel}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className={cn(
 "flex flex-col items-center",
 isScrolled && "scale-90"
 )}
 >
 <span className="text-[10px] font-black text-white tracking-tight uppercase">
 {dateRangeLabel}
 </span>
 {!isScrolled && (
 <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.1em] mt-0.5">
 Período Seleccionado
 </span>
 )}
 </motion.div>

 <button 
 onClick={() => {
 if (timeRange === 'TODAY') setCurrentDate(d => addDays(d, 1));
 if (timeRange === 'WEEK') setCurrentDate(d => addWeeks(d, 1));
 if (timeRange === '8_WEEKS') setCurrentDate(d => addWeeks(d, 8));
 if (timeRange === 'MONTH') setCurrentDate(d => addMonths(d, 1));
 if (timeRange === '3_MONTHS') setCurrentDate(d => addMonths(d, 3));
 if (timeRange === 'YEAR') setCurrentDate(d => addYears(d, 1));
 }}
 disabled={timeRange === 'TOTAL'}
 className={cn(
 "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-75",
 timeRange === 'TOTAL' ? "opacity-0 pointer-events-none" : "bg-white/[0.03] text-white/30 hover:text-white hover:bg-white/10 border border-white/[0.05]"
 )}
 >
 <ChevronRight size={18} strokeWidth={2.5} />
 </button>
 </motion.div>

 {project && attribute && attribute.subTraits && attribute.subTraits.length > 0 && (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 max-w-full justify-center border-t border-white/[0.05] pt-2 w-full">
      <button
        onClick={() => setSelectedSubTraitId('ALL')}
        className={cn(
          "px-2.5 py-1 rounded-full text-[9px] font-black tracking-tight transition-all",
          selectedSubTraitId === 'ALL'
            ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.25)]"
            : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
        )}
      >
        TODO
      </button>
      {attribute.subTraits.map((st) => (
        <button
          key={st.id}
          onClick={() => setSelectedSubTraitId(st.id)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[9px] font-black tracking-tight transition-all whitespace-nowrap",
            selectedSubTraitId === st.id
              ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.25)]"
              : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
          )}
        >
          {st.name.toUpperCase()}
        </button>
      ))}
    </div>
  )}
 </motion.div>
 </motion.div>

 <div 
 onScroll={handleScroll}
 className={cn(
 "flex-1 overflow-y-auto overflow-x-hidden px-5 pt-0 pb-20 space-y-4 scrollbar-hide overscroll-contain",
 isDateModalOpen && "overflow-hidden"
 )}
 >
 
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="space-y-4 max-w-2xl mx-auto"
 >

 <motion.div 
 variants={itemVariants} 
 className="bg-[#121214]/80 rounded-[32px] p-8 border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] mb-4 relative overflow-hidden group"
 >
 <motion.div
 animate={{ 
 scale: [1, 1.2, 1],
 opacity: [0.1, 0.2, 0.1]
 }}
 transition={{ duration: 8, repeat: Infinity }}
 className="absolute top-0 right-0 w-48 h-48 rounded-full -z-10 pointer-events-none"
 style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 75%)` }}
 />
 
 <div className="flex flex-col gap-6">
 <div className="text-center py-4 relative">
 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
 <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
 {t('common.total', 'Total')}
 </span>
 </div>
 <motion.div 
 key={timeRange + summaryValue}
 initial={{ scale: 0.8, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 transition={{ type: "spring", stiffness: 400, damping: 25 }}
 className="text-7xl font-[1000] text-white tracking-[-0.06em] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
 >
 {formatValue(summaryValue, habit?.type, unitLabel, isTimeBased)}
 </motion.div>
 </div>

 <div className="px-2 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex flex-col">
 <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">{t('habits.detail.ratio', 'Ratio')}</span>
 <span className="text-sm font-bold text-white/90">
 {formatValue(summaryValue, habit?.type, unitLabel, isTimeBased)} <span className="text-white/30 font-medium">/</span> {formatValue(goalValue, habit?.type, unitLabel, isTimeBased)}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">Progreso</span>
 <div className="text-sm font-black text-white">{summaryPercentage}%</div>
 </div>
 </div>
 
 <div className="relative h-3 w-full rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.05]">
 <motion.div
 initial={{ scaleX: 0 }}
 animate={{ scaleX: summaryBarValue }}
 transition={{ type: "spring", stiffness: 350, damping: 20 }}
 className="h-full rounded-full origin-left relative"
 style={{ backgroundColor: themeColor }}
 >
 <motion.div 
 animate={{ x: ['-100%', '100%'] }}
 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
 />
 </motion.div>
 </div>
 </div>
 </div>
 </motion.div>

 <motion.div variants={itemVariants} className="bg-[#121214]/60 rounded-[32px] p-8 border border-white/[0.06] shadow-md relative overflow-hidden group flex flex-col">
 <div className="flex items-center gap-2 mb-6">
 <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
 <h3 className="text-[11px] font-[900] text-white/40 uppercase tracking-[0.2em]">{t('habits.detail.goalSummary', 'GOAL SUMMARY')}</h3>
 </div>
 
 <div className="grid grid-cols-2 gap-8 mb-4">
 <div className="relative">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
 <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{t('dashboard.workedThisPeriod', 'Worked')}</span>
 </div>
 <div className="text-3xl font-[1000] text-white tracking-tight">
 <FormattedValue value={unfilteredSummaryValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} />
 </div>
 </div>
 <div className="text-right relative">
 <div className="flex items-center justify-end gap-2 mb-2">
 <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{t('habits.detail.estimatedGoal', 'Goal')}</span>
 <div className="w-2 h-2 rounded-full bg-white/10" />
 </div>
 <div className="text-3xl font-[1000] text-white/60 tracking-tight">
 <FormattedValue value={unfilteredGoalValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} className="justify-end" />
 </div>
 </div>
 </div>

 <div className="h-[280px] relative mt-2 -mx-4 mb-0 w-[calc(100%+32px)] overflow-visible rounded-b-[32px] flex-grow">
 <HabitGoalChart 
 dataPoints={chartData.map((d: any) => ({ ...d, value: d.unfilteredValue }))}
 goalValue={unfilteredGoalValue}
 totalValue={unfilteredSummaryValue}
 startDate={chartData[0]?.date || new Date()}
 endDate={chartData[chartData.length - 1]?.date || new Date()}
 color={themeColor}
 />
 </div>
 </motion.div>

 <motion.div variants={itemVariants} className="bg-[#121214]/60 rounded-[32px] p-8 border border-white/[0.06] shadow-md relative overflow-hidden group">
 <div className="flex justify-between items-center mb-8">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-4 rounded-full bg-white/20" />
 <h3 className="text-[11px] font-[900] text-white/40 uppercase tracking-[0.2em]">
 {isTimeBased ? t('habits.detail.hoursWorked', 'HOURS WORKED') : t('habits.detail.progress', 'PROGRESS')}
 </h3>
 </div>
 <button className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all active:scale-90">
 <Share2 size={16} />
 </button>
 </div>

 <div className="flex justify-around mb-10">
 <div className="text-center">
 <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1.5">{t('common.total', 'Total')}</div>
 <div className="text-3xl font-[1000] text-white tracking-tight">
 <FormattedValue value={totalValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} className="justify-center" />
 </div>
 </div>
 <div className="w-[1px] h-10 bg-white/[0.06] self-center" />
 <div className="text-center">
 <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1.5">{t('common.average', 'Average')}</div>
 <div className="text-3xl font-[1000] text-white tracking-tight">
 <FormattedValue value={averageValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} className="justify-center" />
 </div>
 </div>
 </div>

 {/* Bar Chart - Ultra Visuals */}
 <div className={`h-60 flex items-end justify-between ${chartData.length > 30 ? 'gap-0' : chartData.length > 15 ? 'gap-0.5' : 'gap-2.5'} relative pl-2 pr-14 mt-4`}>
 {/* Y-Axis Labels (Right Side) */}
 <div className="absolute right-0 top-0 bottom-8 flex flex-col justify-between text-[10px] font-black text-white/30 text-right w-12">
 <span>{formatValue(maxChartValue, habit?.type, unitLabel, isTimeBased)}</span>
 <span>{formatValue(maxChartValue / 2, habit?.type, unitLabel, isTimeBased)}</span>
 <span>{isTimeBased ? '0h 00m' : '0'}</span>
 </div>

 {/* Grid Lines - Subtle */}
 <div className="absolute inset-0 right-12 bottom-8 flex flex-col justify-between pointer-events-none z-0 opacity-20">
 <div className="w-full border-t border-dashed border-white/30" />
 <div className="w-full border-t border-dashed border-white/30" />
 <div className="w-full border-t border-dashed border-white/30" />
 </div>

 {chartData.map((data: any, i: number) => {
 // Smart Label Visibility
 let showLabel = true;
 if (timeRange === 'TODAY') showLabel = true;
 else if (timeRange === '3_MONTHS') showLabel = i % 2 === 0;
 else if (timeRange === 'YEAR') showLabel = i % 2 === 0;
 else if (timeRange === '8_WEEKS') showLabel = i % 2 === 0;

 return (
 <div key={i} className="flex-1 flex flex-col items-center gap-4 z-10 h-full justify-end group/bar cursor-pointer pb-8 min-w-0">
 <div className="w-full max-w-[28px] h-[85%] relative flex items-end">
 {/* Tooltip on Hover */}
 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-[1000] px-2 py-1 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-md scale-75 group-hover/bar:scale-100 origin-bottom whitespace-nowrap">
 {formatValue(data.value, habit?.type, unitLabel, isTimeBased)}
 </div>
 
 <motion.div 
 variants={barVariants}
 style={{ 
 height: `${Math.max((data.value / maxChartValue) * 100, 4)}%`, 
 originY: 1,
 backgroundColor: data.isToday ? themeColor : themeColor,
 border: data.isToday ? `1px solid ${themeColor}` : `1px solid ${themeColor}`
 }}
 className="w-full rounded-t-xl rounded-b-md relative overflow-hidden transition-colors duration-200 group-hover/bar:brightness-110"
 >
 {/* Bar Inner Glow */}
 {data.isToday && (
 <motion.div 
 animate={{ opacity: [0.3, 0.6, 0.3] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="absolute inset-0 bg-white/20 pointer-events-none"
 />
 )}
 </motion.div>
 </div>
 <span className={cn(
 "absolute bottom-0 text-[8px] font-black uppercase text-white/20 tracking-tighter truncate w-full text-center transition-all duration-200",
 showLabel ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100 group-hover/bar:text-white/40"
 )}>
 {data.label}
 </span>
 </div>
 );
 })}
 </div>
 </motion.div>

 {/* 4. STATS GRID */}
 <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
 <StatCard 
 label={t('dashboard.sessions', 'Sessions')}
 value={totalSessions}
 />
 <StatCard
 label={t('dashboard.currentStreak', 'Current Streak')}
 value={`${streakDays} ${t('dashboard.days')}`}
 />
 {isPro && (
 <>
 <StatCard
 label={t('dashboard.averageSession', 'Average Session')}
 value={formatValue(averageValue, habit?.type, unitLabel, isTimeBased)}
 />
 <StatCard 
 label={t('dashboard.bestDay')}
 value={formatValue(bestDayValue, habit?.type, unitLabel, isTimeBased)}
 />
 </>
 )}
 {!isPro && (
 <>
 <StatCard
 label={
 <span className="flex items-center gap-1 justify-center">
 {t('dashboard.averageSession', 'Average Session')}
 <Lock size={10} className="text-yellow-400" />
 </span> as any
 }
 value={<span className="bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-x_6s_ease_infinite] bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400">DELUX</span> as any}
 onClick={() => onOpenPro && onOpenPro()}
 />
 <StatCard 
 label={
 <span className="flex items-center gap-1 justify-center">
 {t('dashboard.bestDay')}
 <Lock size={10} className="text-yellow-400" />
 </span> as any
 }
 value={<span className="bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-x_6s_ease_infinite] bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400">DELUX</span> as any}
 onClick={() => onOpenPro && onOpenPro()}
 />
 </>
 )}
 </motion.div>
 
 {/* Bottom Spacer */}
 <div className="h-10" />
 </motion.div>
 </div>
 </motion.div>

 {/* Delete Confirmation Modal */}
 <ConfirmationModal 
 isOpen={showDeleteConfirmation}
 onClose={() => setShowDeleteConfirmation(false)}
 onConfirm={() => {
 const targetId = habit?.id || project?.id;
 if (targetId && onDelete) {
 onDelete(targetId);
 onClose();
 }
 }}
 title={habit ? t('habits.deleteTitle', 'Delete Habit?') : t('projects.deleteTitle', 'Delete Project?')}
 message={t('common.deleteHabitConfirm', { title: habit?.title || project?.title })}
 confirmText={t('common.delete', 'Delete')}
 variant="danger"
 />

 <DateSelectionModal 
 isOpen={isDateModalOpen}
 onClose={() => setIsDateModalOpen(false)}
 onSelect={setCurrentDate}
 mode={['WEEK', 'MONTH', 'YEAR'].includes(timeRange) ? (timeRange as DateSelectionMode) : 'WEEK'}
 currentDate={currentDate}
 />
 </AnimatePresence>,
 document.body
 );
};
