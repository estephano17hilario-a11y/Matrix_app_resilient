import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  Firestore,
  serverTimestamp
} from '../services/firebase';
import { db } from '../services/firebase';
import { Project } from '../types';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';
import { AuditLogger } from './auditService';

export const projectService = {
  /**
   * Fetch all projects for a user
   */
  getUserProjects: async (userId: string): Promise<Project[] | null> => {
    try {
      const projectsRef = collection(db as Firestore, 'users', userId, 'projects');
      const snapshot = await getDocs(projectsRef);
      return snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() as object } as Project))
        .filter((p: any) => !p.deleted);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return null;
    }
  },

  /**
   * Create or overwrite a project
   */
  saveProject: async (userId: string, project: Project): Promise<void> => {
    try {
      const projectRef = doc(db as Firestore, 'users', userId, 'projects', project.id);
      const cleanProject = sanitizeFirestoreData(project);
      
      // Revive if needed
      if ((cleanProject as any).deleted) delete (cleanProject as any).deleted;

      await setDoc(projectRef, cleanProject, { merge: true });
      AuditLogger.log('CREATE', 'projects', project.id, { userId });
    } catch (error) {
      console.error('Error saving project:', error);
      AuditLogger.log('ERROR', 'projects', project.id, { error: String(error) });
      throw error;
    }
  },

  /**
   * Update specific fields of a project
   */
  updateProject: async (userId: string, projectId: string, data: Partial<Project>): Promise<void> => {
    try {
      const projectRef = doc(db as Firestore, 'users', userId, 'projects', projectId);
      const cleanData = sanitizeFirestoreData(data);
      await setDoc(projectRef, cleanData, { merge: true });
      AuditLogger.log('UPDATE', 'projects', projectId, { changes: Object.keys(data) });
    } catch (error) {
      console.error('Error updating project:', error);
      AuditLogger.log('ERROR', 'projects', projectId, { error: String(error) });
      throw error;
    }
  },

  /**
   * Delete a project (Soft Delete)
   */
  deleteProject: async (userId: string, projectId: string): Promise<void> => {
    try {
      const projectRef = doc(db as Firestore, 'users', userId, 'projects', projectId);
      
      // SOFT DELETE
      // await deleteDoc(projectRef);
      await setDoc(projectRef, { 
          deleted: true, 
          deletedAt: serverTimestamp() 
      }, { merge: true });

      AuditLogger.log('SOFT_DELETE', 'projects', projectId, { userId });

    } catch (error) {
      console.error('Error deleting project:', error);
      AuditLogger.log('ERROR', 'projects', projectId, { error: String(error) });
      throw error;
    }
  }
};
