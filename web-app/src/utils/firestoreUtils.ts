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
