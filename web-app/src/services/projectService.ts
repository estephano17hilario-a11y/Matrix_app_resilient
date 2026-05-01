import { Project } from '../types';
import { persistenceService } from './persistenceService';

export const projectService = {
  /**
   * Fetch all projects for a user
   */
  getUserProjects: async (userId: string): Promise<Project[] | null> => {
    return persistenceService.projects.getAll(userId);
  },

  /**
   * Create or overwrite a project
   */
  saveProject: async (userId: string, project: Project): Promise<void> => {
    await persistenceService.projects.save(userId, project);
  },

  /**
   * Update specific fields of a project
   */
  updateProject: async (userId: string, projectId: string, data: Partial<Project>): Promise<void> => {
    const projects = await persistenceService.projects.getAll(userId);
    const existing = projects?.find(p => p.id === projectId);
    if (existing) {
      await persistenceService.projects.save(userId, { ...existing, ...data });
    }
  },

  /**
   * Delete a project (Soft Delete)
   */
  deleteProject: async (userId: string, projectId: string): Promise<void> => {
    await persistenceService.projects.delete(userId, projectId);
  }
};
