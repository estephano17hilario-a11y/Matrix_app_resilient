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
    X
} from 'lucide-react';
import { StrategicNode, SmartProject, TimeFrame } from '../../../types/SmartGoal';
import { Timestamp } from 'firebase/firestore';
import { cn } from '../../../utils/cn';

interface StrategicMapViewProps {
  project: SmartProject;
  onUpdateProject?: (project: SmartProject) => void;
}

const LevelColors: Record<TimeFrame, string> = {
  YEAR: 'from-amber-500/20 to-orange-600/20 border-amber-500/30 text-amber-400',
  SEMESTER: 'from-purple-500/20 to-indigo-600/20 border-purple-500/30 text-purple-400',
  QUARTER: 'from-blue-500/20 to-cyan-600/20 border-blue-500/30 text-blue-400',
  MONTH: 'from-emerald-500/10 to-teal-600/10 border-emerald-500/20 text-emerald-400',
  WEEK: 'from-slate-800/50 to-slate-900/50 border-white/10 text-slate-300',
  DAY: 'bg-transparent border-transparent text-slate-400',
};

const LevelLabels: Record<TimeFrame, string> = {
    YEAR: 'Año',
    SEMESTER: 'Semestre',
    QUARTER: 'Trimestre',
    MONTH: 'Mes',
    WEEK: 'Semana',
    DAY: 'Día',
};

const LevelIcons: Record<TimeFrame, React.ReactNode> = {
    YEAR: <Target size={20} />,
    SEMESTER: <Flag size={20} />,
    QUARTER: <Calendar size={20} />,
    MONTH: <Calendar size={18} />,
    WEEK: <Zap size={18} />,
    DAY: <Circle size={16} />,
};

// Helper to get expected children count
const getExpectedChildrenCount = (level: TimeFrame): number => {
    switch (level) {
      case 'YEAR': return 2; // 2 Semesters
      case 'SEMESTER': return 3; // 3 Months (Standard)
      case 'QUARTER': return 3; // 3 Months
      case 'MONTH': return 4; // 4 Weeks
      case 'WEEK': return 7; // 7 Days
      default: return 0;
    }
};

// Helper for next level
const getNextLevel = (currentLevel: TimeFrame): TimeFrame | null => {
    // Modified hierarchy to skip QUARTER as per new logic
    const hierarchy: TimeFrame[] = ['YEAR', 'SEMESTER', 'MONTH', 'WEEK', 'DAY'];
    const index = hierarchy.indexOf(currentLevel);
    if (index === -1 || index === hierarchy.length - 1) return null;
    return hierarchy[index + 1];
};
const getPlaceholderTitle = (level: TimeFrame, index: number): string => {
    switch (level) {
      case 'SEMESTER': return `Semestre ${index + 1}`;
      case 'QUARTER': return `Trimestre ${index + 1}`;
      case 'MONTH': return `Mes ${index + 1}`;
      case 'WEEK': return `Semana ${index + 1}`;
      case 'DAY': return `Día ${index + 1}`;
      default: return 'Nuevo Item';
    }
};

export const StrategicMapView: React.FC<StrategicMapViewProps> = ({ project, onUpdateProject }) => {
  // Navigation State
  const [path, setPath] = useState<StrategicNode[]>([project.rootNode]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  
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
      
      const expectedCount = getExpectedChildrenCount(activeNode.level);
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

  return (
    <div className="w-full h-full flex flex-col bg-black/20 font-sans">
        
        {/* --- 1. NAVIGATION HEADER --- */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl z-10">
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
                                <span className={cn("opacity-70", isLast && "text-indigo-400")}>
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
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />
                            
                            <div className="space-y-4 relative z-10">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] shadow-lg backdrop-blur-md">
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
                                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl md:text-4xl font-bold text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                                            />
                                            <button onClick={saveTitle} className="p-3 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 transition-colors">
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
                        <div>
                            {isLeafLevel ? (
                                <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
                                    {activeNode.children && activeNode.children.length > 0 ? (
                                        activeNode.children.map((child) => (
                                            <div key={child.id} className={cn(
                                                "p-5 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0 group",
                                            )}>
                                                <div className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0 group-hover:border-indigo-400 transition-colors" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white/90 truncate font-medium text-lg">{child.title}</div>
                                                    {child.reward && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-bold text-indigo-400/80 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                                                <Trophy size={10} /> {child.reward.xp} XP
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center">
                                            <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-6 text-white/20">
                                                <CheckCircle2 size={40} />
                                            </div>
                                            <h3 className="text-white font-medium text-xl">Sin Tareas Aún</h3>
                                            <p className="text-white/40 mt-2">Añade tareas para ejecutar el plan de este día.</p>
                                            <button className="mt-8 px-8 py-3 bg-white text-black rounded-full font-semibold hover:scale-105 transition-all shadow-lg shadow-white/10">
                                                Crear Tarea
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {displayChildren.map((child) => (
                                        <button
                                            key={child.id}
                                            onClick={() => handleNavigate(child)}
                                            className="group relative flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-3xl transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-xl hover:scale-[1.01]"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner",
                                                    child.placeholder 
                                                        ? "bg-white/5 text-white/20 group-hover:bg-white/10 group-hover:text-white/40" 
                                                        : cn("bg-gradient-to-br", LevelColors[child.level] || "bg-gray-700")
                                                )}>
                                                    {LevelIcons[child.level] || <Circle size={18} />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-40 text-white">
                                                        {LevelLabels[child.level]}
                                                    </div>
                                                    <div className={cn(
                                                        "text-xl font-semibold transition-colors",
                                                        child.placeholder ? "text-white/30 italic" : "text-white"
                                                    )}>
                                                        {child.title || "Espacio Vacío"}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-white/20 group-hover:text-white/60 transition-colors">
                                                {child.placeholder && (
                                                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 text-white/40 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                        Crear
                                                    </span>
                                                )}
                                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    </div>
  );
};

