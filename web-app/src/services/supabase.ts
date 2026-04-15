import { createClient } from '@supabase/supabase-js';

// Get environment variables or fallback to empty strings to prevent build crashes
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Status flag to know if Supabase is ready
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const configStatus = {
    isValid: isSupabaseConfigured,
    hasKeys: isSupabaseConfigured,
    missingKeys: isSupabaseConfigured ? [] : ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
};

if (!isSupabaseConfigured) {
    console.warn(
        '⚠️ MATRIX CORE: Supabase no está configurado. ' +
        'Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY a tu archivo .env'
    );
}

// Initialize the single Supabase client
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseAnonKey || 'placeholder_key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        global: {
            headers: {
                apikey: supabaseAnonKey || 'placeholder_key'
            }
        }
    }
);

// We keep these empty objects/types to avoid breaking other files 
// that might still be importing Firebase-like structures while you migrate them.
export const app = {} as any;
export const auth = { currentUser: null } as any;
export const db = {} as any;
export type User = any;

// Mock Firebase functions to fix build errors during migration
export const doc = (...args: any[]) => ({ id: args.join('/') }) as any;
export const collection = (...args: any[]) => ({ path: args.join('/') }) as any;
export const getDocs = async (...args: any[]) => ({ docs: [] }) as any;
export const setDoc = async (...args: any[]) => { return {} as any; };
export const query = (...args: any[]) => args as any;
export const getDoc = async (...args: any[]) => ({ exists: () => false, data: () => ({}) }) as any;
export const runTransaction = async (db: any, updateFunction: any) => {
    const mockTransaction = {
        get: async () => ({ exists: () => false, data: () => ({}) }),
        update: () => {},
        set: () => {},
        delete: () => {}
    };
    return updateFunction(mockTransaction);
};
export const serverTimestamp = () => new Date().toISOString() as any;
export const writeBatch = (...args: any[]) => ({
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async () => {}
}) as any;
export const increment = (n: number) => n as any;
export const addDoc = async (...args: any[]) => ({ id: 'mock-id' }) as any;
export const arrayUnion = (...args: any[]) => args as any;
export const updateDoc = async (...args: any[]) => { return {} as any; };
export const deleteDoc = async (...args: any[]) => { return {} as any; };
export const getRedirectResult = async (...args: any[]) => null as any;

// Additional mock Firebase auth and firestore functions to prevent build errors
export const onAuthStateChanged = (auth: any, callback: any) => { callback(null); return () => {}; } as any;
export const signOut = async (...args: any[]) => { return {} as any; };
export const waitForPendingWrites = async (...args: any[]) => { return {} as any; };
export const GoogleAuthProvider = class {} as any;
export const signInWithPopup = async (...args: any[]) => { return {} as any; };
export const signInWithRedirect = async (...args: any[]) => { return {} as any; };
export const signInWithCredential = async (...args: any[]) => { return {} as any; };
export const signInAnonymously = async (...args: any[]) => { return {} as any; };
export const updateProfile = async (...args: any[]) => { return {} as any; };
export const onSnapshot = (...args: any[]) => { return () => {}; } as any;

// Mock Firebase types
export type Firestore = any;
export type QueryConstraint = any;
export type Transaction = any;

export class Timestamp {
    seconds: number;
    nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }
    static now() {
        return Timestamp.fromMillis(Date.now());
    }
    static fromDate(date: Date) {
        return Timestamp.fromMillis(date.getTime());
    }
    static fromMillis(milliseconds: number) {
        return new Timestamp(Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1000000);
    }
    toMillis() {
        return this.seconds * 1000 + this.nanoseconds / 1000000;
    }
    toDate() {
        return new Date(this.toMillis());
    }
}
