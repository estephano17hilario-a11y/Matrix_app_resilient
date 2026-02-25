'use client';

import React, { useState, useMemo } from 'react';
import { X, Target, Check, Plus, Calendar, Trash2, Clock, Zap, ChevronLeft, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, isToday, isYesterday } from 'date-fns';
import { Project } from '../../../types';
import { cn } from '../../../utils/cn';

export const SessionHistoryModal = React.memo(({ isOpen, onClose, project, onUpdateProject, onDeleteSession, onAddSession }: { 
    isOpen: boolean, 
    onClose: () => void, 
    project: Project, 
    onUpdateProject: (p: Project) => void,
    onDeleteSession?: (projectId: string, sessionId: string) => void,
    onAddSession?: (durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string) => void
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDuration, setEditDuration] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    // Add Session State
    const [newDuration, setNewDuration] = useState('25');
    const [newType, setNewType] = useState<'POMO' | 'STOPWATCH'>('POMO');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Sort sessions by date descending
    const sortedSessions = useMemo(() => {
        return [...(project.sessions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [project.sessions]);
    
    if (!isOpen) return null;

    const handleSaveEdit = (sessionId: string) => {
        const newDurMinutes = Number.parseFloat(editDuration);
        if (!Number.isFinite(newDurMinutes) || newDurMinutes <= 0) return;
        
        const newSessions = project.sessions ? project.sessions.map(s => s.id === sessionId ? { ...s, duration: Math.round(newDurMinutes * 60) } : s) : [];
        const newTotal = newSessions.reduce((acc, s) => acc + s.duration, 0);
        
        onUpdateProject({ ...project, sessions: newSessions, totalTime: newTotal });
        setEditingId(null);
    };

    const handleAddSession = () => {
        const durMinutes = Number.parseFloat(newDuration);
        if (!Number.isFinite(durMinutes) || durMinutes <= 0) return;

        if (onAddSession) {
            const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
            // Use the selected date but keep current time if it's today, otherwise noon
            const dateToUse = new Date(selectedDate);
            if (isToday(selectedDate)) {
                dateToUse.setHours(new Date().getHours(), new Date().getMinutes());
            } else {
                dateToUse.setHours(12, 0, 0, 0);
            }
            
            onAddSession(durMinutes, newType, sessionId, dateToUse.toISOString());
        }
        
        setIsAdding(false);
        setNewDuration('25');
        setSelectedDate(new Date());
    };

    const handleDelete = (sessionId: string) => {
        if (confirm('Delete this session?')) { // Removed explicit window.confirm call as 'confirm' is globally available but might trigger linter warnings in strict environments
            if (onDeleteSession) {
                onDeleteSession(project.id, sessionId);
            }
        }
    };

    const adjustDuration = (amount: number) => {
        const current = parseInt(newDuration) || 0;
        const next = Math.max(5, current + amount);
        setNewDuration(next.toString());
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={onClose} 
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="relative z-10 w-full max-w-md bg-[#0f0f11] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col h-[600px] max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-2 shrink-0 flex justify-between items-center relative z-20">
                    <AnimatePresence mode="wait">
                        {isAdding ? (
                            <motion.button
                                key="back"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onClick={() => setIsAdding(false)}
                                className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                            >
                                <ChevronLeft size={20} />
                                <span className="text-sm font-medium">History</span>
                            </motion.button>
                        ) : (
                            <motion.div 
                                key="title"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                            >
                                <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
                                    History
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                </h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate max-w-[200px]">
                                    {project.title}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait" initial={false}>
                        {isAdding ? (
                            <motion.div
                                key="add-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute inset-0 p-6 flex flex-col"
                            >
                                {/* Type Selector */}
                                <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
                                    <button
                                        onClick={() => setNewType('POMO')}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden",
                                            newType === 'POMO' ? "text-white" : "text-white/40 hover:text-white/60"
                                        )}
                                    >
                                        {newType === 'POMO' && (
                                            <motion.div
                                                layoutId="activeType"
                                                className="absolute inset-0 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20"
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            <Target size={14} /> Focus
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setNewType('STOPWATCH')}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden",
                                            newType === 'STOPWATCH' ? "text-white" : "text-white/40 hover:text-white/60"
                                        )}
                                    >
                                        {newType === 'STOPWATCH' && (
                                            <motion.div
                                                layoutId="activeType"
                                                className="absolute inset-0 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20"
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            <Zap size={14} /> Flow
                                        </span>
                                    </button>
                                </div>

                                {/* Duration Input */}
                                <div className="flex-1 flex flex-col items-center justify-center mb-8">
                                    <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Duration</div>
                                    <div className="flex items-center gap-6">
                                        <button 
                                            onClick={() => adjustDuration(-5)}
                                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                        >
                                            <Minus size={20} />
                                        </button>
                                        <div className="relative group">
                                            <input 
                                                type="number" 
                                                value={newDuration}
                                                onChange={(e) => setNewDuration(e.target.value)}
                                                className="w-40 bg-transparent text-center text-7xl font-black text-white outline-none appearance-none m-0 p-0 tracking-tighter"
                                                placeholder="0"
                                            />
                                            <span className="absolute -right-4 bottom-4 text-sm font-bold text-white/30 uppercase">min</span>
                                        </div>
                                        <button 
                                            onClick={() => adjustDuration(5)}
                                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    
                                    {/* Presets */}
                                    <div className="flex gap-2 mt-8">
                                        {[15, 25, 45, 60].map(mins => (
                                            <button
                                                key={mins}
                                                onClick={() => setNewDuration(mins.toString())}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                                                    newDuration === mins.toString()
                                                        ? "bg-white text-black border-white shadow-lg scale-105"
                                                        : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:border-white/10"
                                                )}
                                            >
                                                {mins}m
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date Selection */}
                                <div className="mb-8">
                                    <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3 text-center">Date</div>
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => setSelectedDate(new Date())}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                                isToday(selectedDate)
                                                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                                    : "bg-white/5 text-white/40 border-white/5"
                                            )}
                                        >
                                            Today
                                        </button>
                                        <button
                                            onClick={() => setSelectedDate(subDays(new Date(), 1))}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                                isYesterday(selectedDate)
                                                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                                    : "bg-white/5 text-white/40 border-white/5"
                                            )}
                                        >
                                            Yesterday
                                        </button>
                                        <div className="relative">
                                            <input 
                                                type="date" 
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => {
                                                    if(e.target.valueAsDate) setSelectedDate(e.target.valueAsDate);
                                                }}
                                            />
                                            <div
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
                                                    !isToday(selectedDate) && !isYesterday(selectedDate)
                                                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                                        : "bg-white/5 text-white/40 border-white/5"
                                                )}
                                            >
                                                <Calendar size={12} />
                                                {!isToday(selectedDate) && !isYesterday(selectedDate) 
                                                    ? format(selectedDate, 'MMM d') 
                                                    : 'Pick Date'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleAddSession}
                                    className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={18} />
                                    Log Session
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute inset-0 flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3 custom-scrollbar">
                                    {sortedSessions.length === 0 ? (
                                        <div className="text-center py-20 flex flex-col items-center gap-6">
                                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center border border-white/5 shadow-inner rotate-3">
                                                <Calendar size={32} className="text-white/20" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-white/60 font-medium text-sm">No sessions yet</p>
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest">Start tracking your progress</p>
                                            </div>
                                        </div>
                                    ) : (
                                        sortedSessions.map((session) => (
                                            <motion.div 
                                                key={session.id} 
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="group bg-white/5 hover:bg-white/10 rounded-2xl p-4 flex items-center justify-between transition-all border border-white/5 hover:border-white/10 relative overflow-hidden"
                                            >
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shadow-sm",
                                                        session.type === 'POMO' 
                                                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                                                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    )}>
                                                        {session.type === 'POMO' ? <Target size={18} /> : <Zap size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest",
                                                                session.type === 'POMO' ? "text-indigo-300" : "text-emerald-300"
                                                            )}>
                                                                {session.type === 'POMO' ? 'FOCUS' : 'FLOW'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-white/40 mt-0.5 font-medium">
                                                            {format(new Date(session.date), 'MMM d, h:mm a')}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 relative z-10">
                                                    {editingId === session.id ? (
                                                        <div className="flex items-center gap-1 bg-black/60 rounded-xl p-1.5 border border-white/10 backdrop-blur-md shadow-xl">
                                                            <input 
                                                                type="number" 
                                                                value={editDuration} 
                                                                onChange={(e) => setEditDuration(e.target.value)}
                                                                className="w-12 bg-transparent text-right text-sm font-bold text-white outline-none"
                                                                autoFocus
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(session.id)}
                                                            />
                                                            <button onClick={() => handleSaveEdit(session.id)} className="w-6 h-6 rounded-lg bg-emerald-500 text-black flex items-center justify-center"><Check size={12} /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                onClick={() => { setEditingId(session.id); setEditDuration(Math.floor(session.duration / 60).toString()); }} 
                                                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-white transition-colors border border-white/5"
                                                            >
                                                                {Math.floor(session.duration / 60)}m
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(session.id)} 
                                                                className="w-8 h-8 rounded-xl text-white/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                                
                                {/* Footer Actions */}
                                <div className="p-6 pt-4 shrink-0 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11] to-transparent">
                                    <button 
                                        onClick={() => setIsAdding(true)}
                                        className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
                                    >
                                        <Plus size={16} className="text-white/40 group-hover:text-white transition-colors" />
                                        Log Past Session
                                    </button>
                                    
                                    <div className="mt-4 flex items-center justify-center gap-2 opacity-40">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-medium uppercase tracking-widest">
                                            Total: {Math.floor(project.totalTime / 60)} min
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
});
