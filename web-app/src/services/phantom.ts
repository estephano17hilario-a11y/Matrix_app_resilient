// Removed firebase dependency

// --- PERSISTENCE HELPERS ---
const PHANTOM_SESSION_KEY = 'MATRIX_PHANTOM_SESSION';
const PHANTOM_DB_KEY = 'MATRIX_PHANTOM_DB';

const saveSession = (user: User | null) => {
    if (user) {
        localStorage.setItem(PHANTOM_SESSION_KEY, JSON.stringify({
            uid: user.id,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));
    } else {
        localStorage.removeItem(PHANTOM_SESSION_KEY);
    }
};

const getSavedSession = (): Partial<User> | null => {
    const saved = localStorage.getItem(PHANTOM_SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
};

const getSavedDB = () => {
    const saved = localStorage.getItem(PHANTOM_DB_KEY);
    return saved ? JSON.parse(saved) : {};
};

const saveDB = (db: any) => {
    localStorage.setItem(PHANTOM_DB_KEY, JSON.stringify(db));
};

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
        signInSecondFactor: null,
    }),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'phantom'
};

// --- AUTH MOCKS ---

export const phantomSignInWithPopup = async (auth: any, _provider: any) => {
    console.log("👻 PHANTOM: Signing in...");
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const user = { ...PHANTOM_USER };
    saveSession(user);
    
    if (auth._notifyAuthState) {
        auth._notifyAuthState(user);
    }
    
    return {
        user,
        providerId: 'google.com',
        operationType: 'signIn'
    };
};

export const phantomSignOut = async (auth: any) => {
    console.log("👻 PHANTOM: Signing out...");
    saveSession(null);
    if (auth._notifyAuthState) {
        auth._notifyAuthState(null);
    }
};

export const phantomOnAuthStateChanged = (auth: any, observer: (user: User | null) => void) => {
    auth._notifyAuthState = observer;
    
    const savedUser = getSavedSession();
    
    setTimeout(() => {
        if (savedUser) {
            console.log("🛡️ PHANTOM: Recovering session for", savedUser.email);
            observer({ ...PHANTOM_USER, ...savedUser } as User);
        } else {
            observer(null); 
        }
    }, 100);
    
    return () => { auth._notifyAuthState = null; };
};


// --- FIRESTORE MOCKS ---

const getInitialDB = () => {
    const local = getSavedDB();
    if (Object.keys(local).length > 0) return local;

    return {
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
};

let PHANTOM_DB = getInitialDB();

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
    saveDB(PHANTOM_DB);
};

export const phantomUpdateDoc = async (ref: any, data: any) => {
    console.log(`👻 PHANTOM: updateDoc(${ref.path})`, data);
    if (!PHANTOM_DB[ref.path]) {
        // Create if doesn't exist to be more resilient in onboarding
        PHANTOM_DB[ref.path] = data;
    } else {
        PHANTOM_DB[ref.path] = { ...PHANTOM_DB[ref.path], ...data };
    }
    saveDB(PHANTOM_DB);
};

export const phantomDeleteDoc = async (ref: any) => {
    console.log(`👻 PHANTOM: deleteDoc(${ref.path})`);
    if (PHANTOM_DB[ref.path]) {
        delete PHANTOM_DB[ref.path];
        saveDB(PHANTOM_DB);
    }
};

export const phantomGetDocs = async (collectionRef: any) => {
    console.log(`👻 PHANTOM: getDocs(${collectionRef.path})`);
    await new Promise(resolve => setTimeout(resolve, 150));

    const prefix = collectionRef.path + '/';
    const docs: any[] = [];

    Object.keys(PHANTOM_DB).forEach(key => {
        if (!key.startsWith(prefix)) return;
        const remaining = key.substring(prefix.length);
        if (!remaining || remaining.includes('/')) return;

        const data = PHANTOM_DB[key];
        docs.push({
            id: remaining,
            data: () => data,
            exists: () => true
        });
    });

    return { docs, empty: docs.length === 0 };
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
    const result = await updateFunction(transactionMock);
    saveDB(PHANTOM_DB);
    return result;
};

export const phantomWriteBatch = (_db: any) => {
    const operations: (() => void)[] = [];
    
    const batch = {
        set: (ref: any, data: any, _options?: any) => {
             operations.push(() => {
                 console.log(`👻 PHANTOM: batch.set(${ref.path})`, data);
                 PHANTOM_DB[ref.path] = { ...PHANTOM_DB[ref.path], ...data };
             });
             return batch;
        },
        update: (ref: any, data: any) => {
             operations.push(() => {
                 console.log(`👻 PHANTOM: batch.update(${ref.path})`, data);
                 // Handle dot notation for nested fields like 'stats.hp'
                 const updateData = { ...data };
                 
                 // Simple merge for now, but should handle dot notation if possible or assume flat for mock
                 // If data has keys with dots, we might want to handle them.
                 // For now, let's just do a shallow merge which is what the previous code did
                 if (PHANTOM_DB[ref.path]) {
                     PHANTOM_DB[ref.path] = { ...PHANTOM_DB[ref.path], ...updateData };
                 }
             });
             return batch;
        },
        delete: (ref: any) => {
             operations.push(() => {
                 console.log(`👻 PHANTOM: batch.delete(${ref.path})`);
                 delete PHANTOM_DB[ref.path];
             });
             return batch;
        },
        commit: async () => {
             console.log(`👻 PHANTOM: batch.commit() - Executing ${operations.length} operations`);
             await new Promise(resolve => setTimeout(resolve, 500));
             operations.forEach(op => op());
             saveDB(PHANTOM_DB);
        }
    };
    return batch;
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
