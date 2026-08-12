'use client';

import React, { useState, useMemo } from 'react';
import { X, Target, Plus, Calendar, Clock, Trash2, Zap, ChevronLeft, ChevronRight, Lock, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Project, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { ManualSessionCreator } from './ManualSessionCreator';

type Timeframe = 'DAY' | 'WEEK' | 'MONTH';

export const SessionHistoryModal = React.memo(({ isOpen, onClose, onOpenCustomization, project, attribute, onUpdateProject, onDeleteSession, onAddSession, onEditSession, isActive, onShowWarning }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onOpenCustomization?: () => void,
    project: Project, 
    attribute?: Attribute,
    onUpdateProject: (p: Project) => void,
    onDeleteSession?: (projectId: string, sessionId: string) => void,
    onAddSession?: (durationMinutes: number, type: 'POMO' | 'STOPWATCH' | 'MANUAL', sessionId?: string, sessionDate?: string, subTraitId?: string) => void,
    onEditSession?: (projectId: string, sessionId: string, newDurationMinutes: number, newDateStr: string, newSubTraitId?: string) => void,
    isActive?: boolean,
    onShowWarning?: () => void
}) => {
    const { t, i18n } = useTranslation();
    const [mode, setMode] = useState<'LIST' | 'ADD' | 'EDIT'>('LIST');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState<Timeframe>('MONTH');
    const [periodOffset, setPeriodOffset] = useState<number>(0);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    // Compute active target date base on timeframe & offset
    const activePeriodRange = useMemo(() => {
        const now = new Date();
        let targetDate = new Date();

        if (timeframe === 'DAY') {
            targetDate = addDays(now, periodOffset);
            return {
                start: startOfDay(targetDate),
                end: endOfDay(targetDate),
                label: isToday(targetDate) ? (i18n.language === 'es' ? 'Hoy' : 'Today') : format(targetDate, 'dd MMMM yyyy', { locale: i18n.language === 'es' ? es : undefined })
            };
        } else if (timeframe === 'WEEK') {
            targetDate = addWeeks(now, periodOffset);
            const start = startOfWeek(targetDate, { weekStartsOn: 1 });
            const end = endOfWeek(targetDate, { weekStartsOn: 1 });
            return {
                start,
                end,
                label: `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`
            };
        } else {
            targetDate = addMonths(now, periodOffset);
            const start = startOfMonth(targetDate);
            const end = endOfMonth(targetDate);
            return {
                start,
                end,
                label: format(targetDate, 'MMMM yyyy', { locale: i18n.language === 'es' ? es : undefined })
            };
        }
    }, [timeframe, periodOffset, i18n.language]);

    // Filter and sort sessions by timeframe range
    const filteredSessions = useMemo(() => {
        const sessions = project.sessions || [];
        return sessions.filter(s => {
            const d = new Date(s.date);
            return d >= activePeriodRange.start && d <= activePeriodRange.end;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [project.sessions, activePeriodRange]);

    const selectedSession = useMemo(() => 
        project.sessions?.find(s => s.id === selectedSessionId),
    [project.sessions, selectedSessionId]);
    
    if (!isOpen) return null;

    const handleSaveSession = (durationMinutes: number, date: Date, subTraitId?: string) => {
        if (mode === 'ADD') {
            if (onAddSession) {
                const newSessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
                onAddSession(durationMinutes, 'MANUAL', newSessionId, date.toISOString(), subTraitId);
            }
        } else if (mode === 'EDIT' && selectedSessionId) {
            if (onEditSession) {
                onEditSession(project.id, selectedSessionId, durationMinutes, date.toISOString(), subTraitId);
            } else {
                const newSessions = (project.sessions || []).map(s => s.id === selectedSessionId ? { 
                    ...s, 
                    duration: Math.round(durationMinutes * 60),
                    date: date.toISOString(),
                    subTraitId: subTraitId,
                    type: 'MANUAL' as const,
                    isManual: true
                } : s);
                const newTotal = newSessions.reduce((acc, s) => acc + s.duration, 0);
                onUpdateProject({ ...project, sessions: newSessions as any[], totalTime: newTotal });
            }
        }
        
        setMode('LIST');
        setSelectedSessionId(null);
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
                className="relative z-10 w-full max-w-md bg-[#0f0f11] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col h-[640px] max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header (Only show in LIST mode, otherwise ManualSessionCreator handles it) */}
                {mode === 'LIST' && (
                    <div className="p-6 pb-3 shrink-0 flex flex-col gap-3 relative z-20 border-b border-white/5">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
                                    {t('focus.history.title', 'Historial de Enfoque')}
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                </h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate max-w-[200px]">
                                    {project.title}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                {onOpenCustomization && (
                                    <button 
                                        type="button" 
                                        onClick={onOpenCustomization} 
                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-all cursor-pointer border border-white/5 shadow-xs"
                                        title="Personalización LUX"
                                    >
                                        <SlidersHorizontal size={15} />
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Timeframe Switcher Tabs */}
                        <div className="flex items-center p-1 bg-white/5 rounded-2xl border border-white/5 gap-1">
                            {(['DAY', 'WEEK', 'MONTH'] as Timeframe[]).map(tf => (
                                <button
                                    key={tf}
                                    type="button"
                                    onClick={() => { setTimeframe(tf); setPeriodOffset(0); }}
                                    className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all ${
                                        timeframe === tf ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    {tf === 'DAY' ? 'Día' : tf === 'WEEK' ? 'Semana' : 'Mes'}
                                </button>
                            ))}
                        </div>

                        {/* Period Range Navigator Bar */}
                        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
                            <button
                                type="button"
                                onClick={() => setPeriodOffset(prev => prev - 1)}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <span className="text-xs font-black text-white capitalize tracking-tight font-mono">
                                {activePeriodRange.label}
                            </span>

                            <button
                                type="button"
                                onClick={() => setPeriodOffset(prev => prev + 1)}
                                disabled={periodOffset >= 0}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                    periodOffset >= 0 ? 'opacity-20 text-white/20 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white/70'
                                }`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
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
                                initialSubTraitId={mode === 'EDIT' && selectedSession ? selectedSession.subTraitId : undefined}
                                project={project}
                                attribute={attribute}
                                onSave={handleSaveSession}
                                onCancel={() => { setMode('LIST'); setSelectedSessionId(null); }}
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
                                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                    {filteredSessions.length === 0 ? (
                                        <div className="text-center py-16 flex flex-col items-center gap-5">
                                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center border border-white/5 shadow-md">
                                                <Calendar size={28} className="text-white/20" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-white/60 font-medium text-sm">Sin sesiones en este período</p>
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest">Navega a otra fecha o registra una sesión</p>
                                            </div>
                                        </div>
                                    ) : (
                                        filteredSessions.map((session) => {
                                            const sessionDate = new Date(session.date);
                                            const daysDiff = Math.abs(differenceInDays(new Date(), sessionDate));
                                            const isEditable = daysDiff <= 7;
                                            const sessionIsToday = isToday(sessionDate);
                                            
                                            const isManual = session.type === 'MANUAL' || (session as any).mode === 'MANUAL' || (session as any).isManual;
                                            const isStopwatch = session.type === 'STOPWATCH' || (session as any).mode === 'STOPWATCH' || (session as any).mode === 'FLOW';
                                            const badgeLabel = isManual ? 'MANUAL' : isStopwatch ? 'MODO FLUJO' : 'POMODORO';
                                            const badgeColorClass = isManual ? 'text-amber-300' : isStopwatch ? 'text-emerald-300' : 'text-indigo-300';
                                            const iconBoxClass = isManual 
                                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                                : isStopwatch 
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';

                                            return (
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
                                                        if (!isEditable) {
                                                            toast.error('Solo puedes editar sesiones de los últimos 7 días 🔒');
                                                            return;
                                                        }
                                                        setSelectedSessionId(session.id);
                                                        setMode('EDIT');
                                                    }}
                                                    className={cn(
                                                        "group bg-white/5 hover:bg-white/10 rounded-2xl p-3.5 flex items-center justify-between transition-all border relative overflow-hidden",
                                                        isEditable ? "cursor-pointer border-white/5 hover:border-white/20 active:scale-98" : "opacity-60 border-white/5 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3.5 relative z-10 min-w-0">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shadow-sm shrink-0",
                                                            iconBoxClass
                                                        )}>
                                                            {isManual ? <Clock size={18} /> : isStopwatch ? <Zap size={18} /> : <Target size={18} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "text-[9px] font-black uppercase tracking-widest",
                                                                    badgeColorClass
                                                                )}>
                                                                    {badgeLabel}
                                                                </span>
                                                                {!isEditable && (
                                                                    <span className="text-[8px] font-bold text-white/40 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                                                                        <Lock size={9} /> Solo Lectura
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-white/50 mt-0.5 font-medium flex items-center gap-1.5">
                                                                <Clock size={11} className="text-white/30" />
                                                                {sessionIsToday ? (
                                                                    <span className="font-mono text-white/90">Hoy, {format(sessionDate, 'h:mm a')}</span>
                                                                ) : (
                                                                    <span className="font-mono">{format(sessionDate, 'dd MMM, h:mm a')}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 relative z-10 shrink-0">
                                                        <div className="px-3 py-1.5 rounded-xl bg-white/5 text-xs font-mono font-bold text-white border border-white/10">
                                                            {Math.floor(session.duration / 60)}m
                                                        </div>
                                                        {isEditable && onDeleteSession && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeletingSessionId(session.id);
                                                                }}
                                                                className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors cursor-pointer"
                                                                title="Eliminar registro"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })
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
                                        className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 group"
                                    >
                                        <Plus size={16} className="text-white/40 group-hover:text-white transition-colors" />
                                        {t('focus.history.logPast', 'Registrar Sesión Pasada')}
                                    </button>
                                    
                                    <div className="mt-3 flex items-center justify-center gap-2 opacity-40">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-medium uppercase tracking-widest font-mono">
                                            {t('focus.history.total', 'Total')}: {Math.floor(project.totalTime / 60)} {t('focus.history.min', 'min')}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            {/* Deletion Warning Modal */}
            <AnimatePresence>
                {deletingSessionId && (
                    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm bg-[#0f0f18] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center text-white"
                        >
                            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
                                <Trash2 size={22} />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-extrabold text-white">⚠️ ¿Eliminar Registro?</h3>
                                <p className="text-xs text-white/70">
                                    Eliminar este registro restará 1 pomodoro completado a tu rutina de hoy y actualizará tus estadísticas.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeletingSessionId(null)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const sid = deletingSessionId;
                                        setDeletingSessionId(null);
                                        if (onDeleteSession) {
                                            onDeleteSession(project.id, sid);
                                            toast.success("Registro eliminado");
                                        }
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs transition-colors shadow-lg shadow-rose-500/20"
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
});
