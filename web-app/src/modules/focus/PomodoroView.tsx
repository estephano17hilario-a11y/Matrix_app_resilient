import React, { useState, useMemo } from 'react';
import { Project, Attribute } from '../../types';
import { ActiveSessionView } from './components/ActiveSessionView';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PomodoroViewProps {
 projects: Project[];
 attributes: Attribute[];
 onExit: () => void;
 onCompleteSession: (projectId: string | null, duration: number, type: 'POMO' | 'STOPWATCH') => void;
 onUpdateProject: (p: Project) => void;
 onDeleteSession?: (projectId: string, sessionId: string) => void;
 onAddManualSession?: (projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string) => void;
 onEditSession?: (projectId: string, sessionId: string, newDurationMinutes: number, newDateStr: string) => void;
 initialProjectId?: string | null;
}

const QUICK_FOCUS_PROJECT_ID = 'quick-focus-v1';

import { createPortal } from 'react-dom';

export const PomodoroView: React.FC<PomodoroViewProps> = ({
 projects,
 attributes,
 onExit,
 onCompleteSession,
 onUpdateProject,
 onDeleteSession,
 onAddManualSession,
 onEditSession,
 initialProjectId
}) => {
 // FORCE INITIAL STATE to use prop if available
 const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => initialProjectId || null);

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

 const handleSessionComplete = (duration: number, type: 'POMO' | 'STOPWATCH') => {
 const targetId = selectedProject ? selectedProject.id : null;
 onCompleteSession(targetId, duration, type);
 };

 // Custom Header Logic (LOCKED to Initial Project if provided)
 const customHeader = (
 <div className="relative z-[60]"> {/* Higher Z-Index to be above other UI */}
 <div className="flex flex-col items-center gap-2">
 {/* If initialProjectId is provided, show static badge. Else, show selector */}
 {initialProjectId ? (
 <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm transform-gpu shadow-md">
 <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeAttribute?.color || '#06b6d4', color: activeAttribute?.color || '#06b6d4' }} />
 <span className="text-xs font-bold text-white uppercase tracking-widest">
 {activeProject.title}
 </span>
 </div>
 ) : (
 <>
 <button
 onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
 className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transform-gpu transition-all active:scale-95 group shadow-md"
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
 Quick Focus
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
 </div>
 </div>
 );

 // Use Portal to ensure it is always on top and centered relative to viewport
 // avoiding scroll context issues from parent containers
 if (typeof document === 'undefined') return null;

 return createPortal(
 <div className="fixed inset-0 z-[9999] bg-[#020204] flex flex-col animate-in fade-in duration-300 overflow-hidden touch-none select-none overscroll-none" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh' }}>
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
 onExit={onExit}
 onCompleteSession={handleSessionComplete}
 onUpdateProject={onUpdateProject}
 onDeleteSession={onDeleteSession}
 onAddManualSession={onAddManualSession}
 onEditSession={onEditSession}
 customHeaderTitle={customHeader}
 />
 </div>
 </div>,
 document.body
 );
};
