import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Note, JournalEntry } from '../../../types';
import { persistenceService } from '../../../services/persistenceService';
import { useAuth } from '@/context/AuthContext';
import { FREE_LIMITS } from '../../../config/limits';
import { PersistenceService } from '../../../services/persistence';

interface NotesContextType {
    notes: Note[];
    journalEntries: JournalEntry[];
    isLoading: boolean;
    updateNote: (note: Note) => Promise<{ isNew: boolean }>;
    deleteNote: (noteId: string) => Promise<void>;
    updateJournal: (entry: JournalEntry) => Promise<{ isNew: boolean }>;
    canCreateNote: () => boolean;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    // 🚀 PERFORMANCE: Optimistic Loading from Cache
    // If we have a profile (even if offline), we assume we can load data
    const activeUid = user?.id || profile?.uid;
    
    const [isLoading, setIsLoading] = useState(() => {
        if (!activeUid) return true;
        const hasNotes = PersistenceService.hasCollectionCache(activeUid, 'notes');
        const hasJournal = PersistenceService.hasCollectionCache(activeUid, 'journal');
        return !(hasNotes || hasJournal);
    });

    const notesRef = useRef<Note[]>([]);
    const journalRef = useRef<JournalEntry[]>([]);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
        journalRef.current = journalEntries;
    }, [journalEntries]);

    // Load data once when user is available
    useEffect(() => {
        if (!activeUid) {
            setNotes([]);
            setJournalEntries([]);
            setIsLoading(false);
            return;
        }

        const uid = activeUid;
        const hasNotesCache = PersistenceService.hasCollectionCache(uid, 'notes');
        const hasJournalCache = PersistenceService.hasCollectionCache(uid, 'journal');
        
        // ⚡ INSTANT LOAD: Load from cache immediately
        if (hasNotesCache) {
            const cachedNotes = PersistenceService.getCollection<Note>(uid, 'notes') ?? [];
            setNotes(cachedNotes);
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
        const shouldSyncNotes = PersistenceService.shouldSyncCollection(uid, 'notes', 60000);
        const shouldSyncJournal = PersistenceService.shouldSyncCollection(uid, 'journal', 60000);

        if (!shouldSyncNotes && !shouldSyncJournal) {
            return;
        }

        console.log(`📚 NOTES: Syncing background data for [${uid}]...`);

        Promise.all([
            shouldSyncNotes ? persistenceService.notes.getAll(uid) : Promise.resolve(null),
            shouldSyncJournal ? persistenceService.journal.getAll(uid) : Promise.resolve(null)
        ]).then(([fetchedNotes, fetchedJournal]) => {
            if (cancelled) return;
            if (fetchedNotes) {
                setNotes(fetchedNotes);
                PersistenceService.saveCollection(uid, 'notes', fetchedNotes);
                PersistenceService.saveCollectionSafe(uid, 'notes', fetchedNotes);
            }
            if (fetchedJournal) {
                setJournalEntries(fetchedJournal);
                PersistenceService.saveCollection(uid, 'journal', fetchedJournal);
                PersistenceService.saveCollectionSafe(uid, 'journal', fetchedJournal);
            }
            setIsLoading(false);
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

        // We can't rely on nextNotes from inside the setter immediately if it's asynchronous.
        // Instead, we compute nextNotes independently.
        const currentNotes = notesRef.current;
        const index = currentNotes.findIndex(n => n.id === note.id);
        const computedNextNotes = index >= 0 
            ? currentNotes.map(n => n.id === note.id ? note : n) 
            : [...currentNotes, note];

        PersistenceService.saveCollection(user.id, 'notes', computedNextNotes);
        PersistenceService.saveCollectionSafe(user.id, 'notes', computedNextNotes);

        if (!isNew) {
            await persistenceService.notes.update(user.id, note.id, note);
        } else {
            await persistenceService.notes.save(user.id, note);
        }
        return { isNew };
    }, [user?.id]);

    const deleteNote = useCallback(async (noteId: string) => {
        if (!user?.id) return;

        setNotes(prev => prev.filter(n => n.id !== noteId));

        const computedNextNotes = notesRef.current.filter(n => n.id !== noteId);
        PersistenceService.saveCollection(user.id, 'notes', computedNextNotes);
        PersistenceService.saveCollectionSafe(user.id, 'notes', computedNextNotes);

        // Persistence
        await persistenceService.notes.delete(user.id, noteId);
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
            await persistenceService.journal.update(user.id, entry.id, entry);
        } else {
            await persistenceService.journal.save(user.id, entry);
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
            journalEntries,
            isLoading,
            updateNote,
            deleteNote,
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
