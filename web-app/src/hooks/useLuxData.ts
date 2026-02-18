import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, FirestoreError } from '../services/firebase';
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
  const unsubscribeRef = useRef<() => void>();
  const lastUpdateTimeRef = useRef<number | null>(null);
  const lastSnapshotUidRef = useRef<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    // Reset if userId changes and we don't have matching cache
    if (userId && user?.uid !== userId) {
        lastUpdateTimeRef.current = null;
        lastSnapshotUidRef.current = null;
        const cached = PersistenceService.getProfile(userId);
        if (cached && cached.uid === userId) {
            setUser({ ...cached, stats: { ...DEFAULT_USER_STATS, ...(cached.stats || {}) } } as UserData);
            setLoading(false);
        } else {
            setLoading(true);
            setUser(null);
        }
    }

    const connectToLux = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        if (!configStatus.isValid) {
            console.warn("Lux Data: No Valid Config (Phantom Mode).");
            setLoading(false);
            return;
        }

        if (!isMounted.current) return;

        try {
            console.log(`📡 LUX: Stabilizing uplink for [${userId}]...`);
            const userRef = doc(db, 'users', userId);

            unsubscribeRef.current = onSnapshot(
                userRef, 
                { includeMetadataChanges: true },
                (snapshot: any) => {
                    if (!isMounted.current) return;

                    // Sync Status Check
                    const pending = snapshot.metadata?.hasPendingWrites || false;
                    setIsSyncing(pending);

                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        const normalized = normalizeUserProfile({ uid: snapshot.id, ...data });
                        const safeStats = { ...DEFAULT_USER_STATS, ...(normalized?.stats || data.stats || {}) };
                        
                        // ⚡ OVERRIDE: Global PRO
                        if (ENABLE_GLOBAL_PRO) {
                            data.plan = 'PRO';
                        }

                        const newData = { 
                            uid: snapshot.id, 
                            ...data,
                            ...(normalized || {}),
                            stats: safeStats
                        } as UserData;
                        const updateTime = snapshot.updateTime?.toMillis() ?? 0;
                        if (lastUpdateTimeRef.current !== updateTime || lastSnapshotUidRef.current !== snapshot.id) {
                            lastUpdateTimeRef.current = updateTime;
                            lastSnapshotUidRef.current = snapshot.id;
                            setUser(newData);
                            PersistenceService.saveProfile(newData);
                        }
                        
                        setError(null);
                    } else {
                        console.log("⚠️ LUX: User profile pending creation.");
                    }
                    setLoading(false);
                },
                (err: FirestoreError) => {
                    if (!isMounted.current) return;
                    console.error("❌ LUX UPLINK ERROR:", err);
                    // Silently handle abortions to keep UI clean
                    if (err.message.includes("Aborted") || err.code === 'unavailable' || err.code === 'resource-exhausted') {
                         console.warn("⚠️ LUX: Connection unstable (retrying silently)...");
                    } else if (err.code === 'permission-denied') {
                        console.error("⛔ LUX: Access Denied. Check your Neural Link (Security Rules).");
                        setError("Access Denied: Neural Link blocked.");
                    } else {
                        console.error("❌ LUX UPLINK ERROR:", err);
                        setError(err.message);
                    }
                    setLoading(false);
                }
            );
        } catch (e) {
            console.error("Connection failed:", e);
            setLoading(false);
        }
    };

    connectToLux();

    return () => {
        isMounted.current = false;
        if (unsubscribeRef.current) {
            console.log("🔌 LUX: Terminating uplink.");
            unsubscribeRef.current();
        }
    };

  }, [userId]);

  return { user, loading, error, isSyncing };
};
