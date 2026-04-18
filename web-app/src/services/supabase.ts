import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// IMPORTANTE: En Capacitor, asegúrate de que el build (npm run build) se ejecute 
// CON el archivo .env presente antes de hacer 'npx cap sync'.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. VALIDACIÓN ESTRICTA (FAIL-FAST)
// Si no hay variables, tiramos error para que la build o el startup crasheen.
// Es mejor un crash evidente que un fallo de red silencioso.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "🛑 ERROR CRÍTICO: Variables de entorno de Supabase NO encontradas. " +
        "Asegúrate de tener el archivo .env configurado y ejecutar 'npm run build' ANTES de compilar."
    );
}

export const isSupabaseConfigured = true;
export const configStatus = {
    isValid: true,
    hasKeys: true,
    missingKeys: []
};

console.log(`🔌 MATRIX CORE: Iniciando Supabase con URL: ${supabaseUrl.substring(0, 20)}...`);

// 2. ALMACENAMIENTO NATIVO BLINDADO
// El localStorage se borra en iOS/Android. Usamos @capacitor/preferences para la sesión.
const capacitorStorage = {
    getItem: async (key: string): Promise<string | null> => {
        const { value } = await Preferences.get({ key });
        return value;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        await Preferences.set({ key, value });
    },
    removeItem: async (key: string): Promise<void> => {
        await Preferences.remove({ key });
    },
};

// 3. INICIALIZACIÓN DEL CLIENTE
export const supabase = createClient(
    supabaseUrl, 
    supabaseAnonKey,
    {
        auth: {
            storage: Capacitor.isNativePlatform() ? capacitorStorage : window.localStorage,
            autoRefreshToken: true,
            persistSession: true,
            // En web necesitamos detectar session en URL por los magic links. 
            // En nativo puro, puede causar problemas de ruteo y re-renders si la URL cambia.
            detectSessionInUrl: !Capacitor.isNativePlatform()
        },
        global: {
            headers: {
                'x-application-name': 'matrix-lux-app'
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
export const doc: any = (...args: any[]) => ({ id: args.join('/') });
export const collection: any = (...args: any[]) => ({ path: args.join('/') });
export const getDocs: any = async (...args: any[]) => ({ docs: [] });
export const setDoc: any = async (...args: any[]) => { return {}; };
export const query: any = (...args: any[]) => args;
export const getDoc: any = async (...args: any[]) => ({ exists: () => false, data: () => ({}) });
export const runTransaction = async (db: any, updateFunction: any) => {
    const mockTransaction = {
        get: async () => ({ exists: () => false, data: () => ({}) }),
        update: () => {},
        set: () => {},
        delete: () => {}
    };
    return updateFunction(mockTransaction);
};
export const serverTimestamp: any = () => new Date().toISOString();
export const writeBatch: any = (...args: any[]) => ({
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async () => {}
});
export const increment: any = (n: number) => n;
export const addDoc: any = async (...args: any[]) => ({ id: 'mock-id' });
export const arrayUnion: any = (...args: any[]) => args;
export const updateDoc: any = async (...args: any[]) => { return {}; };
export const deleteDoc: any = async (...args: any[]) => { return {}; };
export const getRedirectResult: any = async (...args: any[]) => null;

// Additional mock Firebase auth and firestore functions to prevent build errors
export const onAuthStateChanged: any = (auth: any, callback: any) => { callback(null); return () => {}; };
export const signOut: any = async (...args: any[]) => { return {}; };
export const waitForPendingWrites: any = async (...args: any[]) => { return {}; };
export const GoogleAuthProvider: any = class {};
export const signInWithPopup: any = async (...args: any[]) => { return {}; };
export const signInWithRedirect: any = async (...args: any[]) => { return {}; };
export const signInWithCredential: any = async (...args: any[]) => { return {}; };
export const signInAnonymously: any = async (...args: any[]) => { return {}; };
export const updateProfile: any = async (...args: any[]) => { return {}; };
export const onSnapshot: any = (...args: any[]) => { return () => {}; };

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
