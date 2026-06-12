import { supabase } from './supabase';
import { PersistenceService } from './persistence';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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
 * Inicia sesión con Google OAuth (Nativo en móvil, Standard OAuth en web).
 */
export const loginWithGoogle = async (): Promise<any | null> => {
    try {
        const isMobile = Capacitor.isNativePlatform();
        
        if (isMobile) {
            try {
                // Forzar cierre de sesión previo para que siempre pida seleccionar cuenta
                await GoogleAuth.signOut();
            } catch (e) {
                // Ignorar si no había sesión activa o si falla
            }

            // 1. Iniciar sesión nativa con el selector nativo de Google
            const googleUser = await GoogleAuth.signIn();
            const idToken = googleUser.authentication.idToken;
            
            if (!idToken) {
                throw new Error("No se recibió el ID Token de Google Auth.");
            }
            
            // 2. Enviar el ID Token a Supabase para autenticar la sesión
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });
            
            if (error) {
                console.error("Supabase rechazó el token:", error.message);
                alert("Error en Supabase: " + error.message);
                throw error;
            }
            
            if (data.user) {
                PersistenceService.setSession(data.user.id);
            }
            
            return data;
        } else {
            // Flujo Web standard
            const redirectTo = window.location.origin;
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) throw error;
            return data;
        }
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
 * Vincula una cuenta de Google a la cuenta actual, con Pre-flight check estricto.
 */
export const linkGoogleAccount = async () => {
    try {
        const isMobile = Capacitor.isNativePlatform();
        let targetEmail = '';

        if (isMobile) {
            try {
                // Clear previous session so Google selector always displays
                await GoogleAuth.signOut();
            } catch (e) {
                // Ignore
            }

            // 1. Trigger native sign in modal to select Google Account
            const googleUser = await GoogleAuth.signIn();
            targetEmail = googleUser.email;

            if (!targetEmail) {
                throw new Error("No se obtuvo el correo electrónico del selector de Google.");
            }

            // 2. Pre-flight Check: Is it a virgin identity?
            const { data: isVirgin, error: rpcError } = await supabase.rpc('check_virgin_identity', {
                email_to_check: targetEmail.toLowerCase(),
            });

            if (rpcError) throw new Error('Error al validar la identidad en el servidor.');
            
            if (!isVirgin) {
                throw new Error('IDENTITY_NOT_VIRGIN');
            }
        }

        const redirectTo = isMobile 
            ? 'com.luxresilient.app://auth/callback' 
            : `${window.location.origin}/settings?linked=true`;

        // 3. Link Identity in Supabase
        const linkOptions: any = {
            provider: 'google',
            options: {
                queryParams: {
                    access_type: 'offline', // Crucial to obtain provider_refresh_token
                    prompt: 'consent'       // Forces new consent to get refresh token
                },
                redirectTo,
            }
        };

        // If mobile, force Google to link with the selected email using login_hint
        if (isMobile && targetEmail) {
            linkOptions.options.queryParams.login_hint = targetEmail;
        }

        const { data, error } = await supabase.auth.linkIdentity(linkOptions);
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error linking Google account:", error);
        throw error;
    }
};

/**
 * Desvincula una cuenta de Google de la cuenta actual y elimina tokens almacenados.
 */
export const unlinkGoogleAccount = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        // Encontrar la identidad de Google
        const googleIdentity = user.identities?.find(id => id.provider === 'google');
        if (!googleIdentity) throw new Error('No hay cuenta de Google vinculada.');

        const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
        if (error) throw error;

        // Limpiar tokens de la base de datos pública
        await supabase.from('user_integrations').update({
            google_access_token: null,
            google_refresh_token: null,
            updated_at: new Date().toISOString()
        }).eq('user_id', user.id);

        return true;
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
