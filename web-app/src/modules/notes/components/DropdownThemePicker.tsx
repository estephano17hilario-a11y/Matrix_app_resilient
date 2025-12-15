import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Project } from '../../../types';

// Moved constants here or import them if they are shared
export const NOTE_THEMES = [
    { id: 'slate', color: '#64748b' },
    { id: 'red', color: '#ef4444' },
    { id: 'orange', color: '#f97316' },
    { id: 'amber', color: '#f59e0b' },
    { id: 'green', color: '#10b981' },
    { id: 'cyan', color: '#06b6d4' },
    { id: 'blue', color: '#3b82f6' },
    { id: 'indigo', color: '#6366f1' },
    { id: 'purple', color: '#8b5cf6' },
    { id: 'pink', color: '#ec4899' },
];

export const DropdownThemePicker = ({ currentTheme, onSelect, projects, activeProject, onSelectProject }: { currentTheme: string, onSelect: (id: string) => void, projects: Project[] | null, activeProject: string | undefined, onSelectProject: (id: string | undefined) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const activeColor = NOTE_THEMES.find(t => t.id === currentTheme)?.color || '#fff';
    
    return (
        <div className="relative z-50">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95">
               <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeColor, color: activeColor }} />
               <ChevronDown size={12} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-64 bg-[#1c1c1e] rounded-2xl border border-white/10 shadow-2xl p-4 z-[999] animate-in fade-in zoom-in-95 flex flex-col gap-4">
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color Tag</span>
                        <div className="grid grid-cols-7 gap-2">
                            {NOTE_THEMES.map(t => (
                                <button key={t.id} onClick={() => { onSelect(t.id); }} className={`w-6 h-6 rounded-full transition-all ${currentTheme === t.id ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1e]' : 'hover:scale-110 opacity-70 hover:opacity-100'}`} style={{ backgroundColor: t.color }} />
                            ))}
                        </div>
                    </div>
                    {projects && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Link Project</span>
                             <div className="flex flex-col gap-1 max-h-32 overflow-y-auto no-scrollbar">
                                <button onClick={() => { onSelectProject(undefined); setIsOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${!activeProject ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                                    <div className="w-2 h-2 rounded-full bg-slate-500" /> None
                                </button>
                                {projects.map((p) => (
                                    <button key={p.id} onClick={() => { onSelectProject(p.id); setIsOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${activeProject === p.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                                        <div className="w-2 h-2 rounded-full bg-blue-500" /> {p.title}
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
};
