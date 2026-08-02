import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Note, NoteFolder, JournalEntry } from '../../../types';
import { persistenceService } from '../../../services/persistenceService';
import { useAuth } from '@/context/AuthContext';
import { FREE_LIMITS } from '../../../config/limits';
import { PersistenceService } from '../../../services/persistence';

interface NotesContextType {
    notes: Note[];
    folders: NoteFolder[];
    journalEntries: JournalEntry[];
    isLoading: boolean;
    updateNote: (note: Note) => Promise<{ isNew: boolean }>;
    deleteNote: (noteId: string) => Promise<void>;
    createFolder: (folder: Omit<NoteFolder, 'id' | 'createdAt'>) => Promise<NoteFolder>;
    updateFolder: (folder: NoteFolder) => Promise<void>;
    deleteFolder: (folderId: string) => Promise<void>;
    updateJournal: (entry: JournalEntry) => Promise<{ isNew: boolean }>;
    canCreateNote: () => boolean;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    
    const activeUid = user?.id || profile?.uid;
    
    const [isLoading, setIsLoading] = useState(() => {
        if (!activeUid) return true;
        const hasNotes = PersistenceService.hasCollectionCache(activeUid, 'notes');
        const hasJournal = PersistenceService.hasCollectionCache(activeUid, 'journal');
        return !(hasNotes || hasJournal);
    });

    const notesRef = useRef<Note[]>([]);
    const foldersRef = useRef<NoteFolder[]>([]);
    const journalRef = useRef<JournalEntry[]>([]);

    const hasSyncedNotesRef = useRef(false);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
        foldersRef.current = folders;
    }, [folders]);

    useEffect(() => {
        journalRef.current = journalEntries;
    }, [journalEntries]);

    // Load data once when user is available
    useEffect(() => {
        if (!activeUid) {
            setNotes([]);
            setFolders([]);
            setJournalEntries([]);
            setIsLoading(false);
            return;
        }

        const uid = activeUid;
        const hasNotesCache = PersistenceService.hasCollectionCache(uid, 'notes');
        const hasFoldersCache = PersistenceService.hasCollectionCache(uid, 'noteFolders');
        const hasJournalCache = PersistenceService.hasCollectionCache(uid, 'journal');
        
        // INSTANT LOAD: Load from cache immediately
        if (hasNotesCache) {
            const cachedNotes = PersistenceService.getCollection<Note>(uid, 'notes') ?? [];
            setNotes(cachedNotes);
        }

        if (hasFoldersCache) {
            const cachedFolders = PersistenceService.getCollection<NoteFolder>(uid, 'noteFolders') ?? [];
            setFolders(cachedFolders);
        }
        
        if (hasJournalCache) {
             const cachedJournal = PersistenceService.getCollection<JournalEntry>(uid, 'journal') ?? [];
             setJournalEntries(cachedJournal);
        }
        
        if (hasNotesCache || hasJournalCache) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        let cancelled = false;
        const currentNotesTTL = hasSyncedNotesRef.current ? 60000 : 0;
        const shouldSyncNotes = PersistenceService.shouldSyncCollection(uid, 'notes', currentNotesTTL);
        const shouldSyncFolders = PersistenceService.shouldSyncCollection(uid, 'noteFolders', currentNotesTTL);
        const shouldSyncJournal = PersistenceService.shouldSyncCollection(uid, 'journal', currentNotesTTL);

        if (!shouldSyncNotes && !shouldSyncJournal && !shouldSyncFolders) {
            return;
        }

        console.log(`📚 NOTES: Syncing background data for [${uid}]...`);

        Promise.all([
            shouldSyncNotes ? persistenceService.notes.getAll(uid) : Promise.resolve(null),
            shouldSyncFolders ? persistenceService.noteFolders.getAll(uid) : Promise.resolve(null),
            shouldSyncJournal ? persistenceService.journal.getAll(uid) : Promise.resolve(null)
        ]).then(([fetchedNotes, fetchedFolders, fetchedJournal]) => {
            if (cancelled) return;
            if (fetchedNotes) {
                const cachedNotes = PersistenceService.getCollection<Note>(uid, 'notes');
                if (fetchedNotes.length === 0 && cachedNotes && cachedNotes.length > 0) {
                    cachedNotes.forEach(n => persistenceService.notes.save(uid, n));
                } else {
                    setNotes(fetchedNotes);
                    PersistenceService.saveCollection(uid, 'notes', fetchedNotes);
                    PersistenceService.saveCollectionSafe(uid, 'notes', fetchedNotes);
                }
            }
            if (fetchedFolders) {
                const cachedFolders = PersistenceService.getCollection<NoteFolder>(uid, 'noteFolders');
                if (fetchedFolders.length === 0 && cachedFolders && cachedFolders.length > 0) {
                    cachedFolders.forEach(f => persistenceService.noteFolders.save(uid, f));
                } else {
                    setFolders(fetchedFolders);
                    PersistenceService.saveCollection(uid, 'noteFolders', fetchedFolders);
                    PersistenceService.saveCollectionSafe(uid, 'noteFolders', fetchedFolders);
                }
            }
            if (fetchedJournal) {
                const cachedJournal = PersistenceService.getCollection<JournalEntry>(uid, 'journal');
                if (fetchedJournal.length === 0 && cachedJournal && cachedJournal.length > 0) {
                    cachedJournal.forEach(j => persistenceService.journal.save(uid, j));
                } else {
                    setJournalEntries(fetchedJournal);
                    PersistenceService.saveCollection(uid, 'journal', fetchedJournal);
                    PersistenceService.saveCollectionSafe(uid, 'journal', fetchedJournal);
                }
            }
            setIsLoading(false);
            hasSyncedNotesRef.current = true;
        }).catch(err => {
            if (cancelled) return;
            console.error("Failed to load notes data:", err);
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [activeUid]);

    const updateNote = useCallback(async (note: Note) => {
        if (!user?.id) return { isNew: false };
        const existing = notesRef.current;
        const isNew = !existing.some(n => n.id === note.id);
        
        let nextNotes: Note[] = [];

        setNotes(prev => {
            const index = prev.findIndex(n => n.id === note.id);
            if (index >= 0) {
                nextNotes = [...prev];
                nextNotes[index] = note;
            } else {
                nextNotes = [...prev, note];
            }
            return nextNotes;
        });

        const currentNotes = notesRef.current;
        const index = currentNotes.findIndex(n => n.id === note.id);
        const computedNextNotes = index >= 0 
            ? currentNotes.map(n => n.id === note.id ? note : n) 
            : [...currentNotes, note];

        PersistenceService.saveCollection(user.id, 'notes', computedNextNotes);
        PersistenceService.saveCollectionSafe(user.id, 'notes', computedNextNotes);

        if (!isNew) {
            persistenceService.notes.update(user.id, note.id, note).catch(err => console.error("Error updating note:", err));
        } else {
            persistenceService.notes.save(user.id, note).catch(err => console.error("Error saving note:", err));
        }
        return { isNew };
    }, [user?.id]);

    const deleteNote = useCallback(async (noteId: string) => {
        if (!user?.id) return;

        setNotes(prev => prev.filter(n => n.id !== noteId));

        const computedNextNotes = notesRef.current.filter(n => n.id !== noteId);
        PersistenceService.saveCollection(user.id, 'notes', computedNextNotes);
        PersistenceService.saveCollectionSafe(user.id, 'notes', computedNextNotes);

        persistenceService.notes.delete(user.id, noteId).catch(err => console.error("Error deleting note:", err));
    }, [user?.id]);

    const createFolder = useCallback(async (folderData: Omit<NoteFolder, 'id' | 'createdAt'>): Promise<NoteFolder> => {
        const newFolder: NoteFolder = {
            ...folderData,
            id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            createdAt: Date.now()
        };

        if (user?.id) {
            const nextFolders = [...foldersRef.current, newFolder];
            setFolders(nextFolders);
            PersistenceService.saveCollection(user.id, 'noteFolders', nextFolders);
            PersistenceService.saveCollectionSafe(user.id, 'noteFolders', nextFolders);
            persistenceService.noteFolders.save(user.id, newFolder).catch(err => console.error("Error saving folder:", err));
        }

        return newFolder;
    }, [user?.id]);

    const updateFolder = useCallback(async (folder: NoteFolder) => {
        if (!user?.id) return;

        const nextFolders = foldersRef.current.map(f => f.id === folder.id ? folder : f);
        setFolders(nextFolders);
        PersistenceService.saveCollection(user.id, 'noteFolders', nextFolders);
        PersistenceService.saveCollectionSafe(user.id, 'noteFolders', nextFolders);
        persistenceService.noteFolders.update(user.id, folder.id, folder).catch(err => console.error("Error updating folder:", err));
    }, [user?.id]);

    const deleteFolder = useCallback(async (folderId: string) => {
        if (!user?.id) return;

        const nextFolders = foldersRef.current.filter(f => f.id !== folderId);
        setFolders(nextFolders);
        PersistenceService.saveCollection(user.id, 'noteFolders', nextFolders);
        PersistenceService.saveCollectionSafe(user.id, 'noteFolders', nextFolders);
        persistenceService.noteFolders.delete(user.id, folderId).catch(err => console.error("Error deleting folder:", err));

        // Reset folderId on notes that were inside this folder
        const affectedNotes = notesRef.current.filter(n => n.folderId === folderId);
        if (affectedNotes.length > 0) {
            const updatedNotes = notesRef.current.map(n => n.folderId === folderId ? { ...n, folderId: undefined } : n);
            setNotes(updatedNotes);
            PersistenceService.saveCollection(user.id, 'notes', updatedNotes);
            PersistenceService.saveCollectionSafe(user.id, 'notes', updatedNotes);
            affectedNotes.forEach(n => {
                persistenceService.notes.update(user.id, n.id, { ...n, folderId: undefined }).catch(console.error);
            });
        }
    }, [user?.id]);

    const updateJournal = useCallback(async (entry: JournalEntry) => {
        if (!user?.id) return { isNew: false };
        const existing = journalRef.current;
        const isNew = !existing.some(e => e.id === entry.id);

        setJournalEntries(prev => {
            const index = prev.findIndex(e => e.id === entry.id);
            if (index >= 0) {
                const newEntries = [...prev];
                newEntries[index] = entry;
                return newEntries;
            }
            return [...prev, entry];
        });

        const currentEntries = journalRef.current;
        const index = currentEntries.findIndex(e => e.id === entry.id);
        const computedNextEntries = index >= 0 
            ? currentEntries.map(e => e.id === entry.id ? entry : e) 
            : [...currentEntries, entry];

        PersistenceService.saveCollection(user.id, 'journal', computedNextEntries);
        PersistenceService.saveCollectionSafe(user.id, 'journal', computedNextEntries);

        if (!isNew) {
            persistenceService.journal.update(user.id, entry.id, entry).catch(err => console.error("Error updating journal:", err));
        } else {
            persistenceService.journal.save(user.id, entry).catch(err => console.error("Error saving journal:", err));
        }
        return { isNew };
    }, [user?.id]);

    const canCreateNote = useCallback(() => {
        if (profile?.plan === 'PRO') return true;
        return notes.length < FREE_LIMITS.NOTES;
    }, [profile, notes.length]);

    return (
        <NotesContext.Provider value={{
            notes,
            folders,
            journalEntries,
            isLoading,
            updateNote,
            deleteNote,
            createFolder,
            updateFolder,
            deleteFolder,
            updateJournal,
            canCreateNote
        }}>
            {children}
        </NotesContext.Provider>
    );
};

export const useNotesContext = () => {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error('useNotesContext must be used within a NotesProvider');
    }
    return context;
};
