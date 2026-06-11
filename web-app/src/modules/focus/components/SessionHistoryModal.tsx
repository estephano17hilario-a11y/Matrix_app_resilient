'use client';

import React, { useState, useMemo } from 'react';
import { X, Target, Plus, Calendar, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { ManualSessionCreator } from './ManualSessionCreator';

export const SessionHistoryModal = React.memo(({ isOpen, onClose, project, attribute, onUpdateProject, onDeleteSession, onAddSession, onEditSession, isActive, onShowWarning }: { 
    isOpen: boolean, 
    onClose: () => void, 
    project: Project, 
    attribute?: Attribute,
    onUpdateProject: (p: Project) => void,
    onDeleteSession?: (projectId: string, sessionId: string) => void,
    onAddSession?: (durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string, subTraitId?: string) => void,
    onEditSession?: (projectId: string, sessionId: string, newDurationMinutes: number, newDateStr: string) => void,
    isActive?: boolean,
    onShowWarning?: () => void
}) => {
    const { t, i18n } = useTranslation();
    const [mode, setMode] = useState<'LIST' | 'ADD' | 'EDIT'>('LIST');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    // Sort sessions by date descending
    const sortedSessions = useMemo(() => {
        return [...(project.sessions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [project.sessions]);

    const selectedSession = useMemo(() => 
        project.sessions?.find(s => s.id === selectedSessionId),
    [project.sessions, selectedSessionId]);
    
    if (!isOpen) return null;

    const handleSaveSession = (durationMinutes: number, date: Date, subTraitId?: string) => {
        if (mode === 'ADD') {
            if (onAddSession) {
                const newSessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
                onAddSession(durationMinutes, 'POMO', newSessionId, date.toISOString(), subTraitId);
            }
        } else if (mode === 'EDIT' && selectedSessionId) {
            if (onEditSession) {
                onEditSession(project.id, selectedSessionId, durationMinutes, date.toISOString());
            } else {
                const newSessions = (project.sessions || []).map(s => s.id === selectedSessionId ? { 
                    ...s, 
                    duration: Math.round(durationMinutes * 60),
                    date: date.toISOString()
                } : s);
                const newTotal = newSessions.reduce((acc, s) => acc + s.duration, 0);
                onUpdateProject({ ...project, sessions: newSessions, totalTime: newTotal });
            }
        }
        
        setMode('LIST');
        setSelectedSessionId(null);
    };

    const handleDelete = (sessionId: string) => {
        const confirmMsg = i18n.language === 'es' ? '¿Eliminar esta sesión?' : 'Delete this session?';
        if (confirm(confirmMsg)) {
            if (onDeleteSession) {
                onDeleteSession(project.id, sessionId);
            }
            if (mode === 'EDIT') {
                setMode('LIST');
                setSelectedSessionId(null);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80" 
                onClick={onClose} 
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="relative z-10 w-full max-w-md bg-[#0f0f11] rounded-[2.5rem] shadow-md overflow-hidden border border-white/10 flex flex-col h-[600px] max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header (Only show in LIST mode, otherwise ManualSessionCreator handles it) */}
                {mode === 'LIST' && (
                    <div className="p-6 pb-2 shrink-0 flex justify-between items-center relative z-20">
                        <motion.div 
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
                                {t('focus.history.title')}
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            </h3>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate max-w-[200px]">
                                {project.title}
                            </p>
                        </motion.div>
                        
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait" initial={false}>
                        {mode !== 'LIST' ? (
                            <ManualSessionCreator
                                key="creator"
                                initialDuration={mode === 'EDIT' && selectedSession ? Math.floor(selectedSession.duration / 60) : 60}
                                initialDate={mode === 'EDIT' && selectedSession ? new Date(selectedSession.date) : new Date()}
                                project={project}
                                attribute={attribute}
                                onSave={handleSaveSession}
                                onCancel={() => { setMode('LIST'); setSelectedSessionId(null); }}
                                onDelete={mode === 'EDIT' && selectedSessionId ? () => handleDelete(selectedSessionId) : undefined}
                                isEditing={mode === 'EDIT'}
                            />
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                className="absolute inset-0 flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3 custom-scrollbar">
                                    {sortedSessions.length === 0 ? (
                                        <div className="text-center py-20 flex flex-col items-center gap-6">
                                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center border border-white/5 shadow-md rotate-3">
                                                <Calendar size={32} className="text-white/20" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-white/60 font-medium text-sm">{t('focus.history.noSessions')}</p>
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest">{t('focus.history.startTracking')}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        sortedSessions.map((session) => (
                                            <motion.div 
                                                key={session.id} 
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                onClick={() => {
                                                    if (isActive) {
                                                        onShowWarning?.();
                                                        return;
                                                    }
                                                    setSelectedSessionId(session.id);
                                                    setMode('EDIT');
                                                }}
                                                className="group bg-white/5 hover:bg-white/10 rounded-2xl p-4 flex items-center justify-between transition-all border border-white/5 hover:border-white/10 relative overflow-hidden cursor-pointer active:scale-95"
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
                                                    <div className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-mono font-bold text-white border border-white/5">
                                                        {Math.floor(session.duration / 60)}m
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                                
                                {/* Footer Actions */}
                                <div className="p-6 pt-4 shrink-0 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11] to-transparent">
                                    <button 
                                        onClick={() => {
                                            if (isActive) {
                                                onShowWarning?.();
                                                return;
                                            }
                                            setMode('ADD');
                                        }}
                                        className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
                                    >
                                        <Plus size={16} className="text-white/40 group-hover:text-white transition-colors" />
                                        {t('focus.history.logPast')}
                                    </button>
                                    
                                    <div className="mt-4 flex items-center justify-center gap-2 opacity-40">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-medium uppercase tracking-widest">
                                            {t('focus.history.total')} {Math.floor(project.totalTime / 60)} {t('focus.history.min')}
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
