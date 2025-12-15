import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Firestore
} from 'firebase/firestore';
import { db } from '../firebase';
import { Project } from '../types';

export const projectService = {
  /**
   * Fetch all projects for a user
   */
  getUserProjects: async (userId: string): Promise<Project[]> => {
    try {
      const projectsRef = collection(db as Firestore, 'users', userId, 'projects');
      const snapshot = await getDocs(projectsRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  /**
   * Create or overwrite a project
   */
  saveProject: async (userId: string, project: Project): Promise<void> => {
    try {
      const projectRef = doc(db as Firestore, 'users', userId, 'projects', project.id);
      await setDoc(projectRef, project);
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  },

  /**
   * Update specific fields of a project
   */
  updateProject: async (userId: string, projectId: string, data: Partial<Project>): Promise<void> => {
    try {
      const projectRef = doc(db as Firestore, 'users', userId, 'projects', projectId);
      await updateDoc(projectRef, data);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  /**
   * Delete a project
   */
  deleteProject: async (userId: string, projectId: string): Promise<void> => {
    try {
      const projectRef = doc(db as Firestore, 'users', userId, 'projects', projectId);
      await deleteDoc(projectRef);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
};
