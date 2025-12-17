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
import { StrategicNode, SmartProject, TimeFrame } from '../../../types/SmartGoal';
import { Attribute, Quest } from '../../../types'; // Import Quest
import { QuestItem } from '../../tasks/components/QuestItem';
import { Timestamp } from 'firebase/firestore';
import { cn } from '../../../utils/cn';
import { formatDate } from '../../../utils/dateUtils';
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
}

const LevelLabels: Record<TimeFrame, string> = {
    '10_YEARS': '10 Años',
    '5_YEARS': '5 Años',
    YEAR: 'Año',
    SEMESTER: 'Semestre',
    QUARTER: 'Trimestre',
    MONTH: 'Mes',
    WEEK: 'Semana',
    DAY: 'Día',
};

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
 
     // We use differenceInDays without +1 because our internal logic (from SmartTaskWizard/dateUtils)
     // now consistently uses EXCLUSIVE end dates (Start of Next Period).
     // e.g. Jan 1 00:00 to Jan 8 00:00 = 7 days.
     const days = differenceInDays(end, start);
 
     // Map NEXT level capacity
    // If current is MONTH, next is WEEK. We want to know how many WEEKS fit in this MONTH.
    // This function receives the PARENT level, so we need to know the CHILD level logic.
    // Actually, it's better to pass the CHILD level or determine it here.
    // Let's look at how it's used: getExpectedChildrenCount(activeNode.level)
    // So 'level' is the PARENT level.

    // We need to know what the next level is to calculate capacity.
    // But getNextLevel is defined below. Let's move getNextLevel up or merge logic.
    
    // Simplification: We calculate based on the *next* level's approximate duration in days.
    const nextLevel = getNextLevel(level);
    if (!nextLevel) return 0;

    switch (nextLevel) {
        case '5_YEARS': return Math.ceil(days / 1826) || 1;
        case 'YEAR': return Math.ceil(days / 365) || 1;
        case 'SEMESTER': return Math.ceil(days / 182) || 1;
        case 'QUARTER': return Math.ceil(days / 91) || 1;
        case 'MONTH': return Math.ceil(days / 30) || 1;
        case 'WEEK': return Math.ceil(days / 7) || 1;
        case 'DAY': return Math.max(1, days); // Exact days (at least 1 if < 1 day but > 0)
        default: return 0;
    }
};

// Helper for next level
const getNextLevel = (currentLevel: TimeFrame): TimeFrame | null => {
    // Modified hierarchy to include QUARTER
    const hierarchy: TimeFrame[] = ['10_YEARS', '5_YEARS', 'YEAR', 'SEMESTER', 'QUARTER', 'MONTH', 'WEEK', 'DAY'];
    const index = hierarchy.indexOf(currentLevel);
    if (index === -1 || index === hierarchy.length - 1) return null;
    return hierarchy[index + 1];
};
const getPlaceholderTitle = (level: TimeFrame, index: number): string => {
    switch (level) {
      case '5_YEARS': return `Lustro ${index + 1}`;
      case 'YEAR': return `Año ${index + 1}`;
      case 'SEMESTER': return `Semestre ${index + 1}`;
      case 'QUARTER': return `Trimestre ${index + 1}`;
      case 'MONTH': return `Mes ${index + 1}`;
      case 'WEEK': return `Semana ${index + 1}`;
      case 'DAY': return `Día ${index + 1}`;
      default: return 'Nuevo Item';
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
    onCreateNew, 
    onAddSmartTask,
    onCompleteQuest,
    onDeleteQuest
}) => {
  // Navigation State
  const [path, setPath] = useState<StrategicNode[]>([project.rootNode]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false); // Collapsed state for content list
  
  // Get Trait Color
  const traitColor = project.traitColor || TRAITS_LIST.find(t => t.id === project.traitId)?.color || '#6366f1';

  // Safety check
  if (!project || !project.rootNode) {
      return <div className="p-8 text-white/50">No hay datos de estrategia disponibles.</div>;
  }

  // Current Active Context
  const activeNode = path[path.length - 1];
  const previousNode = path.length > 1 ? path[path.length - 2] : null;

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
      
      const placeholders: StrategicNode[] = Array.from({ length: missingCount }).map((_, i) => ({
          id: `virtual-${activeNode.id}-${existing.length + i}`,
          title: getPlaceholderTitle(nextLevel, existing.length + i),
          level: nextLevel,
          dueDate: Timestamp.now(),
          isCompleted: false,
          children: [],
          reward: { xp: 0, coins: 0 },
          placeholder: true
      }));
      
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
  const activeDate = activeNode.dueDate ? safeDate(activeNode.dueDate).toISOString().split('T')[0] : null;
  const dayTasks = React.useMemo(() => {
      if (!isLeafLevel || !activeDate) return [];
      return quests.filter(q => q.deadline === activeDate && q.attribute === project.traitId);
  }, [quests, isLeafLevel, activeDate, project.traitId]);

  return (
    <div className="w-full h-full flex flex-col bg-black/20 font-sans">
        
        {/* --- 1. NAVIGATION HEADER --- */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl z-10 flex items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-linear-fade">
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
                                    {LevelLabels[node.level]}
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

            {onCreateNew && (
                <button 
                    onClick={onCreateNew}
                    className="ml-6 px-4 py-2 rounded-full bg-black/40 border border-white/10 text-white font-medium text-xs shadow-lg hover:bg-white/5 transition-all flex items-center gap-2 backdrop-blur-md relative overflow-hidden group"
                    title="Nueva Estrategia"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <Sparkles size={14} className="text-indigo-300 relative z-10" />
                    <span className="relative z-10 tracking-wide text-indigo-100/90">New Smart Task</span>
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
                                    {previousNode ? `Dentro de ${previousNode.title}` : 'Estrategia Maestra'}
                                </div>
                                
                                <div className="flex flex-col items-center justify-center gap-4">
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
                                            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60 tracking-tighter leading-tight max-w-4xl mx-auto cursor-pointer"
                                                onClick={() => setIsEditing(true)}
                                            >
                                                {activeNode.title || (activeNode.placeholder ? "Definir Objetivo..." : "Sin Título")}
                                            </h1>
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="absolute -right-8 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-lg text-white/40 max-w-xl mx-auto font-light leading-relaxed">
                                    {isLeafLevel 
                                        ? "Completa estas tareas para lograr el objetivo diario." 
                                        : `Selecciona un ${getNextLevel(activeNode.level) ? LevelLabels[getNextLevel(activeNode.level)!].toLowerCase() : 'segmento'} para profundizar.`}
                                </p>
                            </div>
                        </div>

                        {/* CONTENT LIST */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
                                    <LayoutList size={14} />
                                    <span>Contenido</span>
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
                                                        <h3 className="text-white font-medium text-xl">Sin Tareas Aún</h3>
                                                        <p className="text-white/40 mt-2">Añade tareas para ejecutar el plan de este día.</p>
                                                        <button 
                                                            onClick={() => onAddSmartTask && onAddSmartTask(safeDate(activeNode.dueDate))}
                                                            className="mt-8 px-8 py-3 bg-white text-black rounded-full font-semibold hover:scale-105 transition-all shadow-lg shadow-white/10"
                                                        >
                                                            Crear Tarea
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {dayTasks.length > 0 && (
                                                    <button 
                                                        onClick={() => onAddSmartTask && onAddSmartTask(safeDate(activeNode.dueDate))}
                                                        className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all group"
                                                    >
                                                        <Plus size={20} className="group-hover:scale-110 transition-transform" />
                                                        <span className="font-medium">Añade otra tarea</span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {displayChildren.map((child) => (
                                                    <div
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
                                                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner",
                                                                    child.placeholder 
                                                                        ? "bg-white/5 text-white/20 group-hover:bg-white/10 group-hover:text-white/40" 
                                                                        : "text-white"
                                                                )}
                                                                style={!child.placeholder ? {
                                                                    background: `linear-gradient(135deg, ${traitColor}66, ${traitColor}22)`, // Stronger gradient
                                                                    boxShadow: `0 0 15px ${traitColor}40`
                                                                } : undefined}
                                                            >
                                                                {LevelIcons[child.level] || <Circle size={18} />}
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50 text-white flex items-center gap-2">
                                                                    <span style={{ color: traitColor }}>{child.level}</span>
                                                                    {child.startDate && child.dueDate && !child.placeholder && (
                                                                        <span className="flex items-center gap-1 text-white/60 ml-2">
                                                                            <Clock size={10} />
                                                                            {formatDate(safeDate(child.startDate))} - {formatDate(safeDate(child.dueDate))}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className={cn(
                                                                    "text-lg font-medium transition-colors",
                                                                    child.placeholder ? "text-white/30 italic" : "text-white/90"
                                                                )}>
                                                                    {child.title || "Espacio Vacío"}
                                                                </div>
                                                                
                                                                {/* Deadline specific for leaf nodes or just extra info */}
                                                                {child.dueDate && !child.placeholder && (
                                                                    <div className="text-[10px] font-mono text-white/30 mt-1">
                                                                        DEADLINE: {formatDate(safeDate(child.dueDate))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4 text-white/20 group-hover:text-white/60 transition-colors relative z-10">
                                                            {onDeleteNode && !child.placeholder && (
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
                                                            {child.placeholder && (
                                                                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 text-white/40 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                                    Crear
                                                                </span>
                                                            )}
                                                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
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

