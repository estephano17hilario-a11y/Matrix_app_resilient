import React, { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Target, Plus, Filter, Calendar, Zap, CheckCircle2, Circle, Brain, Swords, X, Coins, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Quest, Attribute, Project } from '../../types';
import { SmartProject } from '../../types/SmartGoal';
import { DailyLimits } from '../../types/User';
import { DAILY_LIMITS } from '../dashboard/constants';
import { QuestItem } from './components/QuestItem';
import { isWithinInterval, isSameDay, format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, addYears, subYears } from 'date-fns';
import { startOfWeek, endOfWeek, parseLocalDate, toLocalISOString } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { DateSelectionModal } from '../dashboard/components/DateSelectionModal';
import { es } from 'date-fns/locale';
import { TourLightbulb } from '../../components/TourLightbulb';

interface TaskListProps {
 quests: Quest[];
 attributes: Attribute[];
 projects?: Project[];
 smartProjects?: SmartProject[];
 dailyLimits?: DailyLimits;
 onCompleteQuest: (e: React.MouseEvent, q: Quest) => void;
 onDeleteQuest?: (id: string) => void;
 onEditQuest?: (quest: Quest) => void;
 onAddQuest?: () => void;
 onFocusProject?: (projectId: string, taskId?: string) => void;
 defaultChartViews?: any;
}

// Optimization: Memoized Item Wrapper
const MemoizedQuestItem = React.memo(QuestItem);

export const TaskList: React.FC<TaskListProps> = React.memo(({ quests, attributes, projects, smartProjects, onCompleteQuest, onDeleteQuest, onEditQuest, onAddQuest, onFocusProject, dailyLimits, defaultChartViews }) => {
 const { t } = useTranslation();

 // Filters
 const [showFilters, setShowFilters] = useState(false);
 const { profile } = useAuth();
 const defaultTaskFilters = profile?.defaultTaskFilters || {};
 const [timeframe, setTimeframe] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR'>(defaultTaskFilters.timeframe || defaultChartViews?.tasks || 'ALL');
 const [currentDate, setCurrentDate] = useState(new Date());
 const [isDateModalOpen, setIsDateModalOpen] = useState(false);

 const [traitFilter, setTraitFilter] = useState<string>(defaultTaskFilters.traitFilter || 'all');
 const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'smart'>(defaultTaskFilters.typeFilter || 'all');
 const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'S' | 'A' | 'B' | 'C'>(defaultTaskFilters.difficultyFilter || 'all');
 const [hideCompleted, setHideCompleted] = useState<boolean>(defaultTaskFilters.hideCompleted ?? true);
 const [isDailyCapsOpen, setIsDailyCapsOpen] = useState(profile?.defaultChartVisibility?.tasks !== false);

 // Optimization: Memoize maps only when inputs change
 const attributeMap = useMemo(() => new Map(attributes.map(attr => [attr.id, attr])), [attributes]);
 const projectMap = useMemo(() => new Map((projects || []).map(project => [project.id, project])), [projects]);
 const smartProjectMap = useMemo(() => new Map((smartProjects || []).map(project => [project.id, project])), [smartProjects]);

 // Optimization: Stable date references for filtering to avoid re-calculating on every render if not needed
 const dateRange = useMemo(() => {
 if (timeframe === 'DAY') return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
 if (timeframe === 'WEEK') return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
 if (timeframe === 'MONTH') return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
 if (timeframe === '3_MONTHS') return { start: startOfMonth(subMonths(currentDate, 2)), end: endOfMonth(currentDate) };
 if (timeframe === 'YEAR') return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
 return null;
 }, [timeframe, currentDate]);

 const filteredQuests = useMemo(() => {
 return quests.filter(quest => {
 // Fast check: Completion status
 if (hideCompleted && quest.completed) return false;

 // Filter by Timeframe - Optimization: reduce date parsing
 if (timeframe !== 'ALL' && dateRange) {
 if (!quest.deadline) return false;
 const qDate = parseLocalDate(quest.deadline);
 
 if (timeframe === 'DAY') {
 if (!isSameDay(qDate, dateRange.start as Date)) return false;
 } else if (timeframe === 'WEEK' || timeframe === 'MONTH' || timeframe === '3_MONTHS' || timeframe === 'YEAR') {
 if (!isWithinInterval(qDate, { start: dateRange.start as Date, end: dateRange.end as Date })) return false;
 }
 }

 // Fast checks: strings/enums
 if (traitFilter !== 'all' && quest.attribute !== traitFilter) return false;
 if (typeFilter === 'smart' && !quest.isSmartQuest) return false;
 if (typeFilter === 'normal' && quest.isSmartQuest) return false;
 if (difficultyFilter !== 'all' && quest.difficulty !== difficultyFilter) return false;

 return true;
 });
 }, [quests, hideCompleted, timeframe, dateRange, traitFilter, typeFilter, difficultyFilter]);

 // Optimization: Separate sorting from filtering to memoize efficiently
  const sortedQuests = useMemo(() => {
    // Create a new array to avoid mutating the filtered one
    const list = [...filteredQuests];
    const todayStr = toLocalISOString(new Date());
    
    return list.sort((a, b) => {
      // 1. Completion status: completed tasks go to the bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 2. Overdue status: non-completed overdue tasks go to the top
      const overdueA = !a.completed && a.deadline && a.deadline < todayStr;
      const overdueB = !b.completed && b.deadline && b.deadline < todayStr;
      if (overdueA !== overdueB) {
        return overdueA ? -1 : 1;
      }
      
      // 3. Chronological: closest deadline first (most actual)
      if (a.deadline && b.deadline) {
        const timeDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (timeDiff !== 0) return timeDiff;
      } else if (a.deadline && !b.deadline) {
        return -1;
      } else if (!a.deadline && b.deadline) {
        return 1;
      }
      
      // 4. Difficulty / Importance: S > A > B > C
      const difficultyRank = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
      const diffA = difficultyRank[a.difficulty as keyof typeof difficultyRank] || 0;
      const diffB = difficultyRank[b.difficulty as keyof typeof difficultyRank] || 0;
      if (diffB !== diffA) {
        return diffB - diffA;
      }
      
      // 5. Duration / Task Time: estimatedTime descending
      const timeA = a.estimatedTime || 0;
      const timeB = b.estimatedTime || 0;
      return timeB - timeA;
    });
  }, [filteredQuests]);

 // Date Label Logic
 const dateRangeLabel = useMemo(() => {
 if (timeframe === 'ALL') return t('tasks.all', 'All Time');
 if (timeframe === 'DAY') return format(currentDate, 'EEEE d MMM', { locale: es });
 if (timeframe === 'WEEK') {
 const start = startOfWeek(currentDate);
 const end = endOfWeek(currentDate);
 return `${format(start, 'd MMM').toUpperCase()} - ${format(end, 'd MMM', { locale: es }).toUpperCase()}`;
 }
 if (timeframe === 'MONTH') {
 const monthName = format(currentDate, 'MMMM', { locale: es });
 return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${format(currentDate, 'yyyy')}`;
 }
 if (timeframe === '3_MONTHS') {
 const start = subMonths(currentDate, 2);
 const startMonth = format(start, 'MMM', { locale: es });
 const endMonth = format(currentDate, 'MMM', { locale: es });
 return `${startMonth.toUpperCase()} - ${endMonth.toUpperCase()} ${format(currentDate, 'yyyy')}`;
 }
 if (timeframe === 'YEAR') {
 return format(currentDate, 'yyyy');
 }
 return '';
 }, [timeframe, currentDate, t]);

 const handleNext = useCallback(() => {
 if (timeframe === 'DAY') setCurrentDate(d => addDays(d, 1));
 if (timeframe === 'WEEK') setCurrentDate(d => addWeeks(d, 1));
 if (timeframe === 'MONTH') setCurrentDate(d => addMonths(d, 1));
 if (timeframe === '3_MONTHS') setCurrentDate(d => addMonths(d, 3));
 if (timeframe === 'YEAR') setCurrentDate(d => addYears(d, 1));
 }, [timeframe]);

 const handlePrev = useCallback(() => {
 if (timeframe === 'DAY') setCurrentDate(d => subDays(d, 1));
 if (timeframe === 'WEEK') setCurrentDate(d => subWeeks(d, 1));
 if (timeframe === 'MONTH') setCurrentDate(d => subMonths(d, 1));
 if (timeframe === '3_MONTHS') setCurrentDate(d => subMonths(d, 3));
 if (timeframe === 'YEAR') setCurrentDate(d => subYears(d, 1));
 }, [timeframe]);

 const handleDateSelect = useCallback((date: Date) => {
 setCurrentDate(date);
 if (timeframe === 'ALL') setTimeframe('WEEK');
 }, [timeframe]);

 const activeCount = filteredQuests.length; // Approximate active count based on view
 const activeFiltersCount = [
 timeframe !== 'ALL',
 traitFilter !== 'all',
 typeFilter !== 'all',
 difficultyFilter !== 'all',
 !hideCompleted 
 ].filter(Boolean).length;

 // Refs for Camera Movement
 const headerRef = useRef<HTMLDivElement>(null);
 const filtersRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (showFilters) {
 setTimeout(() => {
 filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
 }, 100);
 } else {
 headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
 }
 }, [showFilters]);

 const resetFilters = useCallback(() => {
 setTimeframe(defaultTaskFilters.timeframe || 'ALL');
 setCurrentDate(new Date());
 setTraitFilter(defaultTaskFilters.traitFilter || 'all');
 setTypeFilter(defaultTaskFilters.typeFilter || 'all');
 setDifficultyFilter(defaultTaskFilters.difficultyFilter || 'all');
 setHideCompleted(defaultTaskFilters.hideCompleted ?? true);
 }, [defaultTaskFilters]);

 // VIRTUALIZATION LOGIC
 const listContainerRef = useRef<HTMLDivElement>(null);
 const ITEM_ESTIMATE = 160; // Reduced slightly to ensure density
 const OVERSCAN = 5;
 const [scrollTop, setScrollTop] = useState(0);
 const [viewportHeight, setViewportHeight] = useState(600); // Default estimate

 // Only virtualize if list is long enough
 const isVirtualized = sortedQuests.length > 20;

 const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
 const target = e.currentTarget;
 // Use requestAnimationFrame to debounce state updates
 requestAnimationFrame(() => {
 setScrollTop(target.scrollTop);
 });
 }, []);

 // Measure viewport on mount/resize
 useLayoutEffect(() => {
 const el = listContainerRef.current;
 if (!el) return;
 
 const measure = () => setViewportHeight(el.clientHeight);
 measure();
 
 const observer = new ResizeObserver(measure);
 observer.observe(el);
 return () => observer.disconnect();
 }, []);

 const { virtualItems, paddingTop, paddingBottom } = useMemo(() => {
 if (!isVirtualized) {
 return { 
 virtualItems: sortedQuests, 
 totalHeight: 'auto', 
 paddingTop: 0, 
 paddingBottom: 0 
 };
 }

 const totalHeightVal = sortedQuests.length * ITEM_ESTIMATE;
 const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_ESTIMATE) - OVERSCAN);
 const endIndex = Math.min(
 sortedQuests.length,
 Math.ceil((scrollTop + viewportHeight) / ITEM_ESTIMATE) + OVERSCAN
 );

 const virtualItems = sortedQuests.slice(startIndex, endIndex);
 const paddingTop = startIndex * ITEM_ESTIMATE;
 const paddingBottom = Math.max(0, totalHeightVal - (endIndex * ITEM_ESTIMATE));

 return { virtualItems, totalHeight: totalHeightVal, paddingTop, paddingBottom };
 }, [sortedQuests, scrollTop, viewportHeight, isVirtualized]);

 const safeTaskXp = Math.max(0, Number(dailyLimits?.taskXp || 0));
 const safeTaskTraitPoints = Math.max(0, Number(dailyLimits?.taskTraitPoints || 0));
 const safeTaskGold = Math.max(0, Number(dailyLimits?.taskGold || 0));
 const maxTaskXp = DAILY_LIMITS.TASKS.XP;
 const maxTaskTraitPoints = DAILY_LIMITS.TASKS.TRAIT_POINTS;
 const maxTaskGold = DAILY_LIMITS.TASKS.GOLD;
 const maxGoldLabel = maxTaskGold >= 999999 ? '∞' : Math.round(maxTaskGold).toString();

 return (
 <div className="flex flex-col gap-3 h-full w-full">
 
 {/* HEADER GROUP */}
 <div className="flex-none pt-1 pb-2 -mx-2 px-2 border-b border-white/5 transition-all duration-200">
 {dailyLimits && (
 <div className="px-1">
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-2">
 <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
 <Zap size={10} className="text-cyan-300" />
 </div>
 <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('common.dailyCaps')}</span>
 </div>
 <button
 onClick={() => setIsDailyCapsOpen(prev => !prev)}
 className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
 >
 <ChevronDown size={12} className={cn("transition-transform duration-200", isDailyCapsOpen ? "rotate-180" : "rotate-0")} />
 </button>
 </div>
 <AnimatePresence initial={false}>
 {isDailyCapsOpen && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="grid grid-cols-3 gap-2 py-1.5">
 <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
 <Zap size={10} />
 {t('common.xp', 'XP')}
 </div>
 <span className="text-[9px] font-mono text-white/60 tabular-nums">{Math.round(safeTaskXp)}/{maxTaskXp}</span>
 </div>
 <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
 <motion.div
 className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 origin-left"
 initial={{ scaleX: 0 }}
 animate={{ scaleX: maxTaskXp > 0 ? Math.min(1, safeTaskXp / maxTaskXp) : 0 }}
 transition={{ type: "spring", stiffness: 350, damping: 20 }}
 style={{ width: '100%' }}
 />
 </div>
 </div>
 <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1 text-[9px] font-bold text-fuchsia-300 uppercase tracking-wider">
 <Brain size={10} />
 {t('common.tp', 'TP')}
 </div>
 <span className="text-[9px] font-mono text-white/60 tabular-nums">{Math.round(safeTaskTraitPoints)}/{maxTaskTraitPoints}</span>
 </div>
 <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
 <motion.div
 className="h-full bg-gradient-to-r from-fuchsia-400 to-violet-400 origin-left"
 initial={{ scaleX: 0 }}
 animate={{ scaleX: maxTaskTraitPoints > 0 ? Math.min(1, safeTaskTraitPoints / maxTaskTraitPoints) : 0 }}
 transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.1 }}
 style={{ width: '100%' }}
 />
 </div>
 </div>
 <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1 text-[9px] font-bold text-amber-300 uppercase tracking-wider">
 <Coins size={10} />
 {t('common.coins', 'Coins')}
 </div>
 <span className="text-[9px] font-mono text-white/60 tabular-nums">{Math.round(safeTaskGold)}/{maxGoldLabel}</span>
 </div>
 <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
 <div
 className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 origin-left transition-all duration-200"
 style={{ width: `${maxTaskGold > 0 ? Math.min(100, (safeTaskGold / maxTaskGold) * 100) : 0}%` }}
 />
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}

 {/* ACTIVE MISSIONS HEADER */}
 <div ref={headerRef} data-tour="tasks-header" className="scroll-mt-24 px-1">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2">
 {t('dashboard.activeMissions')}
 </h2>

 <div className="flex items-center gap-2">
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={cn(
 "w-8 h-8 flex items-center justify-center rounded-full transition-all relative",
 showFilters 
 ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
 : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
 )}
 >
 <Filter size={14} />
 {!showFilters && activeFiltersCount > 0 && (
 <span className="absolute -top-1 -right-1 w-3 h-3 bg-theme-avatar rounded-full border border-black flex items-center justify-center text-[8px] text-white font-bold">
 {activeFiltersCount}
 </span>
 )}
 </button>

 <div data-tour="tasks-counter" className="bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
 <Target size={10} className="text-orange-400" />
 <span className="text-[10px] font-black text-orange-400">
 {activeCount}
 </span>
 </div>

 <TourLightbulb tourId="tasks" />

 {onAddQuest && (
 <button 
 onClick={onAddQuest}
 className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors"
 >
 <Plus size={16} />
 </button>
 )}
 </div>
 </div>

 {/* FILTERS PANEL - Simplified Animation */}
 {showFilters && (
 <div className="overflow-hidden origin-top animate-in fade-in slide-in-from-top-2 duration-200">
 {/* 💸 AHORRO MÁXIMO UI: Reducimos el desenfoque a bg-black/60 para cuidar la GPU en móviles y evitar pantallazos negros */}
 <div ref={filtersRef} className="bg-black/60 border border-white/10 rounded-xl p-4 space-y-5 shadow-md relative mb-4">
 
 {/* Reset Button */}
 <button 
 onClick={resetFilters}
 className="absolute top-4 right-4 text-[10px] text-white/30 hover:text-white/60 uppercase font-bold tracking-wider flex items-center gap-1"
 >
 <X size={10} /> {t('tasks.clear', 'Clear')}
 </button>

 {/* Date Filter */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Calendar size={10} />
 {t('tasks.filterDate', 'Timeline')}
 </label>
 <div className="flex flex-col gap-2">
 
 {/* Tabs Row */}
 <div className="flex flex-wrap items-center gap-3">
 {/* Tabs */}
 <div className="flex p-0.5 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
 {(['ALL', 'DAY', 'WEEK', 'MONTH', '3_MONTHS', 'YEAR'] as const).map((tf) => (
 <button
 key={tf}
 onClick={() => setTimeframe(tf)}
 className={cn(
 "relative px-3 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 z-10",
 timeframe === tf ? "text-white" : "text-white/40 hover:text-white/70"
 )}
 >
 {timeframe === tf && (
 <motion.div
 layoutId="timeframeTab"
 className="absolute inset-0 bg-white/10 rounded-md border border-white/20"
 transition={{ type: "spring", bounce: 0.2, duration: 0.2 }}
 />
 )}
 <span className="relative z-20">{t(`tasks.filterDateTabs.${tf}`, tf.replace('_', ' '))}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Navigator Row (Only if NOT ALL) */}
 {timeframe !== 'ALL' && (
 <div className="flex items-center gap-2">
 {/* Navigator */}
 <div className="flex items-center bg-[#1c1c1e] rounded-lg border border-white/10 p-0.5 shrink-0">
 <button 
 onClick={handlePrev}
 className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
 >
 <ChevronLeft size={14} />
 </button>
 
 <div className="px-2 min-w-[80px] text-center">
 <span className="text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
 {dateRangeLabel}
 </span>
 </div>

 <button 
 onClick={handleNext}
 className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
 >
 <ChevronRight size={14} />
 </button>
 </div>

 {/* Blue Date Button (Now separate and simplified) */}
 <button 
 onClick={() => setIsDateModalOpen(true)}
 className="h-8 px-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)] shrink-0"
 >
 <Calendar size={12} />
 <span>
 {format(currentDate, 'MMMM yyyy', { locale: es })}
 </span>
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Trait Filter */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Zap size={10} />
 {t('tasks.filterTrait', 'Attribute')}
 </label>
 <div className="flex flex-wrap gap-1.5">
 <button
 onClick={() => setTraitFilter('all')}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
 traitFilter === 'all'
 ? "bg-white/10 border-white/20 text-white"
 : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
 )}
 >
 {t('tasks.all', 'All')}
 </button>
 {attributes.map(attr => (
 <button
 key={attr.id}
 onClick={() => setTraitFilter(attr.id)}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border",
 traitFilter === attr.id
 ? "bg-white/10 border-white/20 text-white shadow-lg"
 : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
 )}
 style={traitFilter === attr.id ? { borderColor: attr.color, color: attr.color, boxShadow: `0 0 10px ${attr.color}20` } : {}}
 >
 <span 
 className="w-1.5 h-1.5 rounded-full"
 style={{ backgroundColor: attr.color }} 
 />
 {t(attr.label, attr.label.replace('traits.', ''))}
 </button>
 ))}
 </div>
 </div>

 {/* Grid for Type, Difficulty, Status */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 
 {/* Difficulty */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Swords size={10} />
 {t('tasks.difficulty', 'Difficulty')}
 </label>
 <div className="flex flex-wrap gap-1.5">
 {[
 { id: 'all', label: t('tasks.all', 'ALL') },
 { id: 'S', label: 'S', color: 'text-purple-400' },
 { id: 'A', label: 'A', color: 'text-red-400' },
 { id: 'B', label: 'B', color: 'text-orange-400' },
 { id: 'C', label: 'C', color: 'text-blue-400' },
 ].map(opt => (
 <button
 key={opt.id}
 onClick={() => setDifficultyFilter(opt.id as any)}
 className={cn(
 "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
 difficultyFilter === opt.id
 ? "bg-white/10 border-white/20 text-white"
 : "bg-transparent border-transparent text-white/30 hover:bg-white/5"
 )}
 >
 <span className={opt.color}>{opt.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Type */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Brain size={10} />
 {t('tasks.filterType', 'Type')}
 </label>
 <div className="flex flex-wrap gap-1.5">
 {[
 { id: 'all', label: t('tasks.all', 'ALL') },
 { id: 'normal', label: t('tasks.normal', 'Normal') },
 { id: 'smart', label: t('tasks.smart', 'Smart') }
 ].map(opt => (
 <button
 key={opt.id}
 onClick={() => setTypeFilter(opt.id as any)}
 className={cn(
 "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
 typeFilter === opt.id
 ? "bg-white/10 border-white/20 text-white"
 : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Status */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <CheckCircle2 size={10} />
 {t('tasks.hideCompleted', 'Hide Completed')}
 </label>
 <button
 onClick={() => setHideCompleted(!hideCompleted)}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-bold transition-all w-full flex items-center justify-center gap-2",
 hideCompleted 
 ? "bg-white/10 text-white shadow-lg border border-white/20" 
 : "bg-transparent text-white/30 border border-white/5 hover:bg-white/5"
 )}
 >
 {hideCompleted ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Circle size={14} />}
 {t('tasks.hideCompleted', 'Hide Completed')}
 </button>
 </div>

 </div>

 </div>
 </div>
 )}
 </div>
 </div>

 <div 
 ref={listContainerRef} 
 onScroll={handleScroll}
 className="flex flex-col pb-24 gap-3 flex-1 min-h-0"
 >
 {sortedQuests.length === 0 ? (
 <div className="py-10 text-center text-white/20 italic">
 {t('tasks.empty', 'No missions found')}
 </div>
 ) : (
 <>
 {paddingTop > 0 && <div style={{ height: paddingTop }} />}
 <div data-tour="task-list">
 {virtualItems.map((quest) => (
 <div
 key={quest.id}
 className="w-full"
 style={{
 contentVisibility: 'auto',
 containIntrinsicSize: '160px',
 }}
 >
 <MemoizedQuestItem 
 quest={quest} 
 attribute={attributeMap.get(quest.attribute)} 
 project={quest.projectId ? projectMap.get(quest.projectId) : undefined}
 smartProject={quest.smartProjectId ? smartProjectMap.get(quest.smartProjectId) : undefined}
 onComplete={onCompleteQuest} 
 onDelete={onDeleteQuest}
 onEdit={onEditQuest}
 onFocusProject={onFocusProject}
 isLite
 />
 </div>
 ))}
 </div>
 {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
 </>
 )}
 </div>

 <DateSelectionModal 
 isOpen={isDateModalOpen}
 onClose={() => setIsDateModalOpen(false)}
 onSelect={handleDateSelect}
 mode={timeframe === 'MONTH' ? 'MONTH' : timeframe === 'DAY' ? 'DAY' : 'WEEK'}
 currentDate={currentDate}
 />
 </div>
 );
}, (prev, next) => {
 // Custom comparison for React.memo to prevent unnecessary re-renders
 // Only re-render if key props change
 if (prev.quests === next.quests && 
 prev.attributes === next.attributes && 
 prev.dailyLimits === next.dailyLimits &&
 prev.projects === next.projects &&
 prev.smartProjects === next.smartProjects) {
 return true; // Props are equal, don't re-render
 }
 return false;
});
