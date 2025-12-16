import { auth, db } from './services/firebase';
import * as realAuth from 'firebase/auth';
import * as realFirestore from 'firebase/firestore';
import * as phantom from './services/phantom';

// Re-export instances
export { auth, db };

// --- HELPER: Detect Mock Mode ---
const isMock = (obj: any) => obj && obj._isMock;

// --- AUTH WRAPPERS ---

export const GoogleAuthProvider = realAuth.GoogleAuthProvider;

export const signInWithPopup = (authInstance: any, provider: any) => {
    if (isMock(authInstance)) return phantom.phantomSignInWithPopup(authInstance, provider);
    return realAuth.signInWithPopup(authInstance, provider);
};

export const signInWithEmailAndPassword = (authInstance: any, e: string, p: string) => {
     // Not implementing phantom for email/pass yet, fallback to real (will fail) or just throw
     return realAuth.signInWithEmailAndPassword(authInstance, e, p);
};

export const createUserWithEmailAndPassword = realAuth.createUserWithEmailAndPassword;

export const signOut = (authInstance: any) => {
    if (isMock(authInstance)) return phantom.phantomSignOut(authInstance);
    return realAuth.signOut(authInstance);
};

export const onAuthStateChanged = (authInstance: any, observer: any) => {
    if (isMock(authInstance)) return phantom.phantomOnAuthStateChanged(authInstance, observer);
    return realAuth.onAuthStateChanged(authInstance, observer);
};

export type { User } from 'firebase/auth';


// --- FIRESTORE WRAPPERS ---

export const doc = (firestore: any, path: string, ...segments: string[]) => {
    if (isMock(firestore)) return phantom.phantomDoc(firestore, path, ...segments);
    return realFirestore.doc(firestore, path, ...segments);
};

export const getDoc = (ref: any) => {
    if (isMock(ref.firestore)) return phantom.phantomGetDoc(ref);
    return realFirestore.getDoc(ref);
};

export const setDoc = (ref: any, data: any, options?: any) => {
    if (isMock(ref.firestore)) return phantom.phantomSetDoc(ref, data, options);
    return realFirestore.setDoc(ref, data, options);
};

export const updateDoc = (ref: any, data: any) => {
    if (isMock(ref.firestore)) return phantom.phantomUpdateDoc(ref, data);
    return realFirestore.updateDoc(ref, data);
};

export const deleteDoc = (ref: any) => {
     if (isMock(ref.firestore)) {
         // Basic mock delete
         return Promise.resolve();
     }
     return realFirestore.deleteDoc(ref);
};

export const runTransaction = (firestore: any, updateFunction: any) => {
    if (isMock(firestore)) return phantom.phantomRunTransaction(firestore, updateFunction);
    return realFirestore.runTransaction(firestore, updateFunction);
};

// --- QUERY / COLLECTION WRAPPERS (Basic Mock Support) ---

export const collection = (firestore: any, path: string, ...segments: string[]) => {
    if (isMock(firestore)) return { type: 'collection', path, firestore }; 
    return realFirestore.collection(firestore, path, ...segments);
};

export const getDocs = (query: any) => {
    if (isMock(query.firestore)) {
        console.log("👻 PHANTOM: getDocs (Returning empty)");
        return Promise.resolve({ docs: [], empty: true, size: 0 });
    }
    return realFirestore.getDocs(query);
};

export const onSnapshot = (query: any, observer: any) => {
    if (isMock(query.firestore)) {
         console.log("👻 PHANTOM: onSnapshot (No-op)");
         // Return unsubscribe function
         return () => {};
    }
    return realFirestore.onSnapshot(query, observer);
};

// Passthrough for query builders (they just build objects, safe to pass through or mock if needed)
// Real Firestore functions often validate input, so we might need simple mocks if they throw on mock refs.
// For now, let's try using the real ones, but if they fail, we might need to mock them too.
// Actually, query(), where(), etc. operate on references. If our mock references are compatible-ish, it might work.
// But realFirestore.query expects a real Query/CollectionReference.
// So we should mock these too to be safe.

export const query = (q: any, ...constraints: any[]) => {
    if (isMock(q.firestore)) return { ...q, constraints };
    return realFirestore.query(q, ...constraints);
};

export const where = realFirestore.where;
export const orderBy = realFirestore.orderBy;
export const limit = realFirestore.limit;

// Export types
export type { 
    DocumentSnapshot, 
    QuerySnapshot, 
    DocumentReference, 
    CollectionReference,
    Firestore
} from 'firebase/firestore';

export { 
    Timestamp, 
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
