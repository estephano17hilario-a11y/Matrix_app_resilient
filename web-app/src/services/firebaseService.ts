import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { DEFAULT_USER_STATS } from '../types/User';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { PersistenceService } from './persistence';
import { retryOperation } from '../utils/networkUtils';

if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize({
      clientId: '337956413837-50tlt5kf1l8o39bobc1bispknmun857o.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (e) {
    console.warn("GoogleAuth initialization failed:", e);
  }
}

/**
 * ATOMIC USER INITIALIZATION (DESDE CERO)
 * This is the ONLY place where a user document is created.
 */
export const initializeUserDocument = async (user: User, additionalData: any = {}) => {
  try {
    // INTENTAR LEER SI YA EXISTE EN SUPABASE
    const { data: existingData, error: getError } = await supabase
      .from('users')
      .select('id, email, display_name, photo_url, plan, archetype, theme, created_at, last_login_at, stats, onboarding, es_pro, revenuecat_app_user_id, avatar_id, preferences, updated_at')
      .eq('id', user.id)
      .single();

    const exists = !!existingData && !getError;

    // CREACIÓN DE NUEVO USUARIO
    if (!exists) {
        console.log("💎 MATRIX: Creating fresh user document in Supabase...");
        const defaultData: any = {
            id: user.id, // Supabase usa 'id' en lugar de 'uid'
            email: user.email || null,
            photo_url: user.user_metadata?.avatar_url || null, // Supabase metadata
            plan: 'FREE',
            es_pro: false,
            archetype: 'NEO',
            stats: DEFAULT_USER_STATS,
            theme: 'MATRIX',
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
            onboarding: {
                successDefinition: "Becoming the One",
                obstacles: [],
                coachingTone: "Stoic",
                completedAt: 0,
                language: localStorage.getItem('i18nextLng') || 'en'
            },
            ...additionalData
        };

        if (additionalData.displayName) {
            defaultData.display_name = additionalData.displayName;
        } else if (user.user_metadata?.full_name) {
            defaultData.display_name = user.user_metadata.full_name;
        }

        const { error: insertError } = await retryOperation(async () => await supabase.from('users').insert(defaultData));
        if (insertError) throw insertError;
        
        return defaultData;
    } else {
        // ACTUALIZACIÓN DE USUARIO EXISTENTE
        console.log("💎 MATRIX: Updating existing user login timestamp in Supabase...");
        const updateData: any = { 
            last_login_at: new Date().toISOString(),
        };

        if (additionalData.displayName) updateData.display_name = additionalData.displayName;
        if (additionalData.isAnonymous !== undefined) updateData.isAnonymous = additionalData.isAnonymous;

        const { error: updateError } = await retryOperation(async () => await supabase.from('users').update(updateData).eq('id', user.id));
        if (updateError) throw updateError;
        
        return { ...existingData, ...updateData };
    }
  } catch (err) {
    console.error("⛔ CRITICAL ERROR in initializeUserDocument:", err);
    throw err;
  }
};
//evaluamos la problematica de las circustancias y al mismo tiempo se hace la capacitacion de forma asincrona
export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    let user: User | null = null;

    if (Capacitor.isNativePlatform()) {
      const googleUser = await GoogleAuth.signIn();
      const { data, error } = await supabase.auth.signInWithIdToken({ 
        provider: 'google', 
        token: googleUser.authentication.idToken 
      });
      if (error) throw error;
      user = data.user;
    } else {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      // In web OAuth with redirect, the user is not returned immediately
      // The session will be picked up by onAuthStateChange
      return null; 
    }

    if (user) {
        await initializeUserDocument(user, { isAnonymous: false });
        PersistenceService.setSession(user.id);
        return user;
    }
    return null;
  } catch (error: any) {
    console.error("Google Login Error:", error);
    throw error;
  }
};
//solo saber el hecho de que somo materia nos hace cuestionarnos la vida, verdad?
//seria bonito ser mas feliz, pero igual se sonrie para ser feliz, no al revez
//aunque cuento me gustaria que sea alrevez
export const loginAsGuest = async (name: string): Promise<User> => {
    try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        
        const user = data.user;
        if (!user) throw new Error("No user returned from anonymous login");
        
        await supabase.auth.updateUser({ data: { full_name: name } });
        
        await initializeUserDocument(user, { displayName: name, isAnonymous: true, email: null });
        
        PersistenceService.setSession(user.id);
        return user;
    } catch (error) {
        console.error("Guest Login Failed:", error);
        throw error;
    }
};

export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Disconnection Error:", error);
    throw error;
  }
};

export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('users').select('id').eq('id', uid).single();
    if (error || !data) return false;
    return true;
  } catch (error) {
    console.error("Database Query Failed:", error);
    return false;
  }
};
