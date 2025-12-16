import { auth, db } from './services/firebase';

// Re-export instances
export { auth, db };

// Re-export SDK types/functions that don't conflict or are essential
// Note: We avoid 'export *' to prevent conflicts like 'Unsubscribe' being exported by both
export { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged
} from 'firebase/auth';

export type { User } from 'firebase/auth';

export { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    limit, 
    Timestamp, 
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';

export type { 
    DocumentSnapshot, 
    QuerySnapshot, 
    DocumentReference, 
    CollectionReference,
    Firestore
} from 'firebase/firestore';
