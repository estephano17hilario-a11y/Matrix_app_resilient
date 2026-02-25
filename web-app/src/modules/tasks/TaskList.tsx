import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Flame, Plus, Filter, Calendar, Zap, CheckCircle2, Brain, Swords, X, Coins, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Quest, Attribute, Project } from '../../types';
import { SmartProject } from '../../types/SmartGoal';
import { DailyLimits } from '../../types/User';
import { DAILY_LIMITS } from '../dashboard/constants';
import { QuestItem } from './components/QuestItem';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

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
  onFocusProject?: (projectId: string) => void;
  onOpenNexus?: (smartProjectId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = React.memo(({ quests, attributes, projects, smartProjects, onCompleteQuest, onDeleteQuest, onEditQuest, onAddQuest, onFocusProject, onOpenNexus, dailyLimits }) => {
  const { t } = useTranslation();

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [traitFilter, setTraitFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'smart'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'S' | 'A' | 'B' | 'C'>('all');
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);
  const [isDailyCapsOpen, setIsDailyCapsOpen] = useState(true);

  const attributeMap = useMemo(() => new Map(attributes.map(attr => [attr.id, attr])), [attributes]);
  const projectMap = useMemo(() => new Map((projects || []).map(project => [project.id, project])), [projects]);
  const smartProjectMap = useMemo(() => new Map((smartProjects || []).map(project => [project.id, project])), [smartProjects]);

  const filteredQuests = useMemo(() => quests.filter(quest => {
    if (hideCompleted && quest.completed) return false;

    if (dateFilter !== 'all') {
      if (!quest.deadline) return false;
      const date = parseISO(quest.deadline);
      if (dateFilter === 'today' && !isToday(date)) return false;
      if (dateFilter === 'week' && !isThisWeek(date)) return false;
      if (dateFilter === 'month' && !isThisMonth(date)) return false;
    }

    if (traitFilter !== 'all' && quest.attribute !== traitFilter) return false;

    if (typeFilter === 'smart' && !quest.isSmartQuest) return false;
    if (typeFilter === 'normal' && quest.isSmartQuest) return false;

    if (difficultyFilter !== 'all' && quest.difficulty !== difficultyFilter) return false;

    return true;
  }), [quests, hideCompleted, dateFilter, traitFilter, typeFilter, difficultyFilter]);

  const sortedQuests = useMemo(() => {
    const list = [...filteredQuests];
    return list.sort((a, b) => {
      if (a.completed === b.completed) {
        if (a.deadline && b.deadline) {
          const timeDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          if (timeDiff !== 0) return timeDiff;
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;

        const difficultyRank = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
        const diffA = difficultyRank[a.difficulty] || 0;
        const diffB = difficultyRank[b.difficulty] || 0;
        return diffB - diffA;
      }
      return a.completed ? 1 : -1;
    });
  }, [filteredQuests]);

  const activeCount = useMemo(() => filteredQuests.filter(q => !q.completed).length, [filteredQuests]);
  const activeFiltersCount = useMemo(() => [
    dateFilter !== 'all',
    traitFilter !== 'all',
    typeFilter !== 'all',
    difficultyFilter !== 'all',
    !hideCompleted // Count only if we are SHOWING completed tasks (deviation from default)
  ].filter(Boolean).length, [dateFilter, traitFilter, typeFilter, difficultyFilter, hideCompleted]);

  const safeTaskXp = Math.max(0, Number(dailyLimits?.taskXp || 0));
  const safeTaskTraitPoints = Math.max(0, Number(dailyLimits?.taskTraitPoints || 0));
  const safeTaskGold = Math.max(0, Number(dailyLimits?.taskGold || 0));
  const maxTaskXp = DAILY_LIMITS.TASKS.XP;
  const maxTaskTraitPoints = DAILY_LIMITS.TASKS.TRAIT_POINTS;
  const maxTaskGold = DAILY_LIMITS.TASKS.GOLD;
  const maxGoldLabel = maxTaskGold >= 999999 ? '∞' : Math.round(maxTaskGold).toString();

  // Refs for Camera Movement
  const headerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const isVirtualized = sortedQuests.length > 20;
  const rowHeight = 120;
  const overscan = 6;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      const nextScrollTop = target.scrollTop;
      if (nextScrollTop !== lastScrollTopRef.current) {
        lastScrollTopRef.current = nextScrollTop;
        setScrollTop(nextScrollTop);
      }
    });
  }, []);

  useEffect(() => {
    if (!isVirtualized) return;
    const element = listRef.current;
    if (!element) return;
    const updateSize = () => setViewportHeight(element.clientHeight);
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isVirtualized]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    if (showFilters) {
      // Camera Down: Focus on filters
      setTimeout(() => {
        filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      // Camera Up: Return to header
      headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showFilters]);

  const resetFilters = () => {
      setDateFilter('all');
      setTraitFilter('all');
      setTypeFilter('all');
      setDifficultyFilter('all');
      setHideCompleted(true);
  };

  const totalHeight = isVirtualized ? sortedQuests.length * rowHeight : 0;
  const startIndex = isVirtualized ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan) : 0;
  const endIndex = isVirtualized
    ? Math.min(sortedQuests.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan)
    : sortedQuests.length;
  const visibleQuests = isVirtualized ? sortedQuests.slice(startIndex, endIndex) : sortedQuests;

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-hidden">
      
      {/* HEADER GROUP (Fixed) */}
      <div className="flex-none z-30 bg-transparent pt-2 pb-2 -mx-2 px-2">
          {dailyLimits && (
            <div className="px-1 mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
                    <Zap size={10} className="text-cyan-300" />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Topes diarios</span>
                </div>
                <button
                  onClick={() => setIsDailyCapsOpen(prev => !prev)}
                  className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <ChevronDown size={12} className={cn("transition-transform duration-300", isDailyCapsOpen ? "rotate-180" : "rotate-0")} />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {isDailyCapsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scaleY: 0.98 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -4, scaleY: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="origin-top rounded-xl bg-transparent px-2 py-2"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
                            <Zap size={10} />
                            XP
                          </div>
                          <span className="text-[9px] font-mono text-white/60 tabular-nums">{Math.round(safeTaskXp)}/{maxTaskXp}</span>
                        </div>
                        <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${maxTaskXp > 0 ? Math.min(100, (safeTaskXp / maxTaskXp) * 100) : 0}%` }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400"
                          />
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-fuchsia-300 uppercase tracking-wider">
                            <Brain size={10} />
                            TP
                          </div>
                          <span className="text-[9px] font-mono text-white/60 tabular-nums">{Math.round(safeTaskTraitPoints)}/{maxTaskTraitPoints}</span>
                        </div>
                        <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${maxTaskTraitPoints > 0 ? Math.min(100, (safeTaskTraitPoints / maxTaskTraitPoints) * 100) : 0}%` }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="h-full bg-gradient-to-r from-fuchsia-400 to-violet-400"
                          />
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-300 uppercase tracking-wider">
                            <Coins size={10} />
                            Coins
                          </div>
                          <span className="text-[9px] font-mono text-white/60 tabular-nums">{Math.round(safeTaskGold)}/{maxGoldLabel}</span>
                        </div>
                        <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${maxTaskGold > 0 ? Math.min(100, (safeTaskGold / maxTaskGold) * 100) : 0}%` }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="h-full bg-gradient-to-r from-amber-400 to-yellow-300"
                          />
                        </div>
                      </div>
                    </div>
                    {safeTaskXp >= maxTaskXp && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-medium text-emerald-400/80">
                        <CheckCircle2 size={10} />
                        Límite de XP alcanzado. Solo ganarás Coins.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ACTIVE MISSIONS HEADER */}
          <div ref={headerRef} className="scroll-mt-24 px-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2">
                {t('dashboard.activeMissions')}
              </h2>
              
              <div className="flex items-center gap-2 ml-auto">
                {/* Counter */}
                <div className="bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <Flame size={10} className="text-orange-400 fill-orange-400" />
                  <span className="text-[10px] font-black text-orange-400">
                    {activeCount}
                  </span>
                </div>

                {/* Filter Toggle */}
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

            {/* FILTERS PANEL */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden origin-top"
                >
                  <div ref={filtersRef} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-5 shadow-md relative mb-4">
                    
                    {/* Reset Button */}
                    <button 
                        onClick={resetFilters}
                        className="absolute top-4 right-4 text-[10px] text-white/30 hover:text-white/60 uppercase font-bold tracking-wider flex items-center gap-1"
                    >
                        <X size={10} /> Clear
                    </button>

                    {/* Date Filter */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={10} />
                        {t('tasks.filterDate', 'Timeline')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: t('tasks.all', 'All') },
                          { id: 'today', label: t('tasks.today', 'Today') },
                          { id: 'week', label: t('tasks.week', 'Week') },
                          { id: 'month', label: t('tasks.month', 'Month') }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setDateFilter(opt.id as any)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                              dateFilter === opt.id
                                ? "bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                                : "bg-transparent border-transparent text-white/40 hover:bg-white/5 hover:text-white/60"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
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
                            {t(attr.label, attr.label)}
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
                                    { id: 'all', label: 'ALL' },
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
                                    { id: 'all', label: 'ALL' },
                                    { id: 'normal', label: 'Normal' },
                                    { id: 'smart', label: 'Smart' }
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
                                {t('tasks.status', 'Status')}
                            </label>
                             <button
                                onClick={() => setHideCompleted(!hideCompleted)}
                                className={cn(
                                    "w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between border",
                                    hideCompleted
                                    ? "bg-white/5 border-white/10 text-white/60"
                                    : "bg-green-500/10 border-green-500/20 text-green-400"
                                )}
                                >
                                <span>{t('tasks.hideCompleted', 'Hide Done')}</span>
                                <div className={cn(
                                    "w-6 h-3.5 rounded-full p-0.5 transition-colors relative",
                                    hideCompleted ? "bg-white/10" : "bg-green-500/20"
                                )}>
                                    <div className={cn(
                                    "w-2.5 h-2.5 rounded-full shadow-sm transition-transform",
                                    hideCompleted ? "bg-white/40 translate-x-0" : "bg-green-400 translate-x-2.5"
                                    )} />
                                </div>
                            </button>
                        </div>

                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </div>

      <div className="flex flex-col pb-32 gap-3 flex-1 min-h-0">
          {isVirtualized ? (
            <div ref={listRef} onScroll={handleScroll} className="relative flex-1 min-h-0 overflow-y-auto pr-1">
              <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleQuests.map((quest, i) => {
                  const index = startIndex + i;
                  return (
                    <div key={quest.id} style={{ position: 'absolute', top: index * rowHeight, left: 0, right: 0 }}>
                      <QuestItem 
                        quest={quest} 
                        attribute={attributeMap.get(quest.attribute)} 
                        project={quest.projectId ? projectMap.get(quest.projectId) : undefined}
                        smartProject={quest.smartProjectId ? smartProjectMap.get(quest.smartProjectId) : undefined}
                        onComplete={onCompleteQuest} 
                        onDelete={onDeleteQuest}
                        onEdit={onEditQuest}
                        onFocusProject={onFocusProject}
                        onOpenNexus={onOpenNexus}
                        isLite
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="relative flex-1 min-h-0 overflow-y-auto pr-1 no-scrollbar">
              <AnimatePresence mode="sync">
                {sortedQuests.map((quest) => (
                    <motion.div
                        key={quest.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '180px' }}
                    >
                        <QuestItem 
                            quest={quest} 
                            attribute={attributeMap.get(quest.attribute)} 
                            project={quest.projectId ? projectMap.get(quest.projectId) : undefined}
                            smartProject={quest.smartProjectId ? smartProjectMap.get(quest.smartProjectId) : undefined}
                            onComplete={onCompleteQuest} 
                            onDelete={onDeleteQuest}
                            onEdit={onEditQuest}
                            onFocusProject={onFocusProject}
                            onOpenNexus={onOpenNexus}
                        />
                    </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          
          {sortedQuests.length === 0 && (
             <div className="py-10 text-center text-white/20 italic">
                {t('tasks.empty', 'No missions found')}
             </div>
          )}
      </div>
    </div>
  );
});
