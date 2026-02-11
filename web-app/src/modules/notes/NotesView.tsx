import React, { useState, useMemo, useCallback } from 'react';
import { Plus, BarChart3, ChevronLeft, ChevronRight, ArrowLeft, Briefcase, Trash2, Save, Lock, Calendar, AlignLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Note, JournalEntry, NoteBlock, Project } from '../../types';
import { BlockEditor } from './components/BlockEditor';
import { DropdownThemePicker, NOTE_THEMES } from './components/DropdownThemePicker';
import { EditorToolbar } from './components/EditorToolbar';
import { NotesStatsModal } from './components/NotesStatsModal';
import { BlueprintSelector } from './components/BlueprintSelector';
import { SaveBlueprintModal } from './components/SaveBlueprintModal';
import { toLocalISOString, getDaysInMonth, calculateStreak } from '../../utils/dateUtils';
import { useNotesLogic } from './hooks/useNotesLogic';

// Constants
const MOODS = [
    { id: 'rad', icon: '🚀', color: '#10b981', label: 'Radiant' },
    { id: 'good', icon: '😊', color: '#3b82f6', label: 'Good' },
    { id: 'meh', icon: '😐', color: '#94a3b8', label: 'Neutral' },
    { id: 'bad', icon: '🌧️', color: '#64748b', label: 'Low' },
    { id: 'awful', icon: '⛈️', color: '#ef4444', label: 'Drained' },
];

interface NotesViewProps {
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
    projects: Project[];
    onShowPro?: () => void;
    currentSubView?: 'NOTES' | 'JOURNAL';
    sectionControl?: 'VISIBLE' | 'HIDDEN';
}

const getEntryTitle = (blocks: NoteBlock[]) => {
    const textBlock = blocks.find(b => b.type === 'text' && b.content.trim().length > 0);
    if (textBlock) {
        return textBlock.content.split('\n')[0].trim();
    }
    return '';
};

const WigglyLine = () => (
    <div className="w-full h-1 overflow-hidden opacity-20">
        <svg width="100%" height="10" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path d="M0 5 Q 10 0, 20 5 T 40 5 T 60 5 T 80 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
    </div>
);

export const NotesView = React.memo(({ onInteractionStart, onInteractionEnd, projects, onShowPro, currentSubView, sectionControl = 'VISIBLE' }: NotesViewProps) => {
    const { t, i18n } = useTranslation();
    const { notes, journalEntries, handleUpdateNote, handleDeleteNote, handleUpdateJournal, canCreateNote } = useNotesLogic();

    const [subView, setSubView] = useState<'NOTES' | 'JOURNAL'>('NOTES');

    // Sync subView with external prop
    React.useEffect(() => {
        if (currentSubView) {
            setSubView(currentSubView);
        }
    }, [currentSubView]);

    const [journalViewMode, setJournalViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
    const [editorMode, setEditorMode] = useState<'NONE' | 'NOTE' | 'JOURNAL'>('NONE');
    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftBlocks, setDraftBlocks] = useState<NoteBlock[]>([]);
    const [draftTheme, setDraftTheme] = useState('slate');
    const [draftMood, setDraftMood] = useState<string | undefined>(undefined);
    const [draftProjectId, setDraftProjectId] = useState<string | undefined>(undefined);
    const [draftDate, setDraftDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showStats, setShowStats] = useState(false);
    const [showSaveBlueprintModal, setShowSaveBlueprintModal] = useState(false);
    const [moodSplash, setMoodSplash] = useState<string | null>(null);
    const streak = useMemo(() => calculateStreak(journalEntries), [journalEntries]);

    const openNote = useCallback((note: Note) => { 
        setEditorMode('NOTE'); setDraftId(note.id); setDraftTitle(note.title); setDraftBlocks(note.blocks); setDraftTheme(note.theme || 'slate'); setDraftProjectId(note.projectId); onInteractionStart(); 
    }, [onInteractionStart]);
    
    const createNote = useCallback(() => { 
        if (!canCreateNote()) {
            if (onShowPro) onShowPro();
            return;
        }
        const newId = Date.now().toString(); setEditorMode('NOTE'); setDraftId(newId); setDraftTitle(''); setDraftBlocks([{ id: 'init-1', type: 'text', content: '' }]); setDraftTheme('slate'); setDraftProjectId(undefined); onInteractionStart(); 
    }, [onInteractionStart, canCreateNote, onShowPro]);
    
    const openJournal = useCallback((date: Date) => { 
        const dateStr = toLocalISOString(date); 
        const entry = journalEntries.find((e: JournalEntry) => e.date === dateStr); 
        setEditorMode('JOURNAL'); setDraftDate(date); setDraftId(entry?.id || Date.now().toString()); setDraftBlocks(entry?.blocks || [{ id: 'init-1', type: 'text', content: '' }]); setDraftMood(entry?.mood); setDraftTheme(entry?.theme || 'slate'); onInteractionStart(); 
    }, [journalEntries, onInteractionStart]);
    
    const handleSave = () => { 
        if (editorMode === 'NOTE' && draftId) { 
            handleUpdateNote({ id: draftId, title: draftTitle, blocks: draftBlocks, theme: draftTheme, projectId: draftProjectId, updatedAt: new Date().toISOString() }); 
        } else if (editorMode === 'JOURNAL' && draftId) { 
            handleUpdateJournal({ id: draftId, date: toLocalISOString(draftDate), blocks: draftBlocks, mood: draftMood, theme: draftTheme, tags: [] }); 
        } 
        closeEditor(); 
    };
    
    const handleDelete = () => { if (editorMode === 'NOTE' && draftId) { handleDeleteNote(draftId); } closeEditor(); };
    const closeEditor = () => { setEditorMode('NONE'); setDraftId(null); onInteractionEnd(); };
    const addBlock = (type: 'text' | 'check' | 'image') => { setDraftBlocks(prev => [...prev, { id: Date.now().toString(), type, content: '', checked: false }]); };
    
    const { days, firstDay } = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);
    const emptyDays = Array(firstDay).fill(null);
    const monthDays = Array.from({ length: days }, (_, i) => i + 1);
    const activeThemeColor = NOTE_THEMES.find(t => t.id === draftTheme)?.color || '#fff';

    return (
        <div className="h-full flex flex-col relative">
            <div className={`transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${editorMode !== 'NONE' ? 'opacity-0 scale-95 pointer-events-none blur-sm' : 'opacity-100 scale-100'}`}>
                <div className="flex items-center justify-between mb-6 mt-4 relative z-10 px-4">
                    <div className="w-8" />
                    {sectionControl === 'VISIBLE' && (
                        <div className="bg-black/40 p-1 rounded-full border border-white/10 flex relative backdrop-blur-md shadow-2xl w-full max-w-[200px]">
                            <div className={`absolute inset-y-1 w-[49%] bg-white/10 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-inner ${
                                subView === 'NOTES' ? 'left-[1%]' : 'left-[50%]'
                            }`} />
                            <button onClick={() => setSubView('NOTES')} className={`relative w-1/2 py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors z-10 ${subView === 'NOTES' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>Notes</button>
                            <button onClick={() => setSubView('JOURNAL')} className={`relative w-1/2 py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors z-10 ${subView === 'JOURNAL' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>Journal</button>
                        </div>
                    )}
                    {sectionControl !== 'VISIBLE' && <div className="flex-1" />}
                    <button onClick={() => setShowStats(true)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><BarChart3 size={16} /></button>
                </div>
                {subView === 'NOTES' && (
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32 animate-in slide-in-from-left-4 fade-in duration-500 px-1">
                        <div className="columns-2 gap-4 space-y-4">
                            <button onClick={createNote} className="w-full aspect-[4/5] rounded-[24px] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all group backdrop-blur-sm"><div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 shadow-lg"><Plus size={28} className="text-white/80" strokeWidth={1.5} /></div><span className="text-xs font-bold text-white/40 uppercase tracking-widest group-hover:text-white/80 transition-colors">New Note</span></button>
                            {notes.map((note) => {
                                const themeColor = NOTE_THEMES.find(t => t.id === note.theme)?.color || '#64748b';
                                const project = projects.find((p) => p.id === note.projectId);
                                return (
                                    <div key={note.id} onClick={() => openNote(note)} className="w-full break-inside-avoid mb-4 rounded-[24px] p-5 flex flex-col justify-between hover:scale-[1.02] active:scale-98 transition-all cursor-pointer group relative overflow-hidden shadow-lg border border-white/5 bg-black/20 backdrop-blur-md">
                                        <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none transition-opacity duration-500" style={{ background: `linear-gradient(to bottom, ${themeColor}, transparent)` }} />
                                        <div className="relative z-10">
                                            {project && <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"/><span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">{project.title}</span></div>}
                                            <h3 className={`text-[17px] font-bold leading-tight mb-3 line-clamp-2 ${!note.title ? 'text-white/30 italic' : 'text-white'}`}>{note.title || 'Untitled'}</h3>
                                            <p className="text-[13px] text-white/60 line-clamp-6 leading-relaxed font-medium break-words">{note.blocks.find(b => b.type === 'text')?.content || <span className="italic opacity-50">Empty...</span>}</p>
                                        </div>
                                        <div className="relative z-10 mt-4 flex justify-between items-center border-t border-white/5 pt-3"><span className="text-[10px] font-medium text-white/30">{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} /></div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
                {subView === 'JOURNAL' && (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-500">
                        <div className="flex justify-between items-end px-6 mb-6">
                            <div>
                                <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">{streak > 0 && <span className="text-orange-500 flex items-center gap-1 animate-pulse"><Plus size={12} fill="currentColor"/> {streak} Day Streak</span>}{!streak && "Your Story"}</span>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none">{currentMonth.toLocaleDateString('en-US', { month: 'long' })} <span className="text-white/20">{currentMonth.getFullYear()}</span></h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 mr-2">
                                    <button onClick={() => setJournalViewMode('CALENDAR')} className={`p-1.5 rounded-md transition-all ${journalViewMode === 'CALENDAR' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title="Calendar View"><Calendar size={14} /></button>
                                    <button onClick={() => setJournalViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${journalViewMode === 'LIST' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title="Notebook View"><AlignLeft size={14} /></button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronLeft size={18} /></button>
                                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                        
                        {journalViewMode === 'CALENDAR' ? (
                            <>
                                <div className="grid grid-cols-7 gap-2 px-4 text-center mb-2">{['S','M','T','W','T','F','S'].map((d, i) => <span key={i} className="text-[10px] font-bold text-white/30">{d}</span>)}</div>
                                <div className="grid grid-cols-7 gap-3 px-4 pb-32 flex-1 content-start animate-in fade-in duration-300">
                                    {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                                    {monthDays.map(day => {
                                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                        const dateStr = toLocalISOString(date);
                                        const entry = journalEntries.find((e) => e.date === dateStr);
                                        const mood = MOODS.find(m => m.id === entry?.mood);
                                        const isToday = toLocalISOString(new Date()) === dateStr;
                                        
                                        const today = new Date();
                                        today.setHours(0,0,0,0);
                                        const checkDate = new Date(date);
                                        checkDate.setHours(0,0,0,0);
                                        const isFuture = checkDate > today;

                                        return (
                                            <button 
                                                key={day} 
                                                onClick={() => !isFuture && openJournal(date)} 
                                                disabled={isFuture}
                                                className={`aspect-[4/5] rounded-[18px] flex flex-col items-center justify-between p-2 relative transition-all active:scale-90 group overflow-hidden border ${isToday ? 'bg-white/10 border-white/20 shadow-lg ring-1 ring-white/20' : 'bg-black/20 border-white/5'} ${!isFuture ? 'hover:bg-white/5 hover:border-white/10' : 'opacity-30 cursor-not-allowed'}`}
                                            >
                                                {mood && <div className="absolute inset-0 opacity-20 bg-gradient-to-b from-transparent to-current transition-opacity" style={{ color: mood.color }} />}
                                                <div className="flex-1 flex items-center justify-center z-10 w-full">
                                                    {mood ? (
                                                        <span className="text-2xl filter drop-shadow-lg group-hover:scale-125 transition-transform duration-300">{mood.icon}</span>
                                                    ) : isFuture ? (
                                                        <Lock size={16} className="text-white/20" />
                                                    ) : null}
                                                </div>
                                                <div className="w-full flex justify-end z-10 absolute bottom-2 right-2"><span className={`text-[12px] font-bold ${isToday ? 'text-white' : 'text-white/30 group-hover:text-white/80'}`}>{day}</span></div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32 animate-in slide-in-from-right-8 duration-300">
                                <div className="relative">
                                    {/* Notebook Binding Effect */}
                                    <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-red-500/10 z-0 hidden sm:block" />
                                    
                                    <div className="space-y-1">
                                        {monthDays.map(day => {
                                            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                            const dateStr = toLocalISOString(date);
                                            const entry = journalEntries.find((e) => e.date === dateStr);
                                            const title = entry ? getEntryTitle(entry.blocks) : '';
                                            const mood = entry ? MOODS.find(m => m.id === entry.mood) : null;
                                            const isToday = toLocalISOString(new Date()) === dateStr;
                                            const today = new Date();
                                            today.setHours(0,0,0,0);
                                            const checkDate = new Date(date);
                                            checkDate.setHours(0,0,0,0);
                                            const isFuture = checkDate > today;

                                            return (
                                                <div key={day} className="relative group">
                                                    <button 
                                                        onClick={() => !isFuture && openJournal(date)}
                                                        disabled={isFuture}
                                                        className={`w-full text-left py-3 px-2 sm:px-8 flex items-baseline gap-4 relative z-10
                                                            ${!isFuture ? 'hover:bg-white/5 active:scale-[0.995] transition-all' : 'opacity-30 cursor-not-allowed'}
                                                        `}
                                                    >
                                                        <span className={`text-xs font-mono font-bold w-6 text-right ${isToday ? 'text-white' : 'text-white/20'}`}>{day < 10 ? `0${day}` : day}</span>
                                                        <div className="flex-1 flex flex-col relative">
                                                            <div className="flex items-center justify-between gap-4 pb-1">
                                                                {entry ? (
                                                                    <span className={`text-xl font-serif italic tracking-wide ${isToday ? 'text-white font-medium' : 'text-white/80'}`}>{title || <span className="opacity-50">Untitled Entry</span>}</span>
                                                                ) : (
                                                                    <span className="text-base text-white/10 font-serif italic">Empty page...</span>
                                                                )}
                                                                {mood && <span className="text-lg filter drop-shadow-md opacity-80 group-hover:opacity-100 transition-opacity">{mood.icon}</span>}
                                                            </div>
                                                            {/* Wiggly underline for every line */}
                                                            <div className={`absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden transition-colors ${entry ? 'text-white/20 group-hover:text-white/30' : 'text-white/5'}`}>
                                                                <WigglyLine />
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <NotesStatsModal isOpen={showStats} onClose={() => setShowStats(false)} notes={notes} journalEntries={journalEntries} />
            <div className={`absolute inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${editorMode !== 'NONE' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[20px] pointer-events-none'}`}>
                {editorMode !== 'NONE' && (
                    <div className="w-full h-full max-w-2xl mx-auto flex flex-col p-4 sm:p-6">
                        <div className="glass-editor rounded-[36px] flex-1 flex flex-col relative animate-in fade-in zoom-in-95 duration-500 delay-100 shadow-2xl">
                             <div className="absolute inset-0 rounded-[36px] overflow-hidden pointer-events-none">
                                <div className="absolute top-0 left-0 right-0 h-64 opacity-15 pointer-events-none blur-lg transition-colors duration-1000" style={{ background: `radial-gradient(circle at 50% 0%, ${activeThemeColor}, transparent 70%)` }} />
                             </div>
                            
                            <div className="flex justify-between items-center p-6 border-b border-white/5 relative z-20">
                                <button onClick={closeEditor} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95 border border-white/5"><ArrowLeft size={20} /></button>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <BlueprintSelector onSelect={setDraftBlocks} />
                                        <button onClick={() => setShowSaveBlueprintModal(true)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Save as Blueprint"><Save size={18} /></button>
                                        <DropdownThemePicker currentTheme={draftTheme} onSelect={setDraftTheme} projects={editorMode === 'NOTE' ? projects : null} activeProject={draftProjectId} onSelectProject={setDraftProjectId} />
                                    </div>
                                    <div className="w-[1px] h-6 bg-white/10" />
                                    {editorMode === 'NOTE' && <button onClick={handleDelete} className="w-10 h-10 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 size={18} /></button>}
                                    <button onClick={handleSave} className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">{t('notes.save')}</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 relative rounded-b-[36px]">
                                {editorMode === 'NOTE' ? (
                                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="relative mb-6">
                                            {draftProjectId && (<div className="inline-flex items-center gap-1 mb-3 px-2 py-0.5 rounded-md bg-white/5 border border-white/5"><Briefcase size={10} className="text-slate-400"/><span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{projects.find((p) => p.id === draftProjectId)?.title}</span></div>)}
                                            <input type="text" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder={t('notes.untitledPlaceholder')} className="w-full bg-transparent text-4xl font-black text-white placeholder:text-white/10 outline-none leading-tight tracking-tight" />
                                        </div>
                                        <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
                                    </div>
                                ) : (
                                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="text-center mb-8 relative z-10">
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">{draftDate.toLocaleDateString(i18n.language, { weekday: 'long' })}</span>
                                            <h2 className="text-5xl font-black text-white mt-1 tracking-tighter leading-none mb-4">{draftDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })}</h2>
                                            <div className="inline-flex justify-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                                                {MOODS.map(m => ( <button key={m.id} onClick={() => { setDraftMood(m.id); setMoodSplash(m.id); }} className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all ${draftMood === m.id ? 'bg-white/10 scale-110 shadow-lg ring-1 ring-white/20' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}>{m.icon}</button> ))}
                                            </div>
                                        </div>
                                        <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
                                    </div>
                                )}
                            </div>
                            <EditorToolbar onAdd={addBlock} />
                        </div>
                    </div>
                )}
            </div>
            <SaveBlueprintModal isOpen={showSaveBlueprintModal} onClose={() => setShowSaveBlueprintModal(false)} currentBlocks={draftBlocks} />
            
            {/* Mood Splash Animation */}
            {moodSplash && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                     <span 
                        className="text-[200px] select-none"
                        style={{
                            animation: 'mood-splash 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                        }}
                        onAnimationEnd={() => setMoodSplash(null)}
                     >
                        {MOODS.find(m => m.id === moodSplash)?.icon}
                     </span>
                     <style>
                        {`
                            @keyframes mood-splash {
                                0% { opacity: 0; transform: scale(0.5) translateY(20px); }
                                40% { opacity: 0.6; transform: scale(1.2); }
                                100% { opacity: 0; transform: scale(1.5); }
                            }
                        `}
                     </style>
                </div>
            )}
        </div>
    );
});
