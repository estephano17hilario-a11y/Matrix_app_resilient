import React, { useState } from 'react';
import { X, Target, StopCircle, Check } from 'lucide-react';
import { Project } from '../../../types';

export const SessionHistoryModal = React.memo(({ isOpen, onClose, project, onUpdateProject }: { isOpen: boolean, onClose: () => void, project: Project, onUpdateProject: (p: Project) => void }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDuration, setEditDuration] = useState('');
    
    if (!isOpen) return null;

    const handleSave = (sessionId: string) => {
        const newDuration = parseInt(editDuration);
        if (isNaN(newDuration) || newDuration < 1) return;
        
        const newSessions = project.sessions ? project.sessions.map(s => s.id === sessionId ? { ...s, duration: newDuration * 60 } : s) : [];
        const newTotal = newSessions.reduce((acc, s) => acc + s.duration, 0);
        
        onUpdateProject({ ...project, sessions: newSessions, totalTime: newTotal });
        setEditingId(null);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm bg-[#1c1c1e] rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-white font-bold text-lg">Session History</h3>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{project.title}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                    {(!project.sessions || project.sessions.length === 0) && (
                        <div className="text-center py-8 text-slate-500 text-sm">No sessions recorded yet.</div>
                    )}
                    {project.sessions?.map((session) => (
                        <div key={session.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-colors border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.type === 'POMO' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                    {session.type === 'POMO' ? <Target size={18} /> : <StopCircle size={18} />}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{session.type === 'POMO' ? 'Pomodoro' : 'Flow'}</div>
                                    <div className="text-[10px] text-slate-500">{new Date(session.date).toLocaleDateString()} • {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingId === session.id ? (
                                    <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1">
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
                                    <button onClick={() => { setEditingId(session.id); setEditDuration(Math.floor(session.duration / 60).toString()); }} className="px-3 py-1.5 rounded-lg bg-black/20 text-sm font-mono font-bold text-white hover:bg-white/20 transition-colors min-w-[60px] text-center">
                                        {Math.floor(session.duration / 60)}m
                                    </button>
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
