import { useState, useEffect, useRef } from 'react';
import { supabase, configStatus } from '../services/supabase';
import { UserData, UserStats, DEFAULT_USER_STATS } from '../types/User';
import { ENABLE_GLOBAL_PRO } from '../config/limits';
import { PersistenceService } from '../services/persistence';
import { normalizeUserProfile } from '../utils/firestoreUtils';

export { type UserData, type UserStats };

export interface LuxDataHook {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  isSyncing: boolean;
}

export const useLuxData = (userId: string | null | undefined): LuxDataHook => {
  // 🧠 MEMORY CORE: Initialize directly from persistence to prevent "Flash of Null"
  const [user, setUser] = useState<UserData | null>(() => {
    if (!userId) return null;
    const cached = PersistenceService.getProfile(userId);
    // Only use cache if it matches the requested user (Security)
    if (cached && cached.uid === userId) {
        console.log("💾 LUX: Instant Boot from Memory Core.");
        return { 
            ...cached, 
            stats: { ...DEFAULT_USER_STATS, ...(cached.stats || {}) } 
        } as UserData;
    }
    return null;
  });

  const [loading, setLoading] = useState(!user); // If we have user, we are not "loading" (Optimistic)
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // 1. Validate Input
    if (!userId) {
        setUser(null);
        setLoading(false);
        return;
    }

    // 2. Handle Cache (Instant Boot)
    // Only if current user state doesn't match requested userId (or first load)
    if (user?.id !== userId) {
        const cached = PersistenceService.getProfile(userId);
        if (cached && cached.uid === userId) {
             setUser({ ...cached, stats: { ...DEFAULT_USER_STATS, ...(cached.stats || {}) } } as UserData);
             setLoading(false); // Optimistic load
        } else {
             setLoading(true);
             setUser(null);
        }
    }

    // 3. Setup Subscription
    if (!configStatus.isValid) {
        console.warn("Lux Data: No Valid Config (Phantom Mode).");
        setLoading(false);
        return;
    }

    console.log(`📡 LUX: Stabilizing uplink for [${userId}]...`);
    
    let channel: any = null;

    try {
        const handleSupabaseData = (data: any) => {
            const normalized = normalizeUserProfile({ uid: data.id, ...data, displayName: data.display_name, photoURL: data.photo_url });
            const safeStats = { ...DEFAULT_USER_STATS, ...(normalized?.stats || data.stats || {}) };
            const safeDailyLimits = data.stats?.dailyLimits || normalized?.dailyLimits || undefined;

            // AUDIT: Verificación estricta de Expiración de Plan Delux
            if (data.plan === 'PRO' && data.planExpiryDate) {
                if (Date.now() > data.planExpiryDate) {
                    console.warn("🛡️ AUDIT: Plan Delux Expirado. Revirtiendo a FREE.");
                    data.plan = 'FREE';
                    // Optimistic update
                    supabase.from('users').update({ plan: 'FREE', planExpiryDate: null }).eq('id', userId).then(({error}) => { if (error) console.error(error); });
                }
            }

            // ⚡ OVERRIDE: Global PRO
            if (ENABLE_GLOBAL_PRO) {
                data.plan = 'PRO';
            }

            const newData = { 
                ...data,
                ...(normalized || {}),
                stats: safeStats,
                dailyLimits: safeDailyLimits,
                displayName: data.display_name,
                photoURL: data.photo_url,
                uid: data.id
            } as UserData;

            // Only update if data changed
            setUser(newData);
            setLoading(false);
            setError(null);

            // Update Cache
            PersistenceService.saveProfile(newData);
        };

        // Fetch initial data
        if (!navigator.onLine) {
            console.log("📶 LUX: Offline detected. Using local cache only.");
            setLoading(false);
        } else {
            supabase.from('users').select('id, email, display_name, photo_url, plan, archetype, theme, created_at, last_login_at, stats, onboarding, es_pro, revenuecat_app_user_id, avatar_id, preferences, updated_at').eq('id', userId).limit(1).then(({ data, error }) => {
                const userData = data && data.length > 0 ? data[0] : null;
                if (error) {
                    console.error("Lux Data Initial Fetch Error:", error);
                    setError(error.message);
                    setLoading(false);
                } else if (userData) {
                    handleSupabaseData(userData);
                } else {
                    console.warn(`User [${userId}] not found in Matrix.`);
                    setUser(null);
                    setLoading(false);
                }
            });
        }

        // Subscribe to real-time changes
        channel = supabase.channel(`public:users:id=eq.${userId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
                (payload: any) => {
                    if (!isMounted.current) return;

                    if (payload.eventType === 'DELETE') {
                        console.warn(`User [${userId}] was deleted.`);
                        setUser(null);
                        setLoading(false);
                    } else if (payload.new && Object.keys(payload.new).length > 0) {
                        setIsSyncing(true); // Simulate syncing state
                        handleSupabaseData(payload.new);
                        setTimeout(() => setIsSyncing(false), 500); // Clear after a bit
                    }
                }
            )
            .subscribe();

    } catch (e: any) {
        console.error("Failed to setup Lux subscription:", e);
        setError(e.message);
        setLoading(false);
    }

    // 4. Cleanup
    return () => {
        isMounted.current = false;
        if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  return { user, loading, error, isSyncing };
};
