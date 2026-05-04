import { supabase } from './supabase';
import { persistenceService } from './persistenceService';
import { UserProfile } from '../types/User';
import { PersistenceService as MemCacheService } from './persistence';

export interface BackupData {
    version: number;
    timestamp: number;
    profile: Partial<UserProfile> | null;
    collections: {
        projects: any[];
        quests: any[];
        habits: any[];
        badHabits: any[];
        notes: any[];
        journal: any[];
        smartProjects: any[];
        attributes: any[];
        settings: any | null;
    };
}

export const BackupService = {
    exportData: async (uid: string): Promise<BackupData> => {
        // Fetch fresh data from Supabase
        const [
            projects, quests, habits, badHabits, notes, journal, smartProjects, attributes, settings, profileRes
        ] = await Promise.all([
            persistenceService.projects.getAll(uid),
            persistenceService.quests.getAll(uid),
            persistenceService.habits.getAll(uid),
            persistenceService.badHabits.getAll(uid),
            persistenceService.notes.getAll(uid),
            persistenceService.journal.getAll(uid),
            persistenceService.smartProjects.getAll(uid),
            persistenceService.attributes.getAll(uid),
            persistenceService.settings.get(uid),
            supabase.from('users').select('*').eq('id', uid).single()
        ]);

        return {
            version: 1,
            timestamp: Date.now(),
            profile: profileRes.data || null,
            collections: {
                projects: projects || [],
                quests: quests || [],
                habits: habits || [],
                badHabits: badHabits || [],
                notes: notes || [],
                journal: journal || [],
                smartProjects: smartProjects || [],
                attributes: attributes || [],
                settings: settings || null
            }
        };
    },

    importData: async (uid: string, data: BackupData): Promise<void> => {
        if (!data || !data.collections) throw new Error("Invalid backup format");

        try {
            // Restore collections to Supabase
            const collections = data.collections;
            
            const restoreTasks = [];
            
            // Re-save all items (upsert handles duplicates/overwrites)
            if (collections.projects) collections.projects.forEach(item => restoreTasks.push(persistenceService.projects.save(uid, item)));
            if (collections.quests) collections.quests.forEach(item => restoreTasks.push(persistenceService.quests.save(uid, item)));
            if (collections.habits) collections.habits.forEach(item => restoreTasks.push(persistenceService.habits.save(uid, item)));
            if (collections.badHabits) collections.badHabits.forEach(item => restoreTasks.push(persistenceService.badHabits.save(uid, item)));
            if (collections.notes) collections.notes.forEach(item => restoreTasks.push(persistenceService.notes.save(uid, item)));
            if (collections.journal) collections.journal.forEach(item => restoreTasks.push(persistenceService.journal.save(uid, item)));
            if (collections.smartProjects) collections.smartProjects.forEach(item => restoreTasks.push(persistenceService.smartProjects.save(uid, item)));
            if (collections.attributes) collections.attributes.forEach(item => restoreTasks.push(persistenceService.attributes.save(uid, item)));
            if (collections.settings) restoreTasks.push(persistenceService.settings.save(uid, collections.settings));

            // Wait for all saves
            await Promise.all(restoreTasks);

            // Update local cache
            if (collections.projects) MemCacheService.saveCollection(uid, 'projects', collections.projects);
            if (collections.quests) MemCacheService.saveCollection(uid, 'quests', collections.quests);
            if (collections.habits) MemCacheService.saveCollection(uid, 'habits', collections.habits);
            if (collections.badHabits) MemCacheService.saveCollection(uid, 'badHabits', collections.badHabits);
            if (collections.notes) MemCacheService.saveCollection(uid, 'notes', collections.notes);
            if (collections.journal) MemCacheService.saveCollection(uid, 'journal', collections.journal);
            if (collections.smartProjects) MemCacheService.saveCollection(uid, 'smartProjects', collections.smartProjects);
            if (collections.attributes) MemCacheService.saveCollection(uid, 'attributes', collections.attributes);

            if (data.profile) {
                const { id, created_at, ...updateData } = data.profile as any;
                await supabase.from('users').update(updateData).eq('id', uid);
            }

        } catch (e) {
            console.error("Restore failed:", e);
            throw e;
        }
    },

    createCloudBackup: async (uid: string): Promise<void> => {
        try {
            const data = await BackupService.exportData(uid);
            const backupPayload = {
                id: `backup_${uid}`,
                data: data,
                timestamp: Date.now()
            };
            // Save into a new collection called 'backups' (using settingsService pattern)
            const { error } = await supabase
              .from('user_collections')
              .upsert({
                id: `backup_${uid}`,
                user_id: uid,
                collection_name: 'backups',
                data: backupPayload,
                deleted: false
              }, { onConflict: 'id' });
            
            if (error) throw error;
        } catch (e) {
            console.error("Cloud Backup failed", e);
            throw e;
        }
    },

    restoreCloudBackup: async (uid: string): Promise<void> => {
        try {
            const { data, error } = await supabase
              .from('user_collections')
              .select('data')
              .eq('id', `backup_${uid}`)
              .eq('user_id', uid)
              .eq('collection_name', 'backups')
              .single();

            if (error) throw error;
            if (!data || !data.data) throw new Error("No cloud backup found");

            const backupData = data.data.data as BackupData;
            await BackupService.importData(uid, backupData);

        } catch (e) {
            console.error("Restore Cloud Backup failed", e);
            throw e;
        }
    },

    downloadLocalBackup: async (uid: string) => {
        try {
            const data = await BackupService.exportData(uid);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `matrix_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Local download failed", e);
            throw e;
        }
    }
};