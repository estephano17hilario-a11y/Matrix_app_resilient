import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, BarChart3, ChevronLeft, ChevronRight, ArrowLeft, Briefcase, Trash2, Save, Lock, Calendar, AlignLeft, Filter, X, Cake, Target, Gift, Settings, ListTodo, Repeat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Note, JournalEntry, NoteBlock, Project, Quest } from '../../types';
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
import { toLocalISOString, getDaysInMonth, calculateStreak, parseLocalDate } from '../../utils/dateUtils';
import { useNotesLogic } from './hooks/useNotesLogic';
import { useAuth } from '@/context/AuthContext';
import { persistenceService } from '@/services/persistenceService';

// Constants
const MOODS = [
 { id: 'rad', icon: '🚀', color: '#10b981', label: 'Radiant' },
 { id: 'good', icon: '😊', color: '#3b82f6', label: 'Good' },
 { id: 'meh', icon: '😐', color: '#94a3b8', label: 'Neutral' },
 { id: 'bad', icon: '🌧️', color: '#64748b', label: 'Low' },
 { id: 'awful', icon: '⛈️', color: '#ef4444', label: 'Drained' },
];

const getInitialNotesConfig = (userId?: string): NotesConfig => {
  const defaultConfig: NotesConfig = {
    enabledFeatures: [],
    security: {
      pin: '',
      recoveryMethod: 'PASSWORD',
      protectedAreas: { memories: false, notes: false, charts: false, journal: false }
    }
  };
  if (typeof window === 'undefined') return defaultConfig;
  const configKey = userId ? `notes_config_v2_${userId}` : 'notes_config_v2';
  const saved = localStorage.getItem(configKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  const oldConfigKey = userId ? `notes_config_${userId}` : 'notes_config';
  const oldSaved = localStorage.getItem(oldConfigKey);
  if (oldSaved) {
    try {
      const parsed = JSON.parse(oldSaved);
      return {
        enabledFeatures: parsed.buttons || [],
        security: {
          pin: parsed.password || '',
          recoveryMethod: 'PASSWORD',
          protectedAreas: { memories: false, notes: false, charts: false, journal: false }
        }
      };
    } catch (e) {}
  }
  return defaultConfig;
};


interface NotesViewProps {
 onInteractionStart: () => void;
 onInteractionEnd: () => void;
 projects: Project[];
 quests?: Quest[];
 onShowPro?: () => void;
 currentSubView?: 'NOTES' | 'JOURNAL';
 sectionControl?: 'VISIBLE' | 'HIDDEN';
 onStatsOpenChange?: (isOpen: boolean) => void;
 onClose?: () => void;
 isActive?: boolean;
 isPro?: boolean;
 defaultChartViews?: any;
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

export const NotesView = React.memo(({ onInteractionStart, onInteractionEnd, projects, quests, onShowPro, currentSubView, sectionControl = 'VISIBLE', onStatsOpenChange, onClose, isActive = true, isPro, defaultChartViews }: NotesViewProps) => {
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
 const editorScrollContainerRef = useRef<HTMLDivElement | null>(null);

 useEffect(() => {
   if (editorMode !== 'NONE' && editorScrollContainerRef.current) {
     editorScrollContainerRef.current.scrollTop = 0;
   }
 }, [editorMode]);

  // Config & Security
  const [configOpen, setConfigOpen] = useState(false);
  const { user, profile } = useAuth();
  const [config, setConfig] = useState<NotesConfig>(() => getInitialNotesConfig(user?.id));

 const [isLocked, setIsLocked] = useState(false);
 const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
 const [recoveryInput, setRecoveryInput] = useState('');
 const [isRecoveryMode, setIsRecoveryMode] = useState(false);
 const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Load Config from LocalStorage and Supabase
  useEffect(() => {
    // 1. Sync config synchronously from localStorage as soon as user?.id changes to prevent layout flickering
    const localConfig = getInitialNotesConfig(user?.id);
    setConfig(localConfig);

    // 2. Fetch and sync from Supabase asynchronously
    const fetchConfig = async () => {
      if (!user?.id) return;
      try {
        const supaSettings = await persistenceService.settings.get(user.id);
        if (supaSettings && supaSettings.notes_config_v2) {
          const finalConfig = supaSettings.notes_config_v2;
          setConfig(finalConfig);
          const configKey = `notes_config_v2_${user.id}`;
          localStorage.setItem(configKey, JSON.stringify(finalConfig));
        }
      } catch (e) {
        console.error("Failed to load notes config from Supabase", e);
      }
    };
    fetchConfig();
  }, [user?.id]);

 // Save Config Helper
 const handleSaveConfig = async (newConfig: NotesConfig) => {
 setConfig(newConfig);
 const configKey = user?.id ? `notes_config_v2_${user.id}` : 'notes_config_v2';
 localStorage.setItem(configKey, JSON.stringify(newConfig));
 
 if (user?.id) {
 try {
 const currentSettings = await persistenceService.settings.get(user.id) || {};
 await persistenceService.settings.save(user.id, { ...currentSettings, notes_config_v2: newConfig });
 } catch (e) {
 console.error("Failed to save notes config to Supabase", e);
 }
 }
 
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
 const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
 const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

 // Load Special Events for Calendar Integration
 useEffect(() => {
 const eventsKey = user?.id ? `special_events_${user.id}` : 'special_events';

 const loadEventsFromSupabase = async () => {
 let eventsData: any = null;

 if (user?.id) {
 try {
 const supaSettings = await persistenceService.settings.get(user.id);
 if (supaSettings && supaSettings.special_events) {
 eventsData = supaSettings.special_events;
 }
 } catch (e) {
 console.error("Failed to load special events from Supabase", e);
 }
 }
 
 if (!eventsData) {
 const saved = localStorage.getItem(eventsKey);
 if (saved) {
 try {
 eventsData = JSON.parse(saved);
 } catch (e) {
 console.error("Failed to load special events", e);
 }
 }
 }

 if (eventsData) {
 setSpecialEvents(eventsData);
 // Also sync to localStorage for immediate next load
 localStorage.setItem(eventsKey, JSON.stringify(eventsData));
 } else {
 setSpecialEvents([]);
 }
 };

 const loadEventsLocal = () => {
 const saved = localStorage.getItem(eventsKey);
 if (saved) {
 try {
 setSpecialEvents(JSON.parse(saved));
 } catch (e) {
 console.error("Failed to load special events from local", e);
 }
 }
 };
 
 loadEventsFromSupabase();
 // Listen for storage changes to update calendar in real-time if multiple tabs or updates
 window.addEventListener('storage', loadEventsLocal);
 // Custom event for same-tab updates
 window.addEventListener('special_events_updated', loadEventsLocal);

    const handleOpenNoteEditor = () => {
      setSubView('NOTES');
      setEditorMode('NOTE');
      setDraftId(Date.now().toString());
      setDraftTitle('');
      setDraftBlocks([{ id: 'init-1', type: 'text', content: '' }]);
      setDraftTheme('slate');
      setDraftProjectId(undefined);
      onInteractionStart();
    };
    const handleCloseNoteEditor = () => {
      setEditorMode('NONE');
      setDraftId(null);
      setShowEventsHub(false);
      setShowSecureHub(false);
      onInteractionEnd();
      window.dispatchEvent(new CustomEvent('note-closed'));
    };

    window.addEventListener('open-note-editor', handleOpenNoteEditor);
    window.addEventListener('close-note-editor', handleCloseNoteEditor);

    return () => {
      window.removeEventListener('storage', loadEventsLocal);
      window.removeEventListener('special_events_updated', loadEventsLocal);
      window.removeEventListener('open-note-editor', handleOpenNoteEditor);
      window.removeEventListener('close-note-editor', handleCloseNoteEditor);
    };
  }, [user?.id, onInteractionEnd]);
 
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
 setEditorMode('NOTE'); 
 setDraftId(note.id); 
 setDraftTitle(note.title || ''); 
 setDraftBlocks(note.blocks || [{ id: 'init-1', type: 'text', content: '' }]); 
 setDraftTheme(note.theme || 'slate'); 
 setDraftProjectId(note.projectId); 
 onInteractionStart(); 
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
      let initialBlocks: NoteBlock[] = entry?.blocks ? [...entry.blocks] : [{ id: 'init-1', type: 'text' as const, content: '' }];
     let extractedTitle = '';
     
     // Only extract the title if the first block starts with the 'title-' ID prefix (added during save)
     if (initialBlocks.length > 0 && initialBlocks[0].id.startsWith('title-')) {
         extractedTitle = initialBlocks[0].content;
         initialBlocks = initialBlocks.slice(1);
     }
     
      setDraftBlocks(initialBlocks.length > 0 ? initialBlocks : [{ id: 'init-1', type: 'text', content: '' }]);
     setDraftTitle(extractedTitle);
     setDraftMood(entry?.mood); 
     setDraftTheme(entry?.theme || 'slate'); 
     onInteractionStart(); 
   }, [journalEntryMap, onInteractionStart]);
 
 const handleSave = () => { 
 if (editorMode === 'NOTE' && draftId) { 
 handleUpdateNote({ id: draftId, title: draftTitle, blocks: draftBlocks, theme: draftTheme, projectId: draftProjectId, updatedAt: new Date().toISOString() }); 
 } else if (editorMode === 'JOURNAL' && draftId) { 
    let finalBlocks = [...draftBlocks];
    if (draftTitle.trim()) {
      finalBlocks.unshift({ id: 'title-' + Date.now(), type: 'text', content: draftTitle });
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
 const specialEvent = specialEvents.find(e => {
 if (e.showInCalendar === false) return false;
 const eDate = parseLocalDate(e.date);
 if (e.type === 'BIRTHDAY' || e.type === 'ANNIVERSARY') {
 return eDate.getDate() === date.getDate() && eDate.getMonth() === date.getMonth();
 }
 return toLocalISOString(eDate) === dateStr;
 });

 // Find Journaling Quests
 const dayQuests = quests?.filter(q => {
 if (!q.showInJournaling) return false;
 
 // If it's a direct match
 if (q.deadline === dateStr) return true;

 // If it has recurrence, we should project it virtually for the calendar view
 if (q.recurrence && q.recurrence.type !== 'NONE') {
 // Only project if the date is after or equal to the quest's creation/start date
 const questStartDate = q.createdAt ? new Date(q.createdAt as string | number) : new Date(q.deadline || 0);
 questStartDate.setHours(0, 0, 0, 0);
 if (checkDate < questStartDate) return false;

 if (q.recurrence.type === 'INTERVAL' && q.recurrence.interval) {
 const diffTime = Math.abs(checkDate.getTime() - questStartDate.getTime());
 const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
 return diffDays % q.recurrence.interval === 0;
 }
 
 if (q.recurrence.type === 'WEEKLY' && q.recurrence.days) {
 return q.recurrence.days.includes(checkDate.getDay());
 }

 if (q.recurrence.type === 'MONTHLY') {
 const isSelectedDay = q.recurrence.days?.includes(checkDate.getDate());
 const isLastDay = q.recurrence.monthlyType === 'LAST_DAY' && 
 checkDate.getDate() === new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
 
 const validMonth = !q.recurrence.months || q.recurrence.months.length === 0 || q.recurrence.months.includes(checkDate.getMonth());
 
 return validMonth && (isSelectedDay || isLastDay);
 }
 }
 
 return false;
 }) || [];

 return {
 day,
 date,
 dateStr,
 entry,
 mood,
 specialEvent,
 dayQuests,
 isToday: dateStr === todayStr,
 isFuture: checkDate > today,
 title: entry ? getEntryTitle(entry.blocks) : ''
 };
 });
 }, [currentMonth, monthDays, journalEntryMap, specialEvents, quests]);

 const activeSpecialEvent = useMemo(() => {
    if (editorMode !== 'JOURNAL') return null;
    const dateStr = toLocalISOString(draftDate);
    return specialEvents.find(e => {
      if (e.showInCalendar === false) return false;
      const eDate = parseLocalDate(e.date);
      if (e.type === 'BIRTHDAY' || e.type === 'ANNIVERSARY') {
        return eDate.getDate() === draftDate.getDate() && eDate.getMonth() === draftDate.getMonth();
      }
      return toLocalISOString(eDate) === dateStr;
    });
  }, [editorMode, draftDate, specialEvents]);

  const activeDayQuests = useMemo(() => {
    if (editorMode !== 'JOURNAL') return [];
    const dateStr = toLocalISOString(draftDate);
    const checkDate = new Date(draftDate);
    checkDate.setHours(0, 0, 0, 0);

    return quests?.filter(q => {
      if (!q.showInJournaling) return false;
      
      if (q.deadline === dateStr) return true;

      if (q.recurrence && q.recurrence.type !== 'NONE') {
        const questStartDate = q.createdAt ? new Date(q.createdAt as string | number) : new Date(q.deadline || 0);
        questStartDate.setHours(0, 0, 0, 0);
        if (checkDate < questStartDate) return false;

        if (q.recurrence.type === 'INTERVAL' && q.recurrence.interval) {
          const diffTime = Math.abs(checkDate.getTime() - questStartDate.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return diffDays % q.recurrence.interval === 0;
        }
        
        if (q.recurrence.type === 'WEEKLY' && q.recurrence.days) {
          return q.recurrence.days.includes(checkDate.getDay());
        }

        if (q.recurrence.type === 'MONTHLY') {
          const isSelectedDay = q.recurrence.days?.includes(checkDate.getDate());
          const isLastDay = q.recurrence.monthlyType === 'LAST_DAY' && 
            checkDate.getDate() === new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
          
          const validMonth = !q.recurrence.months || q.recurrence.months.length === 0 || q.recurrence.months.includes(checkDate.getMonth());
          
          return validMonth && (isSelectedDay || isLastDay);
        }
      }
      return false;
    }) || [];
  }, [editorMode, draftDate, quests]);

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
 toast.success(t('notes.verified', 'Identity Verified'));
 if (pendingAction) {
 pendingAction();
 setPendingAction(null);
 }
 }}
 onCancel={() => {
 if (onClose) onClose();
 }} 
 title={t('notes.securityLock', 'Security Lock')}
 description={t('notes.verificationRequired', 'Verification Required')}
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
 className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-8 shadow-md relative overflow-hidden"
 >
 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/50 to-teal-500/50" />
 
 <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
 <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-2">{t('notes.recoveryTitle', 'Security Challenge')}</p>
 <p className="text-sm text-white/90 font-bold leading-relaxed">
 {config.security.recoveryMethod === 'PASSWORD' 
 ? t('notes.recovery.enterPassword', 'Enter your account password')
 : (config.security.recoveryQuestion || t('notes.recovery.question', 'Recovery Question'))}
 </p>
 </div>

 <input 
 type={config.security.recoveryMethod === 'PASSWORD' ? "password" : "text"}
 value={recoveryInput}
 onChange={(e) => setRecoveryInput(e.target.value)}
 placeholder={t('notes.challenge.placeholder', 'Type your response...')}
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
 toast.success(t('notes.verified', 'Verified'));
 if (pendingAction) {
 pendingAction();
 setPendingAction(null);
 }
 } else {
 toast.error(t('notes.incorrectResponse', 'Incorrect response'));
 }
 }}
 className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
 >
 {t('notes.challenge.verify', 'Verify Identity')}
 </button>
 
 <button 
 onClick={() => {
 setIsRecoveryMode(false);
 setRecoveryInput('');
 }}
 className="w-full mt-4 text-[10px] font-bold text-white/20 hover:text-white/60 transition-all uppercase tracking-widest py-2"
 >
 {t('notes.challenge.back', 'Back to PIN')}
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
 <div className="bg-black/60 backdrop-blur-xl p-1 rounded-full border border-white/10 flex relative shadow-md w-full max-w-[200px]">
 <div className={`absolute inset-y-1 w-[49%] bg-white/10 rounded-full transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-md ${
 subView === 'NOTES' ? 'left-[1%]' : 'left-[50%]'
 }`} />
 <button onClick={() => setSubView('NOTES')} className={`relative w-1/2 py-2 rounded-full text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-colors z-10 whitespace-nowrap truncate min-w-0 ${subView === 'NOTES' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>{t('notes.tabs.notes', 'Notes')}</button>
 <button data-tour="journal-tab-btn" onClick={() => setSubView('JOURNAL')} className={`relative w-1/2 py-2 rounded-full text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-colors z-10 whitespace-nowrap truncate min-w-0 ${subView === 'JOURNAL' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>{t('notes.tabs.journal', 'Journal')}</button>
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
 onClick={() => {
 if (!isPro) {
 onShowPro?.();
 return;
 }
 openSecureHub();
 }} 
 className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${showSecureHub ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
 >
 <Lock size={14} />
 {!isPro && (
 <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full border-2 border-[#161616] flex items-center justify-center">
 <Lock size={8} className="text-black" />
 </div>
 )}
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
 className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:rotate-45 transition-all duration-200 text-white/60 hover:text-white shadow-sm"
 title={t('notes.settings', 'Settings')}
 >
 <Settings size={14} />
 </button>

 <TourLightbulb tourId="notes" />
 </div>
 </div>
 
 <AnimatePresence>
 {showFilters && subView === 'NOTES' && (
 <motion.div
 initial={{  opacity: 0, marginBottom: 0 }}
 animate={{  opacity: 1, marginBottom: 24 }}
 exit={{  opacity: 0, marginBottom: 0 }}
 transition={{ type: "spring", stiffness: 450, damping: 25 }}
 className="overflow-hidden px-4 relative z-10"
 >
 <div className="bg-[#0a0a0a]/95 transform-gpu backface-hidden border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-md">
 {/* Projects Filter */}
 <div className="flex flex-col gap-2">
 <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">{t('notes.filterByProject', 'Filter by Project')}</span>
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
 <button onClick={() => setFilterProject('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${filterProject === 'ALL' ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'}`}>
 {t('notes.allProjects', 'All Projects')}
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
 {t('notes.allColors', 'All Colors')}
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
 <div ref={notesContainerRef} className="flex-1 overflow-y-auto no-scrollbar pb-24 animate-in slide-in-from-left-4 fade-in duration-200 px-4">
 {isLocked ? (
 <div className="flex flex-col items-center justify-center h-[50vh] text-white/40 gap-4 animate-in fade-in zoom-in-95">
 <div className="p-6 rounded-full bg-white/10 border border-white/5 shadow-lg transform-gpu backface-hidden ">
 <Lock size={48} className="text-white/20" />
 </div>
 <span className="text-xs font-bold uppercase tracking-widest opacity-60">{t('notes.sectionLocked', 'Section Locked')}</span>
 <button onClick={() => setShowPasswordPrompt(true)} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-lg">{t('notes.unlock', 'Unlock')}</button>
 </div>
 ) : (
 <div className="columns-2 md:columns-3 gap-4">


 {/* Create Button */}
 <button onClick={createNote} data-tour="notes-fab" className="w-full h-[180px] rounded-[24px] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-colors group bg-black/25 mb-4 break-inside-avoid">
 <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 shadow-sm"><Plus size={28} className="text-theme-avatar" strokeWidth={1.5} /></div>
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest group-hover:text-white/80 transition-colors">{t('notes.newNote', 'New Note')}</span>
 </button>
 
 {/* Notes List */}
 {noteCards.map(({ note, themeColor, project, previewText, updatedLabel }) => (
 <div key={note.id} onClick={() => openNote(note)} className="w-full min-h-[140px] max-h-[300px] rounded-[24px] p-5 flex flex-col justify-between hover:scale-[1.02] active:scale-98 transition-transform cursor-pointer group relative overflow-hidden shadow-md border border-white/5 bg-black/40 mb-4 break-inside-avoid">
 <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none transition-opacity duration-200" style={{ background: `linear-gradient(to bottom, ${themeColor}, transparent)` }} />
 <div className="relative z-10 flex flex-col h-full">
 {project && <div className="inline-flex self-start items-center gap-1 mb-2 px-2 py-0.5 rounded-md bg-white/10 border border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"/><span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">{project.title}</span></div>}
 <h3 className={`text-[17px] font-bold leading-tight mb-3 ${!note.title ? 'text-white/30 italic' : 'text-white'}`}>{note.title || t('notes.untitled', 'Untitled')}</h3>
 <div className="relative flex-1 overflow-hidden">
 <p className="text-[13px] text-white/60 leading-relaxed font-medium break-words line-clamp-[8]">{previewText || <span className="italic opacity-50">{t('notes.empty', 'Empty...')}</span>}</p>
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
 {t('notes.loadMore', 'Load More')}
 </button>
 </div>
 )}
 </div>
 )}
 {subView === 'JOURNAL' && (
 <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
 {isLocked ? (
 <div className="flex flex-col items-center justify-center h-[50vh] text-white/40 gap-4 animate-in fade-in zoom-in-95 px-4">
 <div className="p-6 rounded-full bg-white/10 border border-white/5 shadow-lg transform-gpu backface-hidden ">
 <Lock size={48} className="text-white/20" />
 </div>
 <span className="text-xs font-bold uppercase tracking-widest opacity-60">{t('notes.journal.locked', 'Journal Locked')}</span>
 <button onClick={() => setShowPasswordPrompt(true)} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-lg">{t('notes.journal.unlock', 'Unlock Journal')}</button>
 </div>
 ) : (
 <>
 <div className="flex justify-between items-end px-6 mb-6">
 <div>
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">{streak > 0 && <span className="text-orange-500 flex items-center gap-1 animate-pulse"><Plus size={12} fill="currentColor"/> {streak} {t('notes.dayStreak', 'Day Streak')}</span>}{!streak && t('notes.yourStory', 'Your Story')}</span>
 <h2 className="text-3xl font-black text-white tracking-tight leading-none">{currentMonth.toLocaleDateString(i18n.language, { month: 'long' })} <span className="text-white/20">{currentMonth.getFullYear()}</span></h2>
 </div>
 <div className="flex items-center gap-2">
 <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 mr-2">
 <button onClick={() => setJournalViewMode('CALENDAR')} className={`p-1.5 rounded-md transition-colors ${journalViewMode === 'CALENDAR' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title={t('notes.calendarView', 'Calendar View')}><Calendar size={14} /></button>
 <button onClick={() => setJournalViewMode('LIST')} className={`p-1.5 rounded-md transition-colors ${journalViewMode === 'LIST' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title={t('notes.notebookView', 'Notebook View')}><AlignLeft size={14} /></button>
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
 <div className="grid grid-cols-7 gap-3 px-4 pb-24 flex-1 content-start animate-in fade-in duration-200">
 {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
 {monthMeta.map(({ day, date, mood, isToday, isFuture, entry, specialEvent, dayQuests }) => {
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
 onClick={() => {
 if (isFuture) {
 if (specialEvent) {
 setSelectedMemory(specialEvent);
 } else if (dayQuests && dayQuests.length > 0) {
 setSelectedQuest(dayQuests[0]);
 }
 } else {
 openJournal(date);
 }
 }} 
 disabled={isFuture && !specialEvent && (!dayQuests || dayQuests.length === 0)}
 data-tour={isToday ? "journal-today-btn" : undefined}
 style={{ 
 borderColor: borderColor,
 backgroundColor: bgColor,
 boxShadow: mood ? `0 0 10px ${mood.color}15` : (hasEntry && entryColor ? `0 0 5px ${entryColor}10` : 'none')
 }}
 className={`aspect-[4/5] rounded-[18px] flex flex-col items-center justify-between p-2 relative transition-transform group overflow-hidden border ${!isFuture || specialEvent || (dayQuests && dayQuests.length > 0) ? 'hover:bg-white/5 active:scale-90 cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
 >
 {/* Fix: Remove full overlay that might obscure text, use subtle gradient instead */}
 {mood && <div className="absolute inset-0 opacity-10 bg-gradient-to-b from-transparent to-current transition-opacity pointer-events-none" style={{ color: mood.color }} />}
 
 <div className="flex-1 flex flex-col items-center justify-center z-10 w-full relative gap-1">
 {specialEvent ? (
 <div 
 className="text-2xl hover:scale-110 transition-transform duration-200 drop-shadow-md"
 >
 {specialEvent.type === 'BIRTHDAY' ? '🎂' : (specialEvent.type === 'ANNIVERSARY' ? '❤️' : '⭐')}
 </div>
 ) : null}
 {(!specialEvent && dayQuests && dayQuests.length > 0) ? (
 <div className="flex gap-1 flex-wrap justify-center">
 {dayQuests.map((q, i) => (
 <div key={q.id || i} className="hover:scale-110 transition-transform duration-200 drop-shadow-md" style={{ color: q.journalIconColor || '#3b82f6' }}>
 <ListTodo size={24} />
 </div>
 ))}
 </div>
 ) : null}
 {(!specialEvent && (!dayQuests || dayQuests.length === 0) && mood) ? (
 <span className="text-3xl group-hover:scale-110 transition-transform duration-200 drop-shadow-md">{mood.icon}</span>
 ) : (!specialEvent && (!dayQuests || dayQuests.length === 0) && isFuture) ? (
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
 <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 animate-in slide-in-from-right-8 duration-200">
 <div className="relative">
 {/* Notebook Binding Effect */}
 <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-red-500/10 z-0 hidden sm:block" />
 
 <div className="space-y-1">
 {monthMeta.map(({ day, date, entry, title, mood, isToday, isFuture, specialEvent, dayQuests }) => {
 const entryThemeId = entry?.theme || 'slate';
 const entryColor = themeColorMap.get(entryThemeId) || '#fff';
 return (
 <div key={day} className="relative group">
 <button 
 onClick={() => {
 if (isFuture) {
 if (specialEvent) {
 setSelectedMemory(specialEvent);
 } else if (dayQuests && dayQuests.length > 0) {
 setSelectedQuest(dayQuests[0]);
 }
 } else {
 openJournal(date);
 }
 }}
 disabled={isFuture && !specialEvent && (!dayQuests || dayQuests.length === 0)}
 data-tour={isToday ? "journal-today-btn" : undefined}
 style={{ borderLeftColor: entry ? entryColor : 'transparent' }}
 className={`w-full text-left py-3 px-2 sm:px-8 flex items-baseline gap-4 relative z-10 border-l-2
 ${!isFuture || specialEvent || (dayQuests && dayQuests.length > 0) ? 'hover:bg-white/5 active:scale-[0.995] transition-transform cursor-pointer' : 'opacity-30 cursor-not-allowed'}
 `}
 >
 <span className={`relative text-xs font-mono font-bold w-6 text-right shrink-0 ${isToday ? 'text-white' : 'text-white/20'}`}>
 {specialEvent ? (
 <span 
 className="absolute right-full mr-1.5 top-1/2 -translate-y-1/2 text-[14px] hover:scale-110 transition-transform duration-200 drop-shadow-md flex items-center justify-center"
 >
 {specialEvent.type === 'BIRTHDAY' ? '🎂' : (specialEvent.type === 'ANNIVERSARY' ? '❤️' : '⭐')}
 </span>
 ) : (dayQuests && dayQuests.length > 0) ? (
 <span 
 className="absolute right-full mr-1.5 top-1/2 -translate-y-1/2 text-[14px] hover:scale-110 transition-transform duration-200 drop-shadow-md flex items-center justify-center"
 style={{ color: dayQuests[0].journalIconColor || '#3b82f6' }}
 >
 <ListTodo size={14} />
 </span>
 ) : null}
 {day < 10 ? `0${day}` : day}
 </span>
 <div className="flex-1 flex flex-col relative min-w-0">
 <div className="flex items-center justify-between gap-4 pb-1">
 <div className="flex items-center gap-3 truncate">
 {entry ? (
 <span className={`text-xl font-serif italic tracking-wide ${isToday ? 'text-white font-medium' : 'text-white/80'}`} style={{ color: entryColor !== '#fff' && entryColor !== '#64748b' ? entryColor : undefined }}>{title || <span className="opacity-50">{t('notes.untitledEntry', 'Untitled Entry')}</span>}</span>
 ) : (
 <span className="text-base text-white/10 font-serif italic">{t('notes.emptyPage', 'Empty page...')}</span>
 )}
 </div>
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
 <NotesStatsModal isOpen={showStats} onClose={() => setShowStats(false)} notes={notes} journalEntries={journalEntries} initialTab={profile?.notesDefaultTab || 'OVERVIEW'} isPro={isPro} onOpenPro={onShowPro} defaultChartViews={defaultChartViews} />
 
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
 toast.success(t('notes.unlocked', 'Unlocked'));
 if (pendingAction) {
 pendingAction();
 setPendingAction(null);
 }
 }}
 onCancel={() => {
 setShowPasswordPrompt(false);
 setPendingAction(null);
 }}
 title={t('notes.enterPin', 'Enter PIN')}
 description={t('notes.protectedAccess', 'Protected Area Access')}
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
 className={`absolute inset-0 z-50 flex items-center justify-center transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${editorMode !== 'NONE' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-98 translate-y-4 pointer-events-none'}`}
 style={{ willChange: 'transform, opacity', transform: 'translate3d(0,0,0)' }}
 >
 {editorMode !== 'NONE' && (
 <div className="w-full h-full max-w-2xl mx-auto flex flex-col p-4 sm:p-6">
 <div className="glass-editor rounded-[36px] flex-1 flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-md" style={{ willChange: 'transform, opacity' }}>
 <div className="absolute inset-0 rounded-[36px] overflow-hidden pointer-events-none">
 <div className="absolute top-0 left-0 right-0 h-64 opacity-15 pointer-events-none transition-colors duration-200" style={{ background: `radial-gradient(circle at 50% 0%, ${activeThemeColor}, transparent 70%)` }} />
 </div>
 
 <div className="flex justify-between items-center p-3 sm:p-6 border-b border-white/5 relative z-20 gap-2">
 <button onClick={closeEditor} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95 border border-white/5 flex-shrink-0"><ArrowLeft size={20} /></button>
 <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-1 min-w-0 justify-end">
 <div className="flex items-center gap-1">
 <BlueprintSelector onSelect={(newBlocks) => setDraftBlocks(prev => [...prev, ...newBlocks])} />
 <button onClick={() => setShowSaveBlueprintModal(true)} className="hidden sm:block p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title={t('notes.editor.saveBlueprint', 'Save as Blueprint')}><Save size={18} /></button>
 <DropdownThemePicker currentTheme={draftTheme} onSelect={setDraftTheme} projects={editorMode === 'NOTE' ? projects : null} activeProject={draftProjectId} onSelectProject={setDraftProjectId} />
 </div>
 <div className="w-[1px] h-6 bg-white/10 mx-1" />
 {editorMode === 'NOTE' && <button onClick={handleDelete} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-500 flex items-center justify-center transition-all flex-shrink-0"><Trash2 size={18} /></button>}
 <button onClick={handleSave} className="h-8 sm:h-10 px-4 sm:px-6 bg-white text-black rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-sm flex-shrink-0 flex items-center justify-center whitespace-nowrap">{t('notes.save')}</button>
 </div>
 </div>
 <div ref={editorScrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 relative rounded-b-[36px]">
 {editorMode === 'NOTE' ? (
 <div className="animate-in slide-in-from-bottom-4 duration-200">
 <div className="relative mb-6">
 {draftProjectId && (<div className="inline-flex items-center gap-1 mb-3 px-2 py-0.5 rounded-md bg-white/5 border border-white/5"><Briefcase size={10} className="text-slate-400"/><span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{projects.find((p) => p.id === draftProjectId)?.title}</span></div>)}
 <input type="text" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder={t('notes.untitledPlaceholder', 'Untitled Note')} className="w-full bg-transparent text-4xl font-black text-white placeholder:text-white/10 outline-none leading-tight tracking-tight" />
 </div>
 <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
 </div>
 ) : (
 <div className="animate-in slide-in-from-bottom-4 duration-200">
 <div className="text-center mb-8 relative z-10 flex flex-col items-center">
                {/* Date header */}
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-6">
                  {draftDate.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>

                {/* Journal Title Input */}
                <input 
                  type="text" 
                  value={draftTitle} 
                  onChange={(e) => setDraftTitle(e.target.value)} 
                  placeholder={t('notes.untitledPlaceholder', 'Untitled Note')} 
                  className="w-full bg-transparent text-3xl font-black text-white placeholder:text-white/10 outline-none leading-tight tracking-tight text-center mb-6" 
                />

                {/* Memories and Quests vertically stacked cards */}
                {(activeSpecialEvent || activeDayQuests.length > 0) && (
                  <div className="w-full max-w-md flex flex-col gap-3 mb-6">
                    {activeSpecialEvent && (
                      <div 
                        onClick={() => setSelectedMemory(activeSpecialEvent)}
                        className="w-full rounded-[24px] bg-gradient-to-r from-pink-500/10 to-transparent border border-pink-500/20 p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(236,72,153,0.05)] group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-md relative z-10">
                          {activeSpecialEvent.type === 'BIRTHDAY' ? '🎂' : (activeSpecialEvent.type === 'ANNIVERSARY' ? '❤️' : '⭐')}
                        </div>
                        <div className="flex-1 text-left relative z-10">
                          <h3 className="text-lg font-black text-white tracking-tight leading-tight line-clamp-1">{activeSpecialEvent.title}</h3>
                          <div className="flex items-center gap-1.5 text-pink-400 mt-0.5">
                            <Gift size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{t(`notes.event.types.${activeSpecialEvent.type}`, activeSpecialEvent.type) as string}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeDayQuests.map((quest) => (
                      <div 
                        key={quest.id}
                        onClick={() => setSelectedQuest(quest)}
                        className="w-full rounded-[24px] border border-white/10 p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md group relative overflow-hidden"
                        style={{ background: `linear-gradient(to right, ${quest.journalIconColor || '#3b82f6'}15, transparent)` }}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${quest.journalIconColor || '#3b82f6'}10` }} />
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-md relative z-10" style={{ color: quest.journalIconColor || '#3b82f6' }}>
                          <ListTodo size={20} />
                        </div>
                        <div className="flex-1 text-left relative z-10 min-w-0">
                          <h3 className="text-lg font-black text-white tracking-tight leading-tight truncate">{quest.title}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5" style={{ color: quest.journalIconColor || '#3b82f6' }}>
                            <Repeat size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{t('notes.editor.repeatedTask', 'Repeated Task')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

 {/* Memory Details Modal (No framer-motion) */}
 {selectedMemory && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
 <div 
 className="absolute inset-0 bg-black/80 transform-gpu backface-hidden transition-opacity duration-200 ease-out animate-in fade-in"
 onClick={() => setSelectedMemory(null)}
 />
 <div 
 className="relative z-10 w-full max-w-sm bg-[#111] border border-white/10 rounded-[32px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-6 animate-in zoom-in-95 fade-in duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
 >
 <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-pink-500/20 to-transparent rounded-t-[32px] pointer-events-none" />
 
 <div className="flex justify-between items-start relative z-10">
 <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-md">
 {selectedMemory.type === 'BIRTHDAY' ? '🎂' : (selectedMemory.type === 'ANNIVERSARY' ? '❤️' : '⭐')}
 </div>
 <button 
 onClick={() => setSelectedMemory(null)}
 className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 <div className="space-y-1 relative z-10">
 <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{selectedMemory.title}</h3>
 <div className="flex items-center gap-2 text-pink-400">
 <Gift size={14} />
 <span className="text-xs font-bold uppercase tracking-widest">{selectedMemory.type}</span>
 </div>
 </div>

 <div className="flex flex-col gap-4 relative z-10">
 <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
 <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
 <Calendar size={16} />
 </div>
 <div>
 <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">{t('notes.dateTime', 'Date & Time')}</p>
 <p className="text-sm font-semibold text-white">
 {new Date(selectedMemory.date).toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
 {selectedMemory.time && ` • ${selectedMemory.time}`}
 </p>
 </div>
 </div>

 {selectedMemory.notes && (
 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
 <div className="flex items-center gap-2 text-white/40">
 <AlignLeft size={14} />
 <span className="text-[10px] font-bold uppercase tracking-wider">{t('notes.noteLabel', 'Note')}</span>
 </div>
 <p className="text-sm text-white/80 leading-relaxed font-medium">
 {selectedMemory.notes}
 </p>
 </div>
 )}
 </div>

 <button 
 onClick={() => setSelectedMemory(null)}
 className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest transition-all active:scale-95 mt-2 relative z-10"
 >
 {t('notes.close', 'Close')}
 </button>
 </div>
 </div>,
 document.body
 )}

 {/* Quest Details Modal */}
 {selectedQuest && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
 <div 
 className="absolute inset-0 bg-black/80 transform-gpu backface-hidden transition-opacity duration-200 ease-out animate-in fade-in"
 onClick={() => setSelectedQuest(null)}
 />
 <div 
 className="relative z-10 w-full max-w-sm bg-[#111] border border-white/10 rounded-[32px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-6 animate-in zoom-in-95 fade-in duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
 >
 <div className="absolute top-0 left-0 right-0 h-32 rounded-t-[32px] pointer-events-none" style={{ background: `linear-gradient(to bottom, ${selectedQuest.journalIconColor || '#3b82f6'}33, transparent)` }} />
 
 <div className="flex justify-between items-start relative z-10">
 <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-md" style={{ color: selectedQuest.journalIconColor || '#3b82f6' }}>
 <ListTodo size={32} />
 </div>
 <button 
 onClick={() => setSelectedQuest(null)}
 className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 <div className="relative z-10">
 <h2 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">{selectedQuest.title}</h2>
 {selectedQuest.description && (
 <p className="text-sm text-white/60 leading-relaxed font-medium mb-4 mt-2">{selectedQuest.description}</p>
 )}
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mt-4" style={{ color: selectedQuest.journalIconColor || '#3b82f6' }}>
 <Repeat size={14} />
 <span>{t('notes.editor.repeatedTask', 'Repeated Task')}</span>
 </div>
 </div>

 <button 
 onClick={() => setSelectedQuest(null)}
 className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest transition-all active:scale-95 mt-2 relative z-10"
 >
 {t('notes.close', 'Close')}
 </button>
 </div>
 </div>,
 document.body
 )}

 </div>
 );
});
