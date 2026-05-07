import { supabase } from './supabase';
import { PersistenceService } from './persistence';

/**
 * Registra un nuevo usuario con Email y Contraseña.
 */
export const atomicRegister = async (email: string, password: string, name: string, _lang: string): Promise<any> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: name,
                }
            }
        });

        if (error) throw error;
        
        // Si no hay sesión, significa que la confirmación de correo está activada en Supabase.
        if (data.user && !data.session) {
            throw new Error("Cuenta creada. Por favor, revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.");
        }
        
        if (data.user) {
            PersistenceService.setSession(data.user.id);
        }
        
        return data.user;
    } catch (error) {
        console.error("❌ ERROR EN ATOMIC REGISTER (Supabase):", error);
        throw error;
    }
};

/**
 * Inicia sesión con Email y Contraseña.
 */
export const atomicLogin = async (email: string, password: string): Promise<any> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        
        if (data.user) {
            PersistenceService.setSession(data.user.id);
        }

        return data.user;
    } catch (error) {
        console.error("⛔ ATOMIC LOGIN FAILED (Supabase):", error);
        throw error;
    }
};

/**
 * Inicia sesión con Google OAuth.
 */
export const loginWithGoogle = async (): Promise<any | null> => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        });

        if (error) throw error;
        
        return data; // Note: OAuth redirection might not return the user immediately
    } catch (error) {
        console.error("Google Login Failed (Supabase):", error);
        throw error;
    }
};

/**
 * Obtiene las identidades vinculadas a la cuenta del usuario actual.
 */
export const getLinkedIdentities = async () => {
    try {
        const { data, error } = await supabase.auth.getUserIdentities();
        if (error) throw error;
        return data.identities;
    } catch (error) {
        console.error("Error fetching linked identities:", error);
        return [];
    }
};

/**
 * Vincula una cuenta de Google a la cuenta actual.
 */
export const linkGoogleAccount = async () => {
    try {
        const { data, error } = await supabase.auth.linkIdentity({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error linking Google account:", error);
        throw error;
    }
};

/**
 * Desvincula una cuenta de Google de la cuenta actual.
 */
export const unlinkGoogleAccount = async (identity: any) => {
    try {
        const { data, error } = await supabase.auth.unlinkIdentity(identity);
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error unlinking Google account:", error);
        throw error;
    }
};

/**
 * Cierra la sesión del usuario actual.
 */
export const logout = async (): Promise<void> => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        PersistenceService.clearSession();
    } catch (error) {
        console.error("Disconnection Error (Supabase):", error);
        throw error;
    }
};

/**
 * Obtiene el usuario activo actualmente.
 */
export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};
