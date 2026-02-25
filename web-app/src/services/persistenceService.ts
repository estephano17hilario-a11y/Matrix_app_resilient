import { 
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  getDoc,
  Firestore,
  QueryConstraint,
  serverTimestamp
} from './firebase';
import { Quest, Habit, Note, JournalEntry, Attribute, Project, BadHabit } from '../types';
import { SmartProject } from '../types/SmartGoal';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';
import { AuditLogger } from './auditService';

// Generic helper for subcollection CRUD
const createSubCollectionService = <T extends { id: string, deleted?: boolean }>(collectionName: string) => ({
  getAll: async (userId: string): Promise<T[] | null> => {
    try {
      const ref = collection(db as Firestore, 'users', userId, collectionName);
      // FETCH ALL + CLIENT FILTER (Safest for mixed legacy data without composite indexes)
      const snapshot = await getDocs(ref);
      
      return snapshot.docs
        .map(doc => ({ ...doc.data() as object, id: doc.id } as T))
        .filter(item => !item.deleted); // SOFT DELETE FILTER
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return null;
    }
  },

  // Optimized Fetch with Query Constraints
  getFiltered: async (userId: string, constraints: QueryConstraint[]): Promise<T[] | null> => {
    try {
        const ref = collection(db as Firestore, 'users', userId, collectionName);
        // Add Soft Delete constraint automatically
        // Note: This might require an index if combined with other filters.
        // For robustness, we apply client-side filtering as a fallback.
        const q = query(ref, ...constraints);
        const snapshot = await getDocs(q);
        
        return snapshot.docs
            .map(doc => ({ ...doc.data() as object, id: doc.id } as T))
            .filter(item => !item.deleted); // SOFT DELETE FILTER
    } catch (error) {
        console.error(`Error fetching filtered ${collectionName}:`, error);
        return null;
    }
  },
  
  // SAVE = UPSERT (Create or Merge)
  save: async (userId: string, item: T): Promise<void> => {
    try {
      let targetId = item.id;
      if (!targetId) {
          console.warn(`[Persistence] Attempted to save ${collectionName} without ID. Generating one.`);
          targetId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }

      const ref = doc(db as Firestore, 'users', userId, collectionName, targetId);
      const cleanItem = sanitizeFirestoreData({ ...item, id: targetId });
      
      // Ensure we don't accidentally revive a deleted item unless explicit?
      // For now, saving revives it.
      if (cleanItem.deleted) delete cleanItem.deleted; 

      await setDoc(ref, cleanItem, { merge: true });
      
      // AUDIT LOG
      AuditLogger.log(item.id ? 'UPDATE' : 'CREATE', collectionName, targetId, { userId });
      
    } catch (error) {
      console.error(`Error saving ${collectionName}:`, error);
      AuditLogger.log('ERROR', collectionName, item.id || 'unknown', { error: String(error) });
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

      // AUDIT LOG
      AuditLogger.log('UPDATE', collectionName, itemId, { changes: Object.keys(data) });

    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      AuditLogger.log('ERROR', collectionName, itemId, { error: String(error) });
      throw error;
    }
  },

  // SOFT DELETE IMPLEMENTATION
  delete: async (userId: string, itemId: string): Promise<void> => {
    try {
      const ref = doc(db as Firestore, 'users', userId, collectionName, itemId);
      
      // DO NOT DELETE PHYSICALLY. MARK AS DELETED.
      // await deleteDoc(ref); 
      
      await setDoc(ref, { 
          deleted: true, 
          deletedAt: serverTimestamp() 
      }, { merge: true });

      // AUDIT LOG
      AuditLogger.log('SOFT_DELETE', collectionName, itemId, { userId });

    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      AuditLogger.log('ERROR', collectionName, itemId, { error: String(error) });
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
