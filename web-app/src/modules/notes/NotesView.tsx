import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, BarChart3, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Briefcase, Trash2, Lock, Calendar, AlignLeft, Filter, X, Cake, Target, Gift, Settings, ListTodo, Repeat, Star, Folder, FolderPlus, FolderOpen, ArrowUpDown, Pencil, BookOpen, Search, Menu, Eye, Download, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Note, NoteFolder, JournalEntry, NoteBlock, Project, Quest } from '../../types';
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
import { toLocalISOString, getDaysInMonth, calculateStreak, parseLocalDate, getWeekStartDay } from '../../utils/dateUtils';
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
    enabledFeatures: ['BIRTHDAY', 'KEY', 'TARGET'],
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
      const parsed = JSON.parse(saved);
      if (!parsed.enabledFeatures || !Array.isArray(parsed.enabledFeatures) || parsed.enabledFeatures.length === 0) {
        parsed.enabledFeatures = ['BIRTHDAY', 'KEY', 'TARGET'];
      }
      return parsed;
    } catch (e) {}
  }
  const oldConfigKey = userId ? `notes_config_${userId}` : 'notes_config';
  const oldSaved = localStorage.getItem(oldConfigKey);
  if (oldSaved) {
    try {
      const parsed = JSON.parse(oldSaved);
      return {
        enabledFeatures: (parsed.buttons && parsed.buttons.length > 0) ? parsed.buttons : ['BIRTHDAY', 'KEY', 'TARGET'],
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
 const { notes, folders, journalEntries, handleUpdateNote, handleDeleteNote, handleCreateFolder, handleUpdateFolder, handleDeleteFolder, handleUpdateJournal, canCreateNote } = useNotesLogic();

 const [subView, setSubView] = useState<'NOTES' | 'JOURNAL'>('NOTES');

 // Notion Library States
 const [selectedFolderId, setSelectedFolderId] = useState<string>('ALL');
 const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>(() => {
   return (localStorage.getItem('notes_sort_order') as 'NEWEST' | 'OLDEST') || 'NEWEST';
 });

 const handleToggleSortOrder = () => {
   const next = sortOrder === 'NEWEST' ? 'OLDEST' : 'NEWEST';
   setSortOrder(next);
   localStorage.setItem('notes_sort_order', next);
 };

  // Folder Modal & Ecosystem state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderIcon, setFolderIcon] = useState('📁');
  const [folderColor, setFolderColor] = useState('#3b82f6');
  const [folderParentId, setFolderParentId] = useState<string | undefined>(undefined);
  const [folderIsPinned, setFolderIsPinned] = useState<boolean>(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

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
 const [draftFolderId, setDraftFolderId] = useState<string | undefined>(undefined);
 const [draftIsFavorite, setDraftIsFavorite] = useState<boolean>(false);
 const [draftDate, setDraftDate] = useState<Date>(new Date());
 const [currentMonth, setCurrentMonth] = useState(new Date());
 const [showStats, setShowStats] = useState(false);
 const [showSaveBlueprintModal, setShowSaveBlueprintModal] = useState(false);
 const [moodSplash, setMoodSplash] = useState<string | null>(null);
 const [pendingOpenDate, setPendingOpenDate] = useState<Date | null>(null);
 const openCreateFolderModal = (parentId?: string) => {
   setEditingFolder(null);
   setFolderName('');
   setFolderIcon('📁');
   setFolderColor('#3b82f6');
   setFolderParentId(parentId);
   setFolderIsPinned(false);
   setIsFolderModalOpen(true);
 };

 const openEditFolderModal = (folder: NoteFolder, e?: React.MouseEvent) => {
   e?.stopPropagation();
   setEditingFolder(folder);
   setFolderName(folder.name);
   setFolderIcon(folder.icon || '📁');
   setFolderColor(folder.color || '#3b82f6');
   setFolderParentId(folder.parentId);
   setFolderIsPinned(!!folder.isPinned);
   setIsFolderModalOpen(true);
 };

 const handleSaveFolder = async () => {
   if (!folderName.trim()) {
     toast.error(t('notes.folderNameRequired', 'Ingrese el nombre de la carpeta'));
     return;
   }
   if (editingFolder) {
     await handleUpdateFolder({
       ...editingFolder,
       name: folderName.trim(),
       icon: folderIcon,
       color: folderColor,
       parentId: folderParentId,
       isPinned: folderIsPinned
     });
     toast.success(t('notes.folderUpdated', 'Carpeta actualizada'));
   } else {
     await handleCreateFolder({
       name: folderName.trim(),
       icon: folderIcon,
       color: folderColor,
       parentId: folderParentId,
       isPinned: folderIsPinned
     });
     toast.success(t('notes.folderCreated', 'Carpeta creada'));
   }
   setIsFolderModalOpen(false);
 };

 const handleToggleFolderPin = async (folder: NoteFolder, e?: React.MouseEvent) => {
   e?.stopPropagation();
   await handleUpdateFolder({
     ...folder,
     isPinned: !folder.isPinned
   });
   toast.success(folder.isPinned ? 'Carpeta desanclada' : 'Carpeta anclada a la barra de inicio 📌');
 };

 const handleDeleteFolderConfirm = async (folderId: string, e: React.MouseEvent) => {
   e.stopPropagation();
   if (window.confirm(t('notes.confirmDeleteFolder', '¿Eliminar carpeta? Las notas no se borrarán.'))) {
     await handleDeleteFolder(folderId);
     if (selectedFolderId === folderId) {
       setSelectedFolderId('ALL');
     }
     toast.success(t('notes.folderDeleted', 'Carpeta eliminada'));
   }
 };

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
          if (!finalConfig.enabledFeatures || !Array.isArray(finalConfig.enabledFeatures) || finalConfig.enabledFeatures.length === 0) {
            finalConfig.enabledFeatures = ['BIRTHDAY', 'KEY', 'TARGET'];
          }
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

  // Calendar settings
  const [calendarCellOpacity, setCalendarCellOpacity] = useState<number>(() => {
    return parseFloat(localStorage.getItem('MATRIX_CALENDAR_OPACITY') || '0.85');
  });
  const [calendarShowFuture, setCalendarShowFuture] = useState<boolean>(() => {
    return localStorage.getItem('MATRIX_CALENDAR_SHOW_FUTURE') !== 'false';
  });
  const [showCalendarSettings, setShowCalendarSettings] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('MATRIX_CALENDAR_OPACITY', calendarCellOpacity.toString());
  }, [calendarCellOpacity]);

  useEffect(() => {
    localStorage.setItem('MATRIX_CALENDAR_SHOW_FUTURE', calendarShowFuture.toString());
  }, [calendarShowFuture]);

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
   // 🔐 SECURITY: If a PIN is already configured, require verification before opening settings
   const hasPin = config.security.pin && config.security.pin.length > 0;
   if (hasPin) {
     setPendingAction(() => () => setConfigOpen(true));
     setShowPasswordPrompt(true);
   } else {
     setConfigOpen(true);
   }
 }, [config.security.pin]);

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

  // Filters & Library State
  const [showFilters, setShowFilters] = useState(false);
  const [filterProject, setFilterProject] = useState<string | 'ALL'>('ALL');
  const [filterTheme, setFilterTheme] = useState<string | 'ALL'>('ALL');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'FOLDERS' | 'FAVORITES' | 'PROJECTS' | 'STATS'>('FOLDERS');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [librarySidebarOpen, setLibrarySidebarOpen] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);

  const touchTimerRef = useRef<any>(null);

  const handlePressStart = (noteId: string) => {
    touchTimerRef.current = setTimeout(() => {
      setSelectedNoteIds(prev => prev.includes(noteId) ? prev : [...prev, noteId]);
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate?.(40);
      }
      toast.success('Modo Selección activado', { id: 'select-toast', duration: 1500 });
    }, 450);
  };

  const handlePressEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const toggleSelectNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedNoteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAllNotes = () => {
    if (selectedNoteIds.length === filteredNotes.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(filteredNotes.map(n => n.id));
    }
  };

  const handleBatchMoveNotes = (targetFolderId?: string) => {
    if (selectedNoteIds.length === 0) return;
    selectedNoteIds.forEach(noteId => {
      const targetNote = notes.find(n => n.id === noteId);
      if (targetNote) {
        handleUpdateNote({ ...targetNote, folderId: targetFolderId });
      }
    });
    const folderObj = targetFolderId ? folderMap.get(targetFolderId) : undefined;
    toast.success(`¡${selectedNoteIds.length} notas movidas a ${folderObj ? folderObj.name : 'Sin Carpeta'}!`);
    setSelectedNoteIds([]);
    setIsBatchMoveOpen(false);
  };

  const handleBatchDeleteNotes = () => {
    if (selectedNoteIds.length === 0) return;
    if (window.confirm(`¿Eliminar ${selectedNoteIds.length} notas seleccionadas?`)) {
      selectedNoteIds.forEach(id => handleDeleteNote(id));
      toast.success(`${selectedNoteIds.length} notas eliminadas`);
      setSelectedNoteIds([]);
    }
  };

  const handleExportNoteMarkdown = (noteTitle: string, blocks: NoteBlock[]) => {
    const text = `# ${noteTitle || 'Sin Título'}\n\n` + blocks.map(b => {
      if (b.type === 'check') return `- [${b.checked ? 'x' : ' '}] ${b.content}`;
      if (b.type === 'heading1') return `# ${b.content}`;
      if (b.type === 'heading2') return `## ${b.content}`;
      if (b.type === 'heading3') return `### ${b.content}`;
      if (b.type === 'quote') return `> ${b.content}`;
      if (b.type === 'code') return `\`\`\`\n${b.content}\n\`\`\``;
      if (b.type === 'latex') return `$$ ${b.content} $$`;
      return b.content;
    }).join('\n\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(noteTitle || 'nota').toLowerCase().replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Nota exportada como .md');
  };

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
  setDraftFolderId(note.folderId);
  setDraftIsFavorite(!!note.isFavorite);
  onInteractionStart(); 
  }, [onInteractionStart]);
  
  const createNote = useCallback(() => { 
  if (!canCreateNote()) {
  if (onShowPro) onShowPro();
  return;
  }
  const newId = Date.now().toString(); 
  setEditorMode('NOTE'); 
  setDraftId(newId); 
  setDraftTitle(''); 
  setDraftBlocks([{ id: 'init-1', type: 'text', content: '' }]); 
  setDraftTheme('slate'); 
  setDraftProjectId(undefined); 
  setDraftFolderId(selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' ? selectedFolderId : undefined);
  setDraftIsFavorite(selectedFolderId === 'FAVORITES');
  onInteractionStart(); 
  }, [onInteractionStart, canCreateNote, onShowPro, selectedFolderId]);

  const createNoteInFolder = useCallback((folderId?: string) => {
    if (!canCreateNote()) {
      if (onShowPro) onShowPro();
      return;
    }
    const newId = Date.now().toString();
    setEditorMode('NOTE');
    setDraftId(newId);
    setDraftTitle('');
    setDraftBlocks([{ id: 'init-1', type: 'text', content: '' }]);
    setDraftTheme('slate');
    setDraftProjectId(undefined);
    setDraftFolderId(folderId === 'UNCATEGORIZED' ? undefined : (folderId === 'FAVORITES' ? undefined : folderId));
    setDraftIsFavorite(folderId === 'FAVORITES');
    onInteractionStart();
  }, [canCreateNote, onShowPro, onInteractionStart]);

  const handleToggleNoteFavorite = useCallback((note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    handleUpdateNote({
      ...note,
      isFavorite: !note.isFavorite,
      updatedAt: new Date().toISOString()
    });
    toast.success(note.isFavorite ? 'Removido de favoritos' : 'Añadido a favoritos ⭐');
  }, [handleUpdateNote]);
 
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

   useEffect(() => {
     const handleOpenDate = (e: Event) => {
       const detail = (e as CustomEvent).detail;
       if (detail && detail.dateStr) {
         const parts = detail.dateStr.split('-');
         if (parts.length === 3) {
           const year = parseInt(parts[0], 10);
           const month = parseInt(parts[1], 10) - 1;
           const day = parseInt(parts[2], 10);
           const targetDate = new Date(year, month, day);
           
           if (journalEntries.length === 0) {
             setPendingOpenDate(targetDate);
           } else {
             openJournal(targetDate);
           }
         }
       }
     };
     window.addEventListener('open_journal_date', handleOpenDate);
     return () => window.removeEventListener('open_journal_date', handleOpenDate);
   }, [openJournal, journalEntries]);

  // If a pending open date exists and journalEntries are loaded, trigger openJournal
  useEffect(() => {
    if (pendingOpenDate && journalEntries.length > 0) {
      openJournal(pendingOpenDate);
      setPendingOpenDate(null);
    }
  }, [pendingOpenDate, journalEntries, openJournal]);

  // Check for cold start journal date on mount
  useEffect(() => {
    const savedDate = localStorage.getItem('cold_start_journal_date');
    if (savedDate) {
      localStorage.removeItem('cold_start_journal_date');
      const parts = savedDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const targetDate = new Date(year, month, day);
        if (journalEntries.length === 0) {
          setPendingOpenDate(targetDate);
        } else {
          openJournal(targetDate);
        }
      }
    }
  }, [journalEntries, openJournal]);

  const handleSave = () => { 
    if (editorMode === 'NOTE' && draftId) { 
      handleUpdateNote({ 
        id: draftId, 
        title: draftTitle, 
        blocks: draftBlocks, 
        theme: draftTheme, 
        projectId: draftProjectId, 
        folderId: draftFolderId,
        isFavorite: draftIsFavorite,
        updatedAt: new Date().toISOString() 
      }); 
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
 const folderMap = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);

  const getAllSubFolderIds = useCallback((allFolders: NoteFolder[], targetId: string): string[] => {
    const result: string[] = [targetId];
    const children = allFolders.filter(f => f.parentId === targetId);
    children.forEach(child => {
      result.push(...getAllSubFolderIds(allFolders, child.id));
    });
    return result;
  }, []);

  const getFolderTotalNotesCount = useCallback((folderId: string): number => {
    const directNotes = notes.filter(n => n.folderId === folderId).length;
    const childFolders = folders.filter(f => f.parentId === folderId);
    const childNotesCount = childFolders.reduce((acc, child) => acc + getFolderTotalNotesCount(child.id), 0);
    return directNotes + childNotesCount;
  }, [notes, folders]);

  const toggleFolderExpand = useCallback((folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const folderBreadcrumbs = useMemo(() => {
    if (selectedFolderId === 'ALL' || selectedFolderId === 'FAVORITES' || selectedFolderId === 'UNCATEGORIZED') return [];
    const path: NoteFolder[] = [];
    let currId: string | undefined = selectedFolderId;
    const visited = new Set<string>();
    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const f = folders.find(folder => folder.id === currId);
      if (f) {
        path.unshift(f);
        currId = f.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [selectedFolderId, folders]);

 const filteredNotes = useMemo(() => {
 return notes.filter(note => {
 const matchesProject = filterProject === 'ALL' || note.projectId === filterProject;
 const noteThemeId = note.theme || 'slate';
 const matchesTheme = filterTheme === 'ALL' || noteThemeId === filterTheme;
 
 let matchesFolder = true;
 if (selectedFolderId === 'FAVORITES') {
   matchesFolder = !!note.isFavorite;
 } else if (selectedFolderId === 'UNCATEGORIZED') {
   matchesFolder = !note.folderId;
 } else if (selectedFolderId !== 'ALL') {
   const allowedIds = getAllSubFolderIds(folders, selectedFolderId);
   matchesFolder = !!note.folderId && allowedIds.includes(note.folderId);
 }

 return matchesProject && matchesTheme && matchesFolder;
 }).sort((a, b) => {
   const timeA = new Date(a.updatedAt || (a as any).createdAt || 0).getTime();
   const timeB = new Date(b.updatedAt || (b as any).createdAt || 0).getTime();
   return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
 });
 }, [notes, folders, filterProject, filterTheme, selectedFolderId, sortOrder, getAllSubFolderIds]);

 const noteCards = useMemo(() => {
 return filteredNotes.slice(0, visibleNotesCount).map(note => {
 const themeId = note.theme || 'slate';
 const themeColor = themeColorMap.get(themeId) || '#64748b';
 const project = note.projectId ? projectMap.get(note.projectId) : undefined;
 const folder = note.folderId ? folderMap.get(note.folderId) : undefined;
 const previewBlock = note.blocks.find(b => b.type === 'text' && b.content.trim().length > 0);
 const previewText = previewBlock?.content || '';
 const updatedLabel = note.updatedAt
 ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
 : '';
 return { note, themeColor, project, folder, previewText, updatedLabel };
 });
 }, [filteredNotes, visibleNotesCount, themeColorMap, projectMap, folderMap]);

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

 <div className={`h-full flex flex-col min-h-0 transition-[opacity,transform] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${editorMode !== 'NONE' || showEventsHub ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`} style={{ willChange: 'transform, opacity' }}>
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
    <div ref={notesContainerRef} className="flex-1 pb-36 sm:pb-40 animate-in slide-in-from-left-4 fade-in duration-200 px-4">
      {isLocked ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-white/40 gap-4 animate-in fade-in zoom-in-95">
          <div className="p-6 rounded-full bg-white/10 border border-white/5 shadow-lg transform-gpu backface-hidden ">
            <Lock size={48} className="text-white/20" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">{t('notes.sectionLocked', 'Section Locked')}</span>
          <button onClick={() => setShowPasswordPrompt(true)} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-lg">{t('notes.unlock', 'Unlock')}</button>
        </div>
      ) : (
        <>
          {/* Header Bar: Only Biblioteca & Todas */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {/* Biblioteca Button */}
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <BookOpen size={15} />
                <span>📚 Biblioteca</span>
              </button>

              {/* Todas Button */}
              <button
                onClick={() => setSelectedFolderId('ALL')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  selectedFolderId === 'ALL'
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FolderOpen size={14} />
                <span>Todas ({notes.length})</span>
              </button>

              {/* Pinned Folders directly on Start Bar */}
              {folders.filter(f => f.isPinned).map(pinned => (
                <button
                  key={pinned.id}
                  onClick={() => setSelectedFolderId(pinned.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    selectedFolderId === pinned.id
                      ? 'bg-cyan-500 text-black border-cyan-300 shadow-md ring-2 ring-cyan-400/50'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20'
                  }`}
                >
                  <span>{pinned.icon || '📁'}</span>
                  <span>{pinned.name}</span>
                  <span className="text-[10px] font-mono opacity-80">📌</span>
                </button>
              ))}
            </div>

            {/* Sort Order Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSortOrder}
                className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                title="Cambiar orden de notas"
              >
                <ArrowUpDown size={13} className="text-emerald-400" />
                <span>{sortOrder === 'NEWEST' ? 'Recientes' : 'Antiguas'}</span>
              </button>
            </div>
          </div>

          {/* Exact 2-Column Grid (Left and Right quadrants) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
            {/* + NUEVA NOTA Card */}
            <button 
              onClick={createNote} 
              data-tour="notes-fab" 
              className="w-full h-44 rounded-[28px] border border-dashed border-white/15 bg-[#121216]/80 hover:bg-white/[0.06] hover:border-cyan-500/40 transition-all flex flex-col items-center justify-center gap-3 p-4 cursor-pointer shadow-lg group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <Plus size={24} className="text-cyan-400" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-white/50 tracking-widest uppercase group-hover:text-white/90 transition-colors">
                NUEVA NOTA
              </span>
            </button>

            {/* Note Cards */}
            {noteCards.map(({ note, themeColor, folder, previewText, updatedLabel }) => {
              const hasFolder = !!folder;
              const hasTags = note.tags && note.tags.length > 0;
              const hasHeaderBadges = hasFolder || hasTags;
              const isSelected = selectedNoteIds.includes(note.id);
              const isSelectionActive = selectedNoteIds.length > 0;

              return (
                <div 
                  key={note.id}
                  onMouseDown={() => handlePressStart(note.id)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={() => handlePressStart(note.id)}
                  onTouchEnd={handlePressEnd}
                  onClick={() => {
                    if (isSelectionActive) {
                      toggleSelectNote(note.id);
                    } else {
                      openNote(note);
                    }
                  }} 
                  className={`w-full h-44 rounded-[28px] p-4 flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group relative overflow-hidden shadow-lg border select-none ${
                    isSelected 
                      ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/30 scale-[1.02]' 
                      : 'border-white/10 bg-[#121216] hover:border-white/20'
                  }`}
                >
                  <div className="absolute top-0 left-0 right-0 h-20 opacity-15 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${themeColor}, transparent)` }} />
                  
                  {/* Select Checkbox (Appears on Long Press / Selection Mode) OR Favorite Star */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
                    {isSelectionActive ? (
                      <button
                        type="button"
                        onClick={(e) => toggleSelectNote(note.id, e)}
                        className={`p-1.5 rounded-xl transition-all ${isSelected ? 'text-cyan-400 bg-cyan-500/20 ring-1 ring-cyan-400/50 scale-110' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                        title="Seleccionar nota"
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleToggleNoteFavorite(note, e)}
                        className={`p-1 rounded-full transition-all ${
                          note.isFavorite ? 'text-amber-400 bg-amber-500/10' : 'text-white/20 hover:text-white/70 hover:bg-white/5'
                        }`}
                        title={note.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
                      >
                        <Star size={14} fill={note.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>

                  <div className="relative z-10 flex flex-col flex-1 min-h-0 pr-12">
                    {/* Header Badges */}
                    {hasHeaderBadges && (
                      <div className="flex items-center gap-1 overflow-hidden mb-1.5 flex-wrap max-h-5">
                        {folder && (
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate max-w-[80px] shadow-sm border border-white/10"
                            style={{ backgroundColor: `${folder.color || '#3b82f6'}25`, color: folder.color || '#60a5fa' }}
                          >
                            {folder.icon || '📁'} {folder.name}
                          </span>
                        )}
                        {note.tags && note.tags.map((t, idx) => (
                          <span key={idx} className="text-[9px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/20 px-1.5 py-0.5 rounded-md truncate max-w-[65px]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Note Title */}
                    <h3 className={`text-[15px] sm:text-base font-extrabold text-white leading-snug truncate mb-1 ${!note.title ? 'text-white/30 italic' : ''}`}>
                      {note.title || t('notes.untitled', 'Sin título')}
                    </h3>

                    {/* Note Content Snippet */}
                    <p className="text-xs text-white/50 leading-relaxed font-medium break-words line-clamp-3 flex-1 min-h-0">
                      {previewText || <span className="italic opacity-40">{t('notes.empty', 'Nota vacía...')}</span>}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="relative z-10 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-medium text-white/40">
                    <span>{updatedLabel}</span>
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Batch Selection Bar */}
          {selectedNoteIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-[#12121c]/95 border border-cyan-500/40 rounded-full px-5 py-3 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 text-white">
              <button onClick={handleSelectAllNotes} className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white transition-colors">
                <CheckSquare size={16} />
                <span>{selectedNoteIds.length === filteredNotes.length ? 'Deseleccionar' : 'Todas'} ({selectedNoteIds.length})</span>
              </button>

              <div className="w-[1px] h-5 bg-white/20" />

              <button 
                onClick={() => setIsBatchMoveOpen(true)} 
                className="px-4 py-1.5 rounded-full bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md"
              >
                <Folder size={14} />
                <span>Mover ({selectedNoteIds.length})</span>
              </button>

              <button 
                onClick={handleBatchDeleteNotes} 
                className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Eliminar seleccionadas"
              >
                <Trash2 size={15} />
              </button>

              <button onClick={() => setSelectedNoteIds([])} className="p-1.5 text-white/40 hover:text-white">
                <X size={15} />
              </button>
            </div>
          )}
          {/* Load More Trigger */}
          {filteredNotes.length > visibleNotesCount && !isLocked && (
            <div className="flex justify-center pb-8 pt-4">
              <button 
                onClick={handleLoadMore}
                className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold uppercase tracking-widest border border-white/5 transition-colors"
              >
                {t('notes.loadMore', 'Cargar más')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )}

 {subView === 'JOURNAL' && (
 <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
 {isLocked ? (
 <div className="flex flex-col items-center justify-center h-[50vh] text-white/40 gap-4 animate-in fade-in zoom-in-95 px-4">
<button onClick={() => setShowPasswordPrompt(true)} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-lg">{t('notes.journal.unlock', 'Unlock Journal')}</button>
 </div>
 ) : (
 <>
 <div className="flex justify-between items-end px-6 mb-6 relative">
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
  {journalViewMode === 'CALENDAR' && (
  <button onClick={() => setShowCalendarSettings(!showCalendarSettings)} className={`p-2.5 rounded-full border transition-colors ${showCalendarSettings ? 'bg-white text-black border-white' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'}`} title={t('notes.calendarSettings', 'Calendar Settings')}><Settings size={18} /></button>
  )}
  </div>
  </div>

  {/* Settings Panel */}
  {showCalendarSettings && (
    <div className="absolute right-6 top-16 bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-xl z-50 w-64 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <span className="text-xs font-bold text-white uppercase tracking-wider">{t('notes.calendarSettings', 'Calendar Settings')}</span>
        <button onClick={() => setShowCalendarSettings(false)} className="text-white/40 hover:text-white/80 transition-colors"><X size={14} /></button>
      </div>
      
      {/* Opacity slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-bold text-white/50 uppercase">
          <span>{t('notes.cellOpacity', 'Cell Opacity')}</span>
          <span>{Math.round(calendarCellOpacity * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0.1" 
          max="1.0" 
          step="0.05"
          value={calendarCellOpacity}
          onChange={(e) => setCalendarCellOpacity(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
        />
      </div>

      {/* Future days toggle */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-white/50 uppercase">{t('notes.showFutureDays', 'Show Future Days')}</span>
        <button 
          onClick={() => setCalendarShowFuture(!calendarShowFuture)}
          className={`w-8 h-4 rounded-full relative transition-colors duration-200 border border-white/10 ${calendarShowFuture ? 'bg-emerald-500' : 'bg-white/5'}`}
        >
          <span className={`block w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${calendarShowFuture ? 'right-0.5' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  )}
  </div>
 
 {journalViewMode === 'CALENDAR' ? (
 <>
 <div className="grid grid-cols-7 gap-2 px-4 text-center mb-2">{(() => {
      const rawInitials = t('common.weekdays.initials', { returnObjects: true });
      let weekdayInitials = Array.isArray(rawInitials) ? rawInitials : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
      
      const weekStartDay = getWeekStartDay();
      if (weekStartDay === 1) {
          weekdayInitials = [...weekdayInitials.slice(1), weekdayInitials[0]];
      }

      return weekdayInitials.map((d: string, i: number) => (
        <span key={i} className="text-[10px] font-bold text-white/30">{d}</span>
      ));
    })()}</div>
 <div className="grid grid-cols-7 gap-3 px-4 pb-24 flex-1 content-start animate-in fade-in duration-200">
 {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
 {monthMeta.map(({ day, date, mood, isToday, isFuture, entry, specialEvent, dayQuests }) => {
 const entryThemeId = entry?.theme || 'slate';
 const entryColor = themeColorMap.get(entryThemeId);
 const hasEntry = !!entry;

 const borderColor = hasEntry && entryColor ? entryColor : (isToday ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)');
 const bgColor = hasEntry && entryColor ? `${entryColor}10` : (mood ? `${mood.color}10` : (isToday ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'));
 
 // Future day and visibility handling
 const isCellHidden = isFuture && !calendarShowFuture;
 
 if (isCellHidden) {
   return (
     <div 
       key={day} 
       className="aspect-[4/5] rounded-[18px] opacity-0 pointer-events-none cursor-default"
     />
   );
 }

 // Calculate actual cell opacity based on configuration
 const actualOpacity = isToday ? 1.0 : (isFuture ? 0.35 * calendarCellOpacity : calendarCellOpacity);

 return (
 <button 
 key={day} 
 onClick={() => {
   openJournal(date);
 }} 
 data-tour={isToday ? "journal-today-btn" : undefined}
 style={{ 
 borderColor: borderColor,
 backgroundColor: bgColor,
 opacity: actualOpacity,
 boxShadow: mood ? `0 0 10px ${mood.color}15` : (hasEntry && entryColor ? `0 0 5px ${entryColor}10` : 'none')
 }}
 className="aspect-[4/5] rounded-[18px] flex flex-col items-center justify-center relative transition-transform active:scale-95 group border hover:bg-white/5 cursor-pointer animate-in fade-in duration-200"
 >
 {/* Mood color overlay */}
 {mood && <div className="absolute inset-0 opacity-10 bg-gradient-to-b from-transparent to-current transition-opacity pointer-events-none animate-in fade-in" style={{ color: mood.color }} />}
 
 {/* Mood emoji centered */}
 {mood ? (
   <span className="text-2xl group-hover:scale-110 transition-transform duration-200 drop-shadow-md z-10">
     {mood.icon}
   </span>
 ) : isFuture ? (
   <Lock size={14} className="text-white/20 z-10" />
 ) : (
   <span className="text-lg opacity-10 group-hover:opacity-30 transition-opacity z-10">📝</span>
 )}
 
 {/* Special Event in top-left */}
 {specialEvent && (
   <div className="absolute top-1.5 left-2 text-[10px] sm:text-xs hover:scale-110 transition-transform duration-200 drop-shadow-md z-20">
     {specialEvent.type === 'BIRTHDAY' ? '🎂' : (specialEvent.type === 'ANNIVERSARY' ? '❤️' : '⭐')}
   </div>
 )}

 {/* Quest indicators in bottom-left */}
 {dayQuests && dayQuests.length > 0 && (
   <div className="absolute bottom-1.5 left-2 flex gap-0.5 items-center z-20">
     {dayQuests.slice(0, 3).map((q, i) => (
       <div 
         key={q.id || i} 
         className="w-1.5 h-1.5 rounded-full" 
         style={{ backgroundColor: q.journalIconColor || '#3b82f6' }}
         title={q.title}
       />
     ))}
     {dayQuests.length > 3 && (
       <span className="text-[7px] font-black text-white/50 leading-none ml-0.5">+</span>
     )}
   </div>
 )}

 {/* Date number in bottom-right */}
 <div className="absolute bottom-1.5 right-2 z-20">
   <span className={`text-[10px] sm:text-[11px] font-black tracking-tight ${isToday ? 'text-white' : 'text-white/30 group-hover:text-white/80'} drop-shadow-sm`}>
     {day}
   </span>
 </div>
 </button>
 );
 })}
 </div>
 </>
 ) : (
 <div className="flex-1 px-4 pb-24 animate-in slide-in-from-right-8 duration-200">
 <div className="relative">
 {/* Notebook Binding Effect */}
 <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-red-500/10 z-0 hidden sm:block" />
 
 <div className="space-y-1">
 {monthMeta.map(({ day, date, entry, title, mood, isToday, isFuture, specialEvent, dayQuests }) => {
 const entryThemeId = entry?.theme || 'slate';
 const entryColor = themeColorMap.get(entryThemeId) || '#fff';
 
 // Future list view toggle
 if (isFuture && !calendarShowFuture) return null;

 return (
 <div key={day} className="relative group">
 <button 
 onClick={() => {
   openJournal(date);
 }}
 data-tour={isToday ? "journal-today-btn" : undefined}
 style={{ borderLeftColor: entry ? entryColor : 'transparent' }}
 className="w-full text-left py-3 px-2 sm:px-8 flex items-baseline gap-4 relative z-10 border-l-2 hover:bg-white/5 active:scale-[0.995] transition-transform cursor-pointer"
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
 
 <SpecialEventsHub isOpen={showEventsHub} onClose={closeEventsHub} onOpenSettings={() => setConfigOpen(true)} isPro={isPro} onOpenPro={onShowPro} />
 <SecureNotesHub isOpen={showSecureHub} onClose={closeSecureHub} onOpenSettings={() => setConfigOpen(true)} />

  {/* Config & Security Modals */}
  <NotesConfigModal 
  isOpen={configOpen} 
  onClose={() => setConfigOpen(false)} 
  onSave={handleSaveConfig}
  initialConfig={config}
  isPro={isPro}
  onOpenPro={onShowPro}
  />

  {/* Folder Modal */}
  <AnimatePresence>
    {isFolderModalOpen && (
      <div className="fixed inset-0 z-[350] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
        >
          <div className="flex justify-between items-center pb-3 border-b border-white/10">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Folder size={18} className="text-cyan-400" />
              <span>{editingFolder ? 'Editar Carpeta' : 'Nueva Carpeta'}</span>
            </h3>
            <button onClick={() => setIsFolderModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1.5">Nombre de la Carpeta</label>
              <input 
                type="text" 
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Ej. Personal, Trabajo, Ideas..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1.5">Icono / Emoji</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {['📁', '💼', '💡', '📚', '🎨', '🎯', '🚀', '🔥', '⭐', '🔑', '❤️', '🧠', '⚡'].map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFolderIcon(icon)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${folderIcon === icon ? 'bg-white/20 scale-110 border border-white/40' : 'bg-white/5 opacity-60 hover:opacity-100'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsFolderModalOpen(false)}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveFolder}
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-lg shadow-cyan-500/20"
            >
              {editingFolder ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
 
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

  {/* Note / Journal Editor Portal Modal */}
  {editorMode !== 'NONE' && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 pt-16 sm:pt-24 pb-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl sm:max-w-2xl mx-auto flex flex-col glass-editor rounded-[32px] sm:rounded-[36px] overflow-hidden border border-white/15 shadow-2xl relative bg-[#0f0f18]/95 my-auto max-h-[82vh] transition-all">
        <div className="absolute top-0 left-0 right-0 h-48 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${activeThemeColor}, transparent 75%)` }} />

        {/* Top Header Controls (Matching screenshot UI) */}
        <div className="flex flex-wrap sm:flex-nowrap justify-between items-center p-3 sm:p-4 border-b border-white/10 relative z-20 gap-2 bg-[#0d0d14]/90">
          <div className="flex items-center gap-2">
            <button 
              onClick={closeEditor} 
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all border border-white/10 active:scale-95"
              title="Cerrar editor"
            >
              <ArrowLeft size={18} />
            </button>

            {editorMode === 'NOTE' && (
              <button 
                onClick={() => setDraftIsFavorite(!draftIsFavorite)} 
                className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center ${
                  draftIsFavorite 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]' 
                    : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                }`} 
                title="Marcar como favorito"
              >
                <Star size={16} fill={draftIsFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-1 min-w-0">
            {editorMode === 'NOTE' && (
              <div className="relative max-w-[140px]">
                <select 
                  value={draftFolderId || ''} 
                  onChange={(e) => setDraftFolderId(e.target.value || undefined)} 
                  className="w-full bg-[#181822] border border-white/15 rounded-full pl-3 pr-7 py-1.5 text-xs font-bold text-white outline-none cursor-pointer hover:border-white/30 transition-colors truncate appearance-none"
                >
                  <option value="">📁 Sin Carpeta</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.icon || '📁'} {f.name}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-[9px]">▼</div>
              </div>
            )}

            <button
              onClick={() => handleExportNoteMarkdown(draftTitle, draftBlocks)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10"
              title="Exportar como Markdown (.md)"
            >
              <Download size={15} />
            </button>

            <BlueprintSelector onSelect={(newBlocks) => setDraftBlocks(prev => [...prev, ...newBlocks])} />

            <DropdownThemePicker 
              currentTheme={draftTheme} 
              onSelect={setDraftTheme} 
              projects={editorMode === 'NOTE' ? projects : null} 
              activeProject={draftProjectId} 
              onSelectProject={setDraftProjectId} 
            />

            {editorMode === 'NOTE' && (
              <button 
                onClick={handleDelete} 
                className="p-2 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                title="Eliminar nota"
              >
                <Trash2 size={16} />
              </button>
            )}

            <button 
              onClick={handleSave} 
              className="h-9 px-5 bg-white text-black font-extrabold text-xs uppercase tracking-wider rounded-full hover:scale-105 active:scale-95 transition-transform shadow-md flex items-center justify-center whitespace-nowrap ml-1"
            >
              {t('notes.save', 'GUARDAR')}
            </button>
          </div>
        </div>

        {/* Editor Body Scrollable Area */}
        <div ref={editorScrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 relative">
          {editorMode === 'NOTE' ? (
            <div className="max-w-2xl mx-auto space-y-4">
              {draftProjectId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Briefcase size={12} className="text-cyan-400"/>
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wide">
                    {projects.find((p) => p.id === draftProjectId)?.title}
                  </span>
                </div>
              )}

              {/* Clean Title Input (No clipping!) */}
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={t('notes.untitledPlaceholder', 'Título de la Nota...')}
                className="w-full bg-transparent text-2xl sm:text-4xl font-black text-white placeholder:text-white/20 outline-none leading-normal tracking-tight border-b border-white/10 pb-3 mb-4"
              />

              {/* Word + Notion Clone Rich Block Editor */}
              <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block">
                {draftDate.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>

              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={t('notes.untitledPlaceholder', 'Título de la Entrada...')}
                className="w-full bg-transparent text-2xl sm:text-3xl font-black text-white placeholder:text-white/20 outline-none leading-normal tracking-tight text-center border-b border-white/10 pb-3"
              />

              <div className="inline-flex justify-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                {MOODS.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => { setDraftMood(m.id); setMoodSplash(m.id); }} 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-transform ${draftMood === m.id ? 'bg-white/10 scale-110 shadow-sm ring-1 ring-white/20' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>

              <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
            </div>
          )}
        </div>

        {/* Editor Bottom Footer Stats Bar */}
        <div className="px-6 py-2 bg-[#0a0a10] border-t border-white/5 flex items-center justify-between text-[11px] text-white/40 font-mono">
          <div className="flex items-center gap-4">
            <span>Palabras: <strong className="text-white/80">{draftBlocks.reduce((acc, b) => acc + (b.content ? b.content.trim().split(/\s+/).filter(Boolean).length : 0), 0)}</strong></span>
            <span>Caracteres: <strong className="text-white/80">{draftBlocks.reduce((acc, b) => acc + (b.content ? b.content.length : 0), 0)}</strong></span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}
  <SaveBlueprintModal isOpen={showSaveBlueprintModal} onClose={() => setShowSaveBlueprintModal(false)} currentBlocks={draftBlocks} />
 
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

  {isLibraryOpen && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#07070a] text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[#0f0f16] border-b border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-lg">
         <button
           onClick={() => setLibrarySidebarOpen(!librarySidebarOpen)}
           className="sm:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10 shrink-0"
         >
           <Menu size={18} />
         </button>

         <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
           <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-purple-600/20 text-cyan-400 border border-cyan-500/30 shadow-md shrink-0">
             <BookOpen size={20} className="sm:w-6 sm:h-6" />
           </div>
           <div className="min-w-0">
             <h2 className="text-sm sm:text-lg font-black text-white tracking-tight truncate">BIBLIOTECA</h2>
             <p className="text-[10px] text-white/50 hidden sm:block">Gestión inteligente de carpetas, subcarpetas y notas</p>
           </div>
         </div>

         <div className="relative flex-1 max-w-[180px] sm:max-w-md mx-1 sm:mx-2">
           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
           <input
             type="text"
             value={librarySearchQuery}
             onChange={(e) => setLibrarySearchQuery(e.target.value)}
             placeholder="Buscar..."
             className="w-full pl-8 pr-7 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all caret-cyan-400"
             style={{ WebkitAppearance: 'none', color: 'white' }}
           />
           {librarySearchQuery && (
             <button onClick={() => setLibrarySearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
               <X size={13} />
             </button>
           )}
         </div>

         <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
           <button
             onClick={() => openCreateFolderModal(selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' ? selectedFolderId : undefined)}
             className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0"
           >
             <FolderPlus size={15} />
             <span className="hidden sm:inline">+ Carpeta</span>
           </button>

           <button
             onClick={() => setIsLibraryOpen(false)}
             className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors border border-white/10 shrink-0"
             title="Cerrar Biblioteca"
           >
             <X size={18} />
           </button>
         </div>
       </div>

      {folders.some(f => f.isPinned) && (
        <div className="bg-[#0b0b10] border-b border-cyan-500/20 px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-inner">
          <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />
          {folders.filter(f => f.isPinned).map(pinned => {
            const isSelected = selectedFolderId === pinned.id;
            const count = getFolderTotalNotesCount(pinned.id);
            return (
              <button
                key={pinned.id}
                onClick={() => { setSelectedFolderId(pinned.id); setLibrarySidebarOpen(false); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
                  isSelected
                    ? 'bg-cyan-500 text-black border-cyan-300 ring-2 ring-cyan-400/40 scale-105'
                    : 'bg-white/5 hover:bg-white/15 text-white border-white/10'
                }`}
              >
                <span>{pinned.icon || '📁'}</span>
                <span>{pinned.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-white/60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {librarySidebarOpen && (
           <div className="fixed inset-0 bg-black/60 z-[100] sm:hidden" onClick={() => setLibrarySidebarOpen(false)} />
         )}

        <div className={`${librarySidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 fixed sm:relative inset-y-0 left-0 z-[101] sm:z-auto w-[280px] sm:w-72 md:w-80 bg-[#0c0c12] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-4 sm:p-3 gap-4 transition-transform duration-300 ease-out shadow-2xl sm:shadow-none`}>
          
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 mb-1 block">Espacios Principales</span>
            
            <button
              onClick={() => { setSelectedFolderId('ALL'); setLibrarySidebarOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm sm:text-xs font-bold transition-all border ${
                selectedFolderId === 'ALL'
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                  : 'bg-transparent border-transparent hover:bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-blue-400" />
                <span>Todas las Notas</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/60">{notes.length}</span>
            </button>

            <button
              onClick={() => { setSelectedFolderId('FAVORITES'); setLibrarySidebarOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm sm:text-xs font-bold transition-all border ${
                selectedFolderId === 'FAVORITES'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                  : 'bg-transparent border-transparent hover:bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" fill="currentColor" />
                <span>Favoritos</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{notes.filter(n => n.isFavorite).length}</span>
            </button>

            <button
              onClick={() => { setSelectedFolderId('UNCATEGORIZED'); setLibrarySidebarOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm sm:text-xs font-bold transition-all border ${
                selectedFolderId === 'UNCATEGORIZED'
                  ? 'bg-slate-600/20 border-white/30 text-white shadow-md'
                  : 'bg-transparent border-transparent hover:bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-slate-400" />
                <span>Sin Carpeta</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/60">{notes.filter(n => !n.folderId).length}</span>
            </button>
          </div>

          <div className="w-full h-[1px] bg-white/5" />

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Árbol de Carpetas</span>
              <button
                onClick={() => openCreateFolderModal()}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Crear Carpeta Raíz"
              >
                <Plus size={14} />
              </button>
            </div>

            {folders.filter(f => !f.parentId).length === 0 ? (
              <p className="text-xs text-white/30 italic px-3 py-4 text-center">No hay carpetas creadas aún.</p>
            ) : (
              <div className="space-y-0.5">
                {folders.filter(f => !f.parentId).map(rootFolder => {
                  const renderTree = (folder: NoteFolder, depth = 0): React.ReactNode => {
                    const children = folders.filter(f => f.parentId === folder.id);
                    const hasChildren = children.length > 0;
                    const isExpanded = expandedFolderIds.has(folder.id);
                    const isSelected = selectedFolderId === folder.id;
                    const totalCount = getFolderTotalNotesCount(folder.id);
                    const color = folder.color || '#3b82f6';

                    return (
                      <div key={folder.id} className="flex flex-col">
                        <div
                          onClick={() => { setSelectedFolderId(folder.id); setLibrarySidebarOpen(false); }}
                          className={`group/item flex items-center justify-between py-2.5 sm:py-1.5 px-2.5 rounded-xl transition-all cursor-pointer select-none border ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold shadow-md'
                              : 'bg-transparent border-transparent hover:bg-white/5 text-white/80 hover:text-white'
                          }`}
                          style={{ paddingLeft: `${Math.max(10, depth * 14 + 10)}px` }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {hasChildren ? (
                              <button
                                onClick={(e) => toggleFolderExpand(folder.id, e)}
                                className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"
                              >
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                            ) : (
                              <span className="w-3.5 h-3.5 inline-block shrink-0" />
                            )}
                            <span className="text-sm shrink-0" style={{ color }}>{folder.icon || '📁'}</span>
                            <span className="text-xs truncate">{folder.name}</span>
                          </div>

                          <div className="flex items-center gap-1 opacity-70 group-hover/item:opacity-100 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFolderId(folder.id);
                                setLibrarySidebarOpen(false);
                                setIsLibraryOpen(false);
                              }}
                              className="px-2 py-0.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] uppercase flex items-center gap-1 transition-transform active:scale-95 shadow-sm"
                              title="Ver notas de esta carpeta"
                            >
                              <Eye size={11} />
                              <span>Ver</span>
                            </button>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white/60">
                              {totalCount}
                            </span>
                            <div className="hidden group-hover/item:flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openCreateFolderModal(folder.id)}
                                className="p-1 rounded bg-white/10 hover:bg-cyan-500/20 text-white/70 hover:text-cyan-300"
                                title="Añadir subcarpeta"
                              >
                                <Plus size={11} />
                              </button>
                              <button
                                onClick={(e) => handleToggleFolderPin(folder, e)}
                                className={`p-1 rounded ${folder.isPinned ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/50 hover:text-white'}`}
                                title={folder.isPinned ? "Desanclar" : "Anclar a inicio"}
                              >
                                📌
                              </button>
                              <button
                                onClick={(e) => openEditFolderModal(folder, e)}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/50 hover:text-white"
                                title="Editar"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {hasChildren && isExpanded && (
                          <div className="flex flex-col gap-0.5 border-l border-white/10 ml-3.5 pl-1 my-0.5">
                            {children.map(child => renderTree(child, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return renderTree(rootFolder);
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#09090e] overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 min-h-0">
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-white/5 text-xs text-white/60 font-medium">
            <button onClick={() => setSelectedFolderId('ALL')} className="hover:text-white transition-colors flex items-center gap-1">
              <BookOpen size={14} className="text-cyan-400" />
              <span>Biblioteca</span>
            </button>

            {folderBreadcrumbs.map((bFolder, index) => (
              <React.Fragment key={bFolder.id}>
                <ChevronRight size={13} className="text-white/30" />
                <button
                  onClick={() => setSelectedFolderId(bFolder.id)}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    index === folderBreadcrumbs.length - 1 ? 'text-white font-bold' : ''
                  }`}
                >
                  <span>{bFolder.icon || '📁'}</span>
                  <span>{bFolder.name}</span>
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Current Folder / View Header */}
          <div className="flex flex-col gap-3 sm:gap-4 bg-gradient-to-r from-white/[0.04] to-transparent border border-white/10 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl">
             <div className="flex items-center gap-3 sm:gap-4">
               <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl shadow-inner shrink-0">
                 {selectedFolderId === 'ALL' ? '📂' : selectedFolderId === 'FAVORITES' ? '⭐' : selectedFolderId === 'UNCATEGORIZED' ? '📦' : folders.find(f => f.id === selectedFolderId)?.icon || '📁'}
               </div>
               <div className="min-w-0 flex-1">
                 <div className="flex items-center gap-2 flex-wrap">
                   <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">
                     {selectedFolderId === 'ALL' ? 'Todas las Notas' : selectedFolderId === 'FAVORITES' ? 'Notas Favoritas' : selectedFolderId === 'UNCATEGORIZED' ? 'Sin Carpeta' : folders.find(f => f.id === selectedFolderId)?.name || 'Carpeta'}
                   </h1>
                   {selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' && folders.find(f => f.id === selectedFolderId)?.isPinned && (
                     <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30 shrink-0">📌</span>
                   )}
                 </div>
                 <p className="text-[11px] sm:text-xs text-white/50 font-mono mt-0.5">
                   {filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}
                 </p>
               </div>
             </div>

             <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
               {selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' && (
                 <>
                   <button
                     onClick={() => openCreateFolderModal(selectedFolderId)}
                     className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all border border-white/10 shadow-sm"
                   >
                     <FolderPlus size={13} />
                     <span>+ Sub</span>
                   </button>
                   <button
                     onClick={() => { const f = folders.find(folder => folder.id === selectedFolderId); if (f) handleToggleFolderPin(f); }}
                     className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition-all border border-amber-500/20"
                   >
                     <span>📌</span>
                   </button>
                   <button
                     onClick={() => { const f = folders.find(folder => folder.id === selectedFolderId); if (f) openEditFolderModal(f); }}
                     className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10"
                     title="Editar carpeta"
                   >
                     <Pencil size={14} />
                   </button>
                 </>
               )}

               <button
                 onClick={() => { setIsLibraryOpen(false); createNoteInFolder(selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' ? selectedFolderId : undefined); }}
                 className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-cyan-500 text-black font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md ml-auto"
               >
                 <Plus size={14} />
                 <span>+ Nota</span>
               </button>
             </div>
           </div>

          {/* Sub-Folders Carousel / Grid inside active folder */}
          {selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' && folders.filter(f => f.parentId === selectedFolderId).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder size={14} />
                <span>Subcarpetas Directas ({folders.filter(f => f.parentId === selectedFolderId).length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {folders.filter(f => f.parentId === selectedFolderId).map(sub => {
                  const subCount = getFolderTotalNotesCount(sub.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedFolderId(sub.id)}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.07] transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/5 shrink-0">{sub.icon || '📁'}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">{sub.name}</h4>
                          <span className="text-[10px] text-white/40 font-mono">{subCount} notas</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFolderId(sub.id);
                          setLibrarySidebarOpen(false);
                          setIsLibraryOpen(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] uppercase flex items-center gap-1 shadow-md transition-transform active:scale-95 shrink-0"
                      >
                        <Eye size={12} />
                        <span>Ver Notas</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  )}

  {/* Batch Move Folder Selector Modal Portal */}
  {isBatchMoveOpen && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsBatchMoveOpen(false)} />
      <div className="relative z-10 w-full max-w-sm bg-[#121218] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-white">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Folder size={16} className="text-cyan-400" />
            <span>Mover {selectedNoteIds.length} Notas a...</span>
          </h3>
          <button onClick={() => setIsBatchMoveOpen(false)} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          <button
            onClick={() => handleBatchMoveNotes(undefined)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-xs font-bold text-left transition-all border border-white/5 hover:border-cyan-500/30"
          >
            <span className="flex items-center gap-2">📂 Sin Carpeta (Raíz)</span>
          </button>

          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => handleBatchMoveNotes(f.id)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-xs font-bold text-left transition-all border border-white/5 hover:border-cyan-500/30"
            >
              <span className="flex items-center gap-2">
                <span>{f.icon || '📁'}</span>
                <span>{f.name}</span>
              </span>
              <span className="text-[10px] font-mono text-white/40">{getFolderTotalNotesCount(f.id)} notas</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )}

  {/* Folder Creation & Editing Modal Portal */}
  {isFolderModalOpen && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsFolderModalOpen(false)}
      />
      
      <div className="relative z-10 w-full max-w-md bg-[#121218] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <FolderPlus size={18} className="text-cyan-400" />
            <span>{editingFolder ? 'Editar Carpeta' : 'Nueva Carpeta / Subcarpeta'}</span>
          </h3>
          <button onClick={() => setIsFolderModalOpen(false)} className="p-1 rounded-full text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">Nombre de la Carpeta</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ej: Proyectos 2026, Ideas, Finanzas..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
              autoFocus
            />
          </div>

          {/* Parent Folder Selector (Subfolder nesting) */}
          <div>
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">Carpeta Padre (Opcional)</label>
            <select
              value={folderParentId || ''}
              onChange={(e) => setFolderParentId(e.target.value || undefined)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a22] border border-white/10 text-xs text-white outline-none cursor-pointer"
            >
              <option value="">📁 Ninguna (Carpeta Raíz)</option>
              {folders
                .filter(f => f.id !== editingFolder?.id)
                .map(f => (
                  <option key={f.id} value={f.id}>{f.icon || '📁'} {f.name}</option>
                ))}
            </select>
          </div>

          {/* Icon & Color Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">Icono (Emoji)</label>
              <input
                type="text"
                value={folderIcon}
                onChange={(e) => setFolderIcon(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-center text-lg text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">Color Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={folderColor}
                  onChange={(e) => setFolderColor(e.target.value)}
                  className="w-10 h-9 rounded-xl bg-transparent border border-white/10 cursor-pointer"
                />
                <span className="text-xs font-mono text-white/60">{folderColor}</span>
              </div>
            </div>
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-amber-400" fill={folderIsPinned ? 'currentColor' : 'none'} />
              <span className="text-xs font-bold text-white">Anclar a la Barra de Inicio</span>
            </div>
            <button
              type="button"
              onClick={() => setFolderIsPinned(!folderIsPinned)}
              className={`w-9 h-5 rounded-full relative transition-colors border border-white/10 ${folderIsPinned ? 'bg-cyan-500' : 'bg-white/10'}`}
            >
              <span className={`block w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${folderIsPinned ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => setIsFolderModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:text-white text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveFolder}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs uppercase hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            {editingFolder ? 'Guardar Cambios' : 'Crear Carpeta'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}

 </div>
 );
});
