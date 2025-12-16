import { User } from 'firebase/auth';

// --- PHANTOM TYPES ---
export const PHANTOM_USER: User = {
    uid: 'phantom-neo-v1',
    displayName: 'Neo (Simulation)',
    email: 'neo@matrix.os',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neo',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    refreshToken: 'phantom-token',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'phantom-jwt',
    getIdTokenResult: async () => ({
        token: 'phantom-jwt',
        signInProvider: 'phantom',
        claims: {},
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        expirationTime: new Date().toISOString(),
        signInSecondFactor: null, // Fixed missing property
    }),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'phantom'
};

// --- AUTH MOCKS ---

export const phantomSignInWithPopup = async (auth: any, _provider: any) => {
    console.log("👻 PHANTOM: Signing in...");
    await new Promise(resolve => setTimeout(resolve, 800)); // Fake network delay
    
    // Trigger the auth state listener
    if (auth._notifyAuthState) {
        auth._notifyAuthState(PHANTOM_USER);
    }
    
    return {
        user: PHANTOM_USER,
        providerId: 'google.com',
        operationType: 'signIn'
    };
};

export const phantomSignOut = async (auth: any) => {
    console.log("👻 PHANTOM: Signing out...");
    if (auth._notifyAuthState) {
        auth._notifyAuthState(null);
    }
};

export const phantomOnAuthStateChanged = (auth: any, observer: (user: User | null) => void) => {
    // Store the observer so we can trigger it later
    auth._notifyAuthState = observer;
    
    // Immediately trigger with null (initially) or simulated persistence
    setTimeout(() => {
        // By default start logged out in phantom mode unless we want to simulate persistence
        observer(null); 
    }, 100);
    
    return () => { auth._notifyAuthState = null; }; // Unsubscribe
};


// --- FIRESTORE MOCKS ---

const PHANTOM_DB: Record<string, any> = {
    'users/phantom-neo-v1': {
        uid: 'phantom-neo-v1',
        email: 'neo@matrix.os',
        displayName: 'Neo (Simulation)',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neo',
        plan: 'PRO',
        archetype: 'NEO',
        stats: { hp: 100, maxHp: 100, xp: 5000, level: 5, gold: 1337, streak: 99 },
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        theme: 'MATRIX'
    }
};

export const phantomDoc = (_db: any, path: string, ...pathSegments: string[]) => {
    const fullPath = [path, ...pathSegments].join('/');
    return { type: 'document', path: fullPath, firestore: _db };
};

export const phantomGetDoc = async (ref: any) => {
    console.log(`👻 PHANTOM: getDoc(${ref.path})`);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const data = PHANTOM_DB[ref.path];
    return {
        exists: () => !!data,
        data: () => data,
        id: ref.path.split('/').pop(),
        ref
    };
};

export const phantomSetDoc = async (ref: any, data: any, _options?: any) => {
    console.log(`👻 PHANTOM: setDoc(${ref.path})`, data);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    PHANTOM_DB[ref.path] = { ...PHANTOM_DB[ref.path], ...data };
};

export const phantomUpdateDoc = async (ref: any, data: any) => {
    console.log(`👻 PHANTOM: updateDoc(${ref.path})`, data);
    if (!PHANTOM_DB[ref.path]) throw new Error("Document not found");
    PHANTOM_DB[ref.path] = { ...PHANTOM_DB[ref.path], ...data };
};

export const phantomRunTransaction = async (_db: any, updateFunction: (transaction: any) => Promise<any>) => {
    console.log("👻 PHANTOM: runTransaction");
    const transactionMock = {
        get: async (ref: any) => phantomGetDoc(ref),
        update: (ref: any, data: any) => {
             console.log(`👻 PHANTOM: transaction.update(${ref.path})`, data);
             if (PHANTOM_DB[ref.path]) {
                 PHANTOM_DB[ref.path] = { ...PHANTOM_DB[ref.path], ...data };
             }
        },
        set: (ref: any, data: any) => {
             console.log(`👻 PHANTOM: transaction.set(${ref.path})`, data);
             PHANTOM_DB[ref.path] = data;
        },
        delete: (ref: any) => {
             delete PHANTOM_DB[ref.path];
        }
    };
    return await updateFunction(transactionMock);
};

export const phantomOnSnapshot = (ref: any, onNext: (doc: any) => void, _onError?: (error: Error) => void) => {
    console.log(`👻 PHANTOM: onSnapshot(${ref.path})`);
    
    // Initial data
    const data = PHANTOM_DB[ref.path];
    const snapshot = {
        exists: () => !!data,
        id: ref.path.split('/').pop(),
        data: () => data,
    };
    
    // Simulate async initial load
    setTimeout(() => {
        onNext(snapshot);
    }, 100);
    
    // Return unsubscribe function
    return () => {
        // Cleanup if needed
    };
};
