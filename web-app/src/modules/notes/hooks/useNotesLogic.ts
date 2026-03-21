import { useCallback } from 'react';
import { useNotesContext } from '../context/NotesContext';
import { Note, JournalEntry } from '../../../types';

export const useNotesLogic = () => {
    const { 
        notes, 
        journalEntries, 
        isLoading, 
        updateNote, 
        deleteNote, 
        updateJournal, 
        canCreateNote 
    } = useNotesContext();

    const handleUpdateNote = useCallback(async (note: Note) => {
        await updateNote(note);
    }, [updateNote]);

    const handleUpdateJournal = useCallback(async (entry: JournalEntry) => {
        await updateJournal(entry);
    }, [updateJournal]);

    const handleDeleteNote = useCallback(async (noteId: string) => {
        await deleteNote(noteId);
    }, [deleteNote]);

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
