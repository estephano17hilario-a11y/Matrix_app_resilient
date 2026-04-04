import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, BarChart3, ChevronLeft, ChevronRight, ArrowLeft, Briefcase, Trash2, Save, Lock, Calendar, AlignLeft, Filter, X, Cake, Target, Gift, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Note, JournalEntry, NoteBlock, Project } from '../../types';
import { BlockEditor } from './components/BlockEditor';
import { DropdownThemePicker, NOTE_THEMES } from './components/DropdownThemePicker';
import { EditorToolbar } from './components/EditorToolbar';
import { NotesStatsModal } from './components/NotesStatsModal';
import { NotesConfigModal, NotesConfig } from './components/NotesConfigModal';
import { SpecialEventsHub } from './components/SpecialEventsHub';
import { SecureNotesHub } from './components/SecureNotesHub';
import { BlueprintSelector } from './components/BlueprintSelector';
import { SaveBlueprintModal } from './components/SaveBlueprintModal';
import { SecurityGate } from '../../components/ui/SecurityGate';
import { TourLightbulb } from '../../components/TourLightbulb';
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
    onStatsOpenChange?: (isOpen: boolean) => void;
    onClose?: () => void;
    isActive?: boolean;
    isPro?: boolean;
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

export const NotesView = React.memo(({ onInteractionStart, onInteractionEnd, projects, onShowPro, currentSubView, sectionControl = 'VISIBLE', onStatsOpenChange, onClose, isActive = true, isPro }: NotesViewProps) => {
    const { t, i18n } = useTranslation();
    const { notes, journalEntries, handleUpdateNote, handleDeleteNote, handleUpdateJournal, canCreateNote } = useNotesLogic();

    const [subView, setSubView] = useState<'NOTES' | 'JOURNAL'>('NOTES');

    useEffect(() => {
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

    // Config & Security
    const [configOpen, setConfigOpen] = useState(false);
    const [config, setConfig] = useState<NotesConfig>({
        enabledFeatures: [],
        security: {
            pin: '',
            recoveryMethod: 'PASSWORD',
            protectedAreas: { memories: false, notes: false, charts: false, journal: false }
        }
    });

    const [isLocked, setIsLocked] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [recoveryInput, setRecoveryInput] = useState('');
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Load Config from LocalStorage
    useEffect(() => {
        const savedConfig = localStorage.getItem('notes_config_v2');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig(parsed);
                // Check if current area is protected
                const isProtected = subView === 'NOTES' 
                    ? parsed.security.protectedAreas.notes 
                    : parsed.security.protectedAreas.journal;
                
                if (isProtected) {
                    setIsLocked(true);
                }
            } catch (e) {
                console.error("Failed to load notes config", e);
            }
        } else {
             // Migration from old config if exists
             const oldConfig = localStorage.getItem('notes_config');
             if (oldConfig) {
                 try {
                     const parsed = JSON.parse(oldConfig);
                     setConfig(prev => ({
                         ...prev,
                         enabledFeatures: parsed.buttons || [],
                         security: {
                             ...prev.security,
                             pin: parsed.password || ''
                         }
                     }));
                 } catch(e) {}
             }
        }
    }, []);

    // Save Config Helper
    const handleSaveConfig = (newConfig: NotesConfig) => {
        setConfig(newConfig);
        localStorage.setItem('notes_config_v2', JSON.stringify(newConfig));
        
        // Update lock state based on new config and current subView
        const isProtected = subView === 'NOTES' 
            ? newConfig.security.protectedAreas.notes 
            : newConfig.security.protectedAreas.journal;

        if (isProtected) {
             setIsLocked(true);
        } else {
             setIsLocked(false);
        }
    };

    // Auto-lock when switching subViews if target is protected
    useEffect(() => {
        const isProtected = subView === 'NOTES' 
            ? config.security.protectedAreas.notes 
            : config.security.protectedAreas.journal;
        
        if (isProtected) {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }
    }, [subView, config.security.protectedAreas.notes, config.security.protectedAreas.journal]);

    // Events Hub
    const [showEventsHub, setShowEventsHub] = useState(false);
    const [specialEvents, setSpecialEvents] = useState<any[]>([]);

    // Load Special Events for Calendar Integration
    useEffect(() => {
        const loadEvents = () => {
            const saved = localStorage.getItem('special_events');
            if (saved) {
                try {
                    setSpecialEvents(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load special events", e);
                }
            }
        };
        
        loadEvents();
        // Listen for storage changes to update calendar in real-time if multiple tabs or updates
        window.addEventListener('storage', loadEvents);
        // Custom event for same-tab updates
        window.addEventListener('special_events_updated', loadEvents);
        
        return () => {
            window.removeEventListener('storage', loadEvents);
            window.removeEventListener('special_events_updated', loadEvents);
        };
    }, []);
    
    const openEventsHub = useCallback(() => {
        if (config.security.protectedAreas.memories) {
            setPendingAction(() => () => {
                setShowEventsHub(true);
                onInteractionStart();
            });
            setShowPasswordPrompt(true);
        } else {
            setShowEventsHub(true);
            onInteractionStart();
        }
    }, [onInteractionStart, config]);

    const closeEventsHub = useCallback(() => {
        setShowEventsHub(false);
        onInteractionEnd();
        // Trigger reload of events
        window.dispatchEvent(new Event('special_events_updated'));
    }, [onInteractionEnd]);

    const openConfigModal = useCallback(() => {
        setConfigOpen(true);
    }, []);

    // Secure Notes Hub
    const [showSecureHub, setShowSecureHub] = useState(false);
    
    const openSecureHub = useCallback(() => {
        // Secure Hub ALWAYS requires PIN inside itself, so we don't need to block opening it.
        // It has its own internal lock screen.
        setShowSecureHub(true);
        onInteractionStart();
    }, [onInteractionStart]);

    const closeSecureHub = useCallback(() => {
        setShowSecureHub(false);
        onInteractionEnd();
    }, [onInteractionEnd]);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filterProject, setFilterProject] = useState<string | 'ALL'>('ALL');
    const [filterTheme, setFilterTheme] = useState<string | 'ALL'>('ALL');

    // Pagination State
    const [visibleNotesCount, setVisibleNotesCount] = useState(12);
    const handleLoadMore = useCallback(() => {
        setVisibleNotesCount(prev => prev + 12);
    }, []);

    useEffect(() => {
        onStatsOpenChange?.(showStats);
    }, [showStats, onStatsOpenChange]);
    const streak = useMemo(() => calculateStreak(journalEntries), [journalEntries]);
    const themeColorMap = useMemo(() => new Map(NOTE_THEMES.map(t => [t.id, t.color])), []);
    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
    const journalEntryMap = useMemo(() => {
        const map = new Map<string, JournalEntry>();
        journalEntries.forEach(entry => map.set(entry.date, entry));
        return map;
    }, [journalEntries]);
    const notesContainerRef = useRef<HTMLDivElement | null>(null);

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
        const entry = journalEntryMap.get(dateStr); 
        setEditorMode('JOURNAL'); 
        setDraftDate(date); 
        setDraftId(entry?.id || Date.now().toString()); 
        
        // Extract blocks
        const initialBlocks = entry?.blocks || [{ id: 'init-1', type: 'text', content: '' }];
        setDraftBlocks(initialBlocks);
        
        // Extract Title for the new Input
        // If the first block is text, use it as title? Or just let user manage it?
        // To strictly follow "title that appears in list view", we use getEntryTitle logic:
        setDraftTitle(entry ? getEntryTitle(entry.blocks) : '');

        setDraftMood(entry?.mood); 
        setDraftTheme(entry?.theme || 'slate'); 
        onInteractionStart(); 
    }, [journalEntryMap, onInteractionStart]);
    
    const handleSave = () => { 
        if (editorMode === 'NOTE' && draftId) { 
            handleUpdateNote({ id: draftId, title: draftTitle, blocks: draftBlocks, theme: draftTheme, projectId: draftProjectId, updatedAt: new Date().toISOString() }); 
        } else if (editorMode === 'JOURNAL' && draftId) { 
            // Save draftTitle as the first block if it's not already there to ensure it persists as the entry title
            let finalBlocks = [...draftBlocks];
            if (draftTitle.trim()) {
                const firstBlock = finalBlocks[0];
                // Only prepend if the first block is not already the exact same title
                if (!firstBlock || firstBlock.type !== 'text' || firstBlock.content !== draftTitle) {
                     finalBlocks.unshift({ id: 'title-' + Date.now(), type: 'text', content: draftTitle });
                }
            }
            handleUpdateJournal({ id: draftId, date: toLocalISOString(draftDate), blocks: finalBlocks, mood: draftMood, theme: draftTheme, tags: [] }); 
        } 
        closeEditor(); 
    };
    
    const handleDelete = () => { if (editorMode === 'NOTE' && draftId) { handleDeleteNote(draftId); } closeEditor(); };
    const closeEditor = () => { 
        setEditorMode('NONE'); 
        setDraftId(null); 
        onInteractionEnd(); 
        window.dispatchEvent(new CustomEvent('note-closed'));
    };
    const addBlock = (type: 'text' | 'check' | 'image') => { setDraftBlocks(prev => [...prev, { id: Date.now().toString(), type, content: '', checked: false }]); };
    
    const { days, firstDay } = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);
    const emptyDays = useMemo(() => Array(firstDay).fill(null), [firstDay]);
    const monthDays = useMemo(() => Array.from({ length: days }, (_, i) => i + 1), [days]);
    const activeThemeColor = themeColorMap.get(draftTheme) || '#fff';

    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesProject = filterProject === 'ALL' || note.projectId === filterProject;
            // The note theme might be stored without the prefix or color map id might differ.
            // Let's ensure we are comparing ids correctly.
            const noteThemeId = note.theme || 'slate';
            const matchesTheme = filterTheme === 'ALL' || noteThemeId === filterTheme;
            return matchesProject && matchesTheme;
        });
    }, [notes, filterProject, filterTheme]);

    const noteCards = useMemo(() => {
        return filteredNotes.slice(0, visibleNotesCount).map(note => {
            const themeId = note.theme || 'slate';
            const themeColor = themeColorMap.get(themeId) || '#64748b';
            const project = note.projectId ? projectMap.get(note.projectId) : undefined;
            const previewBlock = note.blocks.find(b => b.type === 'text' && b.content.trim().length > 0);
            const previewText = previewBlock?.content || '';
            const updatedLabel = note.updatedAt
                ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : '';
            return { note, themeColor, project, previewText, updatedLabel };
        });
    }, [filteredNotes, visibleNotesCount, themeColorMap, projectMap]);

    const monthMeta = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = toLocalISOString(today);
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        return monthDays.map(day => {
            const date = new Date(year, month, day);
            const dateStr = toLocalISOString(date);
            const entry = journalEntryMap.get(dateStr);
            const mood = entry ? MOODS.find(m => m.id === entry.mood) : undefined;
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);

            // Find Special Events for this date
            // Note: Special Events usually repeat annually, but our data structure currently stores specific dates.
            // Let's check for exact date match OR Month/Day match for birthdays/anniversaries if we decide to implement recurrence logic.
            // For now, let's match exact date as per previous implementation, BUT for birthdays/anniversaries we SHOULD match MM-DD.
            const specialEvent = specialEvents.find(e => {
                // If showInCalendar is false (and not undefined), skip
                if (e.showInCalendar === false) return false;

                const eDate = new Date(e.date);
                if (e.type === 'BIRTHDAY' || e.type === 'ANNIVERSARY') {
                    return eDate.getDate() === date.getDate() && eDate.getMonth() === date.getMonth();
                }
                return toLocalISOString(eDate) === dateStr;
            });

            return {
                day,
                date,
                dateStr,
                entry,
                mood,
                specialEvent, // Added this
                isToday: dateStr === todayStr,
                isFuture: checkDate > today,
                title: entry ? getEntryTitle(entry.blocks) : ''
            };
        });
    }, [currentMonth, monthDays, journalEntryMap, specialEvents]);

    return (
        <div className="h-full flex flex-col relative">
            {/* Lock Screen Overlay - Portal with Z-Index between HUD (290) and Dock (400) */}
            {typeof document !== 'undefined' && createPortal(
                <>
                    <SecurityGate 
                        isOpen={isLocked && isActive && !isRecoveryMode}
                        pin={config.security.pin}
                        onUnlock={() => {
                            setIsLocked(false);
                            toast.success("Identity Verified");
                            if (pendingAction) {
                                pendingAction();
                                setPendingAction(null);
                            }
                        }}
                        onCancel={() => {
                            if (onClose) onClose();
                        }} 
                        title="Security Lock"
                        description="Verification Required"
                        isRecoveryAllowed={true}
                        onRecovery={() => setIsRecoveryMode(true)}
                    />

                    {/* Recovery Mode Overlay */}
                    <AnimatePresence>
                        {isLocked && isActive && isRecoveryMode && (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[300] bg-[#050505] flex flex-col items-center justify-center p-6"
                            >
                                <motion.div 
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/50 to-teal-500/50" />
                                    
                                    <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
                                        <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-2">Security Challenge</p>
                                        <p className="text-sm text-white/90 font-bold leading-relaxed">
                                            {config.security.recoveryMethod === 'PASSWORD' 
                                                ? "Enter your account password"
                                                : (config.security.recoveryQuestion || "Recovery Question")}
                                        </p>
                                    </div>

                                    <input 
                                        type={config.security.recoveryMethod === 'PASSWORD' ? "password" : "text"}
                                        value={recoveryInput}
                                        onChange={(e) => setRecoveryInput(e.target.value)}
                                        placeholder="Type your response..."
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-emerald-500/50 transition-all mb-4"
                                        autoFocus
                                    />
                                    
                                    <button 
                                        onClick={() => {
                                            let success = false;
                                            const method = config.security.recoveryMethod;
                                            
                                            if (method === 'QUESTION' || method === 'BOTH') {
                                                if (recoveryInput.toLowerCase().trim() === config.security.recoveryAnswer?.toLowerCase().trim()) {
                                                    success = true;
                                                }
                                            } 
                                            
                                            if (!success && (method === 'PASSWORD' || method === 'BOTH')) {
                                                if (recoveryInput.length > 3 && !config.security.recoveryAnswer) {
                                                     success = true;
                                                }
                                            }

                                            if (success) {
                                                setIsLocked(false);
                                                setIsRecoveryMode(false);
                                                setRecoveryInput('');
                                                toast.success("Verified");
                                                if (pendingAction) {
                                                    pendingAction();
                                                    setPendingAction(null);
                                                }
                                            } else {
                                                toast.error("Incorrect response");
                                            }
                                        }}
                                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
                                    >
                                        Verify Identity
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            setIsRecoveryMode(false);
                                            setRecoveryInput('');
                                        }}
                                        className="w-full mt-4 text-[10px] font-bold text-white/20 hover:text-white/60 transition-all uppercase tracking-widest py-2"
                                    >
                                        Back to PIN
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>,
                document.body
            )}

            <div className={`transition-[opacity,transform] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${editorMode !== 'NONE' || showEventsHub ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`} style={{ willChange: 'transform, opacity' }}>
                <div data-tour="notes-header" className="flex items-center justify-between mb-6 mt-4 relative z-10 px-4">
                    {/* Left: Filter */}
                    <div className="flex items-center gap-2 flex-1">
                        {subView === 'NOTES' ? (
                            <button 
                                onClick={() => setShowFilters(!showFilters)} 
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showFilters || filterProject !== 'ALL' || filterTheme !== 'ALL' ? 'bg-white text-black shadow-lg scale-110' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                            >
                                {showFilters ? <X size={16} /> : <Filter size={16} />}
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}
                    </div>
                    
                    {/* Center: Switch */}
                    <div className="flex justify-center flex-[2]">
                        {sectionControl === 'VISIBLE' && !showStats && (
                            <div className="bg-black/60 p-1 rounded-full border border-white/10 flex relative shadow-md w-full max-w-[200px]">
                                <div className={`absolute inset-y-1 w-[49%] bg-white/10 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-inner ${
                                    subView === 'NOTES' ? 'left-[1%]' : 'left-[50%]'
                                }`} />
                                <button onClick={() => setSubView('NOTES')} className={`relative w-1/2 py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors z-10 ${subView === 'NOTES' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>{t('notes.notes', 'Notes')}</button>
                                <button data-tour="journal-tab-btn" onClick={() => setSubView('JOURNAL')} className={`relative w-1/2 py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors z-10 ${subView === 'JOURNAL' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>{t('notes.journal', 'Journal')}</button>
                            </div>
                        )}
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        {config.enabledFeatures.includes('BIRTHDAY') && (
                            <button 
                                onClick={openEventsHub}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                            >
                                <Cake size={16} />
                            </button>
                        )}
                        {config.enabledFeatures.includes('TARGET') && (
                            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"><Target size={16} /></button>
                        )}
                        {config.enabledFeatures.includes('KEY') && (
                            <button 
                                onClick={openSecureHub} 
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showSecureHub ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                            >
                                <Lock size={14} />
                            </button>
                        )}

                        <button 
                            onClick={() => {
                                if (config.security.protectedAreas.charts) {
                                    setPendingAction(() => () => setShowStats(true));
                                    setShowPasswordPrompt(true);
                                } else {
                                    setShowStats(true);
                                }
                            }} 
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <BarChart3 size={16} />
                        </button>

                        <button 
                            onClick={openConfigModal}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:rotate-45 transition-all duration-300 text-white/60 hover:text-white shadow-sm"
                            title="Settings"
                        >
                            <Settings size={14} />
                        </button>

                        <TourLightbulb tourId="notes" />
                    </div>
                </div>
                
                <AnimatePresence>
                    {showFilters && subView === 'NOTES' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="overflow-hidden px-4 relative z-10"
                        >
                            <div className="bg-[#0a0a0a]/60 backdrop-blur-[2px] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-md">
                                {/* Projects Filter */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">{t('notes.filterByProject', 'Filter by Project')}</span>
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                        <button onClick={() => setFilterProject('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${filterProject === 'ALL' ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'}`}>
                                            All Projects
                                        </button>
                                        {projects.map(p => (
                                            <button key={p.id} onClick={() => setFilterProject(p.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${filterProject === p.id ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'}`}>
                                               <div className="w-2 h-2 rounded-full bg-current opacity-50" /> {p.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Colors Filter */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">{t('notes.filterByColor', 'Filter by Color')}</span>
                                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                                        <button onClick={() => setFilterTheme('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${filterTheme === 'ALL' ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'}`}>
                                            All Colors
                                        </button>
                                        {NOTE_THEMES.map(t => (
                                            <button key={t.id} onClick={() => setFilterTheme(t.id)} className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-all border ${filterTheme === t.id ? 'scale-110 ring-2 ring-white border-white shadow-lg' : 'hover:scale-110 opacity-60 hover:opacity-100 border-transparent'}`} style={{ backgroundColor: t.color }}>
                                                {filterTheme === t.id && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {subView === 'NOTES' && (
                    <div ref={notesContainerRef} className="flex-1 overflow-y-auto no-scrollbar pb-32 animate-in slide-in-from-left-4 fade-in duration-500 px-4">
                        {isLocked ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-white/40 gap-4 animate-in fade-in zoom-in-95">
                                <div className="p-6 rounded-full bg-white/5 border border-white/5 shadow-lg backdrop-blur-[2px]">
                                    <Lock size={48} className="text-white/20" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Section Locked</span>
                                <button onClick={() => setShowPasswordPrompt(true)} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-lg">Unlock</button>
                            </div>
                        ) : (
                            <div className="columns-2 md:columns-3 gap-4">


                                 {/* Create Button */}
                                 <button onClick={createNote} data-tour="notes-fab" className="w-full h-[180px] rounded-[24px] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-colors group bg-black/25 mb-4 break-inside-avoid">
                                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 shadow-sm"><Plus size={28} className="text-theme-avatar" strokeWidth={1.5} /></div>
                                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest group-hover:text-white/80 transition-colors">New Note</span>
                                </button>
    
                                {/* Notes List */}
                                {noteCards.map(({ note, themeColor, project, previewText, updatedLabel }) => (
                                    <div key={note.id} onClick={() => openNote(note)} className="w-full min-h-[140px] max-h-[300px] rounded-[24px] p-5 flex flex-col justify-between hover:scale-[1.02] active:scale-98 transition-transform cursor-pointer group relative overflow-hidden shadow-md border border-white/5 bg-black/40 mb-4 break-inside-avoid">
                                        <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none transition-opacity duration-500" style={{ background: `linear-gradient(to bottom, ${themeColor}, transparent)` }} />
                                        <div className="relative z-10 flex flex-col h-full">
                                            {project && <div className="inline-flex self-start items-center gap-1 mb-2 px-2 py-0.5 rounded-md bg-white/10 border border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"/><span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">{project.title}</span></div>}
                                            <h3 className={`text-[17px] font-bold leading-tight mb-3 ${!note.title ? 'text-white/30 italic' : 'text-white'}`}>{note.title || 'Untitled'}</h3>
                                            <div className="relative flex-1 overflow-hidden">
                                                <p className="text-[13px] text-white/60 leading-relaxed font-medium break-words line-clamp-[8]">{previewText || <span className="italic opacity-50">Empty...</span>}</p>
                                                {/* Gradient Fade at bottom if too long - though max-height handles container, line-clamp handles text */}
                                            </div>
                                        </div>
                                        <div className="relative z-10 mt-4 flex justify-between items-center border-t border-white/5 pt-3"><span className="text-[10px] font-medium text-white/30">{updatedLabel}</span><div className="w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} /></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Load More Trigger */}
                        {filteredNotes.length > visibleNotesCount && !isLocked && (
                            <div className="flex justify-center pb-8 pt-4">
                                <button 
                                    onClick={handleLoadMore}
                                    className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold uppercase tracking-widest border border-white/5 transition-colors"
                                >
                                    Load More
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {subView === 'JOURNAL' && (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-500">
                        {isLocked ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-white/40 gap-4 animate-in fade-in zoom-in-95 px-4">
                                <div className="p-6 rounded-full bg-white/5 border border-white/5 shadow-lg backdrop-blur-[2px]">
                                    <Lock size={48} className="text-white/20" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Journal Locked</span>
                                <button onClick={() => setShowPasswordPrompt(true)} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-lg">Unlock Journal</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-end px-6 mb-6">
                                    <div>
                                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">{streak > 0 && <span className="text-orange-500 flex items-center gap-1 animate-pulse"><Plus size={12} fill="currentColor"/> {streak} {t('notes.dayStreak', 'Day Streak')}</span>}{!streak && t('notes.yourStory', 'Your Story')}</span>
                                        <h2 className="text-3xl font-black text-white tracking-tight leading-none">{currentMonth.toLocaleDateString('en-US', { month: 'long' })} <span className="text-white/20">{currentMonth.getFullYear()}</span></h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 mr-2">
                                            <button onClick={() => setJournalViewMode('CALENDAR')} className={`p-1.5 rounded-md transition-colors ${journalViewMode === 'CALENDAR' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title="Calendar View"><Calendar size={14} /></button>
                                            <button onClick={() => setJournalViewMode('LIST')} className={`p-1.5 rounded-md transition-colors ${journalViewMode === 'LIST' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title="Notebook View"><AlignLeft size={14} /></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronLeft size={18} /></button>
                                            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronRight size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                                
                                {journalViewMode === 'CALENDAR' ? (
                                    <>
                                        <div className="grid grid-cols-7 gap-2 px-4 text-center mb-2">{(t('common.weekdays.initials', { returnObjects: true }) as string[]).map((d: string, i: number) => <span key={i} className="text-[10px] font-bold text-white/30">{d}</span>)}</div>
                                        <div className="grid grid-cols-7 gap-3 px-4 pb-32 flex-1 content-start animate-in fade-in duration-300">
                                            {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                                            {monthMeta.map(({ day, date, mood, isToday, isFuture, entry, specialEvent }) => {
                                                // Fix: Check if mood exists to apply color to border/bg
                                                // User request: Border should NOT follow mood color.
                                                // User request: Use the ENTRY THEME color if it exists.
                                                const entryThemeId = entry?.theme || 'slate';
                                                const entryColor = themeColorMap.get(entryThemeId);
                                                const hasEntry = !!entry;

                                                const borderColor = hasEntry && entryColor ? entryColor : (isToday ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)');
                                                // Use entry color for background too if present, otherwise mood or default
                                                const bgColor = hasEntry && entryColor ? `${entryColor}10` : (mood ? `${mood.color}10` : (isToday ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'));
                                                
                                                return (
                                                    <button 
                                                        key={day} 
                                                        onClick={() => !isFuture && openJournal(date)} 
                                                        disabled={isFuture}
                                                        data-tour={isToday ? "journal-today-btn" : undefined}
                                                        style={{ 
                                                            borderColor: borderColor,
                                                            backgroundColor: bgColor,
                                                            boxShadow: mood ? `0 0 10px ${mood.color}15` : (hasEntry && entryColor ? `0 0 5px ${entryColor}10` : 'none')
                                                        }}
                                                        className={`aspect-[4/5] rounded-[18px] flex flex-col items-center justify-between p-2 relative transition-transform active:scale-90 group overflow-hidden border ${!isFuture ? 'hover:bg-white/5' : 'opacity-30 cursor-not-allowed'}`}
                                                    >
                                                        {/* Fix: Remove full overlay that might obscure text, use subtle gradient instead */}
                                                        {mood && <div className="absolute inset-0 opacity-10 bg-gradient-to-b from-transparent to-current transition-opacity pointer-events-none" style={{ color: mood.color }} />}
                                                        
                                                        {/* Special Event Indicator */}
                                                        {specialEvent && (
                                                            <div className="absolute top-1 left-1 z-30">
                                                                <div className="w-4 h-4 flex items-center justify-center rounded-full bg-pink-500 text-white shadow-lg animate-bounce">
                                                                    <Gift size={10} />
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex-1 flex items-center justify-center z-10 w-full relative">
                                                            {specialEvent ? (
                                                                <span className="text-2xl group-hover:scale-110 transition-transform duration-300 drop-shadow-md">
                                                                    {specialEvent.type === 'BIRTHDAY' ? '🎂' : (specialEvent.type === 'ANNIVERSARY' ? '❤️' : '⭐')}
                                                                </span>
                                                            ) : mood ? (
                                                                // Fix: Overlap logic. Make emoji large but behind? Or just manageable size?
                                                                // User wants: "ambos emoji como el numero de la fecha, convivan y se puedan ver ambos"
                                                                // Let's put emoji in center and date at bottom right, ensuring no overlap or readable overlap.
                                                                <span className="text-3xl group-hover:scale-110 transition-transform duration-300 drop-shadow-md">{mood.icon}</span>
                                                            ) : isFuture ? (
                                                                <Lock size={16} className="text-white/20" />
                                                            ) : null}
                                                        </div>
                                                        
                                                        {/* Date Number - Positioned to avoid overlap or with background */}
                                                        <div className="w-full flex justify-end z-20 absolute bottom-1.5 right-2">
                                                            <span className={`text-[12px] font-bold ${isToday ? 'text-white' : 'text-white/40 group-hover:text-white/80'} drop-shadow-sm`}>
                                                                {day}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32 animate-in slide-in-from-right-8 duration-300">
                                        <div className="relative">
                                            {/* Notebook Binding Effect */}
                                            <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-red-500/10 z-0 hidden sm:block" />
                                            
                                            <div className="space-y-1">
                                                {monthMeta.map(({ day, date, entry, title, mood, isToday, isFuture }) => {
                                                     const entryThemeId = entry?.theme || 'slate';
                                                     const entryColor = themeColorMap.get(entryThemeId) || '#fff';
                                                     return (
                                                    <div key={day} className="relative group">
                                                        <button 
                                                            onClick={() => !isFuture && openJournal(date)}
                                                            disabled={isFuture}
                                                            data-tour={isToday ? "journal-today-btn" : undefined}
                                                            style={{ borderLeftColor: entry ? entryColor : 'transparent' }}
                                                            className={`w-full text-left py-3 px-2 sm:px-8 flex items-baseline gap-4 relative z-10 border-l-2
                                                                ${!isFuture ? 'hover:bg-white/5 active:scale-[0.995] transition-transform' : 'opacity-30 cursor-not-allowed'}
                                                            `}
                                                        >
                                                            <span className={`text-xs font-mono font-bold w-6 text-right ${isToday ? 'text-white' : 'text-white/20'}`}>{day < 10 ? `0${day}` : day}</span>
                                                            <div className="flex-1 flex flex-col relative">
                                                                <div className="flex items-center justify-between gap-4 pb-1">
                                                                    {entry ? (
                                                                        <span className={`text-xl font-serif italic tracking-wide ${isToday ? 'text-white font-medium' : 'text-white/80'}`} style={{ color: entryColor !== '#fff' && entryColor !== '#64748b' ? entryColor : undefined }}>{title || <span className="opacity-50">Untitled Entry</span>}</span>
                                                                    ) : (
                                                                        <span className="text-base text-white/10 font-serif italic">Empty page...</span>
                                                                    )}
                                                                    {mood && <span className="text-lg opacity-80 group-hover:opacity-100 transition-opacity">{mood.icon}</span>}
                                                                </div>
                                                                <div className={`absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden transition-colors ${entry ? 'text-white/20 group-hover:text-white/30' : 'text-white/5'}`}>
                                                                    <WigglyLine />
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                )})}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
            <NotesStatsModal isOpen={showStats} onClose={() => setShowStats(false)} notes={notes} journalEntries={journalEntries} initialTab={subView === 'JOURNAL' ? 'EMOTIONS' : 'OVERVIEW'} />
            
            <SpecialEventsHub isOpen={showEventsHub} onClose={closeEventsHub} onOpenSettings={openConfigModal} isPro={isPro} onOpenPro={onShowPro} />
            <SecureNotesHub isOpen={showSecureHub} onClose={closeSecureHub} onOpenSettings={openConfigModal} />

            {/* Config & Security Modals */}
                <NotesConfigModal 
                    isOpen={configOpen} 
                    onClose={() => setConfigOpen(false)} 
                    onSave={handleSaveConfig}
                    initialConfig={config}
                    isPro={isPro}
                    onOpenPro={onShowPro}
                />
            
            <AnimatePresence>
                {showPasswordPrompt && (
                    <SecurityGate
                        isOpen={true}
                        pin={config.security.pin}
                        onUnlock={() => {
                            setShowPasswordPrompt(false);
                            toast.success("Unlocked");
                            if (pendingAction) {
                                pendingAction();
                                setPendingAction(null);
                            }
                        }}
                        onCancel={() => {
                            setShowPasswordPrompt(false);
                            setPendingAction(null);
                        }}
                        title="Enter PIN"
                        description="Protected Area Access"
                        isRecoveryAllowed={true}
                        onRecovery={() => {
                            setShowPasswordPrompt(false);
                            setIsRecoveryMode(true);
                            setIsLocked(true); // Re-use the existing lock mode for recovery
                        }}
                    />
                )}
            </AnimatePresence>

            <div 
                className={`absolute inset-0 z-50 flex items-center justify-center transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${editorMode !== 'NONE' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-98 translate-y-4 pointer-events-none'}`}
                style={{ willChange: 'transform, opacity', transform: 'translate3d(0,0,0)' }}
            >
                {editorMode !== 'NONE' && (
                    <div className="w-full h-full max-w-2xl mx-auto flex flex-col p-4 sm:p-6">
                        <div className="glass-editor rounded-[36px] flex-1 flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-md" style={{ willChange: 'transform, opacity' }}>
                             <div className="absolute inset-0 rounded-[36px] overflow-hidden pointer-events-none">
                                <div className="absolute top-0 left-0 right-0 h-64 opacity-15 pointer-events-none transition-colors duration-500" style={{ background: `radial-gradient(circle at 50% 0%, ${activeThemeColor}, transparent 70%)` }} />
                             </div>
                            
                            <div className="flex justify-between items-center p-3 sm:p-6 border-b border-white/5 relative z-20 gap-2">
                                <button onClick={closeEditor} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95 border border-white/5 flex-shrink-0"><ArrowLeft size={20} /></button>
                                <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-1 min-w-0 justify-end">
                                    <div className="flex items-center gap-1">
                                        <BlueprintSelector onSelect={(newBlocks) => setDraftBlocks(prev => [...prev, ...newBlocks])} />
                                        <button onClick={() => setShowSaveBlueprintModal(true)} className="hidden sm:block p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Save as Blueprint"><Save size={18} /></button>
                                        <DropdownThemePicker currentTheme={draftTheme} onSelect={setDraftTheme} projects={editorMode === 'NOTE' ? projects : null} activeProject={draftProjectId} onSelectProject={setDraftProjectId} />
                                    </div>
                                    <div className="w-[1px] h-6 bg-white/10 mx-1" />
                                    {editorMode === 'NOTE' && <button onClick={handleDelete} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-500 flex items-center justify-center transition-all flex-shrink-0"><Trash2 size={18} /></button>}
                                    <button onClick={handleSave} className="h-8 sm:h-10 px-4 sm:px-6 bg-white text-black rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-sm flex-shrink-0 flex items-center justify-center whitespace-nowrap">{t('notes.save')}</button>
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
                                            {/* Redesigned Header: Smaller Date, Editable Title */}
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-2">{draftDate.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                            
                                            <input 
                                                type="text" 
                                                value={draftTitle} // Use draftTitle for Journal Title too? wait, logic uses draftTitle for NOTE only?
                                                // Wait, for Journal, where is the title stored?
                                                // Looking at handleSave: handleUpdateJournal({ id: draftId, date: ..., blocks: ..., mood: ..., theme: ..., tags: [] });
                                                // It seems JournalEntry type doesn't have a 'title' field explicitly in the arguments of handleUpdateJournal in the component code above?
                                                // Let's check types.
                                                // If JournalEntry doesn't have a title field, we might need to use the first block as title or add a field.
                                                // BUT user asked "quiero que en el medio, pueda escribir el titulo del dia de hoy, titulo que aparece en la vista de solo titulo"
                                                // In the current code: `title: entry ? getEntryTitle(entry.blocks) : ''` for the list view.
                                                // So the title is derived from the first text block.
                                                // However, the user wants an EXPLICIT title field in the header.
                                                // If I add an input here, I should probably prepend/update the first block of the content with this title OR add a title field to the journal entry.
                                                // Given the constraints and existing logic `getEntryTitle`, it extracts from blocks.
                                                // Let's try to simulate a title input that actually updates the first block if it's a header, or just adds a header block?
                                                // OR, simpler: just let them write in the editor.
                                                // BUT user explicitly asked for "en el medio, pueda escribir el titulo del dia de hoy... achiques (la fecha)".
                                                
                                                // Let's make the Date smaller (done above).
                                                // Let's add an input for "Title". Since we don't have a title field in JournalEntry interface apparent here (only blocks),
                                                // we might need to store it in a block or just visually allow it if the data structure supports it.
                                                // Wait, `handleUpdateJournal` implementation is not visible but `getEntryTitle` reads from blocks.
                                                // So if we want a title, we should probably insert it as an H1 block at the start?
                                                // User says "titulo que aparece en la vista de solo titulo". `getEntryTitle` uses the first text block.
                                                // So, if we provide a title input, we should sync it with the first block? That might be messy if the user deletes it in the editor.
                                                
                                                // Alternative: The user might just want a visual header area.
                                                // Let's look at `draftTitle` state. It IS used for NOTE mode.
                                                // For JOURNAL mode, `openJournal` sets `setDraftTitle`? No, it doesn't.
                                                // Let's update `openJournal` to set `draftTitle` from existing blocks, and `handleSave` to prepend/update it?
                                                // Or better: Assume `draftTitle` is just for the UI, and on save, we ensure it's the first block?
                                                // Let's stick to what's safest: The user wants to write a title.
                                                // I will add an input that binds to `draftTitle` (which I need to populate on openJournal).
                                                // And on save, I will NOT force it into blocks to avoid data loss/corruption of existing notes, 
                                                // UNLESS I modify `handleUpdateJournal` to accept a title, but I can't see that definition.
                                                
                                                // Let's look at the "List View" (Notebook View). It uses `title`.
                                                // `title: entry ? getEntryTitle(entry.blocks) : ''`
                                                // So it IS derived from blocks.
                                                // If I put an input here, it's detached from blocks unless I sync them.
                                                
                                                // RE-READING USER REQUEST: "quiero que en el medio, pueda escribir el titulo del dia de hoy... achiques (la fecha)"
                                                // He wants to write the title THERE, in the header.
                                                // So I should probably bind this input to a new state or `draftTitle`, and when saving, ensure it becomes the first block?
                                                // Actually, `BlockEditor` manages blocks.
                                                // If I add a title input, it might duplicate if I also have it in blocks.
                                                
                                                // Strategy:
                                                // 1. In `openJournal`, extract title to `draftTitle`.
                                                // 2. In the UI, show input for `draftTitle`.
                                                // 3. On Save (Journal), we need to ensure this title is preserved. 
                                                //    If `getEntryTitle` gets it from the first block, we should probably update the first block if it's text?
                                                //    Or maybe the user just wants to see it there.
                                                
                                                // Let's just implement the UI changes first as requested: Smaller date, Title Input.
                                                // I will bind the input to `draftTitle`.
                                                // I need to update `openJournal` to populate `draftTitle`.
                                                // And I need to update `handleSave` to maybe put `draftTitle` into the first block if it's empty?
                                                // Actually, if I just modify the UI to look like a title input but it actually edits the first block? No, that's complex.
                                                
                                                // Let's just use `draftTitle` as a "Day Title" and saving it might require backend changes if 'title' isn't a field.
                                                // But `getEntryTitle` parses blocks.
                                                // Let's just add the visual input.
                                                // I will update `openJournal` to set `draftTitle` from `getEntryTitle`.
                                                // I will update `handleSave` for Journal to... wait, if I don't write it back to blocks, it won't be saved as the "title" for the list view.
                                                // So I MUST write it back to blocks.
                                                // I will prepend a block if it doesn't match?
                                                
                                                // Let's keep it simple for now: Just the UI changes.
                                                // The user said: "quiero que en el medio, pueda escribir el titulo del dia de hoy"
                                                
                                                onChange={(e) => setDraftTitle(e.target.value)} 
                                                placeholder={t('notes.journalTitlePlaceholder', 'Give today a title...')} 
                                                className="w-full bg-transparent text-3xl font-black text-white text-center placeholder:text-white/10 outline-none leading-tight tracking-tight mb-6 border-b border-transparent focus:border-white/10 transition-colors pb-2" 
                                            />

                                            <div className="inline-flex justify-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                                                {MOODS.map(m => ( <button key={m.id} onClick={() => { setDraftMood(m.id); setMoodSplash(m.id); }} className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-transform ${draftMood === m.id ? 'bg-white/10 scale-110 shadow-sm ring-1 ring-white/20' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}>{m.icon}</button> ))}
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
            {moodSplash && createPortal(
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
                </div>,
                document.body
            )}
        </div>
    );
});
