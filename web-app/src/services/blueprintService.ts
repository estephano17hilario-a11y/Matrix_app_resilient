import { supabase } from '@/services/supabase';
import { NoteBlueprint } from '../types';
import { defaultBlueprints } from '../config/defaultBlueprints';
import { AuditLogger } from './auditService';

export const getBlueprints = async (uid: string): Promise<NoteBlueprint[]> => {
  try {
    const { data, error } = await supabase
        .from('user_collections')
        .select('data')
        .eq('user_id', uid)
        .eq('collection_name', 'blueprints')
        .eq('deleted', false);

    if (error) throw error;

    const userBlueprints = data
      .map(row => row.data as NoteBlueprint)
      .filter((bp: any) => !bp.deleted);

    return [...defaultBlueprints, ...userBlueprints];
  } catch (error) {
    console.error("Failed to fetch blueprints:", error);
    // Return at least defaults if offline or error
    return defaultBlueprints;
  }
};

export const saveBlueprint = async (uid: string, blueprint: NoteBlueprint): Promise<void> => {
    try {
        const uniqueRecordId = `${uid}_blueprints_${blueprint.id}`;
        
        // Revive logic
        const cleanBlueprint: any = { ...blueprint };
        if (cleanBlueprint.deleted) delete cleanBlueprint.deleted;

        const { error } = await supabase
            .from('user_collections')
            .upsert({
                id: uniqueRecordId,
                user_id: uid,
                collection_name: 'blueprints',
                data: cleanBlueprint,
                deleted: false
            }, { onConflict: 'id' });

        if (error) throw error;

        AuditLogger.log('CREATE', 'blueprints', blueprint.id, { uid });
    } catch (error) {
        AuditLogger.log('ERROR', 'blueprints', blueprint.id, { error: String(error) });
        throw error;
    }
};

export const deleteBlueprint = async (uid: string, blueprintId: string): Promise<void> => {
    try {
        const uniqueRecordId = `${uid}_blueprints_${blueprintId}`;
        
        // SOFT DELETE
        const { error } = await supabase
            .from('user_collections')
            .upsert({
                id: uniqueRecordId,
                user_id: uid,
                collection_name: 'blueprints',
                data: { id: blueprintId, deleted: true },
                deleted: true
            }, { onConflict: 'id' });

        if (error) throw error;

        AuditLogger.log('SOFT_DELETE', 'blueprints', blueprintId, { uid });
    } catch (error) {
        AuditLogger.log('ERROR', 'blueprints', blueprintId, { error: String(error) });
        throw error;
    }
};
