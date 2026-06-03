import { UserData, DEFAULT_USER_STATS } from '../types/User';

// HELPER: Sanitize data for Firestore (Removes Functions, Symbols, Undefined)
export const sanitizeFirestoreData = (data: any): any => {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sanitizeFirestoreData);

    const sanitized: any = {};
    for (const key in data) {
        const value = data[key];
        
        // Skip explicitly forbidden types
        if (value === undefined) continue;
        if (typeof value === 'function') continue;
        if (typeof value === 'symbol') continue;
        
        // Handle Date objects (Pass through to Firestore)
        if (value instanceof Date) {
            sanitized[key] = value;
            continue;
        }

        // Specific exclusions for UI components
        if (key === 'icon') continue; 

        // Recursive sanitization
        if (typeof value === 'object') {
            // Handle React Elements or non-plain objects roughly
            if (value?.$$typeof) continue; // React Element check
            
            sanitized[key] = sanitizeFirestoreData(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};

export const normalizeUserProfile = (data: any): UserData => {
    if (!data) return {} as UserData;
    
    return {
        uid: data.uid || '',
        email: data.email || null,
        displayName: data.displayName || '',
        photoURL: data.photoURL || null,
        plan: data.plan || 'FREE',
        archetype: data.archetype || 'NEO',
        stats: { ...DEFAULT_USER_STATS, ...(data.stats || {}) },
        theme: data.theme || 'MATRIX',
        createdAt: data.createdAt || Date.now(),
        lastLoginAt: data.lastLoginAt || Date.now(),
        onboarding: data.onboarding || { completedAt: 0 },
        // Preserve any other existing fields that might be in the data
        ...data,
        unlockedStoreItems: data.unlockedStoreItems || data.unlocked_store_items || [],
        inventory: data.inventory || []
    };
};
