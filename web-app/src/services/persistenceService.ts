import { 
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  getDoc,
  Firestore,
  QueryConstraint
} from './firebase';
import { Quest, Habit, Note, JournalEntry, Attribute, Project, BadHabit } from '../types';
import { SmartProject } from '../types/SmartGoal';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';

// Generic helper for subcollection CRUD
const createSubCollectionService = <T extends { id: string }>(collectionName: string) => ({
  getAll: async (userId: string): Promise<T[]> => {
    try {
      const ref = collection(db as Firestore, 'users', userId, collectionName);
      const snapshot = await getDocs(ref);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as object } as T));
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return [];
    }
  },

  // Optimized Fetch with Query Constraints
  getFiltered: async (userId: string, constraints: QueryConstraint[]): Promise<T[]> => {
    try {
        const ref = collection(db as Firestore, 'users', userId, collectionName);
        const q = query(ref, ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as object } as T));
    } catch (error) {
        console.error(`Error fetching filtered ${collectionName}:`, error);
        return [];
    }
  },
  
  // SAVE = UPSERT (Create or Merge)
  save: async (userId: string, item: T): Promise<void> => {
    try {
      const ref = doc(db as Firestore, 'users', userId, collectionName, item.id);
      const cleanItem = sanitizeFirestoreData(item);
      await setDoc(ref, cleanItem, { merge: true });
    } catch (error) {
      console.error(`Error saving ${collectionName}:`, error);
      throw error;
    }
  },

  // UPDATE = UPSERT (Create or Merge)
  update: async (userId: string, itemId: string, data: Partial<T>): Promise<void> => {
    try {
      const ref = doc(db as Firestore, 'users', userId, collectionName, itemId);
      const cleanData = sanitizeFirestoreData(data);
      await setDoc(ref, cleanData, { merge: true });
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

// SETTINGS SERVICE (Single Doc)
const settingsService = {
    get: async (userId: string) => {
        try {
            const ref = doc(db as Firestore, 'users', userId, 'settings', 'config');
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : null;
        } catch (error) {
            console.error("Error fetching settings:", error);
            return null;
        }
    },
    save: async (userId: string, data: any) => {
        try {
            const ref = doc(db as Firestore, 'users', userId, 'settings', 'config');
            await setDoc(ref, data, { merge: true });
        } catch (error) {
            console.error("Error saving settings:", error);
        }
    }
}

export const questService = createSubCollectionService<Quest>('quests');
export const habitService = createSubCollectionService<Habit>('habits');
export const noteService = createSubCollectionService<Note>('notes');
export const journalService = createSubCollectionService<JournalEntry>('journal');
export const attributeService = createSubCollectionService<Attribute>('attributes');
export const smartProjectService = createSubCollectionService<SmartProject>('smartProjects');
export const projectService = createSubCollectionService<Project>('projects');
export const badHabitService = createSubCollectionService<BadHabit>('badHabits');

export const persistenceService = {
  quests: questService,
  habits: habitService,
  badHabits: badHabitService,
  notes: noteService,
  journal: journalService,
  attributes: attributeService,
  smartProjects: smartProjectService,
  projects: projectService,
  settings: settingsService
};
