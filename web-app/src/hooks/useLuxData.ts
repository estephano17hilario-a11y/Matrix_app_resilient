import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, configStatus } from '../services/supabase';
import { UserData, UserStats, DEFAULT_USER_STATS } from '../types/User';
import { ENABLE_GLOBAL_PRO } from '../config/limits';
import { PersistenceService } from '../services/persistence';
import { normalizeUserProfile } from '../utils/firestoreUtils';
import { OfflineSyncService } from '../services/offlineSync';

export { type UserData, type UserStats };

export interface LuxDataHook {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  isSyncing: boolean;
  updateLuxLocally: (updates: Partial<UserData>) => void;
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
    let handleSupabaseDataFn: (data: any) => void = () => {};

    try {
        const handleSupabaseData = (data: any) => {
            const normalized = normalizeUserProfile({ uid: data.id, ...data, displayName: data.display_name, photoURL: data.photo_url });
            let safeStats = { ...DEFAULT_USER_STATS, ...(normalized?.stats || data.stats || {}) };
            let safeDailyLimits = data.stats?.dailyLimits || normalized?.dailyLimits || undefined;

            // Merge pending local stats to prevent overwrite
            if (userId && OfflineSyncService.hasPendingStatsSync(userId)) {
                const pendingStats = OfflineSyncService.getPendingStats(userId);
                if (pendingStats) {
                    console.log("🛡️ LUX SYNC GUARD: Merging pending offline stats to prevent overwrite:", pendingStats);
                    safeStats = { ...safeStats, ...pendingStats };
                    if (pendingStats.dailyLimits) {
                        safeDailyLimits = pendingStats.dailyLimits;
                    }
                }
            }

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

        handleSupabaseDataFn = handleSupabaseData;

        // Fetch initial data
        if (!navigator.onLine) {
            console.log("📶 LUX: Offline detected. Using local cache only.");
            setLoading(false);
        } else {
            supabase.from('users').select('id, email, display_name, photo_url, plan, archetype, theme, created_at, last_login_at, stats, onboarding, es_pro, revenuecat_app_user_id, avatar_id, preferences, updated_at, inventory, unlocked_store_items').eq('id', userId).limit(1).then(({ data, error }) => {
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

    // 🧠 Visibility Refetch (Cross-device Sync)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && userId && navigator.onLine) {
            console.log("📶 LUX: Visibility visible, refetching user stats...");
            supabase.from('users')
                .select('id, email, display_name, photo_url, plan, archetype, theme, created_at, last_login_at, stats, onboarding, es_pro, revenuecat_app_user_id, avatar_id, preferences, updated_at, inventory, unlocked_store_items')
                .eq('id', userId)
                .limit(1)
                .then(({ data, error }) => {
                    const userData = data && data.length > 0 ? data[0] : null;
                    if (userData && !error) {
                        handleSupabaseDataFn(userData);
                    }
                });
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        isMounted.current = false;
        if (channel) supabase.removeChannel(channel);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  const updateLuxLocally = useCallback((updates: Partial<UserData>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        ...updates,
        stats: updates.stats ? {
          ...(prev.stats || {}),
          ...updates.stats
        } : prev.stats,
      } as UserData;
      PersistenceService.saveProfile(updated);
      console.log("⚡ LUX: Profile updated locally (Optimistic):", updates);
      return updated;
    });
  }, []);

  return { user, loading, error, isSyncing, updateLuxLocally };
};
