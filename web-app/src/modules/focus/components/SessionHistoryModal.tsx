import React, { useState } from 'react';
import { X, Target, StopCircle, Check, Plus, Calendar } from 'lucide-react';
import { Project, Session } from '../../../types';

export const SessionHistoryModal = React.memo(({ isOpen, onClose, project, onUpdateProject }: { isOpen: boolean, onClose: () => void, project: Project, onUpdateProject: (p: Project) => void }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDuration, setEditDuration] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newDuration, setNewDuration] = useState('25');
    const [newType, setNewType] = useState<'POMO' | 'STOPWATCH'>('POMO');
    
    if (!isOpen) return null;

    const handleSave = (sessionId: string) => {
        const newDur = parseInt(editDuration);
        if (isNaN(newDur) || newDur < 1) return;
        
        const newSessions = project.sessions ? project.sessions.map(s => s.id === sessionId ? { ...s, duration: newDur * 60 } : s) : [];
        const newTotal = newSessions.reduce((acc, s) => acc + s.duration, 0);
        
        onUpdateProject({ ...project, sessions: newSessions, totalTime: newTotal });
        setEditingId(null);
    };

    const handleAddSession = () => {
        const dur = parseInt(newDuration);
        if (isNaN(dur) || dur < 1) return;

        const newSession: Session = {
            id: Date.now().toString(),
            type: newType,
            duration: dur * 60,
            date: new Date().toISOString()
        };

        const newSessions = [newSession, ...(project.sessions || [])];
        const newTotal = newSessions.reduce((acc, s) => acc + s.duration, 0);

        onUpdateProject({ ...project, sessions: newSessions, totalTime: newTotal });
        setIsAdding(false);
        setNewDuration('25');
    };

    const handleDelete = (sessionId: string) => {
        if (!confirm('Delete this session?')) return;
        const newSessions = project.sessions ? project.sessions.filter(s => s.id !== sessionId) : [];
        const newTotal = newSessions.reduce((acc, s) => acc + s.duration, 0);
        onUpdateProject({ ...project, sessions: newSessions, totalTime: newTotal });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm bg-[#1c1c1e] rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-white font-bold text-lg">Session History</h3>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{project.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsAdding(!isAdding)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAdding ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>
                            <Plus size={16} className={isAdding ? 'rotate-45 transition-transform' : 'transition-transform'} />
                        </button>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                    </div>
                </div>

                {isAdding && (
                    <div className="p-4 bg-white/5 border-b border-white/5 animate-in slide-in-from-top-2">
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => setNewType('POMO')} className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${newType === 'POMO' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>Pomodoro</button>
                            <button onClick={() => setNewType('STOPWATCH')} className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${newType === 'STOPWATCH' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>Flow</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-black/40 rounded-xl px-3 py-2 flex items-center gap-2 border border-white/5 focus-within:border-white/20 transition-colors">
                                <span className="text-slate-400 text-xs font-bold uppercase">Duration</span>
                                <input 
                                    type="number" 
                                    value={newDuration}
                                    onChange={(e) => setNewDuration(e.target.value)}
                                    className="flex-1 bg-transparent text-right text-white font-mono font-bold outline-none"
                                    placeholder="25"
                                />
                                <span className="text-slate-500 text-xs">min</span>
                            </div>
                            <button onClick={handleAddSession} className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-slate-200 transition-colors shadow-lg active:scale-95">
                                <Check size={20} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                    {(!project.sessions || project.sessions.length === 0) && !isAdding && (
                        <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center gap-2">
                            <Calendar size={24} className="opacity-50" />
                            <p>No sessions recorded yet.</p>
                            <button onClick={() => setIsAdding(true)} className="text-xs text-indigo-400 font-bold uppercase tracking-wider hover:underline mt-2">Add Manual Session</button>
                        </div>
                    )}
                    {project.sessions?.map((session) => (
                        <div key={session.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-colors border border-white/5 relative overflow-hidden">
                             {/* Delete Slide Action (simplified as a button for now) */}
                            
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.type === 'POMO' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                    {session.type === 'POMO' ? <Target size={18} /> : <StopCircle size={18} />}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{session.type === 'POMO' ? 'Pomodoro' : 'Flow'}</div>
                                    <div className="text-[10px] text-slate-500">{new Date(session.date).toLocaleDateString()} • {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative z-10">
                                {editingId === session.id ? (
                                    <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 animate-in zoom-in">
                                        <input 
                                            type="number" 
                                            value={editDuration} 
                                            onChange={(e) => setEditDuration(e.target.value)}
                                            className="w-12 bg-transparent text-right text-sm font-bold text-white outline-none"
                                            autoFocus
                                        />
                                        <span className="text-[10px] text-slate-500 pr-1">min</span>
                                        <button onClick={() => handleSave(session.id)} className="w-6 h-6 rounded-md bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30"><Check size={12} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => { setEditingId(session.id); setEditDuration(Math.floor(session.duration / 60).toString()); }} className="px-3 py-1.5 rounded-lg bg-black/20 text-sm font-mono font-bold text-white hover:bg-white/20 transition-colors min-w-[60px] text-center">
                                            {Math.floor(session.duration / 60)}m
                                        </button>
                                        <button onClick={() => handleDelete(session.id)} className="w-6 h-6 rounded-md text-slate-600 hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                                            <X size={12} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-white/5 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Total Time</span>
                    <span className="text-xl font-black text-white">{Math.floor(project.totalTime / 60)}<span className="text-sm font-medium text-white/40 ml-1">min</span></span>
                </div>
            </div>
        </div>
    );
});
