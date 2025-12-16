import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Firestore,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { Quest, Habit, Note, JournalEntry } from '../types';

// Generic helper for subcollection CRUD
const createSubCollectionService = <T extends { id: string }>(collectionName: string) => ({
  getAll: async (userId: string): Promise<T[]> => {
    try {
      const ref = collection(db as Firestore, 'users', userId, collectionName);
      const snapshot = await getDocs(ref);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return [];
    }
  },
  
  save: async (userId: string, item: T): Promise<void> => {
    try {
      const ref = doc(db as Firestore, 'users', userId, collectionName, item.id);
      await setDoc(ref, item);
    } catch (error) {
      console.error(`Error saving ${collectionName}:`, error);
      throw error;
    }
  },

  update: async (userId: string, itemId: string, data: Partial<T>): Promise<void> => {
    try {
      const ref = doc(db as Firestore, 'users', userId, collectionName, itemId);
      await updateDoc(ref, data);
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  },

  delete: async (userId: string, itemId: string): Promise<void> => {
    try {
      const ref = doc(db as Firestore, 'users', userId, collectionName, itemId);
      await deleteDoc(ref);
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      throw error;
    }
  }
});

export const questService = createSubCollectionService<Quest>('quests');
export const habitService = createSubCollectionService<Habit>('habits');
export const noteService = createSubCollectionService<Note>('notes');
export const journalService = createSubCollectionService<JournalEntry>('journal');

export const persistenceService = {
  quests: questService,
  habits: habitService,
  notes: noteService,
  journal: journalService
};
