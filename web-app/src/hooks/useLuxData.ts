import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from '../services/firebase';
import { db, configStatus } from '../services/firebase';
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
    if (user?.uid !== userId) {
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
    
    let unsubscribe: () => void = () => {};

    try {
        const userRef = doc(db, 'users', userId);
        unsubscribe = onSnapshot(
            userRef, 
            { includeMetadataChanges: true },
            (snapshot: any) => {
                if (!isMounted.current) return;

                const pending = snapshot.metadata?.hasPendingWrites || false;
                setIsSyncing(pending);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const normalized = normalizeUserProfile({ uid: snapshot.id, ...data });
                    const safeStats = { ...DEFAULT_USER_STATS, ...(normalized?.stats || data.stats || {}) };
                    
                    // AUDIT: Verificación estricta de Expiración de Plan Delux
                    if (data.plan === 'PRO' && data.planExpiryDate) {
                        if (Date.now() > data.planExpiryDate) {
                            console.warn("🛡️ AUDIT: Plan Delux Expirado. Revirtiendo a FREE.");
                            data.plan = 'FREE';
                            // Optimistic update
                            updateDoc(userRef, { plan: 'FREE', planExpiryDate: null }).catch(e => console.error(e));
                        }
                    }

                    // ⚡ OVERRIDE: Global PRO
                    if (ENABLE_GLOBAL_PRO) {
                        data.plan = 'PRO';
                    }

                    const newData = { 
                        ...data,
                        ...(normalized || {}),
                        stats: safeStats
                    } as UserData;

                    // Only update if data changed (Deep check optional, but React handles shallow well)
                    setUser(newData);
                    setLoading(false);
                    setError(null);

                    // Update Cache
                    PersistenceService.saveProfile(newData);
                } else {
                    console.warn(`User [${userId}] not found in Matrix.`);
                    // Only clear if we are sure it's not just a connection blip?
                    // Snapshot exists=false means the doc is genuinely missing or we don't have permission.
                    setUser(null);
                    setLoading(false);
                }
            },
            (err: any) => {
                console.error("Lux Data Sync Error:", err);
                setError(err.message);
                setLoading(false);
            }
        );
    } catch (e: any) {
        console.error("Failed to setup Lux subscription:", e);
        setError(e.message);
        setLoading(false);
    }

    // 4. Cleanup
    return () => {
        isMounted.current = false;
        if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  return { user, loading, error, isSyncing };
};
