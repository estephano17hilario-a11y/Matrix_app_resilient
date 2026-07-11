import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Project, Attribute, Quest } from '../../types';
import { ActiveSessionView } from './components/ActiveSessionView';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, Clock, X, Hourglass, Plus, Trash2, Save, Calendar, Check, Edit3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface PomodoroViewProps {
 projects: Project[];
 attributes: Attribute[];
 quests: Quest[];
 onExit: () => void;
 onCompleteSession: (projectId: string | null, duration: number, type: 'POMO' | 'STOPWATCH', subTraitId?: string) => void;
 onUpdateProject: (p: Project) => void;
 onDeleteSession?: (projectId: string, sessionId: string) => void;
 onAddManualSession?: (projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string, subTraitId?: string) => void;
 onEditSession?: (projectId: string, sessionId: string, newDurationMinutes: number, newDateStr: string) => void;
 initialProjectId?: string | null;
}

interface RoutineSessionModalProps {
  project: Project;
  attributes: Attribute[];
  onClose: () => void;
  onUpdateProject: (p: Project) => void;
}

const RoutineSessionModal: React.FC<RoutineSessionModalProps> = ({ project, attributes, onClose, onUpdateProject }) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentWeekday = today.getDay(); // 0 Sunday, 1 Monday...

  // State to track selected mode: 'DEFAULT' | 'TEMP' | 'WEEKDAY'
  const [routineMode, setRoutineMode] = useState<'DEFAULT' | 'TEMP' | 'WEEKDAY'>(() => {
    return (localStorage.getItem(`matrix_project_routine_mode_${project.id}`) as any) || 'DEFAULT';
  });

  // State to track selected weekday for editing (defaults to today's weekday)
  const [selectedWeekday, setSelectedWeekday] = useState<number>(currentWeekday);

  // Active steps loaded based on mode & weekday
  const [steps, setSteps] = useState<any[]>([]);
  const [activeDays, setActiveDays] = useState<number[]>([]);

  // Step editor states
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [breakDuration, setBreakDuration] = useState<number>(5);
  const [isEditingDurationManual, setIsEditingDurationManual] = useState(false);
  const [manualDurationInput, setManualDurationInput] = useState<string>('25');
  const [stepType, setStepType] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [subTrait, setSubTrait] = useState<string | undefined>(undefined);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // Load steps depending on selected mode and selected weekday
  const loadStepsForMode = () => {
    if (routineMode === 'TEMP') {
      const tempSaved = localStorage.getItem(`matrix_temp_routine_${project.id}_${todayStr}`);
      if (tempSaved) {
        try {
          setSteps(JSON.parse(tempSaved));
        } catch (e) {
          setSteps([]);
        }
      } else {
        // Fallback to project routine
        setSteps(project.focusRoutine || []);
      }
    } else if (routineMode === 'WEEKDAY') {
      const weekdaySaved = localStorage.getItem(`matrix_project_routine_${project.id}_weekday_${selectedWeekday}`);
      if (weekdaySaved) {
        try {
          setSteps(JSON.parse(weekdaySaved));
        } catch (e) {
          setSteps([]);
        }
      } else {
        // Fallback to project routine
        setSteps(project.focusRoutine || []);
      }
    } else {
      // DEFAULT project mode
      setSteps(project.focusRoutine || []);
      setActiveDays(project.focusRoutineDays || []);
    }
  };

  useEffect(() => {
    loadStepsForMode();
  }, [routineMode, selectedWeekday, project]);

  const selectedAttr = attributes.find(a => a.id === project.attribute);
  const subTraits = selectedAttr?.subTraits || [];

  const DAYS = [
    { label: 'D', index: 0 },
    { label: 'L', index: 1 },
    { label: 'M', index: 2 },
    { label: 'M', index: 3 },
    { label: 'J', index: 4 },
    { label: 'V', index: 5 },
    { label: 'S', index: 6 }
  ];

  const handleSaveAndApply = () => {
    // 1. Save Mode
    localStorage.setItem(`matrix_project_routine_mode_${project.id}`, routineMode);

    // 2. Save Steps depending on Mode
    if (routineMode === 'TEMP') {
      localStorage.setItem(`matrix_temp_routine_${project.id}_${todayStr}`, JSON.stringify(steps));
    } else if (routineMode === 'WEEKDAY') {
      localStorage.setItem(`matrix_project_routine_${project.id}_weekday_${selectedWeekday}`, JSON.stringify(steps));
    } else {
      // DEFAULT: update project default routine in database
      const updatedProject = {
        ...project,
        focusRoutine: steps,
        focusRoutineDays: activeDays
      };
      onUpdateProject(updatedProject);
    }

    // Force active focus session hook to reload steps immediately
    window.dispatchEvent(new CustomEvent(`matrix_focus_routine_updated_${project.id}`));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Configuración de Rutina</h3>
              <p className="text-[10px] text-white/40 font-medium">Modifica los intervalos y descansos de tu sesión</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors animate-fade-in"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Mode Selector */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Modo de Rutina:</span>
            <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
              {[
                { id: 'DEFAULT', label: 'Por Defecto' },
                { id: 'TEMP', label: 'Solo Hoy (Temp)' },
                { id: 'WEEKDAY', label: 'Por Día' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setRoutineMode(m.id as any)}
                  className={cn(
                    "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                    routineMode === m.id 
                      ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 shadow-md"
                      : "bg-transparent border border-transparent text-white/40 hover:text-white/60"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekday selector for WEEKDAY mode */}
          {routineMode === 'WEEKDAY' && (
            <div className="space-y-1.5 animate-fade-in">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Selecciona Día a Editar:</span>
              <div className="flex justify-between bg-black/40 p-1.5 rounded-xl border border-white/5">
                {DAYS.map(d => (
                  <button
                    key={d.index}
                    onClick={() => setSelectedWeekday(d.index)}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black transition-all border",
                      selectedWeekday === d.index
                        ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                        : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline View */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pasos de Enfoque (Timeline):</span>
            <div className="flex flex-col items-center py-2 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-8 bottom-8 w-0.5 bg-white/10 left-1/2 -translate-x-1/2 z-0" />
              <div className="relative z-10 bg-[#161622] border border-white/10 px-2 py-0.5 rounded-full text-[7px] font-black text-white uppercase tracking-wider mb-3">START</div>
              
              {steps.length === 0 ? (
                <div className="text-[9px] text-white/30 italic py-3 relative z-10">Sin pasos. Agrega enfoques o intervalos abajo.</div>
              ) : (
                <div className="w-full flex flex-col gap-2 px-5 my-1 relative z-10">
                  {steps.map((step, idx) => {
                    const isFocus = step.type === 'FOCUS';
                    const isSelected = editingStepId === step.id;
                    const subTraitName = step.subAttribute ? subTraits.find(st => st.id === step.subAttribute)?.name : null;
                    return (
                      <React.Fragment key={step.id}>
                        <div
                          onClick={() => {
                            setEditingStepId(step.id);
                            if (step.type === 'FOCUS') {
                              setFocusDuration(step.duration);
                            } else {
                              setBreakDuration(step.duration);
                            }
                            setStepType(step.type);
                            setSubTrait(step.subAttribute);
                          }}
                          className={cn(
                            "w-1/2 flex items-center relative cursor-pointer group",
                            isFocus ? "self-end justify-start pl-3" : "self-start justify-end pr-3 text-right"
                          )}
                        >
                          <div 
                            className={cn(
                              "absolute w-3 h-3 rounded-full border top-1/2 -translate-y-1/2 z-20 shadow-sm transition-all",
                              isSelected ? "bg-white border-cyan-400 scale-150" : isFocus ? "bg-cyan-500 border-cyan-400" : "bg-amber-500 border-amber-400"
                            )}
                            style={isFocus ? { left: '-6px' } : { right: '-6px' }}
                          />
                          <div
                            className={cn(
                              "p-1.5 rounded-xl border text-[8px] font-bold transition-all max-w-full relative",
                              isSelected ? "bg-white/10 border-white text-white" : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]"
                            )}
                          >
                            <div className="truncate max-w-[90px]">
                              {step.duration} min - {isFocus ? 'Enfoque' : 'Descanso'}
                            </div>
                            {isFocus && subTraitName && (
                              <div className="text-[6px] text-cyan-400 mt-0.5 truncate max-w-[90px]">
                                🎯 {subTraitName}
                              </div>
                            )}
                            {isSelected && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSteps(steps.filter(s => s.id !== step.id));
                                  setEditingStepId(null);
                                }}
                                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-600 border border-white/20 flex items-center justify-center text-white text-[7px]"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Plus button between elements (Request 1) */}
                        {idx < steps.length - 1 && (
                          <div className="w-full flex justify-center py-1 relative z-25">
                            <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  const nextType = step.type === 'FOCUS' ? 'BREAK' : 'FOCUS';
                                  const nextDuration = nextType === 'FOCUS' ? focusDuration : breakDuration;
                                  const insertedStep = {
                                    id: Math.random().toString(),
                                    type: nextType,
                                    duration: nextDuration
                                  };
                                  const newSteps = [...steps];
                                  newSteps.splice(idx + 1, 0, insertedStep);
                                  setSteps(newSteps);
                              }}
                              className="w-3.5 h-3.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center font-black text-[8px] shadow-sm border border-cyan-400/30 transition-transform active:scale-90"
                              title="Insertar paso de rutina"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
              <div className="relative z-10 bg-[#161622] border border-white/10 px-2 py-0.5 rounded-full text-[7px] font-black text-white uppercase tracking-wider mt-3">END</div>
            </div>
          </div>

          {/* Steps Editor Form */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 space-y-2.5">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
              {editingStepId ? 'Editar Paso Seleccionado' : 'Agregar Nuevo Paso'}
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <button 
                onClick={() => setStepType('FOCUS')}
                className={cn(
                  "flex-1 py-1 rounded-md text-[9px] font-bold border transition-all uppercase tracking-wider",
                  stepType === 'FOCUS' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-transparent border-white/10 text-slate-500"
                )}
              >
                Enfoque
              </button>
              <button 
                onClick={() => setStepType('BREAK')}
                className={cn(
                  "flex-1 py-1 rounded-md text-[9px] font-bold border transition-all uppercase tracking-wider",
                  stepType === 'BREAK' ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-transparent border-white/10 text-slate-500"
                )}
              >
                Descanso
              </button>
            </div>

            {stepType === 'FOCUS' && subTraits.length > 0 && (
              <div className="space-y-1">
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wide">Sub-Rasgo Exclusivo:</span>
                <div className="flex flex-wrap gap-1">
                  <button 
                    onClick={() => setSubTrait(undefined)}
                    className={cn(
                      "px-1 py-0.5 rounded text-[7px] font-bold border transition-all",
                      subTrait === undefined ? "bg-white/15 border-white text-white" : "bg-transparent border-white/10 text-slate-500"
                    )}
                  >
                    Ninguno
                  </button>
                  {subTraits.map(st => (
                    <button 
                      key={st.id}
                      onClick={() => setSubTrait(st.id)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[7px] font-bold border transition-all",
                        subTrait === st.id ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : "bg-transparent border-white/10 text-slate-500"
                      )}
                    >
                      {st.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration picker */}
            <div className="flex items-center justify-between bg-black/40 rounded-lg p-1.5 border border-white/5">
              <button 
                type="button"
                onClick={() => {
                  if (stepType === 'FOCUS') {
                    setFocusDuration(prev => Math.max(1, prev - 1));
                  } else {
                    setBreakDuration(prev => Math.max(1, prev - 1));
                  }
                }}
                className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold text-xs"
              >
                -
              </button>
              {isEditingDurationManual ? (
                <input
                  type="number"
                  value={manualDurationInput}
                  onChange={(e) => setManualDurationInput(e.target.value)}
                  onBlur={() => {
                    const val = parseInt(manualDurationInput);
                    if (!isNaN(val) && val > 0) {
                      if (stepType === 'FOCUS') {
                        setFocusDuration(val);
                      } else {
                        setBreakDuration(val);
                      }
                    }
                    setIsEditingDurationManual(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(manualDurationInput);
                      if (!isNaN(val) && val > 0) {
                        if (stepType === 'FOCUS') {
                          setFocusDuration(val);
                        } else {
                          setBreakDuration(val);
                        }
                      }
                      setIsEditingDurationManual(false);
                    }
                  }}
                  className="w-16 bg-white/10 border border-white/20 rounded text-center text-xs font-bold text-white outline-none"
                  autoFocus
                />
              ) : (
                <div 
                  onClick={() => {
                    setManualDurationInput(stepType === 'FOCUS' ? focusDuration.toString() : breakDuration.toString());
                    setIsEditingDurationManual(true);
                  }}
                  className="text-center leading-none cursor-pointer hover:scale-105 transition-transform"
                >
                  <span className="text-xs font-black text-white font-mono">
                    {stepType === 'FOCUS' ? focusDuration : breakDuration}
                  </span>
                  <span className="text-[8px] text-slate-500 ml-1 font-bold">MIN</span>
                </div>
              )}
              <button 
                type="button"
                onClick={() => {
                  if (stepType === 'FOCUS') {
                    setFocusDuration(prev => Math.min(180, prev + 1));
                  } else {
                    setBreakDuration(prev => Math.min(180, prev + 1));
                  }
                }}
                className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold text-xs"
              >
                +
              </button>
            </div>

            {editingStepId ? (
              <div className="flex gap-1.5">
                <button 
                  type="button"
                  onClick={() => {
                    const currentDur = stepType === 'FOCUS' ? focusDuration : breakDuration;
                    setSteps(steps.map(s => s.id === editingStepId ? { ...s, type: stepType, duration: currentDur, subAttribute: stepType === 'FOCUS' ? subTrait : undefined } : s));
                    setEditingStepId(null);
                  }}
                  className="flex-1 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider shadow-md"
                >
                  Guardar
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingStepId(null)}
                  className="px-2 py-1 rounded-lg bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  const currentDur = stepType === 'FOCUS' ? focusDuration : breakDuration;
                  const newStep = {
                    id: Math.random().toString(),
                    type: stepType,
                    duration: currentDur,
                    subAttribute: stepType === 'FOCUS' ? subTrait : undefined
                  };
                  setSteps([...steps, newStep]);
                  setSubTrait(undefined);
                }}
                className="w-full py-1 rounded-lg bg-cyan-600 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-cyan-500 transition-colors shadow-md"
              >
                Agregar Paso
              </button>
            )}
          </div>

          {/* Active Days configuration for DEFAULT mode only */}
          {routineMode === 'DEFAULT' && (
            <div className="space-y-1.5 border-t border-white/5 pt-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Días activos de la rutina:</span>
              <div className="flex justify-between">
                {DAYS.map(d => {
                  const isSelected = activeDays.includes(d.index);
                  return (
                    <button
                      key={d.index}
                      onClick={() => {
                        if (activeDays.includes(d.index)) {
                          setActiveDays(activeDays.filter(x => x !== d.index));
                        } else {
                          setActiveDays([...activeDays, d.index].sort((a,b)=>a-b));
                        }
                      }}
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border transition-all",
                        isSelected 
                          ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.4)]"
                          : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 shrink-0 flex gap-2">
          <button
            onClick={handleSaveAndApply}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
          >
            Aplicar Rutina
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const QUICK_FOCUS_PROJECT_ID = 'quick-focus-v1';

export const PomodoroView: React.FC<PomodoroViewProps> = ({
 projects,
 attributes,
 quests,
 onExit,
 onCompleteSession,
 onUpdateProject,
 onDeleteSession,
 onAddManualSession,
 onEditSession,
 initialProjectId
}) => {
 const { t } = useTranslation();
 const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => initialProjectId || null);
 const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => localStorage.getItem('matrix_active_focus_task_id'));

  const handleSelectTask = (taskId: string | null) => {
    if (taskId) {
      localStorage.setItem('matrix_active_focus_task_id', taskId);
      setActiveTaskId(taskId);
    } else {
      localStorage.removeItem('matrix_active_focus_task_id');
      setActiveTaskId(null);
    }
  };

 // EFFECT: Sync with prop if it changes later (optional but safe)
 React.useEffect(() => {
 if (initialProjectId && initialProjectId !== selectedProjectId) {
 setSelectedProjectId(initialProjectId);
 }
 }, [initialProjectId]);

 // EFFECT: Lock body scroll when PomodoroView is mounted
 React.useEffect(() => {
 // FORCE SCROLL TO TOP - Fix for mobile browsers retaining scroll position
 window.scrollTo(0, 0);
 
 const originalStyle = window.getComputedStyle(document.body).overflow;
 const originalTouchAction = window.getComputedStyle(document.body).touchAction;
 
 document.body.style.overflow = 'hidden';
 document.body.style.touchAction = 'none';
 document.documentElement.style.overflow = 'hidden';
 document.documentElement.style.touchAction = 'none';

 return () => {
 document.body.style.overflow = originalStyle;
 document.body.style.touchAction = originalTouchAction;
 document.documentElement.style.overflow = originalStyle;
 document.documentElement.style.touchAction = originalTouchAction;
 };
 }, []);

 const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

 const selectedProject = useMemo(() => {
 if (!selectedProjectId) return null;
 return projects.find(p => p.id === selectedProjectId) || null;
 }, [selectedProjectId, projects]);

 // Create a virtual "Quick Focus" project if no project is selected
 const activeProject: Project = useMemo(() => {
 const quickFocusProject: Project = {
 id: QUICK_FOCUS_PROJECT_ID,
 title: 'Quick Focus',
 description: 'Sesión de enfoque rápido',
 attribute: 'intelligence',
 pomoDuration: 25,
 breakDuration: 5,
 impact: 1,
 totalTime: 0,
 goalTarget: 100,
 goalFrequency: 'WEEKLY',
 createdAt: Date.now(),
 sessions: []
 };

 if (!projects.length) {
 return quickFocusProject;
 }

 if (selectedProject) {
 return selectedProject;
 }

 return quickFocusProject;
 }, [selectedProject, projects.length]);

 const activeAttribute = attributes.find(a => a.id === activeProject.attribute);

  const handleSessionComplete = (duration: number, type: 'POMO' | 'STOPWATCH', subTraitId?: string, isCompletedNaturally?: boolean) => {
  const targetId = selectedProject ? selectedProject.id : null;
  onCompleteSession(targetId, duration, type, subTraitId, isCompletedNaturally);
  };

 // Custom Header Logic (LOCKED to Initial Project if provided)
 const customHeader = (
 <div className="relative z-[60]"> {/* Higher Z-Index to be above other UI */}
 <div className="flex flex-col items-center gap-2">
 {/* If initialProjectId is provided, show static badge. Else, show selector */}
 {initialProjectId ? (
 <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-white/10 shadow-md">
 <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeAttribute?.color || '#06b6d4', color: activeAttribute?.color || '#06b6d4' }} />
 <span className="text-xs font-bold text-white uppercase tracking-widest">
 {activeProject.title}
 </span>
 </div>
 ) : (
 <>
 <button
 onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
 className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-white/10 border border-white/10 transition-all active:scale-95 group shadow-md"
 >
 <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeAttribute?.color || '#06b6d4', color: activeAttribute?.color || '#06b6d4' }} />
 <span className="text-xs font-bold text-white uppercase tracking-widest">
 {activeProject.id === QUICK_FOCUS_PROJECT_ID ? 'Quick Focus' : activeProject.title}
 </span>
 <ChevronDown size={14} className={cn("text-white/40 transition-transform", isProjectSelectorOpen ? "rotate-180" : "")} />
 </button>
 
 <AnimatePresence>
 {isProjectSelectorOpen && (
 <motion.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 className="absolute top-full mt-2 w-64 max-h-60 overflow-y-auto bg-[#1a1a1a]/95 border border-white/10 rounded-xl shadow-md p-1 flex flex-col gap-1 z-[100]"
 >
 <button
 onClick={() => {
 setSelectedProjectId(null);
 setIsProjectSelectorOpen(false);
 }}
 className={cn(
 "w-full px-3 py-2 rounded-lg text-left text-xs font-bold flex items-center gap-2 transition-all",
 activeProject.id === QUICK_FOCUS_PROJECT_ID ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
 )}
 >
 <Zap size={14} className="text-cyan-400" />
 {t('focus.quickFocus', 'Quick Focus')}
 </button>
 <div className="h-px bg-white/5 my-1" />
 {projects.filter(p => !p.archived).map(project => {
 const attr = attributes.find(a => a.id === project.attribute);
 return (
 <button
 key={project.id}
 onClick={() => {
 setSelectedProjectId(project.id);
 setIsProjectSelectorOpen(false);
 }}
 className={cn(
 "w-full px-3 py-2 rounded-lg text-left text-xs font-bold flex items-center gap-2 transition-all",
 selectedProjectId === project.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
 )}
 >
 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: attr?.color || '#666' }} />
 <span className="truncate">{project.title}</span>
 </button>
 );
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </>
 )}
  {/* Bottom triggers: Rutina + Task Selector side by side */}
  {activeProject.id !== QUICK_FOCUS_PROJECT_ID && (() => {
    const activeTask = activeTaskId ? quests.find(q => q.id === activeTaskId) : null;
    const projectTasks = quests.filter(q => q.projectId === activeProject.id && !q.completed && q.pomodoroTarget);
    return (
      <div className="mt-1 flex items-center gap-2 relative">
        {/* Rutina button - shifted slightly left */}
        <button
          onClick={() => setIsRoutineModalOpen(true)}
          className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 px-2.5 py-1 rounded-full transition-all active:scale-95 flex items-center gap-1 shadow-sm"
        >
          <span>🔄 Rutina</span>
        </button>

        {/* Task Selector button */}
        {projectTasks.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsTaskSelectorOpen(!isTaskSelectorOpen)}
              className={cn(
                "text-[9px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full transition-all active:scale-95 flex items-center gap-1 shadow-sm",
                activeTask
                  ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20"
                  : "text-slate-400 bg-white/5 hover:bg-white/10 border-white/10"
              )}
            >
              <span>🍅</span>
              <span className="max-w-[70px] truncate">
                {activeTask ? `${activeTask.pomodoroCompleted || 0}/${activeTask.pomodoroTarget}` : 'Tarea'}
              </span>
              <ChevronDown size={10} className={cn("transition-transform", isTaskSelectorOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {isTaskSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute bottom-full mb-2 right-0 w-56 max-h-48 overflow-y-auto bg-[#1a1a1a]/95 border border-white/10 rounded-xl shadow-xl p-1 flex flex-col gap-1 z-[200]"
                >
                  {/* Clear selection */}
                  {activeTask && (
                    <button
                      onClick={() => { handleSelectTask(null); setIsTaskSelectorOpen(false); }}
                      className="w-full px-3 py-1.5 rounded-lg text-left text-[10px] font-bold flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <span>✕</span>
                      <span>Sin tarea asignada</span>
                    </button>
                  )}
                  {projectTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => { handleSelectTask(task.id); setIsTaskSelectorOpen(false); }}
                      className={cn(
                        "w-full px-3 py-1.5 rounded-lg text-left text-[10px] font-bold flex items-center gap-2 transition-all",
                        activeTaskId === task.id ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" : "text-zinc-300 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <span className="shrink-0">🍅</span>
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className="text-[9px] font-mono text-rose-400 shrink-0">{task.pomodoroCompleted || 0}/{task.pomodoroTarget}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  })()}
  </div>
  </div>
  );

 // Use Portal to ensure it is always on top and centered relative to viewport
 // avoiding scroll context issues from parent containers
 if (typeof document === 'undefined') return null;

 return createPortal(
 <div className="fixed inset-0 z-[9999] bg-[#020204] flex flex-col animate-in fade-in duration-200 overflow-hidden touch-none select-none overscroll-none" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh' }}>
 {/* Background Atmosphere - High Performance, No heavy blurs to avoid flickering */}
 <div 
 className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full pointer-events-none opacity-20"
 style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }} 
 />
 <div 
 className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full pointer-events-none opacity-20"
 style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)' }} 
 />

 <div className="flex-1 relative z-10 overflow-hidden flex items-center justify-center">
  <ActiveSessionView
  project={activeProject}
  attribute={activeAttribute}
  quests={quests}
  onExit={onExit}
  onCompleteSession={handleSessionComplete}
  onUpdateProject={onUpdateProject}
  onDeleteSession={onDeleteSession}
  onAddManualSession={onAddManualSession}
  onEditSession={onEditSession}
  customHeaderTitle={customHeader}
  onEditRoutine={() => setIsRoutineModalOpen(true)}
  activeTaskId={activeTaskId}
  />
 </div>

 <AnimatePresence>
   {isRoutineModalOpen && (
     <RoutineSessionModal 
       project={activeProject}
       attributes={attributes}
       onClose={() => setIsRoutineModalOpen(false)}
       onUpdateProject={onUpdateProject}
     />
   )}
 </AnimatePresence>
 </div>,
 document.body
 );
};
