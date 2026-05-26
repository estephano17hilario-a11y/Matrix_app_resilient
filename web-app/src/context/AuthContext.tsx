import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { supabase, configStatus } from '../services/supabase';
import { UserProfile, DEFAULT_USER_STATS } from '../types/User';
import { PersistenceService } from '../services/persistence';
import { User } from '@supabase/supabase-js';
import { initRevenueCat } from '../services/revenueCatService';
import { toast } from 'react-hot-toast';
import { OfflineSyncService } from '../services/offlineSync';

const DEFAULT_ONBOARDING = {
  successDefinition: "Becoming the One",
  obstacles: [],
  coachingTone: "Stoic",
  completedAt: 0,
  language: 'en'
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  logout: () => Promise<void>;
  updateProfileLocally: (updates: Partial<UserProfile>) => void;
}

// Authentication context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => PersistenceService.getProfile());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(() => !PersistenceService.getProfile());
  const [error, setError] = useState<string | null>(null);

  const updateProfileLocally = useCallback((updates: Partial<UserProfile>) => {
    if (!profile) return;
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    PersistenceService.saveProfile(newProfile);
    console.log("⚡ MATRIX: Profile updated locally (Optimistic)");
  }, [profile]);

  const logout = useCallback(async () => {
    try {
      console.log("💾 MATRIX: Ensuring data persistence before disconnect...");
      
      if (user?.id) {
        PersistenceService.clearUserCache(user.id);
      }
      PersistenceService.clearSession();
      sessionStorage.setItem('MATRIX_INTENTIONAL_LOGOUT', 'true');
      localStorage.setItem('MATRIX_INTENTIONAL_LOGOUT', 'true');
      
      setUser(null);
      setProfile(null);
      
      setTimeout(async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error("Supabase signout error:", e);
        }
      }, 0);

    } catch (error: any) {
      console.error("Logout Error:", error);
      setError(error.message);
    }
  }, [user]);

  useEffect(() => {
    if (!configStatus.isValid) {
        console.warn("⚠️ MATRIX: Running in PHANTOM MODE (No Supabase Config).");
        setIsLoading(false);
        setIsInitializing(false);
        return;
    }

    const checkInitialSession = async () => {
      try {
        // Detect OAuth Errors from URL hash (like identity already linked)
        const hash = window.location.hash;
        if (hash && hash.includes('error=server_error') && hash.includes('identity+is+already+linked')) {
           toast.error('Esta cuenta de Google ya está vinculada a otro usuario. Por favor, usa una cuenta nueva (VIRGEN).', { duration: 6000 });
           // Clean up the hash to avoid multiple triggers
           window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        await supabase.auth.getSession();
      } catch (e) {
        console.error("Error verificando sesión de Supabase:", e);
      } finally {
        setIsInitializing(false);
      }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      try {
        // FASE 2: Captura de Tokens de Google para Backups (SSOT)
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.provider_token) {
          const { provider_token, provider_refresh_token, user } = session;
          
          if (provider_refresh_token) {
            await supabase.from('user_integrations').upsert({
              user_id: user.id,
              google_access_token: provider_token,
              google_refresh_token: provider_refresh_token,
              updated_at: new Date().toISOString()
            });
            console.log("🔐 MATRIX: Google Tokens persistidos en SSOT.");
          }
        }

        if (!currentUser) {
          // If no current user, it means session is missing or expired.
          // Supabase caches the session locally, so if it's null even when offline,
          // the session is truly dead. We must force them to login again to prevent
          // disjointed local data that cannot sync to the cloud.
          setUser(null);
          setProfile(null);
          PersistenceService.clearSession();
          sessionStorage.removeItem('MATRIX_INTENTIONAL_LOGOUT');
          localStorage.removeItem('MATRIX_INTENTIONAL_LOGOUT');
          
          setIsLoading(false);
          return;
        }

        // --- USER IS LOGGED IN ---
        console.log("🔐 MATRIX: User logged in:", currentUser.id);
        setUser(currentUser);
        setError(null);
        
        // Initialize RevenueCat for native platforms
        initRevenueCat(currentUser.id).catch(console.error);
        
        // 1. Show cached profile immediately if available
        const cached = PersistenceService.getProfile(currentUser.id);
        if (cached && cached.onboarding?.completedAt) {
             // Only use cache immediately if it indicates onboarding is completed
             // This prevents the "flash" of onboarding if the cache is stale or incomplete
             setProfile(cached);
             setIsLoading(false); // ⚡ MATRIX: Instant Boot when cached!
        } else {
            // Optimistic Skeleton while we fetch
            setProfile({
                id: currentUser.id,
                uid: currentUser.id,
                email: currentUser.email || null,
                displayName: currentUser.user_metadata?.full_name || "",
                photoURL: currentUser.user_metadata?.avatar_url || null,
                plan: 'FREE',
                archetype: 'NEO',
                stats: DEFAULT_USER_STATS,
                theme: 'MATRIX',
                createdAt: Date.now(),
                lastLoginAt: Date.now(),
                onboarding: { ...DEFAULT_ONBOARDING, completedAt: Date.now() }, // ASSUME COMPLETED temporarily to prevent flicker
                isSkeleton: true
            });
            // We set isLoading to false IMMEDIATELY to prevent the LoadingScreen from showing
            // while we fetch the actual profile in the background. The skeleton is enough to render the Dashboard.
            setIsLoading(false);
        }

        // 2. Fetch the real document from Supabase
        const fetchProfile = async (attempts = 0) => {
            try {
                // If offline, don't even try to fetch and wait for timeouts if we have cache
                if (!navigator.onLine && cached) {
                    console.log("📶 MATRIX: Offline detected. Using cache directly.");
                    setProfile(cached);
                    setIsLoading(false);
                    return;
                }

                const { data: userDataList, error } = await supabase.from('users').select('id, email, display_name, photo_url, plan, archetype, theme, created_at, last_login_at, stats, onboarding, es_pro, revenuecat_app_user_id, avatar_id, preferences, updated_at').eq('id', currentUser.id).limit(1);
        const userData = userDataList && userDataList.length > 0 ? userDataList[0] : null;
                
                if (userData && !error) {
                    const finalProfile: UserProfile = {
                        ...userData,
                        uid: currentUser.id,
                        displayName: userData.display_name || currentUser.user_metadata?.full_name || "",
                        photoURL: userData.photo_url || currentUser.user_metadata?.avatar_url,
                        avatarId: userData.avatar_id || null,
                        preferences: userData.preferences || {},
                        defaultChartViews: userData.preferences?.defaultChartViews || {},
                        defaultProjectView: userData.preferences?.defaultProjectView || 'PROJECT',
                        archivedTraits: userData.preferences?.archivedTraits || {},
                        stats: userData.stats || DEFAULT_USER_STATS,
                        archetype: userData.archetype || 'NEO',
                        plan: userData.plan || 'FREE',
                        theme: userData.theme || 'MATRIX',
                        createdAt: userData.created_at ? new Date(userData.created_at).getTime() : Date.now(),
                        lastLoginAt: userData.last_login_at ? new Date(userData.last_login_at).getTime() : Date.now(),
                        onboarding: userData.onboarding || null, // FIX: Use null if not present, don't force DEFAULT_ONBOARDING
                        isSkeleton: false,
                        unlockedAchievements: userData.preferences?.unlockedAchievements || []
                    };
                    
                    console.log("✅ MATRIX: Profile loaded from Supabase.");

                    let finalProfileStats = finalProfile.stats;
                    // Merge pending local stats if they exist
                    if (currentUser.id && OfflineSyncService.hasPendingStatsSync(currentUser.id)) {
                        const pending = OfflineSyncService.getPendingStats(currentUser.id);
                        if (pending) {
                            console.log("🛡️ MATRIX AUTH SYNC GUARD: Merging pending offline stats:", pending);
                            finalProfileStats = { ...finalProfile.stats, ...pending };
                            if (pending.dailyLimits) {
                                finalProfile.dailyLimits = pending.dailyLimits;
                            }
                        }
                    }
                    finalProfile.stats = finalProfileStats;

                    setProfile(finalProfile);
                    PersistenceService.saveProfile(finalProfile);
                    setIsLoading(false);
                } else {
                    // IF DOCUMENT DOES NOT EXIST YET:
                    if (attempts < 5) {
                        console.log(`⏳ MATRIX: Profile document not found yet. Retrying (${attempts + 1}/5)...`);
                        await new Promise(r => setTimeout(r, 1000));
                        return fetchProfile(attempts + 1);
                    } else {
                        throw new Error("Profile creation timed out. Please try logging in again.");
                    }
                }
            } catch (err: any) {
                console.error("🔥 MATRIX: Fetch error:", err);
                
                // If we are offline or there is a clear network error, fallback immediately
                const isNetworkError = err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine;
                if (isNetworkError && cached) {
                    console.log("📶 MATRIX: Network error detected. Using cache directly.");
                    setProfile(cached);
                    setIsLoading(false);
                    return;
                }

                if (attempts < 5) {
                    await new Promise(r => setTimeout(r, 1000));
                    return fetchProfile(attempts + 1);
                }
                
                // Fallback to cache if offline
                if (cached) {
                    setProfile(cached);
                    setIsLoading(false);
                } else {
                    setError("Could not load profile from network. Please restart the app.");
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();

      } catch (err: any) {
        console.error("CRITICAL AUTH ERROR:", err);
        setError(err.message || "Failed to synchronize.");
        setIsLoading(false);
      }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    isLoading,
    isInitializing,
    error,
    logout,
    updateProfileLocally
  }), [user, profile, isLoading, isInitializing, error, logout, updateProfileLocally]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
