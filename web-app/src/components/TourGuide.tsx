import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, ChevronRight, Sparkles, Zap, Coins, Trophy, Target, Star, Check, Flame, Plus, Archive, BarChart3, Pointer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type TourActionType = 
 | 'OPEN_QUEST_MODAL'
 | 'OPEN_HABIT_MODAL'
 | 'OPEN_PROJECT_MODAL'
 | 'OPEN_BAD_HABIT_MODAL'
 | 'SCROLL_TO_ELEMENT'
 | 'CLICK_ELEMENT';

export interface TourAction {
 type: TourActionType;
 payload?: any;
}

export interface TourStep {
 id: string;
 target?: string; // CSS Selector of the element to highlight
 title: string;
 description: string;
 subtext?: string;
 icon?: React.ElementType;
 position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
 highlightPadding?: number;
 interaction?: 'next' | 'click' | 'wait-event'; // 'next' = button in tooltip, 'click' = click the highlighted element, 'wait-event' = wait for a specific event
 awaitEvent?: string; // Event name to wait for
 action?: TourAction;
}

interface TourContextType {
 isActive: boolean;
 currentStep: number;
 tourId: string | null;
 startTour: (tourId: string) => void;
 endTour: () => void;
 nextStep: () => void;
 prevStep: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
 const context = useContext(TourContext);
 if (!context) {
 return { isActive: false, currentStep: 0, tourId: null, startTour: () => {}, endTour: () => {}, nextStep: () => {}, prevStep: () => {} };
 }
 return context;
};

// ==========================================
// CONFIGURACIÓN DE TOURS DINÁMICOS
// ==========================================
// TOURS object has been removed to fix unused variable warning, it is now generated dynamically inside getTours

// ==========================================
// PROVIDER PRINCIPAL
// ==========================================
export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
 const { t } = useTranslation();
 const [isActive, setIsActive] = useState(false);
 const [currentStep, setCurrentStep] = useState(0);
 const [tourId, setTourId] = useState<string | null>(null);

 const getTours = useCallback((): Record<string, TourStep[]> => ({
 onboarding: [
 { id: 'welcome', title: t('tour.onboarding.welcome.title', 'Welcome to Lux!'), description: t('tour.onboarding.welcome.desc', 'Your life management system.'), subtext: t('tour.onboarding.welcome.sub', "Let's take an interactive tour."), icon: Sparkles, position: 'center' },
 { id: 'xp', target: '[data-tour="xp-counter"]', title: t('tour.onboarding.xp.title', 'XP Bar'), description: t('tour.onboarding.xp.desc', 'Complete tasks to gain experience.'), subtext: t('tour.onboarding.xp.sub', 'Level up to unlock abilities.'), icon: Zap, position: 'bottom', highlightPadding: 8 },
 { id: 'gold', target: '[data-tour="gold-counter"]', title: t('tour.onboarding.gold.title', 'Your Coins'), description: t('tour.onboarding.gold.desc', 'Gold is used in the store.'), subtext: t('tour.onboarding.gold.sub', 'Earn it by completing missions.'), icon: Coins, position: 'bottom', highlightPadding: 8 },
 { id: 'streak', target: '[data-tour="streak-display"]', title: t('tour.onboarding.streak.title', 'Your Streak'), description: t('tour.onboarding.streak.desc', 'Consecutive days of action.'), subtext: t('tour.onboarding.streak.sub', "If you miss a day, it resets to zero!"), icon: Flame, position: 'bottom', highlightPadding: 8 },
 { id: 'dock', target: '[data-tour="dock"]', title: t('tour.onboarding.dock.title', 'Navigation (Dock)'), description: t('tour.onboarding.dock.desc', 'Your main command center.'), subtext: t('tour.onboarding.dock.sub', 'Access the whole app from here.'), icon: Star, position: 'top', highlightPadding: 16 },
 { id: 'create', target: '[data-tour="dock-main-btn"]', title: t('tour.onboarding.create.title', 'Create Mission'), description: t('tour.onboarding.create.desc', 'The task creator will open automatically.'), subtext: t('tour.onboarding.create.sub', 'Get ready!'), icon: Zap, position: 'top', action: { type: 'OPEN_QUEST_MODAL' }, highlightPadding: 8 },
 ],
 tasks: [
 { id: 'tasks-intro', target: '[data-tour="tasks-header"]', title: t('tour.tasks.intro.title', 'Mission Center'), description: t('tour.tasks.intro.desc', 'Manage your day-to-day here.'), subtext: t('tour.tasks.intro.sub', 'Active missions appear here.'), icon: Target, position: 'bottom', highlightPadding: 8 },
 { id: 'tasks-counter', target: '[data-tour="tasks-counter"]', title: t('tour.tasks.counter.title', 'Active Missions'), description: t('tour.tasks.counter.desc', 'This is your current counter.'), subtext: t('tour.tasks.counter.sub', 'Keep this number under control.'), icon: Zap, position: 'bottom', highlightPadding: 6 },
 { id: 'tasks-list', target: '[data-tour="task-list"]', title: t('tour.tasks.list.title', 'Difficulty Range'), description: t('tour.tasks.list.desc', 'S, A, B, C and EPIC.'), subtext: t('tour.tasks.list.sub', 'Higher difficulty = Better rewards.'), icon: Trophy, position: 'top', highlightPadding: 12 },
 { id: 'tasks-create', position: 'center', title: t('tour.tasks.create.title', "It's your turn!"), description: t('tour.tasks.create.desc', "Let's create your first task right now."), subtext: t('tour.tasks.create.sub', 'The creator will open automatically.'), icon: Plus, action: { type: 'OPEN_QUEST_MODAL' } },
 ],
 habits: [
 { id: 'habits-intro', target: '[data-tour="habits-header"]', title: t('tour.habits.intro.title', 'Protocols & Vices'), description: t('tour.habits.intro.desc', 'Your system to build discipline.'), subtext: t('tour.habits.intro.sub', 'Automate the good and destroy the bad.'), icon: Flame, position: 'bottom', highlightPadding: 8 },
 { id: 'habits-chart', target: '[data-tour="habit-chart"]', title: t('tour.habits.chart.title', 'Consistency Chart'), description: t('tour.habits.chart.desc', 'Visualize your performance over time.'), subtext: t('tour.habits.chart.sub', 'Keep the chart green.'), icon: BarChart3, position: 'bottom', highlightPadding: 8 },
 { id: 'habits-streak', target: '[data-tour="habit-streak"]', title: t('tour.habits.streak.title', 'The Flame Path'), description: t('tour.habits.streak.desc', 'Your current discipline streak.'), subtext: t('tour.habits.streak.sub', "Don't break the chain."), icon: Flame, position: 'bottom', highlightPadding: 8 },
 { id: 'habits-create', position: 'top', title: t('tour.habits.create.title', 'Create a Protocol'), description: t('tour.habits.create.desc', "Let's create your first positive habit."), subtext: t('tour.habits.create.sub', 'Complete the form and save it.'), icon: Plus, action: { type: 'OPEN_HABIT_MODAL' }, interaction: 'wait-event', awaitEvent: 'habit-created' },
 { id: 'habits-vices', target: '[data-tour="habit-vices-tab"]', title: t('tour.habits.vices.title', 'Vice Zone'), description: t('tour.habits.vices.desc', 'Identify and eradicate destructive habits.'), subtext: t('tour.habits.vices.sub', 'Click to enter the dark zone.'), icon: Target, position: 'bottom', interaction: 'click', highlightPadding: 8 },
 { id: 'habits-create-bad', position: 'top', title: t('tour.habits.createBad.title', 'Identify a Vice'), description: t('tour.habits.createBad.desc', 'Now, declare war on a bad habit.'), subtext: t('tour.habits.createBad.sub', 'Complete the form and save it.'), icon: Plus, action: { type: 'OPEN_BAD_HABIT_MODAL' }, interaction: 'wait-event', awaitEvent: 'bad-habit-created' },
 ],
 focus: [
 { id: 'focus-intro', target: '[data-tour="focus-header"]', title: t('tour.focus.intro.title', 'Focus Zone'), description: t('tour.focus.intro.desc', 'For deep work and projects.'), icon: Target, position: 'bottom', highlightPadding: 8 },
 { id: 'focus-stats', target: '[data-tour="focus-stats"]', title: t('tour.focus.stats.title', 'Statistics'), description: t('tour.focus.stats.desc', 'Visualize your concentration hours.'), icon: BarChart3, position: 'bottom', highlightPadding: 12 },
 { id: 'focus-projects', target: '[data-tour="project-list"]', title: t('tour.focus.projects.title', 'Your Projects'), description: t('tour.focus.projects.desc', 'Divide big goals into short sessions.'), icon: Archive, position: 'top', highlightPadding: 12 },
 { id: 'focus-create', position: 'center', title: t('tour.focus.create.title', 'New Project'), description: t('tour.focus.create.desc', 'Start planning your next big goal.'), subtext: t('tour.focus.create.sub', 'The creator will open automatically.'), icon: Plus, action: { type: 'OPEN_PROJECT_MODAL' } },
 ],
 store: [
 { id: 'store-intro', target: '[data-tour="store-header"]', title: t('tour.store.intro.title', 'Power Store'), description: t('tour.store.intro.desc', 'Spend your coins here.'), icon: Coins, position: 'bottom', highlightPadding: 8 },
 { id: 'store-items', target: '[data-tour="store-items"]', title: t('tour.store.items.title', 'Items & Potions'), description: t('tour.store.items.desc', 'Each one has a unique effect on your account.'), icon: Sparkles, position: 'top', highlightPadding: 12 },
 ],
 notes: [
 { id: 'notes-intro', target: '[data-tour="notes-header"]', title: t('tour.notes.intro.title', 'Your Second Brain'), description: t('tour.notes.intro.desc', 'Capture ideas and thoughts.'), icon: Star, position: 'bottom', highlightPadding: 8 },
 { id: 'notes-fab', target: '[data-tour="notes-fab"]', title: t('tour.notes.fab.title', 'New Note'), description: t('tour.notes.fab.desc', 'Press here to create a note.'), icon: Pointer, position: 'top', interaction: 'click', highlightPadding: 8 },
 { id: 'notes-wait-close', position: 'center', title: t('tour.notes.wait.title', 'Escribe algo'), description: t('tour.notes.wait.desc', 'Crea tu nota y cuando termines, cierra el editor.'), icon: Lightbulb, interaction: 'wait-event', awaitEvent: 'note-closed' },
 { id: 'notes-journal-btn', target: '[data-tour="journal-tab-btn"]', title: t('tour.notes.journal.title', 'Tu Diario'), description: t('tour.notes.journal.desc', 'Ahora, cambia a la pestaña del Diario.'), icon: Pointer, position: 'bottom', interaction: 'click', highlightPadding: 8 },
 { id: 'notes-journal-today', target: '[data-tour="journal-today-btn"]', title: t('tour.notes.today.title', 'Tu Día de Hoy'), description: t('tour.notes.today.desc', 'Pulsa en el día de hoy para escribir cómo te fue.'), icon: Pointer, position: 'top', interaction: 'click', highlightPadding: 8 }
 ],
 }), [t]);

 const startTour = useCallback((id: string) => {
 const tours = getTours();
 if (tours[id as keyof typeof tours]) {
 setTourId(id);
 setCurrentStep(0);
 setIsActive(true);
 }
 }, [getTours]);

 const endTour = useCallback(() => {
 setIsActive(false);
 setTimeout(() => {
 setTourId(null);
 setCurrentStep(0);
 }, 300);
 }, []);

 const tours = getTours();
 const nextStep = useCallback(() => {
 if (tourId && currentStep < tours[tourId as keyof typeof tours].length - 1) {
 setCurrentStep(prev => prev + 1);
 } else {
 endTour();
 }
 }, [currentStep, tourId, endTour, tours]);

 const prevStep = useCallback(() => {
 if (currentStep > 0) setCurrentStep(prev => prev - 1);
 }, [currentStep]);

 return (
 <TourContext.Provider value={{ isActive, currentStep, tourId, startTour, endTour, nextStep, prevStep }}>
 {children}
 <AnimatePresence>
 {isActive && tourId && (
 <TourOverlay
 step={tours[tourId as keyof typeof tours][currentStep]}
 currentStep={currentStep}
 totalSteps={tours[tourId as keyof typeof tours].length}
 onNext={nextStep}
 onPrev={prevStep}
 onEnd={endTour}
 />
 )}
 </AnimatePresence>
 </TourContext.Provider>
 );
};

// ==========================================
// OVERLAY INTERACTIVO (SPOTLIGHT & TOOLTIP)
// ==========================================
const TourOverlay: React.FC<{
 step: TourStep;
 currentStep: number;
 totalSteps: number;
 onNext: () => void;
 onPrev: () => void;
 onEnd: () => void;
}> = ({ step, currentStep, totalSteps, onNext, onPrev, onEnd }) => {
 const [rect, setRect] = useState<DOMRect | null>(null);
 const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

 // Seguir el elemento objetivo dinámicamente
 useEffect(() => {
 if (!step.target) {
 setRect(null);
 return;
 }

 const updateRect = () => {
 const el = document.querySelector(step.target!);
 if (el) {
 const r = el.getBoundingClientRect();
 // Solo establecer el rect si el elemento es visible (tiene dimensiones)
 if (r.width > 0 && r.height > 0) {
 setRect(r);
 // Auto-scroll si no está visible
 if (r.top < 0 || r.bottom > window.innerHeight) {
 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
 }
 } else {
 setRect(null); // Element exists but is hidden (e.g. inside closed dock)
 }
 } else {
 setRect(null);
 }
 setWindowSize({ w: window.innerWidth, h: window.innerHeight });
 };

 updateRect();
 const interval = setInterval(updateRect, 100); // Track animations/scrolls continuously
 window.addEventListener('resize', updateRect);
 return () => {
 clearInterval(interval);
 window.removeEventListener('resize', updateRect);
 };
 }, [step.target]);

 const padding = step.highlightPadding || 8;
 const isCenter = !step.target || !rect;

 // Calculamos las coordenadas del "agujero"
 const hole = rect ? {
 top: rect.top - padding,
 bottom: rect.bottom + padding,
 left: rect.left - padding,
 right: rect.right + padding,
 width: rect.width + (padding * 2),
 height: rect.height + (padding * 2),
 } : null;

 // Disparar acciones automáticas si el paso lo requiere y no es por click
 useEffect(() => {
 if (step.action && step.interaction !== 'click') {
 if (step.action.type === 'OPEN_QUEST_MODAL') {
 window.dispatchEvent(new CustomEvent('open-quest-modal'));
 } else if (step.action.type === 'OPEN_HABIT_MODAL') {
 window.dispatchEvent(new CustomEvent('open-habit-modal'));
 } else if (step.action.type === 'OPEN_PROJECT_MODAL') {
 window.dispatchEvent(new CustomEvent('open-project-modal'));
 } else if (step.action.type === 'OPEN_BAD_HABIT_MODAL') {
 window.dispatchEvent(new CustomEvent('open-bad-habit-modal'));
 }
 }
 }, [step]);

 // Escuchar eventos personalizados si interaction es 'wait-event'
 useEffect(() => {
 if (step.interaction === 'wait-event' && step.awaitEvent) {
 const handleCustomEvent = () => {
 onNext();
 };
 window.addEventListener(step.awaitEvent as string, handleCustomEvent);
 return () => window.removeEventListener(step.awaitEvent as string, handleCustomEvent);
 }
 }, [step, onNext]);

 // Si requiere interacción, disparamos la acción y avanzamos
 const handleHoleClick = () => {
 if (step.interaction === 'click') {
 
 // Si hay una acción configurada en el paso, la disparamos
 if (step.action?.type === 'OPEN_QUEST_MODAL') {
 window.dispatchEvent(new CustomEvent('open-quest-modal'));
 } else if (step.action?.type === 'OPEN_HABIT_MODAL') {
 window.dispatchEvent(new CustomEvent('open-habit-modal'));
 } else if (step.action?.type === 'OPEN_PROJECT_MODAL') {
 window.dispatchEvent(new CustomEvent('open-project-modal'));
 } else if (step.action?.type === 'OPEN_BAD_HABIT_MODAL') {
 window.dispatchEvent(new CustomEvent('open-bad-habit-modal'));
 } else {
 // Fallback: Disparamos evento nativo al elemento debajo si es necesario
 const el = document.querySelector(step.target!) as HTMLElement;
 if (el) el.click();
 }
 
 onNext();
 }
 };

 // Do not render mask or tooltip if we are just waiting for an event
 if (step.interaction === 'wait-event') {
 return null;
 }

 return (
 <div className="fixed inset-0 z-[9999] pointer-events-none">
 
 {/* MÁSCARA DE 4 DIVS (Bloquea clicks fuera del agujero y oscurece) */}
 <AnimatePresence>
 {!isCenter && hole && (
 <motion.div key="hole-mask" className="absolute inset-0 pointer-events-none z-0">
 {/* Top */}
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-0 left-0 right-0 bg-black/70 backdrop-blur-sm transform-gpu pointer-events-auto" style={{ height: Math.max(0, hole.top) }} onClick={onEnd} />
 {/* Bottom */}
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm transform-gpu pointer-events-auto" style={{ top: Math.min(windowSize.h, hole.bottom) }} onClick={onEnd} />
 {/* Left */}
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bg-black/70 backdrop-blur-sm transform-gpu pointer-events-auto" style={{ top: Math.max(0, hole.top), height: Math.max(0, hole.height), left: 0, width: Math.max(0, hole.left) }} onClick={onEnd} />
 {/* Right */}
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bg-black/70 backdrop-blur-sm transform-gpu pointer-events-auto" style={{ top: Math.max(0, hole.top), height: Math.max(0, hole.height), left: Math.min(windowSize.w, hole.right), width: Math.max(0, windowSize.w - hole.right) }} onClick={onEnd} />
 </motion.div>
 )}
 {isCenter && (
 <motion.div key="center-mask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm transform-gpu pointer-events-auto" onClick={onEnd} />
 )}
 </AnimatePresence>

 {/* EL RECUADRO EXACTO (Brillo alrededor del elemento) */}
 {!isCenter && hole && (
 <motion.div
 layout
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ type: "spring", stiffness: 400, damping: 30 }}
 className="absolute rounded-2xl pointer-events-none"
 style={{
 top: hole.top, left: hole.left, width: hole.width, height: hole.height,
 boxShadow: '0 0 0 2px rgba(251, 191, 36, 0.8), 0 0 30px rgba(251, 191, 36, 0.4)',
 }}
 >
 {/* Si requiere click, ponemos un botón invisible EXACTAMENTE sobre el agujero para capturarlo */}
 {step.interaction === 'click' && (
 <div 
 className="absolute inset-0 pointer-events-auto cursor-pointer rounded-2xl flex items-center justify-center group"
 onClick={handleHoleClick}
 >
 <div className="absolute inset-0 bg-amber-400/10 rounded-2xl animate-pulse" />
 <Pointer className="text-amber-400 drop-shadow-lg scale-150 animate-bounce" />
 </div>
 )}
 </motion.div>
 )}

 {/* TOOLTIP ESTILO APPLE */}
 <motion.div
 layout
 initial={{ opacity: 0, y: 20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ type: "spring", stiffness: 400, damping: 30 }}
 className="pointer-events-auto w-full max-w-[320px]"
 style={getTooltipPosition(step, hole, windowSize)}
 >
 <div className="bg-[#1c1c1e]/90 backdrop-blur-sm transform-gpu border border-white/10 rounded-3xl shadow-md overflow-hidden">
 <div className="p-5">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
 {step.icon ? <step.icon size={24} className="text-white" /> : <Lightbulb size={24} className="text-white" />}
 </div>
 <div className="flex-1 pt-0.5">
 <h3 className="text-white font-bold text-[17px] tracking-tight">{step.title}</h3>
 <p className="text-white/70 text-[14px] leading-snug mt-1.5">{step.description}</p>
 {step.subtext && <p className="text-amber-400/80 text-[13px] font-medium mt-1.5">{step.subtext}</p>}
 </div>
 </div>
 </div>

 <div className="px-5 pb-5 flex items-center justify-between">
 {/* Dots */}
 <div className="flex gap-1.5">
 {Array.from({ length: totalSteps }).map((_, i) => (
 <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/15'}`} />
 ))}
 </div>

 {/* Buttons */}
 <div className="flex items-center gap-2">
 {currentStep > 0 && (
 <button onClick={onPrev} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
 <ChevronRight size={18} className="text-white rotate-180" />
 </button>
 )}
 
 {step.interaction === 'click' && hole ? (
 <div className="h-9 px-4 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[13px] font-bold flex items-center gap-2">
 <Pointer size={14} className="animate-bounce" />
 <span className="hidden sm:inline">Haz click en el área resaltada</span>
 <span className="sm:hidden">Pulsa el área</span>
 </div>
 ) : (
 <button onClick={onNext} className="h-9 px-5 rounded-full bg-white text-black hover:bg-gray-200 text-[14px] font-bold transition-transform active:scale-95 flex items-center gap-1.5 shadow-lg shadow-white/20">
 <span>{currentStep === totalSteps - 1 ? 'Finalizar' : 'Siguiente'}</span>
 {currentStep === totalSteps - 1 ? <Check size={16} /> : <ChevronRight size={16} />}
 </button>
 )}
 </div>
 </div>

 <button
 onClick={onEnd}
 className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
 >
 <X size={14} className="text-white/50" />
 </button>
 </div>
 </motion.div>
 </div>
 );
};

// ==========================================
// CÁLCULO DINÁMICO DE POSICIÓN
// ==========================================
function getTooltipPosition(step: TourStep, hole: any, win: {w: number, h: number}): React.CSSProperties {
 const tooltipWidth = 320;
 const tooltipHeight = 220; // estimated max height
 const margin = 16;

 if (!hole) {
 if (step.position === 'top') {
 return { top: margin * 2, left: Math.max(margin, (win.w - tooltipWidth) / 2), position: 'fixed' };
 }
 if (step.position === 'bottom') {
 return { top: win.h - tooltipHeight - margin * 2, left: Math.max(margin, (win.w - tooltipWidth) / 2), position: 'fixed' };
 }
 // Perfectamente centrado en pantalla
 return { 
 top: Math.max(margin, (win.h - tooltipHeight) / 2), 
 left: Math.max(margin, (win.w - tooltipWidth) / 2), 
 position: 'fixed' 
 };
 }

 if (step.position === 'center') {
 return { 
 top: Math.max(margin, (win.h - tooltipHeight) / 2), 
 left: Math.max(margin, (win.w - tooltipWidth) / 2), 
 position: 'fixed' 
 };
 }

 const gap = 16;
 let top = hole.bottom + gap;
 // Intentar centrar horizontalmente con respecto al agujero
 let left = hole.left + (hole.width / 2) - (tooltipWidth / 2);

 // Preferred Position Logic
 if (step.position === 'top') {
 top = hole.top - tooltipHeight - gap;
 } else if (step.position === 'bottom') {
 top = hole.bottom + gap;
 }

 // Bounds checking VERTICAL
 if (top + tooltipHeight > win.h - margin) {
 top = hole.top - tooltipHeight - gap; // flip to top
 }
 if (top < margin) {
 top = hole.bottom + gap; // flip to bottom
 }
 
 // Fallback drástico si el agujero ocupa toda la pantalla (evitar desaparecer)
 if (top < margin) top = margin;
 if (top + tooltipHeight > win.h - margin) top = win.h - tooltipHeight - margin;

 // Bounds checking HORIZONTAL (Mantener estrictamente dentro de los márgenes)
 if (left + tooltipWidth > win.w - margin) {
 left = win.w - tooltipWidth - margin;
 }
 if (left < margin) {
 left = margin;
 }

 return { top, left, position: 'fixed' };
}
