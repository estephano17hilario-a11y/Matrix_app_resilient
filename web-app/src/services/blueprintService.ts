import { db, collection, getDocs, doc, setDoc, serverTimestamp } from './firebase';
import { NoteBlueprint } from '../types';
import { defaultBlueprints } from '../config/defaultBlueprints';
import { AuditLogger } from './auditService';

export const getBlueprints = async (uid: string): Promise<NoteBlueprint[]> => {
  try {
    const userBlueprintsRef = collection(db, `users/${uid}/blueprints`);
    const snapshot = await getDocs(userBlueprintsRef);
    const userBlueprints = snapshot.docs
      .map((doc: any) => doc.data() as NoteBlueprint)
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
        const ref = doc(db, 'users', uid, 'blueprints', blueprint.id);
        
        // Revive logic
        const cleanBlueprint: any = { ...blueprint };
        if (cleanBlueprint.deleted) delete cleanBlueprint.deleted;

        await setDoc(ref, cleanBlueprint);
        AuditLogger.log('CREATE', 'blueprints', blueprint.id, { uid });
    } catch (error) {
        AuditLogger.log('ERROR', 'blueprints', blueprint.id, { error: String(error) });
        throw error;
    }
};

export const deleteBlueprint = async (uid: string, blueprintId: string): Promise<void> => {
    try {
        const ref = doc(db, 'users', uid, 'blueprints', blueprintId);
        
        // SOFT DELETE
        // await deleteDoc(ref);
        await setDoc(ref, { 
            deleted: true, 
            deletedAt: serverTimestamp() 
        }, { merge: true });

        AuditLogger.log('SOFT_DELETE', 'blueprints', blueprintId, { uid });
    } catch (error) {
        AuditLogger.log('ERROR', 'blueprints', blueprintId, { error: String(error) });
        throw error;
    }
};
