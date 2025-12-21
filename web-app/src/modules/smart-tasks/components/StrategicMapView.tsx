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
import { Attribute, Quest } from '../../../types'; // Import Quest
import { QuestItem } from '../../tasks/components/QuestItem';
import { Timestamp } from 'firebase/firestore';
import { cn } from '../../../utils/cn';
import { formatDate, getContextDates, toLocalISOString } from '../../../utils/dateUtils';
import { differenceInDays } from 'date-fns';
import { TRAITS_LIST } from '../../dashboard/constants';

interface StrategicMapViewProps {
  project: SmartProject;
  quests?: Quest[]; // Add quests prop
  attributes?: Attribute[];
  onUpdateProject?: (project: SmartProject) => void;
  onDeleteProject?: () => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateNew?: () => void;
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

export const StrategicMapView: React.FC<StrategicMapViewProps> = ({ 
    project, 
    quests = [], 
    attributes = [], 
    onUpdateProject, 
    onDeleteProject, 
    onDeleteNode, 
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
      let start = lastChild && lastChild.dueDate 
          ? safeDate(lastChild.dueDate) 
          : (activeNode.startDate ? safeDate(activeNode.startDate) : new Date());

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
    <div className="w-full h-full flex flex-col bg-black/20 font-sans">
        
        {/* --- 1. NAVIGATION HEADER --- */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl z-10 flex items-center justify-between">
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
            
            {onDeleteProject && activeNode.level === 'YEAR' && (
                <button 
                    onClick={() => {
                        if (window.confirm('¿Estás seguro de que quieres eliminar este Plan Inteligente? Se borrarán todas las tareas asociadas.')) {
                            onDeleteProject();
                        }
                    }}
                    className="ml-4 p-2.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all flex-shrink-0"
                    title="Eliminar Estrategia Completa"
                >
                    <Trash2 size={16} />
                </button>
            )}

            {onDeleteNode && activeNode.level !== 'YEAR' && (
                <button 
                    onClick={() => {
                        if (window.confirm('¿Eliminar esta sección completa y volver al nivel superior?')) {
                            onDeleteNode(activeNode.id);
                            // Navigate up automatically handled by parent update or we can manually go back
                            if (path.length > 1) {
                                setPath(path.slice(0, path.length - 1));
                            }
                        }
                    }}
                    className="ml-4 p-2.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all flex-shrink-0"
                    title="Eliminar Sección Actual"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>

        {/* --- 2. MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-12">
                
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeNode.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-10"
                    >
                        {/* ACTIVE CONTEXT HEADER (Apple Event Style) */}
                        <div className="text-center relative">
                            <div 
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-[80px] rounded-full pointer-events-none transition-colors duration-700"
                                style={{ backgroundColor: `${traitColor}33` }} 
                            />
                            
                            <div className="space-y-4 relative z-10">
                                <div 
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg backdrop-blur-md transition-colors"
                                    style={{ 
                                        borderColor: `${traitColor}33`,
                                        color: traitColor 
                                    }}
                                >
                                    {previousNode ? t('strategicMap.inside', { title: previousNode.title }) : t('strategicMap.masterStrategy')}
                                </div>
                                
                                <div className="flex flex-col items-center justify-center gap-2">
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
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
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
                                                    <div className="p-12 text-center bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
                                                        <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-6 text-white/20">
                                                            <CheckCircle2 size={40} />
                                                        </div>
                                                        <h3 className="text-white font-medium text-xl">{t('strategicMap.leaf.emptyTitle')}</h3>
                                                        <p className="text-white/40 mt-2">{t('strategicMap.leaf.emptyDesc')}</p>
                                                    </div>
                                                )}
                                                
                                                <button 
                                                    onClick={() => onAddSmartTask && onAddSmartTask(safeDate(activeNode.startDate))}
                                                    className="w-full py-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-white/30 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all group mt-4 active:scale-95"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                                        <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                                    </div>
                                                    <span className="font-bold tracking-wide uppercase text-xs">Añade otra tarea</span>
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
                                                                className="group relative flex flex-col items-center justify-center p-8 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/10 hover:border-white/20 rounded-3xl transition-all duration-300 backdrop-blur-md cursor-pointer h-full min-h-[160px] active:scale-95"
                                                            >
                                                                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white/40 group-hover:text-white">
                                                                    <Plus size={24} />
                                                                </div>
                                                                <span className="text-white/40 group-hover:text-white font-bold text-lg transition-colors">{child.title}</span>
                                                                <span className="text-xs font-bold text-white/20 uppercase tracking-widest mt-1">Crear Nuevo Bloque</span>
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
                                                            className="group relative flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-3xl transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-xl hover:scale-[1.01] overflow-hidden cursor-pointer"
                                                            style={{
                                                                boxShadow: `0 0 0 1px ${traitColor}10, 0 10px 30px -10px ${traitColor}10`
                                                            }}
                                                        >
                                                            {/* Subtle Trait Glow */}
                                                            <div 
                                                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                                                                style={{ background: `linear-gradient(to right, ${traitColor}20, transparent)` }}
                                                            />

                                                            <div className="flex items-center gap-5 relative z-10">
                                                                <div 
                                                                    className={cn(
                                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner text-white",
                                                                    )}
                                                                    style={{
                                                                        background: `linear-gradient(135deg, ${traitColor}66, ${traitColor}22)`, // Stronger gradient
                                                                        boxShadow: `0 0 15px ${traitColor}40`
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
                                                                {onDeleteNode && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (window.confirm('¿Eliminar esta rama y todas sus subtareas?')) {
                                                                                onDeleteNode(child.id);
                                                                            }
                                                                        }}
                                                                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all z-20"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                                
                                                {/* CREATE NEW NODE SECTION */}
                                                <div className="mt-2">
                                                    {isCreating ? (
                                                        <div className="flex items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
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
                                                            className="w-full py-4 flex items-center justify-center gap-2 text-white/20 hover:text-white hover:bg-white/5 border border-dashed border-white/10 hover:border-white/20 rounded-3xl transition-all group"
                                                        >
                                                            <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                                            <span className="font-bold uppercase tracking-widest text-xs">Añadir {getNextLevel(activeNode.level) ? t(`strategicMap.levels.${getNextLevel(activeNode.level)!}`) : 'Sección'}</span>
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
};

