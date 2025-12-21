import { useState, useEffect, useCallback } from 'react';
import { Note, JournalEntry } from '../../../types';
import { persistenceService } from '../../../services/persistenceService';
import { useAuth } from '../../../context/AuthContext';
import { FREE_LIMITS } from '../../../config/limits';

export const useNotesLogic = () => {
    const { user, profile } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch data on mount
    useEffect(() => {
        if (!user?.uid) return;

        setIsLoading(true);
        Promise.all([
            persistenceService.notes.getAll(user.uid),
            persistenceService.journal.getAll(user.uid)
        ]).then(([fetchedNotes, fetchedJournal]) => {
            setNotes(fetchedNotes);
            setJournalEntries(fetchedJournal);
            setIsLoading(false);
        }).catch(err => {
            console.error("Failed to load notes data:", err);
            setIsLoading(false);
        });
    }, [user?.uid]);

    const handleUpdateNote = useCallback(async (note: Note) => {
        if (!user?.uid) return;
        
        // Optimistic Update
        setNotes(prev => {
            const index = prev.findIndex(n => n.id === note.id);
            if (index >= 0) {
                const newNotes = [...prev];
                newNotes[index] = note;
                return newNotes;
            } else {
                return [note, ...prev];
            }
        });

        // Persistence
        if (notes.some(n => n.id === note.id)) {
            await persistenceService.notes.update(user.uid, note.id, note);
        } else {
            await persistenceService.notes.save(user.uid, note);
        }
    }, [user?.uid, notes]);

    const handleDeleteNote = useCallback(async (noteId: string) => {
        if (!user?.uid) return;

        // Optimistic Update
        setNotes(prev => prev.filter(n => n.id !== noteId));

        // Persistence
        await persistenceService.notes.delete(user.uid, noteId);
    }, [user?.uid]);

    const handleUpdateJournal = useCallback(async (entry: JournalEntry) => {
        if (!user?.uid) return;

        // Optimistic Update
        setJournalEntries(prev => {
            const index = prev.findIndex(e => e.id === entry.id);
            if (index >= 0) {
                const newEntries = [...prev];
                newEntries[index] = entry;
                return newEntries;
            } else {
                return [...prev, entry];
            }
        });

        // Persistence
        if (journalEntries.some(e => e.id === entry.id)) {
            await persistenceService.journal.update(user.uid, entry.id, entry);
        } else {
            await persistenceService.journal.save(user.uid, entry);
        }
    }, [user?.uid, journalEntries]);

    const canCreateNote = useCallback(() => {
        if (profile?.plan === 'PRO') return true;
        return notes.length < FREE_LIMITS.NOTES;
    }, [profile, notes.length]);

    return {
        notes,
        journalEntries,
        isLoading,
        handleUpdateNote,
        handleDeleteNote,
        handleUpdateJournal,
        canCreateNote
    };
};
