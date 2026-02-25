import { useState, useEffect, useCallback } from 'react';
import { Note, JournalEntry } from '../../../types';
import { persistenceService } from '../../../services/persistenceService';
import { useAuth } from '../../../context/AuthContext';
import { FREE_LIMITS } from '../../../config/limits';
import { db, doc, getDoc, updateDoc } from '../../../services/firebase';
import { toLocalISOString } from '../../../utils/dateUtils';

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
            setNotes(fetchedNotes ?? []);
            setJournalEntries(fetchedJournal ?? []);
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
        const isNew = !notes.some(n => n.id === note.id);
        
        if (!isNew) {
            await persistenceService.notes.update(user.uid, note.id, note);
        } else {
            await persistenceService.notes.save(user.uid, note);
            
            // UPDATE STREAK PROTOCOL (Notes/Journaling)
            const userRef = doc(db, 'users', user.uid);
            getDoc(userRef).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    const today = toLocalISOString(new Date());
                    let limits = data.dailyLimits || {};
                    
                    if (limits.date !== today) {
                        limits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0, notesCompleted: 0 };
                    }
                    
                    updateDoc(userRef, {
                        dailyLimits: {
                            ...limits,
                            notesCompleted: (limits.notesCompleted || 0) + 1
                        }
                    }).catch(console.error);
                }
            });
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
        const isNew = !journalEntries.some(e => e.id === entry.id);

        if (!isNew) {
            await persistenceService.journal.update(user.uid, entry.id, entry);
        } else {
            await persistenceService.journal.save(user.uid, entry);
            
            // UPDATE STREAK PROTOCOL (Notes/Journaling)
            const userRef = doc(db, 'users', user.uid);
            getDoc(userRef).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    const today = toLocalISOString(new Date());
                    let limits = data.dailyLimits || {};
                    
                    if (limits.date !== today) {
                        limits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0, notesCompleted: 0 };
                    }
                    
                    updateDoc(userRef, {
                        dailyLimits: {
                            ...limits,
                            notesCompleted: (limits.notesCompleted || 0) + 1
                        }
                    }).catch(console.error);
                }
            });
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
