import React, { useState } from 'react';
import { Flame, Plus, Filter, Calendar, Zap, CheckCircle2, Brain, Swords, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Quest, Attribute, Project } from '../../types';
import { QuestItem } from './components/QuestItem';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface TaskListProps {
  quests: Quest[];
  attributes: Attribute[];
  projects?: Project[];
  onCompleteQuest: (e: React.MouseEvent, q: Quest) => void;
  onDeleteQuest?: (id: string) => void;
  onEditQuest?: (quest: Quest) => void;
  onAddQuest?: () => void;
  onFocusProject?: (projectId: string) => void;
  onOpenNexus?: (smartProjectId: string) => void;
  onOpenWizard?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({ quests, attributes, projects, onCompleteQuest, onDeleteQuest, onEditQuest, onAddQuest, onFocusProject, onOpenNexus }) => {
  const { t } = useTranslation();

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [traitFilter, setTraitFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'smart'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'S' | 'A' | 'B' | 'C'>('all');
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);

  // Filter Logic
  const filteredQuests = quests.filter(quest => {
    // 1. Completed
    if (hideCompleted && quest.completed) return false;

    // 2. Date
    if (dateFilter !== 'all') {
      if (!quest.deadline) return false;
      const date = parseISO(quest.deadline);
      if (dateFilter === 'today' && !isToday(date)) return false;
      if (dateFilter === 'week' && !isThisWeek(date)) return false;
      if (dateFilter === 'month' && !isThisMonth(date)) return false;
    }

    // 3. Trait
    if (traitFilter !== 'all' && quest.attribute !== traitFilter) return false;

    // 4. Type
    if (typeFilter === 'smart' && !quest.isSmartQuest) return false;
    if (typeFilter === 'normal' && quest.isSmartQuest) return false;

    // 5. Difficulty
    if (difficultyFilter !== 'all' && quest.difficulty !== difficultyFilter) return false;

    return true;
  });

  // Sort: Active first, then by deadline, then by difficulty (S > A > B > C)
  const sortedQuests = filteredQuests.sort((a, b) => {
    if (a.completed === b.completed) {
       // Priority: Deadline -> Difficulty -> Creation (implicit)
       if (a.deadline && b.deadline) {
         const timeDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
         if (timeDiff !== 0) return timeDiff;
       }
       if (a.deadline && !b.deadline) return -1;
       if (!a.deadline && b.deadline) return 1;

       // Difficulty sort if no deadline difference
       const difficultyRank = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
       const diffA = difficultyRank[a.difficulty] || 0;
       const diffB = difficultyRank[b.difficulty] || 0;
       return diffB - diffA; // Higher rank first
    }
    return a.completed ? 1 : -1;
  });

  const activeCount = filteredQuests.filter(q => !q.completed).length;
  const activeFiltersCount = [
    dateFilter !== 'all',
    traitFilter !== 'all',
    typeFilter !== 'all',
    difficultyFilter !== 'all',
    hideCompleted
  ].filter(Boolean).length;

  const resetFilters = () => {
      setDateFilter('all');
      setTraitFilter('all');
      setTypeFilter('all');
      setDifficultyFilter('all');
      setHideCompleted(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ACTIVE MISSIONS HEADER */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
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
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-5 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] relative">
                
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
                        {attr.label}
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
        
        <div className="flex flex-col pb-32 gap-3">
          <AnimatePresence mode='popLayout'>
            {sortedQuests.map((quest) => (
                <motion.div
                    key={quest.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                    <QuestItem 
                        quest={quest} 
                        attribute={attributes.find(a => a.id === quest.attribute)} 
                        project={projects?.find(p => p.id === quest.projectId)}
                        onComplete={onCompleteQuest} 
                        onDelete={onDeleteQuest}
                        onEdit={onEditQuest}
                        onFocusProject={onFocusProject}
                        onOpenNexus={onOpenNexus}
                    />
                </motion.div>
            ))}
          </AnimatePresence>
          
          {sortedQuests.length === 0 && (
             <div className="py-10 text-center text-white/20 italic">
                {t('tasks.empty', 'No missions found')}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
