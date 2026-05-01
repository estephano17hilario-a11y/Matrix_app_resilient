import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Target, 
    Calendar, 
    Zap, 
    Flag, 
    ChevronRight, 
    CheckCircle2,
    Circle,
    Edit2,
    Trophy,
    Save,
    X,
    Clock,
    Trash2,
    Sparkles,
    ChevronUp,
    ChevronDown,
    LayoutList,
    Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StrategicNode, SmartProject, TimeFrame } from '../../../types/SmartGoal';
import { Attribute, Quest } from '../../../types'; 
import { QuestItem } from '../../tasks/components/QuestItem';
import { Timestamp } from '@/services/supabase';
import { cn } from '../../../utils/cn';
import { formatDate, getContextDates, toLocalISOString } from '../../../utils/dateUtils';
import { differenceInDays } from 'date-fns';
import { TRAITS_LIST } from '../../dashboard/constants';

interface StrategicMapViewProps {
  project: SmartProject;
  quests?: Quest[]; 
  attributes?: Attribute[];
  
  onUpdateProject?: (project: SmartProject) => void;
  onDeleteProject?: () => void;
  onDeleteNode?: (nodeId: string) => void;
  onAddSmartTask?: (date: Date) => void;
  onCompleteQuest?: (e: React.MouseEvent, q: Quest) => void;
  onDeleteQuest?: (id: string) => void;
  onEditQuest?: (q: Quest) => void;
}

const LevelIcons: Record<TimeFrame, React.ReactNode> = {
    '10_YEARS': <Trophy size={22} />,
    '5_YEARS': <Sparkles size={20} />,
    YEAR: <Target size={20} />,
    SEMESTER: <Flag size={20} />,
    QUARTER: <Calendar size={20} />,
    MONTH: <Calendar size={18} />,
    WEEK: <Zap size={18} />,
    DAY: <Circle size={16} />,
};

// Helper for next level
const getNextLevel = (currentLevel: TimeFrame): TimeFrame | null => {
    // Modified hierarchy to include QUARTER
    const hierarchy: TimeFrame[] = ['10_YEARS', '5_YEARS', 'YEAR', 'SEMESTER', 'QUARTER', 'MONTH', 'WEEK', 'DAY'];
    const index = hierarchy.indexOf(currentLevel);
    if (index === -1 || index === hierarchy.length - 1) return null;
    return hierarchy[index + 1];
};

// Helper to get expected children count based on duration
const getCapacity = (level: TimeFrame, start?: Date, end?: Date): number => {
    if (!start || !end) {
        // Fallback to standard counts if dates are missing
        switch (level) {
            case '10_YEARS': return 2;
            case '5_YEARS': return 5;
            case 'YEAR': return 2;
            case 'SEMESTER': return 6;
            case 'QUARTER': return 3;
            case 'MONTH': return 4;
            case 'WEEK': return 7;
            default: return 0;
        }
    }

    const days = differenceInDays(end, start);
    
    const nextLevel = getNextLevel(level);
    if (!nextLevel) return 0;

    switch (nextLevel) {
        case '5_YEARS': return Math.ceil(days / 1826) || 1;
        case 'YEAR': return Math.ceil(days / 365) || 1;
        case 'SEMESTER': return Math.ceil(days / 182) || 1;
        case 'QUARTER': return Math.ceil(days / 91) || 1;
        case 'MONTH': return Math.ceil(days / 30) || 1;
        case 'WEEK': return Math.ceil(days / 7) || 1;
        case 'DAY': return Math.max(1, days);
        default: return 0;
    }
};

const safeDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
};

export const StrategicMapView: React.FC<StrategicMapViewProps> = React.memo(({ 
    project, 
    quests = [], 
    attributes = [], 
    onUpdateProject, 
    onDeleteProject,
    onDeleteNode: _onDeleteNode, // Ignore unused
    onAddSmartTask, 
    onCompleteQuest, 
    onDeleteQuest
}) => {
  const { t } = useTranslation();
  // Navigation State
  const [path, setPath] = useState<StrategicNode[]>([project.rootNode]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false); // Collapsed state for content list
  
  // Get Trait Color
  const traitColor = project.traitColor || TRAITS_LIST.find(t => t.id === project.traitId)?.color || '#6366f1';

  // Safety check
  if (!project || !project.rootNode) {
      return <div className="p-8 text-white/50">{t('strategicMap.noData')}</div>;
  }

  // Current Active Context
  const activeNode = path[path.length - 1];
  const previousNode = path.length > 1 ? path[path.length - 2] : null;

  // Create New Node State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreateNode = () => {
      if (!newTitle.trim()) return;
      
      const nextLevel = getNextLevel(activeNode.level);
      if (!nextLevel) return;

      const existingChildren = activeNode.children || [];
      const lastChild = existingChildren.length > 0 ? existingChildren[existingChildren.length - 1] : null;

      // Calculate Start Date
      const now = new Date();
      const contextStart = activeNode.startDate ? safeDate(activeNode.startDate) : new Date();

      // Start is max(now, contextStart)
      // This ensures if we are in the context, we start today.
      // If we are planning a future context, we start at the beginning of that context.
      
      // FIX: If we are deep in the tree (Day level), contextStart IS the day.
      // If the day is Jan 3, and now is Dec 22. 
      // We WANT start to be Jan 3, not Dec 22.
      // But if context is "Week", and we create a Day, we might want it to be sequential.
      
      // Reverting logic to trust contextStart if it's explicitly set for future planning
      let start = contextStart;
      
      // Only default to NOW if context is in the past or invalid
      if (start < now && activeNode.level !== 'DAY') {
          start = now;
      }
      
      // If creating a specific day task/node, stick to the context date!
      if (activeNode.level === 'DAY' || nextLevel === 'DAY') {
         // Keep start as is (from lastChild or activeNode)
         // But ensure it's not weirdly in the past if we are planning future
         if (activeNode.startDate && safeDate(activeNode.startDate) > now) {
             start = safeDate(activeNode.startDate);
             if (lastChild && lastChild.dueDate) {
                 start = safeDate(lastChild.dueDate);
             }
         }
      }

      // If start is invalid, fallback to now
      if (isNaN(start.getTime())) start = new Date();

      let end = new Date(start);
      switch (nextLevel) {
          case '5_YEARS': end.setFullYear(end.getFullYear() + 5); break;
          case 'YEAR': end.setFullYear(end.getFullYear() + 1); break;
          case 'SEMESTER': end.setMonth(end.getMonth() + 6); break;
          case 'QUARTER': end.setMonth(end.getMonth() + 3); break;
          case 'MONTH': end.setMonth(end.getMonth() + 1); break;
          case 'WEEK': end.setDate(end.getDate() + 7); break;
          case 'DAY': end.setDate(end.getDate() + 1); break;
      }

      const newNode: StrategicNode = {
          id: crypto.randomUUID(),
          title: newTitle,
          level: nextLevel,
          startDate: Timestamp.fromDate(start),
          dueDate: Timestamp.fromDate(end),
          isCompleted: false,
          reward: { xp: 500, coins: 100 },
          children: [],
          placeholder: false
      };

      // Helper to update the tree recursively
      const updateNodeInTree = (node: StrategicNode): StrategicNode => {
          if (node.id === activeNode.id) {
              return {
                  ...node,
                  children: [...(node.children || []), newNode]
              };
          }
          if (node.children) {
              return { ...node, children: node.children.map(updateNodeInTree) };
          }
          return node;
      };

      if (onUpdateProject) {
          const newRoot = updateNodeInTree(project.rootNode);
          onUpdateProject({ ...project, rootNode: newRoot });
          
          // Update local path state to reflect the new child immediately
          // We need to find the active node in the path and update its children
          setPath(prev => prev.map(p => p.id === activeNode.id ? { ...p, children: [...(p.children || []), newNode] } : p));
      }

      setNewTitle('');
      setIsCreating(false);
  };

  // Sync title when node changes
  useEffect(() => {
      setEditTitle(activeNode.title);
  }, [activeNode]);

  // Generate Virtual Children for display
  const displayChildren = React.useMemo(() => {
      if (!activeNode) return [];
      
      // Use dynamic capacity based on actual duration
      const expectedCount = getCapacity(
          activeNode.level, 
          activeNode.startDate ? safeDate(activeNode.startDate) : undefined,
          activeNode.dueDate ? safeDate(activeNode.dueDate) : undefined
      );
      
      const nextLevel = getNextLevel(activeNode.level);
      
      if (!nextLevel || expectedCount === 0) return activeNode.children || [];

      const existing = activeNode.children || [];
      const missingCount = Math.max(0, expectedCount - existing.length);
      
      const placeholders: StrategicNode[] = Array.from({ length: missingCount }).map((_, i) => {
          const index = existing.length + i;
          const { start, end, label } = getContextDates(
              activeNode.startDate ? safeDate(activeNode.startDate) : new Date(),
              activeNode.dueDate ? safeDate(activeNode.dueDate) : new Date(),
              activeNode.level,
              index,
              expectedCount
          );

          return {
              id: `virtual-${activeNode.id}-${index}`,
              title: label || t(`strategicMap.placeholders.${nextLevel}`, { index: index + 1, defaultValue: t('strategicMap.placeholders.generic') }),
              level: nextLevel,
              startDate: Timestamp.fromDate(start),
              dueDate: Timestamp.fromDate(end),
              isCompleted: false,
              children: [],
              reward: { xp: 0, coins: 0 },
              placeholder: true
          };
      });
      
      return [...existing, ...placeholders];
  }, [activeNode]);

  const handleNavigate = (node: StrategicNode) => {
      setPath([...path, node]);
      setIsEditing(false);
  };

  const handleBreadcrumbClick = (index: number) => {
      setPath(path.slice(0, index + 1));
      setIsEditing(false);
  };

  const saveTitle = () => {
      if (!editTitle.trim() || !onUpdateProject) return;

      // Recursive update function
      const updateNodeInTree = (node: StrategicNode): StrategicNode => {
          if (node.id === activeNode.id) {
              return { ...node, title: editTitle };
          }
          if (node.children) {
              return { ...node, children: node.children.map(updateNodeInTree) };
          }
          return node;
      };

      const newRoot = updateNodeInTree(project.rootNode);
      const newProject = { ...project, rootNode: newRoot };
      
      onUpdateProject(newProject);
      
      // Update local path state to reflect change immediately
      const newPath = path.map(p => p.id === activeNode.id ? { ...p, title: editTitle } : p);
      setPath(newPath);
      
      setIsEditing(false);
  };

  const isLeafLevel = ['DAY'].includes(activeNode.level);

  // Filter quests for the active leaf node
  const activeDate = activeNode.startDate ? toLocalISOString(safeDate(activeNode.startDate)) : null;
  const dayTasks = React.useMemo(() => {
      if (!isLeafLevel || !activeDate) return [];
      return quests.filter(q => q.deadline === activeDate && q.attribute === project.traitId);
  }, [quests, isLeafLevel, activeDate, project.traitId]);

  return (
    <div className="w-full h-full flex flex-col bg-transparent font-sans">
        
        {/* --- 1. NAVIGATION HEADER --- */}
        <div 
          className="flex-shrink-0 px-6 py-4 z-10 flex items-center justify-between liquid-glass-header"
          style={{
            '--trait-color': traitColor,
            '--trait-color-alpha': `${traitColor}20`
          } as React.CSSProperties}
        >
            <div className="flex items-center gap-1 flex-wrap gap-y-2">
                {path.map((node, index) => {
                    const isLast = index === path.length - 1;
                    return (
                        <React.Fragment key={node.id}>
                            <button 
                                onClick={() => handleBreadcrumbClick(index)}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium transition-all",
                                    isLast 
                                        ? "text-white cursor-default" 
                                        : "text-white/40 hover:text-white/80"
                                )}
                            >
                                <span 
                                    className={cn("opacity-70")}
                                    style={{ color: isLast ? traitColor : undefined }}
                                >
                                    {LevelIcons[node.level] || <Circle size={14}/>}
                                </span>
                                <span className={cn(isLast && "font-bold")}>
                                    {t(`strategicMap.levels.${node.level}`)}
                                </span>
                            </button>
                            {!isLast && (
                                <ChevronRight size={14} className="text-white/10 flex-shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {/* Always allow deleting the project if onDeleteProject is provided, regardless of level */}
                {onDeleteProject && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(t('strategicMap.deleteProjectConfirm', 'Are you sure you want to delete this Smart Plan? All associated tasks will be deleted.'))) {
                                onDeleteProject();
                            }
                        }}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all flex items-center gap-2 text-xs font-bold border border-red-500/20"
                        title={t('strategicMap.deleteProject', 'Delete Strategy')}
                    >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">{t('common.delete', 'DELETE')}</span>
                    </button>
                )}

                {/* REMOVED COMPLETION BUTTON AS PER USER REQUEST */}

            </div>
        </div>

        {/* --- 2. MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
            
            <div className="max-w-3xl mx-auto space-y-12">
                
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeNode.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="space-y-10"
                    >
                        {/* ACTIVE CONTEXT HEADER (Apple Event Style) */}
                        <div className="text-center relative">
                            <div 
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full pointer-events-none transition-colors duration-200 opacity-50"
                                style={{ background: `radial-gradient(circle, ${traitColor} 0%, transparent 60%)` }} 
                            />
                            
                            <div className="space-y-4 relative z-10">
                                <div 
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg transition-colors"
                                    style={{ 
                                        background: `linear-gradient(90deg, ${traitColor}22, transparent)`,
                                        borderColor: `${traitColor}33`,
                                        color: traitColor 
                                    }}
                                >
                                    {previousNode ? t('strategicMap.inside', { title: previousNode.title }) : t('strategicMap.masterStrategy')}
                                </div>
                                
                                <div className="flex flex-col items-center justify-center gap-2 mt-8">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 w-full max-w-lg">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl md:text-4xl font-bold text-white text-center focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                                style={{ caretColor: traitColor }}
                                                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                                            />
                                            <button 
                                                onClick={saveTitle} 
                                                className="p-3 rounded-xl text-white hover:opacity-90 transition-all"
                                                style={{ backgroundColor: traitColor }}
                                            >
                                                <Save size={20} />
                                            </button>
                                            <button onClick={() => setIsEditing(false)} className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="group relative">
                                            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-t from-gray-900 via-white to-white tracking-tighter leading-tight max-w-5xl mx-auto cursor-pointer pb-4 select-none drop-shadow-sm"
                                                onClick={() => setIsEditing(true)}
                                            >
                                                {activeNode.title || (activeNode.placeholder ? t('strategicMap.defineObjective') : t('strategicMap.untitled'))}
                                            </h1>
                                            <h2 className="text-sm md:text-base font-bold text-white/40 tracking-[0.2em] uppercase mt-2">
                                                {t(`strategicMap.levels.${activeNode.level}`) || activeNode.level}
                                            </h2>
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white"
                                            >
                                                <Edit2 size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-lg text-white/60 max-w-xl mx-auto font-light leading-relaxed">
                                    {isLeafLevel 
                                        ? t('strategicMap.leafDescription')
                                        : t('strategicMap.nodeDescription', { level: getNextLevel(activeNode.level) ? t(`strategicMap.levels.${getNextLevel(activeNode.level)!}`).toLowerCase() : t('strategicMap.section').toLowerCase() })}
                                </p>
                            </div>
                        </div>

                        {/* CONTENT LIST */}
                        <div className="relative">
                            
                            {/* MISSIONS BUTTON (REMOVED) */}

                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
                                    <LayoutList size={14} />
                                    <span>{t('strategicMap.content')}</span>
                                </div>
                                <button 
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                                >
                                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </button>
                            </div>

                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{  opacity: 0 }}
                                        animate={{  opacity: 1 }}
                                        exit={{  opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        {isLeafLevel ? (
                                            <div className="space-y-4">
                                                {dayTasks.length > 0 ? (
                                                    dayTasks.map((quest) => (
                                                        <QuestItem 
                                                            key={quest.id} 
                                                            quest={quest} 
                                                            attribute={attributes.find(a => a.id === quest.attribute)}
                                                            onComplete={onCompleteQuest || (() => {})}
                                                            onDelete={onDeleteQuest}
                                                        />
                                                    ))
                                                ) : (
                                                    <div 
                                                        className="p-12 text-center border rounded-3xl"
                                                        style={{
                                                            background: `linear-gradient(145deg, ${traitColor}15 0%, transparent 100%)`,
                                                            borderColor: `${traitColor}22`
                                                        }}
                                                    >
                                                        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 text-white/20" style={{ backgroundColor: `${traitColor}15` }}>
                                                            <CheckCircle2 size={40} />
                                                        </div>
                                                        <h3 className="text-white font-medium text-xl">{t('strategicMap.leaf.emptyTitle')}</h3>
                                                        <p className="text-white/40 mt-2">{t('strategicMap.leaf.emptyDesc')}</p>
                                                    </div>
                                                )}
                                                
                                                <button 
                                                    onClick={() => onAddSmartTask && onAddSmartTask(safeDate(activeNode.startDate))}
                                                    className="w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 text-white/30 hover:text-white transition-transform duration-200 group mt-4 active:scale-95"
                                                    style={{ borderColor: `${traitColor}33`, backgroundColor: `${traitColor}05` }}
                                                >
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: `${traitColor}22` }}>
                                                        <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                                    </div>
                                                    <span className="font-bold tracking-wide uppercase text-xs" style={{ color: traitColor }}>{t('smartTasks.addAnotherTask', 'Add another task')}</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <motion.div 
                                                variants={{
                                                    hidden: { opacity: 0 },
                                                    show: {
                                                        opacity: 1,
                                                        transition: {
                                                            staggerChildren: 0.1,
                                                            delayChildren: 0.2
                                                        }
                                                    }
                                                }}
                                                initial="hidden"
                                                animate="show"
                                                className="grid grid-cols-1 gap-4"
                                            >
                                                {displayChildren.map((child) => {
                                                    if (child.placeholder) {
                                                        return (
                                                            <motion.button
                                                                variants={{
                                                                    hidden: { opacity: 0, y: 20 },
                                                                    show: { opacity: 1, y: 0 }
                                                                }}
                                                                key={child.id}
                                                                onClick={() => handleNavigate(child)}
                                                                className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl transition-transform duration-200 cursor-pointer h-full min-h-[160px] active:scale-95"
                                                                style={{ backgroundColor: `${traitColor}05`, borderColor: `${traitColor}33` }}
                                                            >
                                                                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${traitColor}22`, color: traitColor }}>
                                                                    <Plus size={24} />
                                                                </div>
                                                                <span className="font-bold text-lg transition-colors" style={{ color: traitColor }}>{child.title}</span>
                                                                <span className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: `${traitColor}88` }}>{t('smartTasks.createNewBlock', 'Create New Block')}</span>
                                                            </motion.button>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <motion.div
                                                            variants={{
                                                                hidden: { opacity: 0, y: 20 },
                                                                show: { opacity: 1, y: 0 }
                                                            }}
                                                            role="button"
                                                            tabIndex={0}
                                                            key={child.id}
                                                            onClick={() => handleNavigate(child)}
                                                            className="group relative flex items-center justify-between p-6 rounded-3xl transition-transform duration-200 hover:scale-[1.01] overflow-hidden cursor-pointer border shadow-md"
                                                            style={{
                                                                background: `linear-gradient(145deg, ${traitColor}22 0%, ${traitColor}05 100%)`,
                                                                borderColor: `${traitColor}33`
                                                            }}
                                                        >
                                                            {/* Subtle Trait Glow - Removed for performance */}

                                                            <div className="flex items-center gap-5 relative z-10">
                                                                <div 
                                                                    className={cn(
                                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 shadow-md text-white",
                                                                    )}
                                                                    style={{
                                                                        background: `linear-gradient(135deg, ${traitColor}55, ${traitColor}11)`,
                                                                        boxShadow: `0 0 10px ${traitColor}30`,
                                                                        border: `1px solid ${traitColor}33`
                                                                    }}
                                                                >
                                                                    {LevelIcons[child.level] || <Circle size={18} />}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-lg font-bold text-white/90 transition-colors tracking-tight leading-snug">
                                                                        {child.title || "Espacio Vacío"}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50 text-white flex items-center gap-2">
                                                                        <span style={{ color: traitColor }}>{child.level}</span>
                                                                        {child.startDate && child.dueDate && (
                                                                            <span className="flex items-center gap-1 text-white/60 ml-2">
                                                                                <Clock size={10} />
                                                                                {formatDate(safeDate(child.startDate))} - {formatDate(safeDate(child.dueDate))}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Deadline specific for leaf nodes or just extra info */}
                                                                    {child.dueDate && (
                                                                        <div className="text-[10px] font-mono text-white/30 mt-0.5">
                                                                            DEADLINE: {formatDate(safeDate(child.dueDate))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-4 text-white/20 group-hover:text-white/60 transition-colors relative z-10">

                                                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                                
                                                {/* CREATE NEW NODE SECTION */}
                                                <div className="mt-2">
                                                    {isCreating ? (
                                                        <div className="flex items-center gap-2 p-4 border rounded-3xl animate-in fade-in slide-in-from-top-2" style={{ borderColor: `${traitColor}44`, backgroundColor: `${traitColor}11` }}>
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={newTitle}
                                                                onChange={(e) => setNewTitle(e.target.value)}
                                                                placeholder={`Nuevo ${getNextLevel(activeNode.level) ? t(`strategicMap.levels.${getNextLevel(activeNode.level)!}`) : 'Item'}...`}
                                                                className="flex-1 bg-transparent text-white placeholder:text-white/20 outline-none font-bold text-lg px-2"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleCreateNode();
                                                                    if (e.key === 'Escape') setIsCreating(false);
                                                                }}
                                                            />
                                                            <button 
                                                                onClick={handleCreateNode}
                                                                disabled={!newTitle.trim()}
                                                                className="p-3 rounded-xl bg-indigo-500 text-white disabled:opacity-50 hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                                                            >
                                                                <Plus size={20} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setIsCreating(false)}
                                                                className="p-3 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setIsCreating(true)}
                                                            className="w-full py-4 flex items-center justify-center gap-2 text-white/20 hover:text-white border border-dashed rounded-3xl transition-transform duration-200 group"
                                                            style={{ borderColor: `${traitColor}33`, backgroundColor: `${traitColor}05` }}
                                                        >
                                                            <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                                            <span className="font-bold uppercase tracking-widest text-xs" style={{ color: traitColor }}>Añadir {getNextLevel(activeNode.level) ? t(`strategicMap.levels.${getNextLevel(activeNode.level)!}`) : 'Sección'}</span>
                                                        </button>
                                                    )}
                                                </div>

                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    </div>
    );
});

