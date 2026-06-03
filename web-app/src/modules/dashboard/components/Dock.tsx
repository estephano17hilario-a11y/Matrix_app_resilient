import React from 'react';
import { Crosshair, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DockConfig, DockItemConfig, DOCK_ITEMS, DockItemId } from '@/components/ui/DockConfigModal';

interface DockProps {
 currentView: string;
 onChangeView: (v: string) => void;
 onOpenModal: (m: string) => void;
 isOpen: boolean;
 onToggle: (open: boolean) => void;
 isHidden: boolean;
 dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA';
 taskViewMode: 'LIST' | 'STRATEGY';
 habitViewMode: 'PROTOCOLS' | 'VICES';
 noteViewMode: 'NOTES' | 'JOURNAL';
 dockConfig?: DockConfig;
 pointerEvents?: 'none' | 'auto';
}

export const Dock = React.memo(({ currentView, onChangeView, onOpenModal, isOpen: propIsOpen, onToggle: propOnToggle, isHidden, dashboardStyle = 'BORDER', taskViewMode, habitViewMode, noteViewMode, dockConfig, pointerEvents = 'auto' }: DockProps) => {
 const { t } = useTranslation();

 const [localIsOpen, setLocalIsOpen] = React.useState(false);
 const isOpen = localIsOpen;

 const onToggle = React.useCallback((open: boolean) => {
   setLocalIsOpen(open);
   if (propOnToggle) {
     requestAnimationFrame(() => {
       propOnToggle(open);
     });
   }
 }, [propOnToggle]);

 React.useEffect(() => {
   if (propIsOpen !== undefined) {
     setLocalIsOpen(propIsOpen);
   }
 }, [propIsOpen]);

 React.useEffect(() => {
   if (isHidden) {
     setLocalIsOpen(false);
     if (propOnToggle) {
       propOnToggle(false);
     }
   }
 }, [isHidden, propOnToggle]);

 const handleView = (v: string) => { onChangeView(v); onToggle(false); };
 
 const handleSmartNav = (v: string) => {
 onChangeView(v);
 onToggle(false);
 };

 const handleModal = (m: string) => { onOpenModal(m); onToggle(false); };

 const isLiquid = dashboardStyle === 'LIQUID';
 const isGlass = dashboardStyle === 'GLASS';
 const isAura = dashboardStyle === 'AURA';
 const taskIndicator = taskViewMode === 'LIST' ? '1/2' : '2/2';
 const habitIndicator = habitViewMode === 'PROTOCOLS' ? '1/2' : '2/2';
 const noteIndicator = noteViewMode === 'NOTES' ? '1/2' : '2/2';

 const effectiveConfig = dockConfig || {
 enabledItems: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'] as DockItemId[],
 order: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'] as DockItemId[],
 expandedItems: ['HABITS', 'FOCUS', 'STORE', 'ACHIEVEMENTS', 'FEED'] as DockItemId[],
 };

 const activeOrder = effectiveConfig.order.slice(0, 4);
 const leftItems = activeOrder.slice(0, 2);
 const rightItems = activeOrder.slice(2, 4);

 const rawExpandedItems = effectiveConfig.expandedItems || ['HABITS', 'FOCUS', 'STORE', 'ACHIEVEMENTS', 'FEED'];
 
 // Dynamically swap FEED and STORE if FEED is placed before STORE
 const mappedItems = rawExpandedItems.map(id => id === 'STRATEGY' ? 'FEED' : id);
 const feedIdx = mappedItems.indexOf('FEED');
 const storeIdx = mappedItems.indexOf('STORE');
 if (feedIdx !== -1 && storeIdx !== -1 && feedIdx < storeIdx) {
    mappedItems[feedIdx] = 'STORE';
    mappedItems[storeIdx] = 'FEED';
 }

 const expandedItems = Array.from(new Set(mappedItems)) as DockItemId[];
 // Reducir la altura base (espacio extra) para eliminar el sobrante
 const dynamicHeight = 175 + Math.ceil(expandedItems.length / 2) * 88;

 const getIndicator = (id: DockItemId) => {
 if (id === 'TASKS') return taskIndicator;
 if (id === 'HABITS') return habitIndicator;
 if (id === 'NOTES') return noteIndicator;
 return null;
 };

 const renderDockButton = (id: DockItemId) => {
 const item = DOCK_ITEMS.find((item: DockItemConfig) => item.id === id);
 if (!item) return null;
 const Icon = item.icon;
 const isActive = currentView === id;

 return (
 <button
 key={id}
 onClick={() => handleSmartNav(id)}
 className="group relative z-10 flex flex-col items-center gap-1 min-w-[40px] w-full"
 >
 <div className={`relative transition-all duration-300 ${isActive ? 'scale-110' : 'text-white/40 group-hover:text-white/80'}`}>
 {isActive && <div className={`absolute inset-0 ${item.bgColor} rounded-full blur-sm `} />}
 <Icon size={22} className={isActive ? item.color : ''} strokeWidth={isActive ? 2.5 : 2} />
 </div>
 <span className={`text-[9px] font-bold tracking-widest transition-colors ${isActive ? 'text-white' : 'text-white/30'}`}>{item.label}</span>
 {getIndicator(id) && (
 <span className={`pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${isActive ? 'text-white/70' : 'text-white/30'}`}>{getIndicator(id)}</span>
 )}
 </button>
 );
 };

 const renderLegacyDockButton = (id: DockItemId) => {
 const item = DOCK_ITEMS.find((item: DockItemConfig) => item.id === id);
 if (!item) return null;
 const Icon = item.icon;
 const isActive = currentView === id;
 const indicator = getIndicator(id);

 return (
 <button 
 key={id}
 onClick={() => handleSmartNav(id)} 
 className={`group relative flex flex-col items-center gap-1 transition-colors duration-300 pb-2 ${isActive ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
 >
 <Icon size={24} className={`transition-transform group-active:scale-75 duration-300 ${isActive ? item.color : ''}`} strokeWidth={isActive ? 2.5 : 2} />
 {indicator && (
 <span className={`pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${isActive ? 'text-white/70' : 'text-white/30'}`}>{indicator}</span>
 )}
 </button>
 );
 };

 const Backdrop = () => (
     <AnimatePresence>
       {isOpen && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.2 }}
           className={`fixed inset-0 z-[350] bg-black/55 backdrop-blur-sm ${pointerEvents === 'none' ? 'pointer-events-none' : ''}`}
           onClick={() => onToggle(false)}
         />
       )}
     </AnimatePresence>
   );
 
 const renderExpandedMenuButton = (id: string, label: string, IconComponent: React.ElementType, color: string, bg: string, border: string, action: () => void, isFullWidth?: boolean) => (
 <button 
 key={id}
 onClick={action}
 className={`relative z-10 h-24 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex flex-col items-center justify-center gap-2 group ${isFullWidth ? 'w-full' : ''}`}
 >
 <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${color} border ${border} group-hover:scale-110 transition-transform`}>
 <IconComponent size={16} />
 </div>
 <span className="text-[10px] font-bold text-white/80">{label}</span>
 </button>
 );

 const renderGlassExpandedButton = (id: DockItemId, isFullWidth?: boolean) => {
 const item = DOCK_ITEMS.find(i => i.id === id);
 if (!item) return null;
 
 let action = () => handleView(id);
 let label = item.label;
 if (id === 'HABITS') { action = () => handleModal('HABIT'); label = 'Habit'; }
 else if (id === 'FOCUS') { action = () => handleModal('PROJECT'); label = 'Focus'; }
 else if (id === 'ACHIEVEMENTS') { label = 'Legacy'; }
 else if (id === 'STORE') { action = () => { handleView('NOTES'); setTimeout(() => window.dispatchEvent(new Event('open-note-editor')), 100); }; label = 'Note'; }
 else if (id === 'FEED') { label = 'Feed'; }

 return renderExpandedMenuButton(id, label, item.icon, item.color, item.bgColor, item.borderColor, action, isFullWidth);
 };

 const renderLegacyExpandedButton = (id: DockItemId, isLastOdd: boolean) => {
 const item = DOCK_ITEMS.find(i => i.id === id);
 if (!item) return null;
 const Icon = item.icon;
 
 let action = () => handleView(id);
 let label = item.label;
 if (id === 'HABITS') { action = () => handleModal('HABIT'); label = t('dock.habit'); }
 else if (id === 'FOCUS') { action = () => handleModal('PROJECT'); label = t('dock.focus'); }
 else if (id === 'ACHIEVEMENTS') { label = 'LEGACY'; }
 else if (id === 'STORE') { action = () => { handleView('NOTES'); setTimeout(() => window.dispatchEvent(new Event('open-note-editor')), 100); }; label = t('dock.note', 'Note'); }
 else if (id === 'FEED') { label = t('dock.feed', 'Feed'); }

 return (
 <button 
 key={id}
 onClick={action} 
 className={`h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm ${isLastOdd ? 'col-span-2' : ''}`}
 >
 <div className={`w-8 h-8 rounded-full ${item.bgColor} border ${item.borderColor} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.05)]`}>
 <Icon size={18} />
 </div>
 <span className="text-white/90 font-bold text-[11px] tracking-tight">{label}</span>
 </button>
 );
 };
 
 // --- GLASS STYLE (VISION OS) ---
 if (isGlass) {
 return (
 <>
 <Backdrop />
 <motion.div 
 data-tour="dock"
 initial={false}
 animate={{ y: isHidden ? '200%' : '0%' }}
 transition={{ type: "spring", stiffness: 300, damping: 28 }}
 className="fixed bottom-10 left-0 right-0 z-[400] flex justify-center pointer-events-none"
 style={{ willChange: "transform", pointerEvents }}
 >
 <motion.div 
 initial={false}
 animate={{ 
 height: isOpen ? dynamicHeight : 72,
 width: '92vw',
 maxWidth: 380,
 borderRadius: 36
 }}
 transition={{ 
 type: "spring", 
 stiffness: 300, 
 damping: 28
 }}
 className="pointer-events-none relative bg-[#0a0a0a]/30 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden"
 style={{ willChange: 'transform, height' }}
 >
 <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none opacity-40 z-0" />

 <motion.div 
 initial={false}
 animate={{
 opacity: isOpen ? 1 : 0,
 y: isOpen ? 0 : -16,
 pointerEvents: isOpen ? 'auto' : 'none'
 }}
 transition={{ type: "spring", stiffness: 80, damping: 20, mass: 1, delay: isOpen ? 0.05 : 0 }}
 className="absolute inset-x-0 top-0 p-4 grid grid-cols-2 gap-2"
 >
 <button onClick={() => handleModal('QUEST')} className="relative z-10 col-span-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(249,115,22,0.2)]">
 <Crosshair size={20} />
 </div>
 <div className="text-left">
 <span className="block text-white font-bold text-sm">New Mission</span>
 <span className="text-[10px] text-white/40 uppercase tracking-wider">Single Task</span>
 </div>
 </div>
 <Plus size={18} className="text-white/20 group-hover:text-white transition-colors" />
 </button>
 
 {expandedItems.map((id, index) => {
 const isLastOdd = index === expandedItems.length - 1 && expandedItems.length % 2 !== 0;
 return (
 <div key={id} className={isLastOdd ? 'col-span-2' : 'col-span-1'}>
 {renderGlassExpandedButton(id as DockItemId, isLastOdd)}
 </div>
 );
 })}
 </motion.div>
 
 <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[72px] px-6 flex items-center justify-between gap-2 z-20">
 {leftItems.map(id => renderDockButton(id))}

 <div className="px-0 relative z-10 shrink-0 flex items-center justify-center">
 <motion.button
 data-tour="dock-main-btn"
 onClick={() => onToggle(!isOpen)}
 animate={{
 rotate: isOpen ? 45 : 0,
 scale: isOpen ? 1 : 1
 }}
 transition={{ type: "spring", stiffness: 300, damping: 28 }}
 className={`
 w-12 h-12 rounded-full flex items-center justify-center ${isOpen
 ? 'bg-zinc-800/80 border border-white/10 text-white hover:bg-zinc-700'
 : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]'
 }
 `}
 >
 <Plus size={24} strokeWidth={2.5} />
 </motion.button>
 </div>

 {rightItems.map(id => renderDockButton(id))}
 </div>
 </motion.div>
 </motion.div>
 </>
 );
 }

 // --- ANIMATED AURA DOCK (User Requested) ---
 if (isAura) {
 return (
 <>
 <Backdrop />
 <motion.div 
 initial={false}
 animate={{ y: isHidden ? '200%' : '0%' }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 className="fixed bottom-6 left-0 right-0 z-[400] flex justify-center" 
 style={{ pointerEvents, willChange: "transform" }}
 >
 {/* Contenedor Animado */} 
 <motion.div 
    layout
    initial={false}
    animate={{
      height: isOpen ? dynamicHeight : 70,
      borderRadius: isOpen ? 32 : 34
    }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 style={{ willChange: 'transform, height' }}
 className={` 
 pointer-events-auto relative aura-container box-border w-[85vw] max-w-[320px] shadow-2xl 
 backdrop-blur-sm 
 ${isOpen ? 'aura-active' : ''} 
 `}
 > 
 <div className="relative w-full h-full z-10"> 
 
 {/* ELEMENTOS INTERNOS (Aparecen al expandir) */} 
 <div className={` 
 absolute bottom-[80px] left-0 right-0 px-4 grid grid-cols-2 gap-2 
 transition-all duration-300 ease-out transform-gpu
 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'} 
 `}> 
 <button onClick={() => { handleModal('QUEST'); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-md">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
 <Crosshair size={18} />
 </div>
 <div className="text-left">
 <span className="block text-white font-bold text-[14px] tracking-tight">{t('dock.newMission') || 'Nueva Misión'}</span>
 </div>
 </div>
 <Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
 </button>

 {expandedItems.map((id, index) => {
 const isLastOdd = index === expandedItems.length - 1 && expandedItems.length % 2 !== 0;
 return renderLegacyExpandedButton(id as DockItemId, isLastOdd);
 })} 
 </div> 

 {/* BARRA INFERIOR (Siempre visible) */} 
 <div className="absolute bottom-0 left-0 right-0 h-[70px] grid grid-cols-5 items-center px-2 sm:px-6 z-20"> 
 <div className="col-span-2 flex items-center justify-around h-full pr-1 sm:pr-2"> 
 {leftItems.map(id => renderLegacyDockButton(id))}
 </div> 
 
 {/* BOTÓN "+" CENTRAL ANIMADO */} 
 <div className="col-span-1 flex items-center justify-center h-full -mt-1 z-30"> 
 <motion.button 
 data-tour="dock-main-btn"
 onClick={() => onToggle(!isOpen)}
 animate={{
 width: isOpen ? 64 : 56,
 height: isOpen ? 48 : 56,
 y: isOpen ? 2 : 0
 }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 className={` 
 relative flex items-center justify-center gap-2 rounded-full font-bold shadow-2xl z-20 overflow-hidden btn-orb-glow transform-gpu
 ${isOpen ? 'bg-white/10 !shadow-none !border-white/5' : 'active:scale-90 hover:scale-105'} 
 `} 
 > 
 {isOpen 
 ? <ChevronDown size={28} className="text-white animate-pulse" strokeWidth={2.5} /> 
 : <Plus size={28} strokeWidth={3} className="text-white drop-shadow-md" /> 
 } 
 </motion.button> 
 </div> 

 <div className="col-span-2 flex items-center justify-around h-full pl-1 sm:pl-2"> 
 {rightItems.map(id => renderLegacyDockButton(id))}
 </div> 
 </div> 

 </div> 
 </motion.div> 
 </motion.div> 
 </>
 );
 }

 // --- LEGACY STYLES (BORDER / LIQUID) WITH NEW ANIMATED BUTTON ---
 
 const baseClass = "pointer-events-none relative box-border mx-auto";
 
 const styleClass = isLiquid
 ? "bg-black/30 border !border-black/30 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]"
 : "glass-panel !shadow-none rgb-border-container rgb-border-active !bg-none";

 const containerClass = `${baseClass} ${styleClass}`;

 const liquidSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

 return (
 <>
 <Backdrop />
 <motion.div 
 data-tour="dock"
 initial={false}
 animate={{ y: isHidden ? '200%' : '0%' }}
 transition={liquidSpring}
 className="fixed bottom-6 left-0 right-0 z-[400] flex justify-center transform-gpu"
 style={{ pointerEvents }}
 >
 <motion.div 
 initial={false}
 animate={{ 
 height: isOpen ? dynamicHeight : 72,
 borderRadius: isOpen ? 32 : 36,
 width: '85vw',
 maxWidth: 320
 }}
 transition={liquidSpring}
 className={containerClass}
 style={{ overflow: 'visible', willChange: 'height, border-radius' }}
 >
 <div 
 className="absolute inset-0 rounded-[inherit] z-10 pointer-events-none backdrop-blur-md"
 style={{ backgroundColor: isOpen ? 'rgba(0,0,0,0.1)' : 'rgba(15,15,15,0.1)' }}
 >
 <div className="relative w-full h-full pointer-events-auto">
 <motion.div 
 initial={false}
 animate={{
 opacity: isOpen ? 1 : 0,
 y: isOpen ? 0 : 15,
 pointerEvents: isOpen ? 'auto' : 'none',
 scale: isOpen ? 1 : 0.98
 }}
 transition={isOpen 
 ? { ...liquidSpring, delay: 0.08 }
 : { duration: 0.05, ease: "easeOut" }
 }
 className="absolute bottom-[80px] left-0 right-0 px-4 grid grid-cols-2 gap-2"
 >
 
 <button onClick={() => { handleModal('QUEST'); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-sm">
 <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)] group-hover:scale-110 transition-transform"><Crosshair size={18} /></div><div className="text-left"><span className="block text-white font-bold text-[14px] tracking-tight">{t('dock.newMission')}</span><span className="block text-white/40 text-[9px] font-bold uppercase tracking-wider">{t('dock.singleTask')}</span></div></div><Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
 </button>
 {expandedItems.map((id, index) => {
 const isLastOdd = index === expandedItems.length - 1 && expandedItems.length % 2 !== 0;
 return renderLegacyExpandedButton(id as DockItemId, isLastOdd);
 })} 
 </motion.div>
 <div className={`pointer-events-auto absolute bottom-0 left-0 right-0 h-[70px] grid grid-cols-5 items-center px-2 sm:px-6 z-20`}>
 
 <div className="col-span-2 flex items-center justify-around h-full">
 {leftItems.map(id => renderLegacyDockButton(id))}
 </div>

 {/* BOTÓN "+" CENTRAL ANIMADO INTEGRADO EN LEGACY UI */} 
 <div className="col-span-1 flex items-center justify-center h-full -mt-1 z-30">
 <button 
 data-tour="dock-main-btn"
 onClick={() => onToggle(!isOpen)} 
 className={` 
 relative transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] 
 flex items-center justify-center gap-2 rounded-full font-bold shadow-2xl z-[450] overflow-hidden btn-orb-glow pointer-events-auto transform-gpu
 ${isOpen ? 'w-16 h-12 bg-white/10 !shadow-none !border-white/5 translate-y-[2px]' : 'w-14 h-14 active:scale-90 hover:scale-105'} 
 `} 
 > 
 {isOpen 
 ? <ChevronDown size={28} className="text-white animate-pulse" strokeWidth={2.5} /> 
 : <Plus size={28} strokeWidth={3} className="text-white drop-shadow-md" /> 
 } 
 </button> 
 </div>

 <div className="col-span-2 flex items-center justify-around h-full">
 {rightItems.map(id => renderLegacyDockButton(id))}
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 </motion.div>
 </>
 );
});
