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
      // Ensure doc.id takes precedence over any 'id' in data
      return snapshot.docs.map(doc => ({ ...doc.data() as object, id: doc.id } as T));
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
        // Ensure doc.id takes precedence over any 'id' in data
        return snapshot.docs.map(doc => ({ ...doc.data() as object, id: doc.id } as T));
    } catch (error) {
        console.error(`Error fetching filtered ${collectionName}:`, error);
        return [];
    }
  },
  
  // SAVE = UPSERT (Create or Merge)
  save: async (userId: string, item: T): Promise<void> => {
    try {
      if (!item.id) {
          console.warn(`[Persistence] Attempted to save ${collectionName} without ID. Generating one.`);
          // Create a new reference with auto-generated ID if missing
          // Use a simple random ID generator to avoid dependency issues
          const newId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const ref = doc(db as Firestore, 'users', userId, collectionName, newId);
          const cleanItem = sanitizeFirestoreData({ ...item, id: newId });
          await setDoc(ref, cleanItem, { merge: true });
          return;
      }
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
      if (!itemId) {
          throw new Error(`[Persistence] Cannot update ${collectionName}: ID is undefined.`);
      }
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
