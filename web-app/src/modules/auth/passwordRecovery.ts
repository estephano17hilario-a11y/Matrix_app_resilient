import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';

// Tiny external store: "the user arrived through a password-recovery link and must pick a new password".
let pending = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const markPasswordRecovery = () => { if (!pending) { pending = true; emit(); } };
export const clearPasswordRecovery = () => { if (pending) { pending = false; emit(); } };
export const usePasswordRecoveryPending = () =>
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => pending,
    () => false,
  );

/** True when a Supabase auth redirect URL (hash or query) is a recovery link. */
export const isRecoveryUrl = (url: string): boolean => /[#?&]type=recovery(&|$)/.test(url);

/**
 * Where the email link must send the user back to. The native URL has to be listed in the GoTrue
 * "Redirect URLs" allow-list of the Supabase server (see supabase/functions/README.md).
 */
export const recoveryRedirectUrl = (): string =>
  Capacitor.isNativePlatform() ? 'com.luxresilient.app://auth/callback' : window.location.origin;

/**
 * Sends the reset email. Resolves the same way whether or not the account exists, so the screen
 * cannot be used to discover which emails are registered.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  // Lazy: keeps the pure helpers importable (and testable) without booting the Supabase client.
  const { supabase } = await import('../../services/supabase');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: recoveryRedirectUrl() });
  // Rate limiting and server problems are real errors the user can act on; "unknown user" is not reported by GoTrue.
  if (error) throw error;
};
