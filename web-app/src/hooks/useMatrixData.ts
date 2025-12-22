import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, FirestoreError } from '../services/firebase';
import { db, configStatus } from '../services/firebase';
import { UserData, UserStats, DEFAULT_USER_STATS } from '../types/User';
import { ENABLE_GLOBAL_PRO } from '../config/limits';

export { type UserData, type UserStats };

export interface MatrixDataHook {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  isSyncing: boolean;
}

export const useMatrixData = (userId: string | null | undefined): MatrixDataHook => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isMounted = useRef(true);
  const unsubscribeRef = useRef<() => void>();

  useEffect(() => {
    isMounted.current = true;

    const connectToMatrix = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        if (!configStatus.isValid) {
            console.warn("Matrix Data: No Valid Config (Phantom Mode).");
            setLoading(false);
            return;
        }

        if (!isMounted.current) return;

        try {
            console.log(`📡 MATRIX: Stabilizing uplink for [${userId}]...`);
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
                        const safeStats = { ...DEFAULT_USER_STATS, ...(data.stats || {}) };
                        
                        // ⚡ OVERRIDE: Global PRO
                        if (ENABLE_GLOBAL_PRO) {
                            data.plan = 'PRO';
                        }

                        setUser({ 
                            uid: snapshot.id, 
                            ...data,
                            stats: safeStats
                        } as UserData);
                        setError(null);
                    } else {
                        console.log("⚠️ MATRIX: User profile pending creation.");
                    }
                    setLoading(false);
                },
                (err: FirestoreError) => {
                    if (!isMounted.current) return;
                    console.error("❌ MATRIX UPLINK ERROR:", err);
                    // Silently handle abortions to keep UI clean
                    if (err.message.includes("Aborted") || err.code === 'unavailable' || err.code === 'resource-exhausted') {
                         console.warn("⚠️ MATRIX: Connection unstable (retrying silently)...");
                    } else if (err.code === 'permission-denied') {
                        console.error("⛔ MATRIX: Access Denied. Check your Neural Link (Security Rules).");
                        setError("Access Denied: Neural Link blocked.");
                    } else {
                        console.error("❌ MATRIX UPLINK ERROR:", err);
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

    connectToMatrix();

    return () => {
        isMounted.current = false;
        if (unsubscribeRef.current) {
            console.log("🔌 MATRIX: Terminating uplink.");
            unsubscribeRef.current();
        }
    };

  }, [userId]);

  return { user, loading, error, isSyncing };
};
