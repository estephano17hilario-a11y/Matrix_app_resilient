import { useCallback } from 'react';
import { useNotesContext } from '../context/NotesContext';
import { Note, NoteFolder, JournalEntry } from '../../../types';

export const useNotesLogic = () => {
    const { 
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

    const handleCreateFolder = useCallback(async (folderData: Omit<NoteFolder, 'id' | 'createdAt'>) => {
        return await createFolder(folderData);
    }, [createFolder]);

    const handleUpdateFolder = useCallback(async (folder: NoteFolder) => {
        await updateFolder(folder);
    }, [updateFolder]);

    const handleDeleteFolder = useCallback(async (folderId: string) => {
        await deleteFolder(folderId);
    }, [deleteFolder]);

    return {
        notes,
        folders,
        journalEntries,
        isLoading,
        handleUpdateNote,
        handleDeleteNote,
        handleCreateFolder,
        handleUpdateFolder,
        handleDeleteFolder,
        handleUpdateJournal,
        canCreateNote
    };
};
