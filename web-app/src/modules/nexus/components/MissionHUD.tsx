import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Play, Pause, Zap, Target, CheckCircle2, Trash2, Edit2, ChevronDown, ChevronUp, Save, Calendar, Coins, Plus, Clock, Brain } from 'lucide-react';
import { Habit, Note, Project } from '../../../types';
import { SmartProject, StrategicNode } from '../../../types/SmartGoal';
import { cn } from '../../../utils/cn';

// Helper to safely get Date object from various formats
const getDate = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date.seconds) return new Date(date.seconds * 1000);
  if (typeof date === 'string') return new Date(date);
  return null;
};

interface MissionHUDProps {
  project: SmartProject;
  onClose: () => void;
  habits: Habit[];
  notes: Note[];
  projects: Project[];
  onToggleHabit: (habitId: string) => void;
  onUpdateProject: (updatedProject: SmartProject) => void;
  onAddNote: (content: string) => void;
}

export const MissionHUD: React.FC<MissionHUDProps> = ({
  project,
  onClose,
  habits,
  notes,
  projects,
  onToggleHabit,
  onUpdateProject,
  onAddNote
}) => {
  const [activeTimer, setActiveTimer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  
  // Task Editing State
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Note State
  const [newNote, setNewNote] = useState('');

  const themeColor = project.traitColor || '#06b6d4';
  const objectives = project.rootNode.children || [];
  
  // Find linked Focus Project (Protocol)
  // Since NexusView filters projects passed here, we can take the first one or find exact match if logic changes
  const linkedFocusProject = projects.length > 0 ? projects[0] : null;

  // --- LOGIC: TASK MANAGEMENT ---
  const handleToggleObjective = (nodeId: string) => {
    const newRoot = JSON.parse(JSON.stringify(project.rootNode));
    const toggleNode = (nodes: StrategicNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          node.isCompleted = !node.isCompleted;
          return true;
        }
        if (node.children && toggleNode(node.children)) return true;
      }
      return false;
    };
    toggleNode(newRoot.children);
    onUpdateProject({ ...project, rootNode: newRoot });
  };

  const handleSaveTask = (nodeId: string) => {
    const newRoot = JSON.parse(JSON.stringify(project.rootNode));
    const updateNode = (nodes: StrategicNode[]): boolean => {
        for (const node of nodes) {
            if (node.id === nodeId) {
                node.title = editTitle;
                node.description = editDesc;
                return true;
            }
            if (node.children && updateNode(node.children)) return true;
        }
        return false;
    };
    updateNode(newRoot.children);
    onUpdateProject({ ...project, rootNode: newRoot });
    setEditingTaskId(null);
  };

  const handleDeleteTask = (nodeId: string) => {
      const newRoot = JSON.parse(JSON.stringify(project.rootNode));
      // Recursive delete
      const deleteNode = (nodes: StrategicNode[]): boolean => {
          const idx = nodes.findIndex(n => n.id === nodeId);
          if (idx !== -1) {
              nodes.splice(idx, 1);
              return true;
          }
          for (const node of nodes) {
              if (node.children && deleteNode(node.children)) return true;
          }
          return false;
      };
      deleteNode(newRoot.children);
      onUpdateProject({ ...project, rootNode: newRoot });
      setExpandedTaskId(null);
  };

  // --- LOGIC: TIMER ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setActiveTimer(false);
    }
    return () => clearInterval(interval);
  }, [activeTimer, timeLeft]);
  
  // Initialize timer with project duration if available
  useEffect(() => {
      if (linkedFocusProject) {
          setTimeLeft(linkedFocusProject.pomoDuration * 60);
      }
  }, [linkedFocusProject]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartFocus = () => {
      setActiveTimer(!activeTimer);
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-[200] bg-[#020204] text-white overflow-hidden font-sans flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 50% 0%, ${themeColor}, transparent 70%)` }} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 pt-6 px-6 pb-4 flex items-center justify-between shrink-0 bg-gradient-to-b from-[#020204] to-transparent">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center hover:bg-white/10 active:scale-95 border border-white/5 transition-all">
          <ChevronLeft className="w-5 h-5 text-white/80" />
        </button>
        <div className="text-center">
            <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-white/40 mb-1">Mission Control</h1>
            <h2 className="text-lg font-black tracking-tight text-white">{project.mainGoal}</h2>
        </div>
        <div className="w-10" />
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 relative z-10 space-y-8">
          
          {/* --- SECTION 1: DIRECTIVES (TASKS) --- */}
          <section>
              <div className="flex items-center gap-2 mb-4 sticky top-0 bg-[#020204]/80 backdrop-blur-md py-2 z-20 border-b border-white/5">
                  <Target size={14} className="text-cyan-400" />
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Directives</h3>
                  <span className="ml-auto text-[10px] font-bold text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{objectives.length} ACTIVE</span>
              </div>
              
              <div className="space-y-3">
                  {objectives.length === 0 && (
                      <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                          <Target size={24} className="text-white/10 mx-auto mb-2" />
                          <div className="text-white/30 text-sm">No active directives.</div>
                      </div>
                  )}
                  {objectives.map((node, i) => (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                            "rounded-[20px] border overflow-hidden transition-all duration-300",
                            node.isCompleted 
                                ? "bg-emerald-500/5 border-emerald-500/20" 
                                : "bg-white/5 border-white/5 hover:border-white/10"
                        )}
                      >
                          {/* Task Header */}
                          <div className="p-3 flex items-center gap-3">
                              <button 
                                onClick={() => handleToggleObjective(node.id)}
                                className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0",
                                    node.isCompleted ? "bg-emerald-500 border-emerald-500 text-black" : "border-white/30 hover:border-white/60"
                                )}
                              >
                                  {node.isCompleted && <CheckCircle2 size={12} />}
                              </button>
                              
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTaskId(expandedTaskId === node.id ? null : node.id)}>
                                  {editingTaskId === node.id ? (
                                      <input 
                                        autoFocus
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-transparent text-white font-medium outline-none border-b border-white/20 pb-1 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                  ) : (
                                      <div className={cn("font-medium text-sm truncate transition-colors", node.isCompleted ? "text-emerald-200/50 line-through" : "text-white")}>
                                          {node.title}
                                      </div>
                                  )}
                              </div>

                              <button onClick={() => setExpandedTaskId(expandedTaskId === node.id ? null : node.id)} className="text-white/30 hover:text-white transition-colors">
                                  {expandedTaskId === node.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                              {expandedTaskId === node.id && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-3 pb-3 border-t border-white/5 bg-black/20"
                                  >
                                      <div className="pt-3 space-y-3">
                                          {editingTaskId === node.id ? (
                                              <textarea
                                                value={editDesc}
                                                onChange={(e) => setEditDesc(e.target.value)}
                                                className="w-full bg-white/5 rounded-lg p-2 text-xs text-white/80 outline-none resize-none h-20 border border-white/10 placeholder:text-white/20"
                                                placeholder="Add description..."
                                              />
                                          ) : (
                                              node.description && (
                                                  <div className="text-xs text-white/70 leading-relaxed">
                                                      {node.description}
                                                  </div>
                                              )
                                          )}

                                          {/* Metadata Pills */}
                                          <div className="flex flex-wrap gap-2 text-[10px] text-white/50">
                                              {node.dueDate && (
                                                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                                                      <Calendar size={10} className="text-cyan-400" />
                                                      {getDate(node.dueDate)?.toLocaleDateString()}
                                                  </div>
                                              )}
                                              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                                                  <Coins size={10} className="text-yellow-400" />
                                                  <span>+{node.reward?.coins || 0} G</span>
                                              </div>
                                              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                                                  <Zap size={10} className="text-purple-400" />
                                                  <span>+{node.reward?.xp || 0} XP</span>
                                              </div>
                                          </div>

                                          {/* Actions Toolbar */}
                                          <div className="flex items-center gap-2 justify-end pt-2 border-t border-white/5">
                                              {editingTaskId === node.id ? (
                                                  <button 
                                                    onClick={() => handleSaveTask(node.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 flex items-center gap-1 transition-colors"
                                                  >
                                                      <Save size={10} /> SAVE
                                                  </button>
                                              ) : (
                                                  <button 
                                                    onClick={() => { setEditingTaskId(node.id); setEditTitle(node.title); setEditDesc(node.description || ''); }}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-[10px] font-bold hover:bg-white/10 flex items-center gap-1 transition-colors"
                                                  >
                                                      <Edit2 size={10} /> EDIT
                                                  </button>
                                              )}
                                              <button 
                                                onClick={() => handleDeleteTask(node.id)}
                                                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 flex items-center gap-1 transition-colors"
                                              >
                                                  <Trash2 size={10} /> DELETE
                                              </button>
                                          </div>
                                      </div>
                                  </motion.div>
                              )}
                          </AnimatePresence>
                      </motion.div>
                  ))}
              </div>
          </section>

          {/* --- SECTION 2: RITUALS (HABITS) --- */}
          <section>
              <div className="flex items-center gap-2 mb-4 sticky top-0 bg-[#020204]/80 backdrop-blur-md py-2 z-20 border-b border-white/5">
                  <Zap size={14} className="text-purple-400" />
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Rituals</h3>
              </div>

              <div className="space-y-2">
                  {habits.length === 0 && (
                      <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                          <Zap size={24} className="text-white/10 mx-auto mb-2" />
                          <div className="text-white/30 text-sm">No linked rituals.</div>
                      </div>
                  )}
                  {habits.map((habit, i) => (
                    <motion.button
                      key={habit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => onToggleHabit(habit.id)}
                      className={cn(
                        "w-full p-3 rounded-[20px] flex items-center gap-3 transition-all duration-300 group border text-left",
                        habit.completedToday 
                          ? "bg-white/10 border-white/20 shadow-[0_0_20px_-5px_rgba(255,255,255,0.2)]" 
                          : "bg-white/5 border-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl transition-colors shrink-0",
                        habit.completedToday ? "bg-white text-black" : "bg-white/10 text-white/60"
                      )}>
                        <Zap size={14} fill={habit.completedToday ? "currentColor" : "none"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white truncate">{habit.title}</div>
                        <div className="text-[10px] text-white/40">{habit.streak} day streak</div>
                      </div>
                      {habit.completedToday && (
                        <div className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          +XP
                        </div>
                      )}
                    </motion.button>
                  ))}
              </div>
          </section>

          {/* --- SECTION 3: PROTOCOL (FOCUS) --- */}
          <section>
              <div className="flex items-center gap-2 mb-4 sticky top-0 bg-[#020204]/80 backdrop-blur-md py-2 z-20 border-b border-white/5">
                  <Clock size={14} className="text-red-400" />
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Protocol</h3>
              </div>

              {linkedFocusProject ? (
                  <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                      
                      {/* Project Info */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                          <Brain size={12} className="text-white/40" />
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{linkedFocusProject.title}</span>
                      </div>

                      <div className="text-5xl font-black text-white tabular-nums tracking-tighter mb-4 relative z-10 mt-6">
                          {formatTime(timeLeft)}
                      </div>
                      <button 
                        onClick={handleStartFocus}
                        className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center transition-all relative z-10 shadow-xl hover:scale-105 active:scale-95",
                            activeTimer ? "bg-red-500 text-white shadow-red-500/30" : "bg-white text-black"
                        )}
                      >
                          {activeTimer ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                      </button>
                      
                      <div className="mt-4 flex gap-4">
                          <div className="text-center">
                              <div className="text-[10px] text-white/30 font-bold uppercase">Session</div>
                              <div className="text-sm font-bold text-white">{linkedFocusProject.pomoDuration}m</div>
                          </div>
                          <div className="w-px h-8 bg-white/10" />
                          <div className="text-center">
                              <div className="text-[10px] text-white/30 font-bold uppercase">Break</div>
                              <div className="text-sm font-bold text-white">{linkedFocusProject.breakDuration}m</div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <button className="w-full py-8 border border-dashed border-white/10 rounded-[24px] flex flex-col items-center justify-center gap-3 group hover:bg-white/5 transition-all">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                          <Plus size={24} />
                      </div>
                      <div className="text-center">
                          <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Initialize Focus Protocol</div>
                          <div className="text-[10px] text-white/40 mt-1">Create a dedicated Focus Project for this mission</div>
                      </div>
                  </button>
              )}
          </section>

          {/* --- SECTION 4: LOG (NOTES) --- */}
          <section>
              <div className="flex items-center gap-2 mb-4 sticky top-0 bg-[#020204]/80 backdrop-blur-md py-2 z-20 border-b border-white/5">
                  <Edit2 size={14} className="text-emerald-400" />
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Mission Log</h3>
              </div>

              <div className="space-y-3">
                  {/* Note Input */}
                  <div className="bg-white/5 rounded-[20px] p-1 flex items-center gap-2 border border-white/5 focus-within:border-white/20 transition-colors">
                      <input 
                        type="text" 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a field note..."
                        className="flex-1 bg-transparent h-10 px-4 text-sm text-white placeholder:text-white/20 outline-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newNote.trim()) {
                                onAddNote(newNote);
                                setNewNote('');
                            }
                        }}
                      />
                      <button 
                        onClick={() => {
                            if (newNote.trim()) {
                                onAddNote(newNote);
                                setNewNote('');
                            }
                        }}
                        disabled={!newNote.trim()}
                        className="w-10 h-10 rounded-[16px] bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-all"
                      >
                          <Plus size={16} />
                      </button>
                  </div>

                  {/* Notes List */}
                  {notes.length === 0 && (
                      <div className="text-center text-white/30 text-xs italic py-4">No log entries yet.</div>
                  )}
                  {notes.map(note => (
                      <div key={note.id} className="bg-white/5 rounded-[20px] p-4 border border-white/5 hover:border-white/10 transition-colors">
                          <div className="text-xs text-white/30 font-mono mb-2">
                              {new Date(note.updatedAt).toLocaleDateString()} • {new Date(note.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="text-sm text-white/80 leading-relaxed">
                              {note.blocks[0]?.content || 'Empty note'}
                          </div>
                      </div>
                  ))}
              </div>
          </section>
      </div>
    </div>
  );
};
