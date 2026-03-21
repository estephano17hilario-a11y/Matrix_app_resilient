import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Note, JournalEntry } from '../../../types';
import { persistenceService } from '../../../services/persistenceService';
import { useAuth } from '../../../context/AuthContext';
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
    const activeUid = user?.uid || profile?.uid;
    
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
        if (!user?.uid) return { isNew: false };
        const existing = notesRef.current;
        const isNew = !existing.some(n => n.id === note.id);
        let nextNotes: Note[] = [];

        setNotes(prev => {
            const index = prev.findIndex(n => n.id === note.id);
            if (index >= 0) {
                const newNotes = [...prev];
                newNotes[index] = note;
                nextNotes = newNotes;
                return newNotes;
            }
            nextNotes = [...prev, note];
            return nextNotes;
        });
        PersistenceService.saveCollection(user.uid, 'notes', nextNotes.length ? nextNotes : existing);
        PersistenceService.saveCollectionSafe(user.uid, 'notes', nextNotes.length ? nextNotes : existing);

        if (!isNew) {
            await persistenceService.notes.update(user.uid, note.id, note);
        } else {
            await persistenceService.notes.save(user.uid, note);
        }
        return { isNew };
    }, [user?.uid]);

    const deleteNote = useCallback(async (noteId: string) => {
        if (!user?.uid) return;
        let nextNotes: Note[] = [];
        setNotes(prev => {
            nextNotes = prev.filter(n => n.id !== noteId);
            return nextNotes;
        });
        PersistenceService.saveCollection(user.uid, 'notes', nextNotes);
        PersistenceService.saveCollectionSafe(user.uid, 'notes', nextNotes);

        // Persistence
        await persistenceService.notes.delete(user.uid, noteId);
    }, [user?.uid]);

    const updateJournal = useCallback(async (entry: JournalEntry) => {
        if (!user?.uid) return { isNew: false };
        const existing = journalRef.current;
        const isNew = !existing.some(e => e.id === entry.id);
        let nextEntries: JournalEntry[] = [];

        setJournalEntries(prev => {
            const index = prev.findIndex(e => e.id === entry.id);
            if (index >= 0) {
                const newEntries = [...prev];
                newEntries[index] = entry;
                nextEntries = newEntries;
                return newEntries;
            }
            nextEntries = [...prev, entry];
            return nextEntries;
        });
        PersistenceService.saveCollection(user.uid, 'journal', nextEntries.length ? nextEntries : existing);
        PersistenceService.saveCollectionSafe(user.uid, 'journal', nextEntries.length ? nextEntries : existing);

        if (!isNew) {
            await persistenceService.journal.update(user.uid, entry.id, entry);
        } else {
            await persistenceService.journal.save(user.uid, entry);
        }
        return { isNew };
    }, [user?.uid]);

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
