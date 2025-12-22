import { db, collection, getDocs, doc, setDoc, deleteDoc } from './firebase';
import { NoteBlueprint } from '../types';
import { defaultBlueprints } from '../config/defaultBlueprints';

export const getBlueprints = async (uid: string): Promise<NoteBlueprint[]> => {
  try {
    const userBlueprintsRef = collection(db, `users/${uid}/blueprints`);
    const snapshot = await getDocs(userBlueprintsRef);
    const userBlueprints = snapshot.docs.map(doc => doc.data() as NoteBlueprint);
    return [...defaultBlueprints, ...userBlueprints];
  } catch (error) {
    console.error("Failed to fetch blueprints:", error);
    // Return at least defaults if offline or error
    return defaultBlueprints;
  }
};

export const saveBlueprint = async (uid: string, blueprint: NoteBlueprint): Promise<void> => {
    const ref = doc(db, 'users', uid, 'blueprints', blueprint.id);
    await setDoc(ref, blueprint);
};

export const deleteBlueprint = async (uid: string, blueprintId: string): Promise<void> => {
    const ref = doc(db, 'users', uid, 'blueprints', blueprintId);
    await deleteDoc(ref);
};
