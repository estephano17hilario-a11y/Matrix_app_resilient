import React from 'react';
import { Crosshair, Plus, Target, ClipboardList, Brain, Map as MapIcon, ShoppingBag, Trophy, ChevronDown, Activity, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export const Dock = React.memo(({ currentView, onChangeView, onOpenModal, isOpen, onToggle, isHidden, dashboardStyle = 'BORDER', taskViewMode, habitViewMode, noteViewMode }: { currentView: string, onChangeView: (v: string) => void, onOpenModal: (m: string) => void, isOpen: boolean, onToggle: (open: boolean) => void, isHidden: boolean, dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS', taskViewMode: 'LIST' | 'STRATEGY', habitViewMode: 'PROTOCOLS' | 'VICES', noteViewMode: 'NOTES' | 'JOURNAL' }) => {
    const { t } = useTranslation();
    const handleView = (v: string) => { onChangeView(v); onToggle(false); };
    
    const handleSmartNav = (v: string) => {
        onChangeView(v);
        onToggle(false);
    };

    const handleModal = (m: string) => { onOpenModal(m); onToggle(false); };

    const isLiquid = dashboardStyle === 'LIQUID';
    const isGlass = dashboardStyle === 'GLASS';
    const taskIndicator = taskViewMode === 'LIST' ? '1/2' : '2/2';
    const habitIndicator = habitViewMode === 'PROTOCOLS' ? '1/2' : '2/2';
    const noteIndicator = noteViewMode === 'NOTES' ? '1/2' : '2/2';
    
    // --- GLASS STYLE (VISION OS) ---
    if (isGlass) {
        return (
            <motion.div 
                initial={false}
                animate={{ y: isHidden ? '200%' : '0%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-8 left-0 right-0 z-[400] flex justify-center pointer-events-none"
            >
                <motion.div 
                    layout
                    initial={false}
                    animate={{ 
                        height: isOpen ? 420 : 72,
                        width: '92vw',
                        maxWidth: 380, // Increased size as requested
                        borderRadius: 36
                    }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 30,
                        mass: 0.8
                    }}
                    className="pointer-events-none relative bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden" // Restored safe blur
                    style={{ willChange: 'transform, height' }}
                >
                    {/* Fake Glass Shine */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none opacity-40 z-0" />

                    {/* EXPANDED MENU CONTENT */}
                    <div className={`pointer-events-auto absolute inset-x-0 top-0 p-4 grid grid-cols-2 gap-2 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0 delay-100' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
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
                        
                        {[
                            { id: 'HABIT', label: 'Habit', icon: Flame, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/20', action: () => handleModal('HABIT') },
                            { id: 'PROJECT', label: 'Focus', icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/20', action: () => handleModal('PROJECT') },
                            { id: 'STRATEGY', label: 'Map', icon: MapIcon, color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/20', action: () => handleView('STRATEGY') },
                            { id: 'STORE', label: 'Store', icon: ShoppingBag, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/20', action: () => handleView('STORE') }
                        ].map((item) => (
                            <button 
                                key={item.id}
                                onClick={item.action}
                                className="relative z-10 h-24 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex flex-col items-center justify-center gap-2 group"
                            >
                                <div className={`w-9 h-9 rounded-full ${item.bg} flex items-center justify-center ${item.color} border ${item.border} group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,0,0,0)] group-hover:shadow-[0_0_15px_${item.color.replace('text-', 'rgba(').replace('-400', ',0.2)')}]`}>
                                    <item.icon size={16} />
                                </div>
                                <span className="text-[10px] font-bold text-white/80">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* MAIN DOCK BAR (Fixed at bottom of container) */}
                    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[72px] px-6 flex items-center justify-between gap-2 z-20">
                        {/* TASKS */}
                        <button 
                            onClick={() => handleSmartNav('TASKS')}
                            className="group relative z-10 flex flex-col items-center gap-1 min-w-[40px] w-full"
                        >
                            <div className={`relative transition-all duration-300 ${currentView === 'TASKS' ? 'text-cyan-400 scale-110' : 'text-white/40 group-hover:text-white/80'}`}>
                                {currentView === 'TASKS' && <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md" />}
                                <ClipboardList size={22} strokeWidth={currentView === 'TASKS' ? 2.5 : 2} />
                            </div>
                            <span className={`text-[9px] font-bold tracking-widest transition-colors ${currentView === 'TASKS' ? 'text-white' : 'text-white/30'}`}>TASKS</span>
                            <span className={`pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${currentView === 'TASKS' ? 'text-white/70' : 'text-white/30'}`}>{taskIndicator}</span>
                        </button>

                        {/* HABITS */}
                        <button 
                            onClick={() => handleSmartNav('HABITS')}
                            className="group relative z-10 flex flex-col items-center gap-1 min-w-[40px] w-full"
                        >
                            <div className={`relative transition-all duration-300 ${currentView === 'HABITS' ? 'text-cyan-400 scale-110' : 'text-white/40 group-hover:text-white/80'}`}>
                                {currentView === 'HABITS' && <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md" />}
                                <Flame size={22} strokeWidth={currentView === 'HABITS' ? 2.5 : 2} />
                            </div>
                            <span className={`text-[9px] font-bold tracking-widest transition-colors ${currentView === 'HABITS' ? 'text-white' : 'text-white/30'}`}>HABITS</span>
                            <span className={`pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${currentView === 'HABITS' ? 'text-white/70' : 'text-white/30'}`}>{habitIndicator}</span>
                        </button>

                        {/* CENTER ACTION BUTTON */}
                        <div className="px-0 relative z-10 shrink-0">
                            <button 
                                onClick={() => onToggle(!isOpen)}
                                className={`
                                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                                    ${isOpen 
                                        ? 'bg-zinc-800/80 rotate-45 border border-white/10 text-white hover:bg-zinc-700' 
                                        : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]'
                                    }
                                `}
                            >
                                <Plus size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* FOCUS */}
                        <button 
                            onClick={() => handleSmartNav('FOCUS')}
                            className="group relative z-10 flex flex-col items-center gap-1 min-w-[40px] w-full"
                        >
                            <div className={`relative transition-all duration-300 ${currentView === 'FOCUS' ? 'text-cyan-400 scale-110' : 'text-white/40 group-hover:text-white/80'}`}>
                                {currentView === 'FOCUS' && <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md" />}
                                <Target size={22} strokeWidth={currentView === 'FOCUS' ? 2.5 : 2} />
                            </div>
                            <span className={`text-[9px] font-bold tracking-widest transition-colors ${currentView === 'FOCUS' ? 'text-white' : 'text-white/30'}`}>FOCUS</span>
                        </button>

                        {/* STATS */}
                        <button 
                            onClick={() => handleSmartNav('NOTES')}
                            className="group relative z-10 flex flex-col items-center gap-1 min-w-[40px] w-full"
                        >
                            <div className={`relative transition-all duration-300 ${currentView === 'NOTES' ? 'text-cyan-400 scale-110' : 'text-white/40 group-hover:text-white/80'}`}>
                                {currentView === 'NOTES' && <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md" />}
                                <Activity size={22} strokeWidth={currentView === 'NOTES' ? 2.5 : 2} />
                            </div>
                            <span className={`text-[9px] font-bold tracking-widest transition-colors ${currentView === 'NOTES' ? 'text-white' : 'text-white/30'}`}>STATS</span>
                            <span className={`pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${currentView === 'NOTES' ? 'text-white/70' : 'text-white/30'}`}>{noteIndicator}</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    // --- LEGACY STYLES (BORDER / LIQUID) ---
    
    // Shared base classes: Glass effect, positioning, sizing
    // REMOVED BACKDROP BLUR for stability
    const baseClass = "pointer-events-none relative box-border mx-auto";
    
    // Style-specific classes
    const styleClass = isLiquid
        ? "bg-black/90 border !border-black/30 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]"
        : `glass-panel !shadow-none ${isOpen ? 'rgb-border-container rgb-border-active !bg-black/90 !bg-none' : ''}`;

    const containerClass = `${baseClass} ${styleClass}`;

    return (
        <motion.div 
            initial={false}
            animate={{ y: isHidden ? '200%' : '0%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-0 right-0 z-[400] flex justify-center pointer-events-none"
        >
           <motion.div 
                layout
                initial={false}
                animate={{ 
                    height: isOpen ? 440 : 70, // Increased height for new row + breathing room
                    borderRadius: isOpen ? 32 : 34,
                    width: '85vw', // Reduced from 88vw for better mobile safety
                    maxWidth: 330
                }}
                transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 28,
                    mass: 0.8
                }}
                className={containerClass}
                style={{ overflow: 'visible' }}
             >
             <div className={`absolute inset-0 overflow-hidden rounded-[inherit] z-10 ${isOpen ? 'bg-black/90' : 'bg-transparent'}`}>
                <div className="relative w-full h-full">
                <div className={`pointer-events-auto absolute bottom-[80px] left-0 right-0 px-5 grid grid-cols-2 gap-2 transition-all duration-300 ease-out ${isOpen ? 'opacity-100 translate-y-0 delay-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    
                    <button onClick={() => { handleModal('QUEST'); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-sm">
                       <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)] group-hover:scale-110 transition-transform"><Crosshair size={18} /></div><div className="text-left"><span className="block text-white font-bold text-[14px] tracking-tight">{t('dock.newMission')}</span><span className="block text-white/40 text-[9px] font-bold uppercase tracking-wider">{t('dock.singleTask')}</span></div></div><Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
                    </button>
                    <button onClick={() => { handleModal('HABIT'); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm">
                       <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.1)]"><Flame size={18} /></div><span className="text-white/90 font-bold text-[11px] tracking-tight">{t('dock.habit')}</span>
                    </button>
                    <button onClick={() => { handleModal('PROJECT'); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm">
                       <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.1)]"><Target size={18} /></div><span className="text-white/90 font-bold text-[11px] tracking-tight">{t('dock.focus')}</span>
                    </button>
                    
                    <button onClick={() => { handleView('STRATEGY'); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm">
                       <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.1)]"><MapIcon size={18} /></div><span className="text-white/90 font-bold text-[10px] tracking-wide">STRATEGY</span>
                    </button>
                    <button onClick={() => { handleView('ACHIEVEMENTS'); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm">
                       <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(234,179,8,0.1)]"><Trophy size={18} /></div><span className="text-white/90 font-bold text-[10px] tracking-wide">LEGACY</span>
                    </button>

                    {/* NEW ROW */}
                    <button onClick={() => { handleView('STORE'); }} className="col-span-2 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm">
                       <div className="w-8 h-8 rounded-full bg-theme-avatar/10 border border-theme-avatar/20 flex items-center justify-center text-theme-avatar group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(var(--color-avatar-accent),0.1)]"><ShoppingBag size={18} /></div><span className="text-white/90 font-bold text-[11px] tracking-tight">{t('dock.store')}</span>
                    </button>

                </div>
                <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[70px] grid grid-cols-5 items-center px-2 sm:px-6 z-20">
                    <div className="flex justify-center">
                        <button onClick={() => handleSmartNav('TASKS')} className={`group relative flex flex-col items-center gap-1 transition-colors duration-300 pb-2 ${currentView === 'TASKS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>
                            <ClipboardList size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'TASKS' ? 2.5 : 2} />
                            <span className={`pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${currentView === 'TASKS' ? 'text-white/70' : 'text-white/30'}`}>{taskIndicator}</span>
                        </button>
                    </div>
                    <div className="flex justify-center">
                        <button onClick={() => handleSmartNav('HABITS')} className={`group relative flex flex-col items-center gap-1 transition-colors duration-300 pb-2 ${currentView === 'HABITS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>
                            <Flame size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'HABITS' ? 2.5 : 2} />
                            <span className={`pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${currentView === 'HABITS' ? 'text-white/70' : 'text-white/30'}`}>{habitIndicator}</span>
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-center h-full -mt-1">
                        <button onClick={() => onToggle(!isOpen)} className={`premium-fab z-20 flex items-center justify-center transition-all duration-400 cubic-bezier(0.19, 1, 0.22, 1) transform-gpu backface-hidden ${isOpen ? 'w-16 h-12 translate-y-[2px]' : 'w-14 h-14 hover:scale-105'}`}>
                            {isOpen ? (<ChevronDown size={28} className="text-white animate-in zoom-in duration-300 relative z-10" strokeWidth={2.5} />) : (<Plus size={28} strokeWidth={3} className="text-white drop-shadow-md relative z-10" />)}
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button onClick={() => handleSmartNav('FOCUS')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 pb-2 ${currentView === 'FOCUS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>
                            <Target size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'FOCUS' ? 2.5 : 2} />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        <button onClick={() => handleSmartNav('NOTES')} className={`group relative flex flex-col items-center gap-1 transition-colors duration-300 pb-2 ${currentView === 'NOTES' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>
                            <Brain size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'NOTES' ? 2.5 : 2} />
                            <span className={`pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest ${currentView === 'NOTES' ? 'text-white/70' : 'text-white/30'}`}>{noteIndicator}</span>
                        </button>
                    </div>
                </div>
             </div>
             </div>
           </motion.div>
        </motion.div>
    );
});
