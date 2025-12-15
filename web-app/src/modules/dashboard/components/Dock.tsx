import React from 'react';
import { Crosshair, Plus, Infinity as InfinityIcon, Target, Trophy, ChevronRight, CheckCircle2, Zap, ChevronDown, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Dock = React.memo(({ currentView, onChangeView, onOpenModal, isOpen, onToggle, isHidden }: { currentView: string, onChangeView: (v: string) => void, onOpenModal: (m: string) => void, isOpen: boolean, onToggle: (open: boolean) => void, isHidden: boolean }) => {
    const handleView = (v: string) => { onChangeView(v); onToggle(false); };
    const handleModal = (m: string) => { onOpenModal(m); onToggle(false); };

    return (
        <motion.div 
            initial={false}
            animate={{ y: isHidden ? '200%' : '0%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none"
        >
           <motion.div 
                layout
                initial={false}
                animate={{ 
                    height: isOpen ? 340 : 70,
                    borderRadius: isOpen ? 32 : 34,
                    width: '88vw',
                    maxWidth: 330
                }}
                transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 28,
                    mass: 0.8
                }}
                className={`pointer-events-auto relative box-border glass-panel ${isOpen ? 'rgb-border-container rgb-border-active' : ''}`}
                style={{ overflow: 'visible' }}
             >
             <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-10">
                <div className="relative w-full h-full">
                <div className={`absolute bottom-[80px] left-0 right-0 px-5 grid grid-cols-2 gap-2 transition-all duration-300 ease-out ${isOpen ? 'opacity-100 translate-y-0 delay-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <button onClick={() => { handleView('TASKS'); setTimeout(() => handleModal('QUEST'), 150); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-sm">
                       <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)] group-hover:scale-110 transition-transform"><Crosshair size={18} /></div><div className="text-left"><span className="block text-white font-bold text-[14px] tracking-tight">New Mission</span><span className="block text-white/40 text-[9px] font-bold uppercase tracking-wider">Single Task</span></div></div><Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
                    </button>
                    <button onClick={() => { handleView('HABITS'); setTimeout(() => handleModal('HABIT'), 150); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm">
                       <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.1)]"><InfinityIcon size={18} /></div><span className="text-white/90 font-bold text-[11px] tracking-tight">Habit</span>
                    </button>
                    <button onClick={() => { handleView('FOCUS'); setTimeout(() => handleModal('PROJECT'), 150); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm">
                       <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.1)]"><Target size={18} /></div><span className="text-white/90 font-bold text-[11px] tracking-tight">Focus</span>
                    </button>
                    <button onClick={() => { handleView('ACHIEVEMENTS'); }} className="col-span-2 h-14 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)] group-hover:scale-110 transition-transform"><Trophy size={18} /></div>
                            <div className="text-left"><span className="block text-white font-bold text-[14px] tracking-tight">Hall of Fame</span><span className="block text-white/40 text-[9px] font-bold uppercase tracking-wider">Achievements</span></div>
                        </div>
                        <ChevronRight size={18} className="text-white/30 group-hover:text-white transition-colors" />
                    </button>
                </div>
                 <div className="absolute bottom-0 left-0 right-0 h-[70px] flex items-center justify-between px-8 z-20">
                     <div className="flex gap-8">
                         <button onClick={() => handleView('TASKS')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'TASKS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><CheckCircle2 size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'TASKS' ? 2.5 : 2} /></button>
                         <button onClick={() => handleView('HABITS')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'HABITS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><Zap size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'HABITS' ? 2.5 : 2} /></button>
                     </div>
                     <div className="flex items-center justify-center h-full -mt-1">
                  <button onClick={() => onToggle(!isOpen)} className={`glass-button z-20 flex items-center justify-center transition-all duration-400 cubic-bezier(0.19, 1, 0.22, 1) transform-gpu backface-hidden ${isOpen ? 'w-16 h-12 translate-y-[2px]' : 'w-14 h-14 hover:scale-105'}`}>
                      {isOpen ? (<ChevronDown size={28} className="text-white animate-in zoom-in duration-300 relative z-10" strokeWidth={2.5} />) : (<Plus size={28} strokeWidth={3} className="text-white drop-shadow-md relative z-10" />)}
                  </button>
              </div>
                     <div className="flex gap-5">
                         <button onClick={() => handleView('FOCUS')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'FOCUS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><Target size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'FOCUS' ? 2.5 : 2} /></button>
                         <button onClick={() => handleView('NOTES')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'NOTES' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><Briefcase size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'NOTES' ? 2.5 : 2} /></button>
                     </div>
                 </div>
             </div>
             </div>
           </motion.div>
        </motion.div>
    );
});
