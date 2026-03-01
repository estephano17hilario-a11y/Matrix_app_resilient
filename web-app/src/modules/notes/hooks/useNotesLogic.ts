import { useCallback } from 'react';
import { useNotesContext } from '../context/NotesContext';
import { Note, JournalEntry } from '../../../types';

export const useNotesLogic = (onNoteCreated?: () => void) => {
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
        const { isNew } = await updateNote(note);
        if (isNew && onNoteCreated) {
            onNoteCreated();
        }
    }, [updateNote, onNoteCreated]);

    const handleUpdateJournal = useCallback(async (entry: JournalEntry) => {
        const { isNew } = await updateJournal(entry);
        if (isNew && onNoteCreated) {
            onNoteCreated();
        }
    }, [updateJournal, onNoteCreated]);

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
