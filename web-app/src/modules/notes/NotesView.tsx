import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, BarChart3, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Briefcase, Trash2, Lock, Calendar, AlignLeft, Filter, X, Cake, Gift, Settings, ListTodo, List, Repeat, Star, Folder, FolderPlus, FolderOpen, ArrowUpDown, Pencil, BookOpen, Search, Menu, Eye, EyeOff, LayoutGrid, CheckSquare, Square, Book, GraduationCap, Layers, Sparkles, Undo2, Redo2, Check, DollarSign, Dumbbell, Code2, Clock, Palette, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Note, NoteFolder, JournalEntry, NoteBlock, Project, Quest } from '../../types';
import { BlockEditor } from './components/BlockEditor';
import { DropdownThemePicker, NOTE_THEMES } from './components/DropdownThemePicker';
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
import { DynamicIcon } from '../../components/DynamicIcon';
import { useAuth } from '@/context/AuthContext';
import { persistenceService } from '@/services/persistenceService';
import { IconPicker } from '../dashboard/components/IconPicker';

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

const formatTimestampWithTime = (ts?: string | number) => {
  if (!ts) return 'Reciente';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return 'Reciente';
  const dateStr = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} a las ${timeStr}`;
};
const getPlainTextFromContent = (content?: string): string => {
  if (!content) return '';
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
};

const getCleanCharacterCount = (blocks: NoteBlock[]): number => {
  if (!blocks || blocks.length === 0) return 0;
  return blocks.reduce((acc, b) => {
    const plainText = getPlainTextFromContent(b.content);
    const noSpaces = plainText.replace(/\s+/g, '');
    return acc + noSpaces.length;
  }, 0);
};

const getCleanWordCount = (blocks: NoteBlock[]): number => {
  if (!blocks || blocks.length === 0) return 0;
  return blocks.reduce((acc, b) => {
    const plainText = getPlainTextFromContent(b.content);
    const words = plainText.trim().split(/\s+/).filter(Boolean);
    return acc + words.length;
  }, 0);
};

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
  const [folderTemplateType, setFolderTemplateType] = useState<'GENERAL' | 'BOOK' | 'STUDY' | 'PROJECT' | 'FINANCE' | 'FITNESS' | 'CREATIVE' | 'CODE'>('GENERAL');
  // Book Template
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookTotalPages, setBookTotalPages] = useState<number>(300);
  const [bookCurrentPage, setBookCurrentPage] = useState<number>(0);
  const [bookStartYear, setBookStartYear] = useState('');
  const [bookRating, setBookRating] = useState<number>(5);
  const [bookGenre, setBookGenre] = useState('');
  // Study Template
  const [studyCourseName, setStudyCourseName] = useState('');
  const [studyProfessor, setStudyProfessor] = useState('');
  const [studyTotalLessons, setStudyTotalLessons] = useState<number>(20);
  const [studyCompletedLessons, setStudyCompletedLessons] = useState<number>(0);
  const [studyNextExamDate, setStudyNextExamDate] = useState('');
  const [studyTargetGrade, setStudyTargetGrade] = useState('');
  // Project Template
  const [projectClient, setProjectClient] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');
  const [projectTotalDeliverables, setProjectTotalDeliverables] = useState<number>(10);
  const [projectCompletedDeliverables, setProjectCompletedDeliverables] = useState<number>(0);
  const [projectStatus, setProjectStatus] = useState<'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED'>('IN_PROGRESS');
  // Finance Template
  const [financeBudget, setFinanceBudget] = useState<number>(1000);
  const [financeCurrent, setFinanceCurrent] = useState<number>(0);
  const [financeCurrency, setFinanceCurrency] = useState('$');
  // Fitness Template
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [fitnessTargetSessions, setFitnessTargetSessions] = useState<number>(4);
  const [fitnessCompletedSessions, setFitnessCompletedSessions] = useState<number>(0);
  const [fitnessTargetMetric, setFitnessTargetMetric] = useState('');
  // Creative & Code Templates
  const [creativeConceptStatus, setCreativeConceptStatus] = useState('En Desarrollo');
  const [creativePlatform, setCreativePlatform] = useState('YouTube');
  const [codeStack, setCodeStack] = useState('React / Node');
  const [codeRepoUrl, setCodeRepoUrl] = useState('');

  const [showIconPickerModal, setShowIconPickerModal] = useState(false);
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
 const [draftCustomEmoji, setDraftCustomEmoji] = useState<string | undefined>(undefined);
 const [draftProjectId, setDraftProjectId] = useState<string | undefined>(undefined);
 const [draftFolderId, setDraftFolderId] = useState<string | undefined>(undefined);
  const [draftIsFavorite, setDraftIsFavorite] = useState<boolean>(false);
  const [draftCreatedAt, setDraftCreatedAt] = useState<string | number | undefined>(undefined);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | undefined>(undefined);
  const [showNoteInfoPopover, setShowNoteInfoPopover] = useState(false);
 const [draftDate, setDraftDate] = useState<Date>(new Date());
 const [currentMonth, setCurrentMonth] = useState(new Date());
 const [showStats, setShowStats] = useState(false);
 const [showSaveBlueprintModal, setShowSaveBlueprintModal] = useState(false);
 const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'SINGLE' | 'BATCH', id?: string } | null>(null);
 const [moodSplash, setMoodSplash] = useState<string | null>(null);
 const [pendingOpenDate, setPendingOpenDate] = useState<Date | null>(null);

  // Custom Folder Picker Modal State
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isParentFolderPickerOpen, setIsParentFolderPickerOpen] = useState(false);
  const [folderPickerSearch, setFolderPickerSearch] = useState('');
  const [expandedFolderPickerIds, setExpandedFolderPickerIds] = useState<Set<string>>(new Set());

  // Solid Undo / Redo History State
  const historyRef = useRef<{ title: string; blocks: NoteBlock[] }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [, setHistoryVersion] = useState(0);
  const isUndoRedoRef = useRef(false);

  const openCreateFolderModal = (parentId?: string) => {
    setEditingFolder(null);
    setFolderName('');
    setFolderIcon('📁');
    setFolderColor('#3b82f6');
    setFolderParentId(parentId);
    setFolderIsPinned(false);
    setFolderTemplateType('GENERAL');
    setBookAuthor('');
    setBookTotalPages(300);
    setBookCurrentPage(0);
    setBookStartYear(new Date().getFullYear().toString());
    setBookRating(5);
    setBookGenre('');
    setStudyCourseName('');
    setStudyProfessor('');
    setStudyTotalLessons(20);
    setStudyCompletedLessons(0);
    setStudyNextExamDate('');
    setStudyTargetGrade('');
    setProjectClient('');
    setProjectDeadline('');
    setProjectTotalDeliverables(10);
    setProjectCompletedDeliverables(0);
    setProjectStatus('IN_PROGRESS');
    setFinanceBudget(1000);
    setFinanceCurrent(0);
    setFinanceCurrency('$');
    setFitnessGoal('');
    setFitnessTargetSessions(4);
    setFitnessCompletedSessions(0);
    setFitnessTargetMetric('');
    setCreativeConceptStatus('En Desarrollo');
    setCreativePlatform('YouTube');
    setCodeStack('React / Node');
    setCodeRepoUrl('');
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
    setFolderTemplateType(folder.templateType || 'GENERAL');
    setBookAuthor(folder.bookAuthor || '');
    setBookTotalPages(folder.bookTotalPages || 300);
    setBookCurrentPage(folder.bookCurrentPage || 0);
    setBookStartYear(folder.bookStartYear || new Date().getFullYear().toString());
    setBookRating(folder.bookRating || 5);
    setBookGenre(folder.bookGenre || '');
    setStudyCourseName(folder.studyCourseName || '');
    setStudyProfessor(folder.studyProfessor || '');
    setStudyTotalLessons(folder.studyTotalLessons || 20);
    setStudyCompletedLessons(folder.studyCompletedLessons || 0);
    setStudyNextExamDate(folder.studyNextExamDate || '');
    setStudyTargetGrade(folder.studyTargetGrade || '');
    setProjectClient(folder.projectClient || '');
    setProjectDeadline(folder.projectDeadline || '');
    setProjectTotalDeliverables(folder.projectTotalDeliverables || 10);
    setProjectCompletedDeliverables(folder.projectCompletedDeliverables || 0);
    setProjectStatus(folder.projectStatus || 'IN_PROGRESS');
    setFinanceBudget(folder.financeBudget || 1000);
    setFinanceCurrent(folder.financeCurrent || 0);
    setFinanceCurrency(folder.financeCurrency || '$');
    setFitnessGoal(folder.fitnessGoal || '');
    setFitnessTargetSessions(folder.fitnessTargetSessions || 4);
    setFitnessCompletedSessions(folder.fitnessCompletedSessions || 0);
    setFitnessTargetMetric(folder.fitnessTargetMetric || '');
    setCreativeConceptStatus(folder.creativeConceptStatus || 'En Desarrollo');
    setCreativePlatform(folder.creativePlatform || 'YouTube');
    setCodeStack(folder.codeStack || 'React / Node');
    setCodeRepoUrl(folder.codeRepoUrl || '');
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) {
      toast.error(t('notes.folderNameRequired', 'Ingrese el nombre de la carpeta'));
      return;
    }
    const folderPayload: Omit<NoteFolder, 'id' | 'createdAt'> = {
      name: folderName.trim(),
      icon: folderIcon,
      color: folderColor,
      parentId: folderParentId,
      isPinned: folderIsPinned,
      templateType: folderTemplateType,
      bookAuthor: bookAuthor.trim() || undefined,
      bookTotalPages: Number(bookTotalPages) || 300,
      bookCurrentPage: Number(bookCurrentPage) || 0,
      bookStartYear: bookStartYear.trim() || undefined,
      bookRating: Number(bookRating) || 5,
      bookGenre: bookGenre.trim() || undefined,
      studyCourseName: studyCourseName.trim() || undefined,
      studyProfessor: studyProfessor.trim() || undefined,
      studyTotalLessons: Number(studyTotalLessons) || 20,
      studyCompletedLessons: Number(studyCompletedLessons) || 0,
      studyNextExamDate: studyNextExamDate || undefined,
      studyTargetGrade: studyTargetGrade.trim() || undefined,
      projectClient: projectClient.trim() || undefined,
      projectDeadline: projectDeadline || undefined,
      projectTotalDeliverables: Number(projectTotalDeliverables) || 10,
      projectCompletedDeliverables: Number(projectCompletedDeliverables) || 0,
      projectStatus,
      financeBudget: Number(financeBudget) || 1000,
      financeCurrent: Number(financeCurrent) || 0,
      financeCurrency: financeCurrency || '$',
      fitnessGoal: fitnessGoal.trim() || undefined,
      fitnessTargetSessions: Number(fitnessTargetSessions) || 4,
      fitnessCompletedSessions: Number(fitnessCompletedSessions) || 0,
      fitnessTargetMetric: fitnessTargetMetric.trim() || undefined,
      creativeConceptStatus: creativeConceptStatus.trim() || undefined,
      creativePlatform: creativePlatform.trim() || undefined,
      codeStack: codeStack.trim() || undefined,
      codeRepoUrl: codeRepoUrl.trim() || undefined,
    };

    if (editingFolder) {
      await handleUpdateFolder({
        ...editingFolder,
        ...folderPayload
      });
      toast.success(t('notes.folderUpdated', 'Carpeta actualizada'));
    } else {
      await handleCreateFolder(folderPayload);
      toast.success(t('notes.folderCreated', 'Carpeta creada'));
    }
    setIsFolderModalOpen(false);
  };

  const handleBatchFavoriteNotes = async () => {
    if (selectedNoteIds.length === 0) return;
    const targetNotes = notes.filter(n => selectedNoteIds.includes(n.id));
    const allFav = targetNotes.every(n => n.isFavorite);
    for (const n of targetNotes) {
      await handleUpdateNote({ ...n, isFavorite: !allFav });
    }
    toast.success(!allFav ? 'Notas marcadas como favoritas ⭐' : 'Notas desmarcadas de favoritas');
    setSelectedNoteIds([]);
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
    setDeleteConfirmTarget({ type: 'BATCH' });
  };

  // Layout Mode & Library States
  const [notesLayoutMode, setNotesLayoutMode] = useState<'GRID' | 'LIST'>(() => 
    typeof window !== 'undefined' && localStorage.getItem('notes_layout_mode') === 'LIST' ? 'LIST' : 'GRID'
  );
  const [showRootFoldersInLibrary, setShowRootFoldersInLibrary] = useState(true);

  // Pagination & Infinite Scroll State
  const [visibleNotesCount, setVisibleNotesCount] = useState(100);

  const notesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = notesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (container.scrollHeight - container.scrollTop - container.clientHeight < 350) {
        setVisibleNotesCount(prev => prev + 50);
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
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

   const openNote = useCallback((note: Note) => { 
     setEditorMode('NOTE'); 
     setDraftId(note.id); 
     const initTitle = note.title || '';
     const initBlocks = note.blocks || [{ id: 'init-1', type: 'text', content: '' }];
     setDraftTitle(initTitle); 
     setDraftBlocks(initBlocks); 
     setDraftTheme(note.theme || 'slate'); 
     setDraftProjectId(note.projectId); 
     setDraftFolderId(note.folderId);
     setDraftIsFavorite(!!note.isFavorite);
     setDraftCreatedAt(note.createdAt || note.updatedAt || Date.now());
     setDraftUpdatedAt(note.updatedAt || new Date().toISOString());
     setShowNoteInfoPopover(false);
     historyRef.current = [{ title: initTitle, blocks: JSON.parse(JSON.stringify(initBlocks)) }];
     historyIndexRef.current = 0;
     setHistoryVersion(v => v + 1);
     onInteractionStart(); 
   }, [onInteractionStart]);
  
   const createNote = useCallback(() => { 
     if (!canCreateNote()) {
       if (onShowPro) onShowPro();
       return;
     }
     const newId = Date.now().toString(); 
     const nowIso = new Date().toISOString();
     const nowMs = Date.now();
     setEditorMode('NOTE'); 
     setDraftId(newId); 
     setDraftTitle(''); 
     const initBlocks = [{ id: 'init-1', type: 'text' as const, content: '' }];
     setDraftBlocks(initBlocks); 
     setDraftTheme('slate'); 
     setDraftProjectId(undefined); 
     setDraftFolderId(selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' ? selectedFolderId : undefined);
     setDraftIsFavorite(selectedFolderId === 'FAVORITES');
     setDraftCreatedAt(nowMs);
     setDraftUpdatedAt(nowIso);
     setShowNoteInfoPopover(false);
     historyRef.current = [{ title: '', blocks: JSON.parse(JSON.stringify(initBlocks)) }];
     historyIndexRef.current = 0;
     setHistoryVersion(v => v + 1);
     onInteractionStart(); 
   }, [onInteractionStart, canCreateNote, onShowPro, selectedFolderId]);

   const createNoteInFolder = useCallback((folderId?: string) => {
     if (!canCreateNote()) {
       if (onShowPro) onShowPro();
       return;
     }
     const newId = Date.now().toString();
     const nowIso = new Date().toISOString();
     const nowMs = Date.now();
     setEditorMode('NOTE');
     setDraftId(newId);
     setDraftTitle('');
     const initBlocks = [{ id: 'init-1', type: 'text' as const, content: '' }];
     setDraftBlocks(initBlocks);
     setDraftTheme('slate');
     setDraftProjectId(undefined);
     setDraftFolderId(folderId === 'UNCATEGORIZED' ? undefined : (folderId === 'FAVORITES' ? undefined : folderId));
     setDraftIsFavorite(folderId === 'FAVORITES');
     setDraftCreatedAt(nowMs);
     setDraftUpdatedAt(nowIso);
     setShowNoteInfoPopover(false);
     historyRef.current = [{ title: '', blocks: JSON.parse(JSON.stringify(initBlocks)) }];
     historyIndexRef.current = 0;
     setHistoryVersion(v => v + 1);
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
     
      const finalInitBlocks = initialBlocks.length > 0 ? initialBlocks : [{ id: 'init-1', type: 'text' as const, content: '' }];
      setDraftBlocks(finalInitBlocks);
      setDraftTitle(extractedTitle);
      setDraftMood(entry?.mood); 
      setDraftCustomEmoji(entry?.customEmoji);
      setDraftTheme(entry?.theme || 'slate'); 
      historyRef.current = [{ title: extractedTitle, blocks: finalInitBlocks }];
      historyIndexRef.current = 0;
      setHistoryVersion(v => v + 1);
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

  const handleSave = useCallback(() => { 
    if (editorMode === 'NOTE' && draftId) { 
      const hasTitle = draftTitle.trim().length > 0;
      const hasContent = draftBlocks.some(b => b.content && b.content.trim().length > 0);
      if (!hasTitle && !hasContent) {
        // DO NOT SAVE empty notes (no title AND no content)
        handleDeleteNote(draftId);
        return;
      }
      handleUpdateNote({ 
        id: draftId, 
        title: draftTitle, 
        blocks: draftBlocks, 
        theme: draftTheme, 
        projectId: draftProjectId, 
        folderId: draftFolderId,
        isFavorite: draftIsFavorite,
        createdAt: draftCreatedAt || Date.now(),
        updatedAt: new Date().toISOString() 
      }); 
    } else if (editorMode === 'JOURNAL' && draftId) { 
      let finalBlocks = [...draftBlocks];
      if (draftTitle.trim() && (!finalBlocks[0] || !finalBlocks[0].id.startsWith('title-'))) {
        finalBlocks.unshift({ id: 'title-' + Date.now(), type: 'text', content: draftTitle });
      }
      handleUpdateJournal({ id: draftId, date: toLocalISOString(draftDate), blocks: finalBlocks, mood: draftMood, customEmoji: draftCustomEmoji, theme: draftTheme, tags: [] }); 
    } 
  }, [editorMode, draftId, draftTitle, draftBlocks, draftTheme, draftProjectId, draftFolderId, draftIsFavorite, draftCreatedAt, draftDate, draftMood, draftCustomEmoji, handleUpdateNote, handleUpdateJournal, handleDeleteNote]);
 
  const handleDelete = () => { if (editorMode === 'NOTE' && draftId) { handleDeleteNote(draftId); } closeEditor(); };
  const closeEditor = useCallback(() => { 
    handleSave();
    setEditorMode('NONE'); 
    setDraftId(null); 
    onInteractionEnd(); 
    window.dispatchEvent(new CustomEvent('note-closed'));
  }, [handleSave, onInteractionEnd]);

  // Continuous Auto-Save effect while editing
  useEffect(() => {
    if (editorMode === 'NONE' || !draftId) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 250);
    return () => clearTimeout(timer);
  }, [draftTitle, draftBlocks, draftTheme, draftProjectId, draftFolderId, draftIsFavorite, draftMood, draftCustomEmoji, handleSave, editorMode, draftId]);

  // Solid Record history helper
  const recordHistoryState = useCallback((title: string, blocks: NoteBlock[]) => {
    if (isUndoRedoRef.current) return;
    const currentIdx = historyIndexRef.current;
    const currentStack = historyRef.current.slice(0, currentIdx + 1);
    const last = currentStack[currentStack.length - 1];

    const clonedBlocks = JSON.parse(JSON.stringify(blocks));

    if (last && last.title === title && JSON.stringify(last.blocks) === JSON.stringify(clonedBlocks)) {
      return;
    }

    const nextStack = [...currentStack.slice(-49), { title, blocks: clonedBlocks }];
    historyRef.current = nextStack;
    historyIndexRef.current = nextStack.length - 1;
    setHistoryVersion(v => v + 1);
  }, []);

  // Undo & Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      if (targetState) {
        setDraftTitle(targetState.title);
        setDraftBlocks(JSON.parse(JSON.stringify(targetState.blocks)));
      }
      setHistoryVersion(v => v + 1);
      setTimeout(() => { isUndoRedoRef.current = false; }, 60);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      if (targetState) {
        setDraftTitle(targetState.title);
        setDraftBlocks(JSON.parse(JSON.stringify(targetState.blocks)));
      }
      setHistoryVersion(v => v + 1);
      setTimeout(() => { isUndoRedoRef.current = false; }, 60);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Record history changes for Undo/Redo
  useEffect(() => {
    if (editorMode === 'NONE' || !draftId) return;
    if (isUndoRedoRef.current) return;
    const timer = setTimeout(() => {
      recordHistoryState(draftTitle, draftBlocks);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftTitle, draftBlocks, editorMode, draftId, recordHistoryState]);

  // Global Keyboard Shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    if (editorMode === 'NONE') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorMode, handleUndo, handleRedo]);
  /* addBlock removed (unused) */
 
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

  const folderNoteCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    const directCounts = new Map<string, number>();
    notes.forEach(n => {
      if (n.folderId) {
        directCounts.set(n.folderId, (directCounts.get(n.folderId) || 0) + 1);
      }
    });

    const computeTotal = (fId: string, visited = new Set<string>()): number => {
      if (map.has(fId)) return map.get(fId)!;
      if (visited.has(fId)) return 0;
      visited.add(fId);
      let total = directCounts.get(fId) || 0;
      const children = folders.filter(f => f.parentId === fId);
      for (const child of children) {
        total += computeTotal(child.id, visited);
      }
      map.set(fId, total);
      return total;
    };

    folders.forEach(f => computeTotal(f.id));
    return map;
  }, [notes, folders]);

  const getFolderTotalNotesCount = useCallback((folderId: string): number => {
    return folderNoteCountsMap.get(folderId) || 0;
  }, [folderNoteCountsMap]);

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

  const [showAllBreadcrumbs, setShowAllBreadcrumbs] = useState(false);
  const breadcrumbContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (breadcrumbContainerRef.current) {
      breadcrumbContainerRef.current.scrollTo({
        left: breadcrumbContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [selectedFolderId]);

  const displayedBreadcrumbs = useMemo(() => {
    if (folderBreadcrumbs.length <= 4 || showAllBreadcrumbs) {
      return { items: folderBreadcrumbs, isTruncated: false, hiddenCount: 0 };
    }
    return {
      items: folderBreadcrumbs.slice(-3),
      isTruncated: true,
      hiddenCount: folderBreadcrumbs.length - 3
    };
  }, [folderBreadcrumbs, showAllBreadcrumbs]);

  const draftFolderBreadcrumbs = useMemo(() => {
    if (!draftFolderId) return [];
    const path: NoteFolder[] = [];
    let currId: string | undefined = draftFolderId;
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
  }, [draftFolderId, folders]);

  const activeFolderObj = useMemo(() => {
    if (!draftFolderId) return undefined;
    return folders.find(f => f.id === draftFolderId);
  }, [draftFolderId, folders]);

  const rootFolders = useMemo(() => {
    return folders.filter(f => !f.parentId);
  }, [folders]);

  const renderFolderPickerTree = (folderList: NoteFolder[], depth = 0) => {
    const searchLower = folderPickerSearch.trim().toLowerCase();
    const filtered = folderList.filter(f => {
      if (!searchLower) return true;
      const matchesSelf = f.name.toLowerCase().includes(searchLower);
      const matchesChild = folders.some(child => child.parentId === f.id && child.name.toLowerCase().includes(searchLower));
      return matchesSelf || matchesChild;
    });

    if (filtered.length === 0 && depth === 0) {
      return (
        <div className="text-center py-6 text-xs text-white/40 italic">
          No se encontraron carpetas con "{folderPickerSearch}"
        </div>
      );
    }

    return filtered.map(folder => {
      const isSelected = draftFolderId === folder.id;
      const children = folders.filter(child => child.parentId === folder.id);
      const hasChildren = children.length > 0;
      const isExpanded = expandedFolderPickerIds.has(folder.id) || !!searchLower;

      return (
        <div key={folder.id} className="flex flex-col gap-1">
          <div
            className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              isSelected
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 ring-1 ring-cyan-400/30 font-bold'
                : 'bg-white/5 text-white/80 border-white/5 hover:bg-white/10 hover:text-white font-medium'
            }`}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
          >
            <div
              onClick={() => {
                setDraftFolderId(folder.id);
                setIsFolderPickerOpen(false);
              }}
              className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedFolderPickerIds(prev => {
                      const next = new Set(prev);
                      if (next.has(folder.id)) next.delete(folder.id);
                      else next.add(folder.id);
                      return next;
                    });
                  }}
                  className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 shrink-0"
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}

              <span className="text-base shrink-0">{folder.icon || '📁'}</span>
              <span className="truncate">{folder.name}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">
                {notes.filter(n => n.folderId === folder.id).length}
              </span>
              {isSelected && <Check size={14} className="text-cyan-400 shrink-0" />}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="flex flex-col gap-1 border-l border-white/10 ml-3 pl-1">
              {renderFolderPickerTree(children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

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

  /* Unused activeSpecialEvent & activeDayQuests removed */

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
 <div className="flex justify-center flex-[2] mt-0.5">
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
          {/* Compact Header Bar: Biblio + Interactive Folder Tree Breadcrumbs + Compact Recientes */}
          <div className="flex items-center justify-between gap-1.5 mb-5 w-full">
            <div className="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
              {/* Compact Biblioteca Button */}
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Abrir Biblioteca completa"
              >
                <BookOpen size={15} />
                <span className="hidden sm:inline">Biblio</span>
              </button>

              {/* Interactive Folder Tree Breadcrumb Trail */}
              <div
                ref={breadcrumbContainerRef}
                className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1 scroll-smooth"
              >
                <button
                  onClick={() => {
                    setSelectedFolderId('ALL');
                    setShowAllBreadcrumbs(false);
                  }}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-all border flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    selectedFolderId === 'ALL'
                      ? 'bg-white text-black border-white shadow-sm'
                      : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Ver todas las notas"
                >
                  <FolderOpen size={12} className={selectedFolderId === 'ALL' ? 'text-cyan-600' : 'text-cyan-400'} />
                  <span className={selectedFolderId === 'ALL' ? 'inline' : 'hidden sm:inline'}>
                    Todas {selectedFolderId === 'ALL' ? `(${notes.length})` : ''}
                  </span>
                </button>

                {selectedFolderId !== 'ALL' && selectedFolderId !== 'FAVORITES' && selectedFolderId !== 'UNCATEGORIZED' && (
                  <>
                    {displayedBreadcrumbs.isTruncated && (
                      <>
                        <ChevronRight size={10} className="text-white/30 shrink-0 mx-0" />
                        <button
                          onClick={() => setShowAllBreadcrumbs(true)}
                          className="px-1.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-medium bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 flex items-center gap-0.5 shrink-0 transition-colors"
                          title="Click para ver la ruta completa"
                        >
                          <span>... (+{displayedBreadcrumbs.hiddenCount})</span>
                        </button>
                      </>
                    )}

                    {displayedBreadcrumbs.items.map((bFolder) => {
                      const isCurrent = bFolder.id === selectedFolderId;
                      return (
                        <React.Fragment key={bFolder.id}>
                          <ChevronRight size={10} className="text-white/30 shrink-0 mx-0" />
                          <button
                            onClick={() => setSelectedFolderId(bFolder.id)}
                            title={bFolder.name}
                            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[11px] sm:text-xs transition-all border flex items-center gap-1 whitespace-nowrap shrink-0 max-w-[100px] sm:max-w-[130px] md:max-w-[160px] ${
                              isCurrent
                                ? 'bg-cyan-500 text-black border-cyan-300 font-bold shadow-md ring-1 ring-cyan-400/40'
                                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/15 font-medium'
                            }`}
                          >
                            <span className="shrink-0 text-xs">{bFolder.icon || '📁'}</span>
                            <span className="truncate max-w-[65px] sm:max-w-[90px] md:max-w-[120px]">{bFolder.name}</span>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </>
                )}

                {selectedFolderId === 'FAVORITES' && (
                  <>
                    <ChevronRight size={11} className="text-white/30 shrink-0 mx-0.5" />
                    <button className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shrink-0">
                      <Star size={13} fill="currentColor" />
                      <span>Favoritos</span>
                    </button>
                  </>
                )}

                {selectedFolderId === 'UNCATEGORIZED' && (
                  <>
                    <ChevronRight size={11} className="text-white/30 shrink-0 mx-0.5" />
                    <button className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-600/20 text-slate-200 border border-white/20 flex items-center gap-1.5 shrink-0">
                      <Folder size={13} />
                      <span>Sin Carpeta</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Action Toggles: View Mode + Sort Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  const next = notesLayoutMode === 'GRID' ? 'LIST' : 'GRID';
                  setNotesLayoutMode(next);
                  localStorage.setItem('notes_layout_mode', next);
                }}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm"
                title={notesLayoutMode === 'GRID' ? 'Vista: Tarjetas (Cuadrado)' : 'Vista: Lista Compacta (Rectángulos)'}
              >
                {notesLayoutMode === 'GRID' ? <List size={14} className="text-cyan-400" /> : <LayoutGrid size={14} className="text-cyan-400" />}
                <span className="hidden sm:inline">{notesLayoutMode === 'GRID' ? 'Lista' : 'Cuadrícula'}</span>
              </button>

              <button
                onClick={handleToggleSortOrder}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm"
                title={sortOrder === 'NEWEST' ? 'Orden: Más recientes' : 'Orden: Más antiguas'}
              >
                <ArrowUpDown size={14} className="text-emerald-400" />
                <span className="hidden sm:inline">{sortOrder === 'NEWEST' ? 'Recientes' : 'Antiguas'}</span>
              </button>
            </div>
          </div>

          {/* Grid / List Layout Container */}
          <div className={notesLayoutMode === 'GRID' ? "grid grid-cols-2 gap-3 sm:gap-4 mb-8" : "flex flex-col gap-2 mb-8"}>
            {/* + NUEVA NOTA Button */}
            <button 
              onClick={createNote} 
              data-tour="notes-fab" 
              className={notesLayoutMode === 'GRID' 
                ? "w-full h-44 rounded-[28px] border border-dashed border-white/15 bg-[#121216]/80 hover:bg-white/[0.06] hover:border-cyan-500/40 transition-all flex flex-col items-center justify-center gap-3 p-4 cursor-pointer shadow-lg group relative overflow-hidden"
                : "w-full py-3.5 px-4 rounded-2xl border border-dashed border-white/15 bg-[#121216]/80 hover:bg-white/[0.06] hover:border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md group"
              }
            >
              <div className={notesLayoutMode === 'GRID' ? "w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md" : "w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform"}>
                <Plus size={notesLayoutMode === 'GRID' ? 24 : 14} className="text-cyan-400" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-white/50 tracking-widest uppercase group-hover:text-white/90 transition-colors">
                NUEVA NOTA
              </span>
            </button>

            {/* Note Cards / Flat Rows */}
            {noteCards.map(({ note, themeColor, folder, previewText, updatedLabel }) => {
              const hasFolder = !!folder;
              const hasTags = note.tags && note.tags.length > 0;
              const hasHeaderBadges = hasFolder || hasTags;
              const isSelected = selectedNoteIds.includes(note.id);
              const isSelectionActive = selectedNoteIds.length > 0;

              if (notesLayoutMode === 'LIST') {
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
                    className={`w-full py-3 px-4 rounded-2xl flex items-center justify-between gap-3 hover:scale-[1.005] active:scale-[0.995] transition-all cursor-pointer border select-none ${
                      isSelected 
                        ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-500/30' 
                        : 'border-white/10 bg-[#121216] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg shrink-0">📝</span>
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <h3 className={`text-sm font-bold text-white truncate ${!note.title ? 'text-white/30 italic' : ''}`}>
                          {note.title || t('notes.untitled', 'Sin título')}
                        </h3>
                        
                        {/* Subfolder tag display when in ALL notes view */}
                        {selectedFolderId === 'ALL' && folder && (
                          <span 
                            className="text-[9px] font-bold px-2 py-0.5 rounded-md truncate max-w-[140px] border border-white/10 shrink-0 self-start sm:self-auto"
                            style={{ backgroundColor: `${folder.color || '#3b82f6'}20`, color: folder.color || '#60a5fa' }}
                          >
                            {folder.icon || '📁'} {folder.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono text-white/40">{updatedLabel}</span>
                      {isSelectionActive && (
                        <button
                          type="button"
                          onClick={(e) => toggleSelectNote(note.id, e)}
                          className={`p-1 rounded-lg ${isSelected ? 'text-cyan-400' : 'text-white/40'}`}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

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
                  
                  {/* Select Checkbox (Appears on Long Press / Selection Mode) */}
                  {isSelectionActive && (
                    <div className="absolute top-3 right-3 z-20">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectNote(note.id, e)}
                        className={`p-1.5 rounded-xl transition-all ${isSelected ? 'text-cyan-400 bg-cyan-500/20 ring-1 ring-cyan-400/50 scale-110' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                        title="Seleccionar nota"
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col flex-1 min-h-0 pr-6">
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
                    <div className="flex items-center gap-1.5">
                      <span>{updatedLabel}</span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleNoteFavorite(note, e)}
                        className="p-0.5 rounded hover:scale-110 transition-transform"
                        title={note.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      >
                        <Star size={11} className={note.isFavorite ? "text-amber-400" : "text-white/20 hover:text-amber-300"} fill={note.isFavorite ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Batch Selection Bar */}
          {selectedNoteIds.length > 0 && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-[#12121c]/95 border border-cyan-500/40 rounded-full px-5 py-3 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-5 text-white">
              <button onClick={handleSelectAllNotes} className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white transition-colors">
                <CheckSquare size={16} />
                <span>{selectedNoteIds.length === filteredNotes.length ? 'Deseleccionar' : 'Todas'} ({selectedNoteIds.length})</span>
              </button>

              <div className="w-[1px] h-5 bg-white/20" />

              <button 
                onClick={handleBatchFavoriteNotes} 
                className="p-2 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                title="Favorito"
              >
                <Star size={15} fill="currentColor" />
              </button>

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
                onClick={() => setVisibleNotesCount(prev => prev + 50)}
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
 <div className="flex flex-wrap sm:flex-nowrap justify-between items-end px-6 mb-6 relative gap-3 min-w-0">
   <div className="min-w-0 flex-1">
   <div className="flex items-center gap-2 mb-1.5 flex-wrap">
     <span className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">{streak > 0 && <span className="text-orange-500 flex items-center gap-1 animate-pulse"><Plus size={12} fill="currentColor"/> {streak} {t('notes.dayStreak', 'Day Streak')}</span>}{!streak && t('notes.yourStory', 'Your Story')}</span>
     <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 shadow-xs">
       {currentMonth.getFullYear()}
     </span>
   </div>
   <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none capitalize">{currentMonth.toLocaleDateString(i18n.language, { month: 'long' })}</h2>
   </div>
   <div className="flex items-center gap-2 shrink-0">
  <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 mr-2">
  <button onClick={() => setJournalViewMode('CALENDAR')} className={`p-1.5 rounded-md transition-colors ${journalViewMode === 'CALENDAR' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title={t('notes.calendarView', 'Calendar View')}><Calendar size={14} /></button>
  <button onClick={() => setJournalViewMode('LIST')} className={`p-1.5 rounded-md transition-colors ${journalViewMode === 'LIST' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`} title={t('notes.notebookView', 'Notebook View')}><AlignLeft size={14} /></button>
  </div>
  <div className="flex gap-2">
  <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronLeft size={18} /></button>
  <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronRight size={18} /></button>
  {journalViewMode === 'CALENDAR' && (
  <button onClick={() => setShowCalendarSettings(!showCalendarSettings)} className={`p-2.5 rounded-full border transition-colors ${showCalendarSettings ? 'bg-white text-black border-white' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'}`} title={t('notes.calendarSettings', 'Calendar Settings')}><Settings size={15} /></button>
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
          className={`w-8 h-4 rounded-full relative transition-colors duration-200 border border-white/10 mt-[2px] ${calendarShowFuture ? 'bg-emerald-500' : 'bg-white/5'}`}
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
   if (isToday || hasEntry) {
     openJournal(date);
   }
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
 
 {/* Mood / Custom Emoji / Writing icon centered */}
 {entry?.customEmoji ? (
    <span className="text-2xl group-hover:scale-110 transition-transform duration-200 drop-shadow-md z-10">
      {entry.customEmoji}
    </span>
  ) : mood ? (
    <span className="text-2xl group-hover:scale-110 transition-transform duration-200 drop-shadow-md z-10">
      {mood.icon}
    </span>
  ) : isFuture ? (
    <Lock size={14} className="text-white/20 z-10" />
  ) : (entry?.blocks && entry.blocks.some(b => b.content && b.content.trim().length > 0)) ? (
    <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity z-10">📝</span>
  ) : null}
 
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
    <div className="fixed inset-0 z-[500] bg-black/12 flex items-start justify-center p-2 sm:p-5 pt-[115px] sm:pt-[130px] pb-6 overflow-y-auto animate-in fade-in duration-200 backdrop-blur-none">
      <div className="w-full max-w-md sm:max-w-lg mx-auto flex flex-col rounded-[28px] sm:rounded-[32px] overflow-hidden border border-white/15 shadow-2xl relative bg-[#0e0e16]/95 my-2 mt-2 max-h-[80vh] transition-all">
        <div className="absolute top-0 left-0 right-0 h-48 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${activeThemeColor}, transparent 75%)` }} />

        {/* Top Header Controls - Single Responsive Row */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10 relative z-20 bg-[#0d0d14]/95 gap-1.5 w-full overflow-x-auto no-scrollbar">
          {/* Left: BLUE Exit Button + Favorite Star */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={closeEditor} 
              className="h-8 px-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all shrink-0 border border-blue-400/30"
              title="Salir del editor"
            >
              <ArrowLeft size={14} />
              <span>Salir</span>
            </button>

            {editorMode === 'NOTE' && (
              <button 
                onClick={() => setDraftIsFavorite(!draftIsFavorite)} 
                className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                  draftIsFavorite 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                    : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                }`} 
                title={draftIsFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
              >
                <Star size={14} fill={draftIsFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>

          {/* Right: Folder Tree Selector + Undo + Redo + Blueprint + Theme Picker */}
          <div className="flex items-center gap-1.5 shrink-0">
            {editorMode === 'NOTE' && (
              <button
                onClick={() => setIsFolderPickerOpen(true)}
                className="h-8 px-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 max-w-[130px] sm:max-w-[170px] transition-all"
                title="Cambiar carpeta de destino"
              >
                <span className="shrink-0">{activeFolderObj ? (activeFolderObj.icon || '📁') : '📁'}</span>
                <span className="truncate max-w-[80px] sm:max-w-[110px]">{activeFolderObj ? activeFolderObj.name : 'Sin Carpeta'}</span>
                <ChevronDown size={11} className="text-white/40 shrink-0" />
              </button>
            )}

            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                canUndo
                  ? 'bg-white/10 text-white border-white/20 hover:bg-white/20 active:scale-95'
                  : 'bg-white/[0.02] text-white/20 border-white/5 cursor-not-allowed'
              }`}
              title="Deshacer (Undo)"
            >
              <Undo2 size={14} />
            </button>

            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                canRedo
                  ? 'bg-white/10 text-white border-white/20 hover:bg-white/20 active:scale-95'
                  : 'bg-white/[0.02] text-white/20 border-white/5 cursor-not-allowed'
              }`}
              title="Rehacer (Redo)"
            >
              <Redo2 size={14} />
            </button>

            <BlueprintSelector onSelect={(newBlocks) => setDraftBlocks(prev => [...prev, ...newBlocks])} />

            <DropdownThemePicker 
              currentTheme={draftTheme} 
              onSelect={setDraftTheme} 
              projects={editorMode === 'NOTE' ? projects : null} 
              activeProject={draftProjectId} 
              onSelectProject={setDraftProjectId} 
            />

            {/* Note Timestamps Info Button (3 dots) */}
            <button
              type="button"
              onClick={() => setShowNoteInfoPopover(prev => !prev)}
              className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                showNoteInfoPopover
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-md'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title="Información y Fechas de la Nota"
            >
              <MoreVertical size={15} />
            </button>
          </div>
        </div>

        {/* Editor Body Scrollable Area */}
        <div ref={editorScrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 relative">
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

              <div className="inline-flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/5 flex-wrap justify-center">
                {MOODS.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => { 
                      if (draftMood === m.id) {
                        setDraftMood(undefined);
                        setDraftCustomEmoji(undefined);
                      } else {
                        setDraftMood(m.id); 
                        setMoodSplash(m.id); 
                      }
                    }} 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-transform ${draftMood === m.id ? 'bg-white/10 scale-110 shadow-sm ring-1 ring-white/20' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}
                  >
                    {m.icon}
                  </button>
                ))}
                {draftMood && (
                  <button
                    type="button"
                    onClick={() => {
                      const emoji = window.prompt('Ingresa un emoji personalizado para este día:', draftCustomEmoji || '');
                      if (emoji !== null) setDraftCustomEmoji(emoji.trim() || undefined);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white/80 transition-all border border-white/10 flex items-center gap-1 active:scale-95"
                    title="Personalizar Emoji"
                  >
                    <span>{draftCustomEmoji || '✨'}</span>
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70">Personalizar</span>
                  </button>
                )}
              </div>

              <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
            </div>
          )}
        </div>

        {/* Editor Bottom Footer Stats Bar */}
        <div className="px-6 py-2 bg-[#0a0a10] border-t border-white/5 flex items-center justify-between text-[11px] text-white/40 font-mono">
          <div className="flex items-center gap-4">
            <span>Palabras: <strong className="text-white/80">{getCleanWordCount(draftBlocks)}</strong></span>
            <span>Caracteres: <strong className="text-white/80">{getCleanCharacterCount(draftBlocks)}</strong></span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}

  {/* Note Info Details Popover Portal (3 dots info - Overlays over everything) */}
  {showNoteInfoPopover && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowNoteInfoPopover(false)} />
      <div className="relative z-10 w-full max-w-xs bg-[#12121e] border border-white/20 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 text-xs text-white animate-in zoom-in-95 duration-150">
        <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center justify-between">
          <span>Detalles de la Nota</span>
          <button 
            onClick={() => setShowNoteInfoPopover(false)} 
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <Calendar size={15} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-white/50 block uppercase tracking-wider">Creado</span>
              <span className="font-mono text-[11px] text-white/90 font-medium">
                {formatTimestampWithTime(draftCreatedAt)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <Clock size={15} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-white/50 block uppercase tracking-wider">Última Modificación</span>
              <span className="font-mono text-[11px] text-white/90 font-medium">
                {formatTimestampWithTime(draftUpdatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}

  <SaveBlueprintModal isOpen={showSaveBlueprintModal} onClose={() => setShowSaveBlueprintModal(false)} currentBlocks={draftBlocks} />

  {/* Deletion Confirmation Modal ("¿Estás seguro que quieres hacer eso?") */}
  <AnimatePresence>
    {deleteConfirmTarget && (
      <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm bg-[#12121e] border border-red-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
            <Trash2 size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">¿Estás seguro que quieres hacer eso?</h3>
            <p className="text-xs text-white/60">
              {deleteConfirmTarget.type === 'BATCH'
                ? `Vas a eliminar ${selectedNoteIds.length} notas seleccionadas. Esta acción no se puede deshacer.`
                : `Esta nota se eliminará permanentemente. Esta acción no se puede deshacer.`}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setDeleteConfirmTarget(null)}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs transition-colors border border-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (deleteConfirmTarget.type === 'BATCH') {
                  selectedNoteIds.forEach(id => handleDeleteNote(id));
                  toast.success(`${selectedNoteIds.length} notas eliminadas`);
                  setSelectedNoteIds([]);
                } else {
                  handleDelete();
                }
                setDeleteConfirmTarget(null);
              }}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs transition-colors shadow-lg shadow-red-500/30"
            >
              Sí, Eliminar
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
 
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
      <div className="bg-[#0f0f16] border-b border-white/10 px-3 sm:px-6 pt-7 sm:pt-8 pb-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-lg">
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

      <div className="flex-1 flex flex-col bg-[#09090e] overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 min-h-0">
        {/* Top Main Spaces Filter Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 flex-nowrap w-full shrink-0">
          <button
            onClick={() => setSelectedFolderId('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shrink-0 ${
              selectedFolderId === 'ALL'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/40 shadow-lg shadow-blue-500/20'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/15 hover:text-white'
            }`}
          >
            <FolderOpen size={15} className="text-cyan-400" />
            <span>Todas las Notas</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white">
              {notes.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFolderId('FAVORITES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shrink-0 ${
              selectedFolderId === 'FAVORITES'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white border-amber-400/40 shadow-lg shadow-amber-500/20'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Star size={15} className="text-amber-300" fill="currentColor" />
            <span>Favoritos</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white">
              {notes.filter(n => n.isFavorite).length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFolderId('UNCATEGORIZED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shrink-0 ${
              selectedFolderId === 'UNCATEGORIZED'
                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white border-slate-400/40 shadow-lg'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Folder size={15} className="text-slate-400" />
            <span>Sin Carpeta</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white">
              {notes.filter(n => !n.folderId).length}
            </span>
          </button>
        </div>
          
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

          {/* NETAMENTE DE ÁRBOLES - Interactive Tree View when in ALL view */}
          {selectedFolderId === 'ALL' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen size={18} className="text-cyan-400" />
                  <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    Árbol de Carpetas ({folders.filter(f => !f.parentId).length})
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRootFoldersInLibrary(prev => !prev)}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 text-xs font-bold transition-colors"
                    title={showRootFoldersInLibrary ? 'Ocultar carpetas raíz' : 'Mostrar carpetas raíz'}
                  >
                    {showRootFoldersInLibrary ? <Eye size={14} className="text-cyan-400" /> : <EyeOff size={14} className="text-white/40" />}
                    <span className="hidden sm:inline">{showRootFoldersInLibrary ? 'Ver Raíz' : 'Ocultar Raíz'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateFolderModal()}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Plus size={14} />
                    <span>+ Crear Carpeta Raíz</span>
                  </button>
                </div>
              </div>

              {showRootFoldersInLibrary && (
                <>
                  {folders.filter(f => !f.parentId).length === 0 ? (
                    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center text-3xl mx-auto">
                        📁
                      </div>
                      <h3 className="text-sm font-bold text-white">No hay carpetas creadas aún</h3>
                      <p className="text-xs text-white/50 max-w-sm mx-auto">
                        Crea tu primera carpeta para estructurar tus estudios, proyectos o libros en árbol.
                      </p>
                      <button
                        onClick={() => openCreateFolderModal()}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold shadow-md hover:brightness-110"
                      >
                        + Crear Primera Carpeta
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                  {folders.filter(f => !f.parentId).map(rootFolder => {
                    const renderWorkspaceTree = (folder: NoteFolder, depth = 0): React.ReactNode => {
                      const childFolders = folders.filter(f => f.parentId === folder.id);
                      const childNotes = notes.filter(n => n.folderId === folder.id);
                      const isExpanded = expandedFolderIds.has(folder.id);
                      const totalNotes = getFolderTotalNotesCount(folder.id);
                      const color = folder.color || '#3b82f6';
                      const isSelected = selectedFolderId === folder.id;

                      return (
                        <div 
                          key={folder.id} 
                          className={`rounded-2xl border overflow-hidden transition-all shadow-md ${
                            isSelected 
                              ? 'bg-cyan-500/[0.08] border-cyan-500/40 ring-1 ring-cyan-500/20' 
                              : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div 
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-all hover:bg-white/5"
                            onClick={() => setSelectedFolderId(folder.id)}
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => toggleFolderExpand(folder.id, e)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors shrink-0 border border-white/10"
                                title={isExpanded ? 'Colapsar subcarpetas' : 'Expandir subcarpetas'}
                              >
                                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                              </button>

                              <div 
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner"
                                style={{ color }}
                              >
                                {folder.icon || '📁'}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm sm:text-base font-extrabold text-white truncate">{folder.name}</h3>
                                  {folder.templateType && folder.templateType !== 'GENERAL' && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider shrink-0">
                                      {folder.templateType}
                                    </span>
                                  )}
                                  {folder.isPinned && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30 shrink-0">📌</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-white/50 font-mono mt-0.5">
                                  {childFolders.length > 0 ? `${childFolders.length} subcarpetas • ` : ''}{totalNotes} {totalNotes === 1 ? 'nota' : 'notas'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openCreateFolderModal(folder.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1 border border-cyan-500/30 transition-all active:scale-95"
                                title="Crear Subcarpeta dentro de esta carpeta"
                              >
                                <FolderPlus size={13} className="text-cyan-400" />
                                <span className="hidden sm:inline text-[11px]">+ Sub</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleFolderPin(folder)}
                                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                  folder.isPinned 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' 
                                    : 'bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10'
                                }`}
                                title={folder.isPinned ? 'Desanclar carpeta' : 'Anclar a la barra de acceso rápido'}
                              >
                                📌
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditFolderModal(folder)}
                                className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors border border-white/10"
                                title="Editar carpeta"
                              >
                                <Pencil size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteFolderConfirm(folder.id, e)}
                                className="p-1.5 sm:p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                                title="Eliminar carpeta"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3.5 sm:p-4 bg-black/40 border-t border-white/10 space-y-4">
                              {childFolders.length > 0 && (
                                <div className="space-y-3 pl-3 sm:pl-5 border-l-2 border-cyan-500/30 my-1">
                                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">
                                    Subcarpetas ({childFolders.length})
                                  </span>
                                  {childFolders.map(child => renderWorkspaceTree(child, depth + 1))}
                                </div>
                              )}

                              {childNotes.length > 0 && (
                                <div className="space-y-2.5">
                                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest block">
                                    Notas en esta carpeta ({childNotes.length})
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                    {childNotes.map(note => (
                                      <div
                                        key={note.id}
                                        onClick={() => openNote(note)}
                                        className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all hover:border-cyan-500/40 group flex flex-col justify-between gap-2.5 shadow-sm"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                                            {note.title || 'Nota sin título'}
                                          </h4>
                                          {note.isFavorite && <Star size={13} className="text-amber-400 shrink-0" fill="currentColor" />}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-white/40 font-mono pt-1 border-t border-white/5">
                                          <span>{formatTimestampWithTime(note.updatedAt)}</span>
                                          <span className="text-cyan-400/80 group-hover:translate-x-0.5 transition-transform">Abrir →</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {childFolders.length === 0 && childNotes.length === 0 && (
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-white/40 italic">
                                  Esta carpeta aún no contiene subcarpetas ni notas.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    };
                    return renderWorkspaceTree(rootFolder);
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

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
                   <button
                      onClick={(e) => handleDeleteFolderConfirm(selectedFolderId, e)}
                      className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                      title="Eliminar carpeta"
                    >
                      <Trash2 size={14} />
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

           {/* Dynamic Interactive Template Hub Cards */}
           {(() => {
             const currentActiveFolder = folders.find(f => f.id === selectedFolderId);
             if (!currentActiveFolder || !currentActiveFolder.templateType || currentActiveFolder.templateType === 'GENERAL') return null;

             // BOOK HUB
             if (currentActiveFolder.templateType === 'BOOK') {
               const total = currentActiveFolder.bookTotalPages || 300;
               const current = currentActiveFolder.bookCurrentPage || 0;
               const pct = Math.min(100, Math.round((current / total) * 100));

               return (
                 <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-black border border-amber-500/30 shadow-xl space-y-3">
                   <div className="flex items-center justify-between flex-wrap gap-2">
                     <div className="flex items-center gap-2">
                       <Book size={18} className="text-amber-400" />
                       <h3 className="text-sm font-bold text-amber-200">Hub de Lectura de Libro</h3>
                     </div>
                     <div className="flex items-center gap-2">
                       {currentActiveFolder.bookAuthor && (
                         <span className="text-xs font-medium text-amber-300/80 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                           Autor: {currentActiveFolder.bookAuthor}
                         </span>
                       )}
                       {currentActiveFolder.bookStartYear && (
                         <span className="text-xs font-mono text-amber-300/60 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                           📅 {currentActiveFolder.bookStartYear}
                         </span>
                       )}
                     </div>
                   </div>

                   <div>
                     <div className="flex justify-between text-xs font-mono text-amber-200/80 mb-1.5">
                       <span>Página {current} de {total}</span>
                       <span className="font-bold text-amber-400">{pct}% Leído</span>
                     </div>
                     <div className="w-full h-3 rounded-full bg-black/50 border border-amber-500/20 overflow-hidden p-0.5">
                       <div
                         className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                         style={{ width: `${pct}%` }}
                       />
                     </div>
                   </div>

                   <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                     {/* Granular Page Controls: -5, -1, Direct Input, +1, +5 */}
                     <div className="flex items-center gap-1.5">
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, bookCurrentPage: Math.max(0, current - 5) })}
                         className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-mono border border-amber-500/20"
                         title="-5 páginas"
                       >
                         -5
                       </button>
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, bookCurrentPage: Math.max(0, current - 1) })}
                         className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30"
                         title="-1 página"
                       >
                         -1
                       </button>
                       
                       {/* DIRECT NUMERIC INPUT BOX */}
                       <div className="flex items-center gap-1 bg-black/60 border border-amber-500/40 rounded-lg px-2 py-0.5">
                         <span className="text-[10px] font-mono text-amber-400/60 uppercase">Pág</span>
                         <input
                           type="number"
                           value={current}
                           min={0}
                           max={total}
                           onChange={(e) => {
                             const val = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                             handleUpdateFolder({ ...currentActiveFolder, bookCurrentPage: val });
                           }}
                           className="w-14 bg-transparent text-amber-300 text-xs font-mono font-bold text-center outline-none"
                         />
                       </div>

                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, bookCurrentPage: Math.min(total, current + 1) })}
                         className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-xs font-black hover:brightness-110 active:scale-95 shadow-sm"
                         title="+1 página"
                       >
                         +1
                       </button>
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, bookCurrentPage: Math.min(total, current + 5) })}
                         className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-mono border border-amber-500/30"
                         title="+5 páginas"
                       >
                         +5
                       </button>
                     </div>

                     <button
                       onClick={() => openEditFolderModal(currentActiveFolder)}
                       className="text-xs text-amber-400/80 hover:text-amber-300 underline font-medium ml-auto"
                     >
                       Editar libro
                     </button>
                   </div>
                 </div>
               );
             }

             // STUDY HUB
             if (currentActiveFolder.templateType === 'STUDY') {
               const total = currentActiveFolder.studyTotalLessons || 20;
               const current = currentActiveFolder.studyCompletedLessons || 0;
               const pct = Math.min(100, Math.round((current / total) * 100));

               return (
                 <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black border border-purple-500/30 shadow-xl space-y-3">
                   <div className="flex items-center justify-between flex-wrap gap-2">
                     <div className="flex items-center gap-2">
                       <GraduationCap size={18} className="text-purple-400" />
                       <h3 className="text-sm font-bold text-purple-200">Hub de Estudio / Asignatura</h3>
                     </div>
                     <div className="flex items-center gap-2">
                       {currentActiveFolder.studyProfessor && (
                         <span className="text-xs font-medium text-purple-300/80 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                           Prof / Plataforma: {currentActiveFolder.studyProfessor}
                         </span>
                       )}
                       {currentActiveFolder.studyNextExamDate && (
                         <span className="text-xs font-mono text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/40 font-bold flex items-center gap-1">
                           <Clock size={11} /> Examen: {currentActiveFolder.studyNextExamDate}
                         </span>
                       )}
                     </div>
                   </div>

                   <div>
                     <div className="flex justify-between text-xs font-mono text-purple-200/80 mb-1.5">
                       <span>Lecciones {current} de {total}</span>
                       <span className="font-bold text-purple-400">{pct}% Progreso</span>
                     </div>
                     <div className="w-full h-3 rounded-full bg-black/50 border border-purple-500/20 overflow-hidden p-0.5">
                       <div
                         className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                         style={{ width: `${pct}%` }}
                       />
                     </div>
                   </div>

                   <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                     <div className="flex items-center gap-1.5">
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, studyCompletedLessons: Math.max(0, current - 1) })}
                         className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/30"
                       >
                         -1 lección
                       </button>
                       <div className="flex items-center gap-1 bg-black/60 border border-purple-500/40 rounded-lg px-2 py-0.5">
                         <span className="text-[10px] font-mono text-purple-400/60 uppercase">Completado</span>
                         <input
                           type="number"
                           value={current}
                           min={0}
                           max={total}
                           onChange={(e) => {
                             const val = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                             handleUpdateFolder({ ...currentActiveFolder, studyCompletedLessons: val });
                           }}
                           className="w-14 bg-transparent text-purple-300 text-xs font-mono font-bold text-center outline-none"
                         />
                       </div>
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, studyCompletedLessons: Math.min(total, current + 1) })}
                         className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-xs font-black hover:brightness-110 active:scale-95 shadow-sm"
                       >
                         +1 lección
                       </button>
                     </div>
                     <button
                       onClick={() => openEditFolderModal(currentActiveFolder)}
                       className="text-xs text-purple-400/80 hover:text-purple-300 underline font-medium ml-auto"
                     >
                       Editar asignatura
                     </button>
                   </div>
                 </div>
               );
             }

             // PROJECT HUB
             if (currentActiveFolder.templateType === 'PROJECT') {
               const total = currentActiveFolder.projectTotalDeliverables || 10;
               const current = currentActiveFolder.projectCompletedDeliverables || 0;
               const pct = Math.min(100, Math.round((current / total) * 100));

               return (
                 <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black border border-emerald-500/30 shadow-xl space-y-3">
                   <div className="flex items-center justify-between flex-wrap gap-2">
                     <div className="flex items-center gap-2">
                       <Layers size={18} className="text-emerald-400" />
                       <h3 className="text-sm font-bold text-emerald-200">Hub de Proyecto</h3>
                     </div>
                     <div className="flex items-center gap-2">
                       {currentActiveFolder.projectClient && (
                         <span className="text-xs font-medium text-emerald-300/80 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                           Cliente: {currentActiveFolder.projectClient}
                         </span>
                       )}
                       <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                         {currentActiveFolder.projectStatus || 'IN_PROGRESS'}
                       </span>
                     </div>
                   </div>

                   <div>
                     <div className="flex justify-between text-xs font-mono text-emerald-200/80 mb-1.5">
                       <span>Entregables {current} de {total}</span>
                       <span className="font-bold text-emerald-400">{pct}% Completado</span>
                     </div>
                     <div className="w-full h-3 rounded-full bg-black/50 border border-emerald-500/20 overflow-hidden p-0.5">
                       <div
                         className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                         style={{ width: `${pct}%` }}
                       />
                     </div>
                   </div>

                   <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                     <div className="flex items-center gap-1.5">
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, projectCompletedDeliverables: Math.max(0, current - 1) })}
                         className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30"
                       >
                         -1 entregable
                       </button>
                       <div className="flex items-center gap-1 bg-black/60 border border-emerald-500/40 rounded-lg px-2 py-0.5">
                         <span className="text-[10px] font-mono text-emerald-400/60 uppercase">Hecho</span>
                         <input
                           type="number"
                           value={current}
                           min={0}
                           max={total}
                           onChange={(e) => {
                             const val = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                             handleUpdateFolder({ ...currentActiveFolder, projectCompletedDeliverables: val });
                           }}
                           className="w-14 bg-transparent text-emerald-300 text-xs font-mono font-bold text-center outline-none"
                         />
                       </div>
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, projectCompletedDeliverables: Math.min(total, current + 1) })}
                         className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-xs font-black hover:brightness-110 active:scale-95 shadow-sm"
                       >
                         +1 entregable
                       </button>
                     </div>
                     <button
                       onClick={() => openEditFolderModal(currentActiveFolder)}
                       className="text-xs text-emerald-400/80 hover:text-emerald-300 underline font-medium ml-auto"
                     >
                       Editar proyecto
                     </button>
                   </div>
                 </div>
               );
             }

             // FINANCE HUB
             if (currentActiveFolder.templateType === 'FINANCE') {
               const budget = currentActiveFolder.financeBudget || 1000;
               const current = currentActiveFolder.financeCurrent || 0;
               const currSymbol = currentActiveFolder.financeCurrency || '$';
               const pct = Math.min(100, Math.round((current / budget) * 100));

               return (
                 <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-900/20 to-black border border-cyan-500/30 shadow-xl space-y-3">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <DollarSign size={18} className="text-cyan-400" />
                       <h3 className="text-sm font-bold text-cyan-200">Hub de Finanzas y Presupuesto</h3>
                     </div>
                     <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                       Meta: {currSymbol}{budget}
                     </span>
                   </div>

                   <div>
                     <div className="flex justify-between text-xs font-mono text-cyan-200/80 mb-1.5">
                       <span>Actual: {currSymbol}{current}</span>
                       <span className="font-bold text-cyan-400">{pct}% Alcanzado</span>
                     </div>
                     <div className="w-full h-3 rounded-full bg-black/50 border border-cyan-500/20 overflow-hidden p-0.5">
                       <div
                         className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                         style={{ width: `${pct}%` }}
                       />
                     </div>
                   </div>

                   <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                     <div className="flex items-center gap-1.5">
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, financeCurrent: Math.max(0, current - 50) })}
                         className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono border border-cyan-500/20"
                       >
                         -50
                       </button>
                       <div className="flex items-center gap-1 bg-black/60 border border-cyan-500/40 rounded-lg px-2 py-0.5">
                         <span className="text-[10px] font-mono text-cyan-400/60">{currSymbol}</span>
                         <input
                           type="number"
                           value={current}
                           min={0}
                           onChange={(e) => handleUpdateFolder({ ...currentActiveFolder, financeCurrent: Number(e.target.value) || 0 })}
                           className="w-16 bg-transparent text-cyan-300 text-xs font-mono font-bold text-center outline-none"
                         />
                       </div>
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, financeCurrent: current + 50 })}
                         className="px-2 py-1 rounded-lg bg-cyan-500 text-black text-xs font-black hover:brightness-110 active:scale-95"
                       >
                         +50
                       </button>
                     </div>
                     <button
                       onClick={() => openEditFolderModal(currentActiveFolder)}
                       className="text-xs text-cyan-400/80 hover:text-cyan-300 underline font-medium ml-auto"
                     >
                       Editar finanzas
                     </button>
                   </div>
                 </div>
               );
             }

             // FITNESS HUB
             if (currentActiveFolder.templateType === 'FITNESS') {
               const target = currentActiveFolder.fitnessTargetSessions || 4;
               const current = currentActiveFolder.fitnessCompletedSessions || 0;
               const pct = Math.min(100, Math.round((current / target) * 100));

               return (
                 <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-orange-900/20 to-black border border-red-500/30 shadow-xl space-y-3">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Dumbbell size={18} className="text-red-400" />
                       <h3 className="text-sm font-bold text-red-200">Hub de Fitness & Salud</h3>
                     </div>
                     {currentActiveFolder.fitnessGoal && (
                       <span className="text-xs font-medium text-red-300 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                         Meta: {currentActiveFolder.fitnessGoal}
                       </span>
                     )}
                   </div>

                   <div>
                     <div className="flex justify-between text-xs font-mono text-red-200/80 mb-1.5">
                       <span>Sesiones: {current} de {target}</span>
                       <span className="font-bold text-red-400">{pct}% Cumplido</span>
                     </div>
                     <div className="w-full h-3 rounded-full bg-black/50 border border-red-500/20 overflow-hidden p-0.5">
                       <div
                         className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-300"
                         style={{ width: `${pct}%` }}
                       />
                     </div>
                   </div>

                   <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                     <div className="flex items-center gap-1.5">
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, fitnessCompletedSessions: Math.max(0, current - 1) })}
                         className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30"
                       >
                         -1 sesión
                       </button>
                       <div className="flex items-center gap-1 bg-black/60 border border-red-500/40 rounded-lg px-2 py-0.5">
                         <span className="text-[10px] font-mono text-red-400/60 uppercase">Sesión</span>
                         <input
                           type="number"
                           value={current}
                           min={0}
                           max={target}
                           onChange={(e) => handleUpdateFolder({ ...currentActiveFolder, fitnessCompletedSessions: Number(e.target.value) || 0 })}
                           className="w-14 bg-transparent text-red-300 text-xs font-mono font-bold text-center outline-none"
                         />
                       </div>
                       <button
                         onClick={() => handleUpdateFolder({ ...currentActiveFolder, fitnessCompletedSessions: Math.min(target, current + 1) })}
                         className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-black hover:brightness-110 active:scale-95"
                       >
                         +1 sesión
                       </button>
                     </div>
                     <button
                       onClick={() => openEditFolderModal(currentActiveFolder)}
                       className="text-xs text-red-400/80 hover:text-red-300 underline font-medium ml-auto"
                     >
                       Editar rutina
                     </button>
                   </div>
                 </div>
               );
             }

             return null;
           })()}

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
      
      <div className="relative z-10 w-full max-w-md bg-[#121218] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
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
              placeholder="Ej: Proyectos 2026, Hábitos Atómicos, Finanzas..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
              autoFocus
            />
          </div>

          {/* Folder Template Type Selector - 8 Rich Categories */}
          <div>
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">Tipo / Plantilla de Carpeta</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setFolderTemplateType('GENERAL'); setFolderIcon('📁'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'GENERAL'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <Folder size={16} className="text-cyan-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">General</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFolderTemplateType('BOOK'); setFolderIcon('📚'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'BOOK'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <Book size={16} className="text-amber-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">Libro</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFolderTemplateType('STUDY'); setFolderIcon('🎓'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'STUDY'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <GraduationCap size={16} className="text-purple-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">Estudio</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFolderTemplateType('PROJECT'); setFolderIcon('💼'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'PROJECT'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <Layers size={16} className="text-emerald-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">Proyecto</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFolderTemplateType('FINANCE'); setFolderIcon('💰'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'FINANCE'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <DollarSign size={16} className="text-cyan-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">Finanzas</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFolderTemplateType('FITNESS'); setFolderIcon('🏋️'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'FITNESS'
                    ? 'bg-red-500/20 border-red-400 text-red-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <Dumbbell size={16} className="text-red-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">Fitness</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFolderTemplateType('CREATIVE'); setFolderIcon('🎨'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'CREATIVE'
                    ? 'bg-pink-500/20 border-pink-400 text-pink-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <Palette size={16} className="text-pink-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">Arte/Ideas</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFolderTemplateType('CODE'); setFolderIcon('💻'); }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  folderTemplateType === 'CODE'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <Code2 size={16} className="text-indigo-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="leading-tight truncate">Código</div>
                </div>
              </button>
            </div>
          </div>

          {/* Book Specific Fields */}
          {folderTemplateType === 'BOOK' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Book size={14} />
                <span>Configuración de Lectura</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-amber-200/70 uppercase block mb-1">Autor</label>
                  <input
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    placeholder="Ej: James Clear..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-amber-200/70 uppercase block mb-1">Año Inicio</label>
                  <input
                    type="text"
                    value={bookStartYear}
                    onChange={(e) => setBookStartYear(e.target.value)}
                    placeholder="Ej: 2026"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-amber-200/70 uppercase block mb-1">Página Actual</label>
                  <input
                    type="number"
                    value={bookCurrentPage === 0 ? '' : bookCurrentPage}
                    onChange={(e) => setBookCurrentPage(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-amber-200/70 uppercase block mb-1">Páginas Totales</label>
                  <input
                    type="number"
                    value={bookTotalPages === 0 ? '' : bookTotalPages}
                    onChange={(e) => setBookTotalPages(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Study Specific Fields */}
          {folderTemplateType === 'STUDY' && (
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <GraduationCap size={14} />
                <span>Configuración de Asignatura / Curso</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-purple-200/70 uppercase block mb-1">Profesor / Plataforma</label>
                  <input
                    type="text"
                    value={studyProfessor}
                    onChange={(e) => setStudyProfessor(e.target.value)}
                    placeholder="Ej: Dr. García, Udemy..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-purple-500/30 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-purple-200/70 uppercase block mb-1">Fecha de Examen</label>
                  <input
                    type="date"
                    value={studyNextExamDate}
                    onChange={(e) => setStudyNextExamDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-purple-500/30 text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-purple-200/70 uppercase block mb-1">Lecciones Hechas</label>
                  <input
                    type="number"
                    value={studyCompletedLessons === 0 ? '' : studyCompletedLessons}
                    onChange={(e) => setStudyCompletedLessons(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-purple-500/30 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-purple-200/70 uppercase block mb-1">Lecciones Totales</label>
                  <input
                    type="number"
                    value={studyTotalLessons === 0 ? '' : studyTotalLessons}
                    onChange={(e) => setStudyTotalLessons(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-purple-500/30 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Project Specific Fields */}
          {folderTemplateType === 'PROJECT' && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Layers size={14} />
                <span>Configuración de Proyecto Hub</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-emerald-200/70 uppercase block mb-1">Cliente / Responsable</label>
                  <input
                    type="text"
                    value={projectClient}
                    onChange={(e) => setProjectClient(e.target.value)}
                    placeholder="Ej: Cliente X..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-emerald-200/70 uppercase block mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={projectDeadline}
                    onChange={(e) => setProjectDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-emerald-200/70 uppercase block mb-1">Entregables Hechos</label>
                  <input
                    type="number"
                    value={projectCompletedDeliverables === 0 ? '' : projectCompletedDeliverables}
                    onChange={(e) => setProjectCompletedDeliverables(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-emerald-200/70 uppercase block mb-1">Entregables Totales</label>
                  <input
                    type="number"
                    value={projectTotalDeliverables === 0 ? '' : projectTotalDeliverables}
                    onChange={(e) => setProjectTotalDeliverables(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Finance Specific Fields */}
          {folderTemplateType === 'FINANCE' && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <DollarSign size={14} />
                <span>Configuración de Finanzas</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-cyan-200/70 uppercase block mb-1">Moneda</label>
                  <input
                    type="text"
                    value={financeCurrency}
                    onChange={(e) => setFinanceCurrency(e.target.value)}
                    placeholder="$"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-cyan-500/30 text-xs text-white outline-none font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-cyan-200/70 uppercase block mb-1">Actual</label>
                  <input
                    type="number"
                    value={financeCurrent === 0 ? '' : financeCurrent}
                    onChange={(e) => setFinanceCurrent(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-cyan-500/30 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-cyan-200/70 uppercase block mb-1">Presupuesto</label>
                  <input
                    type="number"
                    value={financeBudget === 0 ? '' : financeBudget}
                    onChange={(e) => setFinanceBudget(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-cyan-500/30 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fitness Specific Fields */}
          {folderTemplateType === 'FITNESS' && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                <Dumbbell size={14} />
                <span>Configuración de Rutina / Salud</span>
              </div>
              <div>
                <label className="text-[9px] font-bold text-red-200/70 uppercase block mb-1">Meta Principal</label>
                <input
                  type="text"
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value)}
                  placeholder="Ej: Ganar masa muscular, Maratón..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-red-500/30 text-xs text-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-red-200/70 uppercase block mb-1">Sesiones Hechas</label>
                  <input
                    type="number"
                    value={fitnessCompletedSessions === 0 ? '' : fitnessCompletedSessions}
                    onChange={(e) => setFitnessCompletedSessions(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-red-500/30 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-red-200/70 uppercase block mb-1">Sesiones Objetivo</label>
                  <input
                    type="number"
                    value={fitnessTargetSessions === 0 ? '' : fitnessTargetSessions}
                    onChange={(e) => setFitnessTargetSessions(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-red-500/30 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Parent Folder Selector (Interactive Notion Tree Picker Button) */}
          <div>
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">Carpeta Padre (Opcional)</label>
            {(() => {
              const activeParentFolderObj = folderParentId ? folderMap.get(folderParentId) : undefined;
              return (
                <button
                  type="button"
                  onClick={() => setIsParentFolderPickerOpen(true)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a22] hover:bg-[#22222e] border border-white/10 text-xs text-white flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <DynamicIcon icon={activeParentFolderObj ? activeParentFolderObj.icon : '📁'} size={16} className="text-cyan-400 shrink-0" />
                    <span className="truncate font-bold text-white/90">{activeParentFolderObj ? activeParentFolderObj.name : 'Ninguna (Carpeta Raíz)'}</span>
                  </div>
                  <ChevronDown size={14} className="text-white/40 group-hover:text-white transition-colors shrink-0" />
                </button>
              );
            })()}
          </div>

          {/* Icon & Color Pickers */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Icono de la Carpeta</label>
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-xl shrink-0 shadow-inner">
                <DynamicIcon icon={folderIcon} size={22} className="text-cyan-400" />
              </div>
              <button
                type="button"
                onClick={() => setShowIconPickerModal(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles size={14} />
                <span>Explorar Catálogo de Iconos</span>
              </button>
            </div>

            {/* Quick Emoji Swatches */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {['📁', '📚', '🎓', '💼', '🎯', '🔒', '💡', '🎨', '⚡', '⭐', '📌', '📝', '📖', '📕', '📊'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFolderIcon(emoji)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                    folderIcon === emoji ? 'bg-cyan-500/30 border border-cyan-400 scale-110' : 'bg-white/5 hover:bg-white/15 border border-white/5'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">Color Accent</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={folderColor}
                onChange={(e) => setFolderColor(e.target.value)}
                className="w-12 h-9 rounded-xl bg-transparent border border-white/10 cursor-pointer"
              />
              <span className="text-xs font-mono text-white/60">{folderColor}</span>
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

        {/* IconPicker Popup Modal */}
        {showIconPickerModal && (
          <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#12121c] border border-white/15 rounded-3xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-white">Seleccionar Icono</h4>
                <button onClick={() => setShowIconPickerModal(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
              </div>
              <IconPicker
                selectedIcon={folderIcon}
                onSelectIcon={(icon) => {
                  if (icon) setFolderIcon(icon);
                  setShowIconPickerModal(false);
                }}
                selectedColor={folderColor}
                onSelectColor={(col) => {
                  if (col) setFolderColor(col);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )}

  {/* Custom Interactive Folder Picker Modal (Tree View + Live Search + Breadcrumbs) */}
  {isFolderPickerOpen && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f0f18] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[85vh] relative overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <FolderOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white leading-none">Mover a Carpeta</h3>
              <p className="text-[10px] text-white/50 mt-1">Selecciona el destino para esta nota</p>
            </div>
          </div>
          <button
            onClick={() => setIsFolderPickerOpen(false)}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors border border-white/10"
          >
            <X size={14} />
          </button>
        </div>

        {/* Active Selected Folder Breadcrumb Path Header */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
          <span className="text-white/40 font-bold shrink-0 text-[10px] uppercase">Ruta:</span>
          <button
            onClick={() => {
              setDraftFolderId(undefined);
              setIsFolderPickerOpen(false);
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 shrink-0 ${
              !draftFolderId ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            <Folder size={11} />
            <span>Sin Carpeta</span>
          </button>

          {draftFolderBreadcrumbs.map((bFolder, idx) => (
            <React.Fragment key={bFolder.id}>
              <ChevronRight size={10} className="text-white/30 shrink-0" />
              <button
                onClick={() => setDraftFolderId(bFolder.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                  idx === draftFolderBreadcrumbs.length - 1
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{bFolder.icon || '📁'}</span>
                <span>{bFolder.name}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Live Folder Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={folderPickerSearch}
            onChange={(e) => setFolderPickerSearch(e.target.value)}
            placeholder="Buscar carpeta por nombre..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-colors"
          />
          {folderPickerSearch && (
            <button
              onClick={() => setFolderPickerSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Folder Tree Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 min-h-[200px] max-h-[320px]">
          {/* Sin Carpeta Root Option */}
          <button
            onClick={() => {
              setDraftFolderId(undefined);
              setIsFolderPickerOpen(false);
            }}
            className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              !draftFolderId
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 ring-1 ring-cyan-400/30 font-bold'
                : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📦</span>
              <span>Sin Carpeta (Raíz)</span>
            </div>
            {!draftFolderId && <Check size={14} className="text-cyan-400" />}
          </button>

          {/* Hierarchical Folder Tree */}
          {renderFolderPickerTree(rootFolders, 0)}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setIsFolderPickerOpen(false);
              openCreateFolderModal(draftFolderId);
            }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all"
          >
            <FolderPlus size={14} className="text-cyan-400" />
            <span>+ Crear Carpeta</span>
          </button>

          <button
            onClick={() => setIsFolderPickerOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-extrabold hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}

  {/* Notion-style Parent Folder Selection Modal */}
  {isParentFolderPickerOpen && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f0f18] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[85vh] relative overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <FolderOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white leading-none">Seleccionar Carpeta Padre</h3>
              <p className="text-[10px] text-white/50 mt-1">Vincula esta carpeta dentro de otra o como Raíz</p>
            </div>
          </div>
          <button
            onClick={() => setIsParentFolderPickerOpen(false)}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors border border-white/10"
          >
            <X size={14} />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[360px]">
          <button
            onClick={() => {
              setFolderParentId(undefined);
              setIsParentFolderPickerOpen(false);
            }}
            className={`w-full p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
              !folderParentId
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                : 'bg-white/5 text-white/80 border-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">📁</span>
              <div className="text-left">
                <div className="font-bold">Ninguna (Carpeta Raíz)</div>
                <div className="text-[10px] text-white/40 font-medium">Crear en el nivel principal</div>
              </div>
            </div>
            {!folderParentId && <Check size={16} className="text-cyan-400" />}
          </button>

          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest pt-2 pb-1 px-1">Carpetas Disponibles</div>

          {folders
            .filter(f => f.id !== editingFolder?.id)
            .map(f => {
              const isSelected = folderParentId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFolderParentId(f.id);
                    setIsParentFolderPickerOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                      : 'bg-white/5 text-white/80 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DynamicIcon icon={f.icon} size={18} className="text-cyan-400 shrink-0" />
                    <span className="truncate font-semibold">{f.name}</span>
                  </div>
                  {isSelected && <Check size={16} className="text-cyan-400 shrink-0" />}
                </button>
              );
            })}
        </div>

        <div className="border-t border-white/10 pt-3 flex justify-end">
          <button
            onClick={() => setIsParentFolderPickerOpen(false)}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-black text-xs font-extrabold hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}

 </div>
 );
});
