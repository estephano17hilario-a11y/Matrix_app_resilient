import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, configStatus } from '../services/firebase';

export interface UserStats {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  gold: number;
  streak: number;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  stats: UserStats;
  archetype: string;
}

export interface MatrixDataHook {
  user: UserData | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATS: UserStats = {
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    gold: 0,
    streak: 0
};

export const useMatrixData = (userId: string | null | undefined): MatrixDataHook => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const unsubscribeRef = useRef<() => void>();

  useEffect(() => {
    isMounted.current = true;
    let timeoutId: NodeJS.Timeout;

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

        // 🛡️ DEBOUNCE: REMOVED for Instant Feedback
        // await new Promise(resolve => timeoutId = setTimeout(resolve, 800));
        
        if (!isMounted.current) return;

        try {
            console.log(`📡 MATRIX: Stabilizing uplink for [${userId}]...`);
            const userRef = doc(db, 'users', userId);

            unsubscribeRef.current = onSnapshot(
                userRef, 
                (snapshot) => {
                    if (!isMounted.current) return;

                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        const safeStats = { ...DEFAULT_STATS, ...(data.stats || {}) };
                        
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
                (err) => {
                    if (!isMounted.current) return;
                    console.error("❌ MATRIX UPLINK ERROR:", err);
                    // Silently handle abortions to keep UI clean
                    if (err.message.includes("Aborted") || err.code === 'unavailable') {
                         console.warn("⚠️ Retrying connection...");
                         // Optional: Implement retry logic here if needed
                    } else {
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
        clearTimeout(timeoutId);
        if (unsubscribeRef.current) {
            console.log("🔌 MATRIX: Terminating uplink.");
            unsubscribeRef.current();
        }
    };

  }, [userId]);

  return { user, loading, error };
};
