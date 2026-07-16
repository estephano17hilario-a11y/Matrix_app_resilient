import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { supabase, configStatus } from '../services/supabase';
import { UserProfile, DEFAULT_USER_STATS } from '../types/User';
import { PersistenceService } from '../services/persistence';
import { User } from '@supabase/supabase-js';
import { initRevenueCat, checkProEntitlement } from '../services/revenueCatService';
import { toast } from 'react-hot-toast';
import { OfflineSyncService } from '../services/offlineSync';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import WidgetAuthBridge from '../plugins/WidgetBridgePlugin';
import { ENABLE_GLOBAL_PRO } from '../config/limits';

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
  const [isLoading, setIsLoading] = useState(() => !PersistenceService.getProfile());
  const [isInitializing, setIsInitializing] = useState(() => !PersistenceService.getProfile());
  const [error, setError] = useState<string | null>(null);

  // 🔒 STABILITY GUARD: Once a real profile is loaded, never revert to skeleton.
  // This prevents Supabase token refreshes or RevenueCat sync callbacks from
  // temporarily setting isSkeleton=true on an already-authenticated user,
  // which would unmount Dashboard and destroy all UI state (activeModal, etc.).
  const hasRealProfileRef = useRef(false);
  if (profile && !profile.isSkeleton) {
    hasRealProfileRef.current = true;
  }

  // 🔒 FIX: Use a ref to hold latest profile so updateProfileLocally never changes reference.
  // Previously, [profile] as dependency caused this callback to be recreated on every render,
  // which in turn caused the subscription sync useEffect to re-run in an infinite loop.
  const profileRef = useRef<UserProfile | null>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const updateProfileLocally = useCallback((updates: Partial<UserProfile>) => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    const newProfile = { ...currentProfile, ...updates };
    setProfile(newProfile);
    PersistenceService.saveProfile(newProfile);
    console.log("⚡ MATRIX: Profile updated locally (Optimistic)");
  }, []); // Stable: no external dependencies, reads from ref

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

        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user && Capacitor.isNativePlatform()) {
          WidgetAuthBridge.shareSession({
            userId: session.user.id,
            accessToken: session.access_token,
            refreshToken: session.refresh_token || undefined
          }).catch(e => console.error("Widget session sharing error from checkInitialSession", e));
        }
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
          
          if (Capacitor.isNativePlatform()) {
            WidgetAuthBridge.clearSession().catch(e => console.error("Widget session clear error", e));
          }
          
          setIsLoading(false);
          return;
        }

        // --- USER IS LOGGED IN ---
        console.log("🔐 MATRIX: User logged in:", currentUser.id);
        setUser(currentUser);
        setError(null);
        
        if (Capacitor.isNativePlatform() && session) {
          WidgetAuthBridge.shareSession({
            userId: currentUser.id,
            accessToken: session.access_token,
            refreshToken: session.refresh_token || undefined
          }).catch(e => console.error("Widget session sharing error", e));
        }
        
        // Initialize RevenueCat for native platforms
        initRevenueCat(currentUser.id).catch(console.error);
        
        // 1. Show cached profile immediately if available
        const cached = PersistenceService.getProfile(currentUser.id);
        if (cached && cached.onboarding?.completedAt) {
             // Only use cache immediately if it indicates onboarding is completed
             // This prevents the "flash" of onboarding if the cache is stale or incomplete
             setProfile(cached);
             if (!hasRealProfileRef.current) hasRealProfileRef.current = true;
             setIsLoading(false); // ⚡ MATRIX: Instant Boot when cached!
        } else if (!hasRealProfileRef.current) {
            // Only set skeleton if we haven't already loaded a real profile.
            // If we already have a real profile (mid-session re-auth), skip the skeleton
            // to prevent Dashboard from unmounting and destroying modal state.
            // Optimistic Skeleton while we fetch
            setProfile({
                 id: currentUser.id,
                 uid: currentUser.id,
                 email: currentUser.email || null,
                 displayName: currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || "",
                 photoURL: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null,
                 plan: ENABLE_GLOBAL_PRO ? 'PRO' : 'FREE',
                 es_pro: ENABLE_GLOBAL_PRO ? true : false,
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

                const { data: userDataList, error } = await supabase.from('users').select('id, email, display_name, photo_url, plan, archetype, theme, created_at, last_login_at, stats, onboarding, es_pro, revenuecat_app_user_id, avatar_id, preferences, updated_at, inventory, unlocked_store_items').eq('id', currentUser.id).limit(1);
        const userData = userDataList && userDataList.length > 0 ? userDataList[0] : null;
                
                if (userData && !error) {
                    // Auto-sync display_name and photo_url if missing in DB but present in auth metadata
                    const dbDisplayName = userData.display_name;
                    const metaDisplayName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || "";
                    if (!dbDisplayName && metaDisplayName) {
                        console.log("📝 MATRIX AUTH: Database display_name is empty. Syncing from metadata:", metaDisplayName);
                        supabase.from('users')
                            .update({ display_name: metaDisplayName })
                            .eq('id', currentUser.id)
                            .then(({ error: updateErr }) => {
                                if (updateErr) console.error("Failed to sync display_name to DB:", updateErr);
                            });
                        userData.display_name = metaDisplayName;
                    }

                    const dbPhotoUrl = userData.photo_url;
                    const metaPhotoUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "";
                    if (!dbPhotoUrl && metaPhotoUrl) {
                        console.log("📝 MATRIX AUTH: Database photo_url is empty. Syncing from metadata:", metaPhotoUrl);
                        supabase.from('users')
                            .update({ photo_url: metaPhotoUrl })
                            .eq('id', currentUser.id)
                            .then(({ error: updateErr }) => {
                                if (updateErr) console.error("Failed to sync photo_url to DB:", updateErr);
                            });
                        userData.photo_url = metaPhotoUrl;
                    }

                    const finalProfile: UserProfile = {
                        ...userData,
                        uid: currentUser.id,
                        displayName: userData.display_name || currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || "",
                        photoURL: userData.photo_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null,
                        avatarId: userData.avatar_id || null,
                        preferences: userData.preferences || {},
                        defaultChartViews: userData.preferences?.defaultChartViews || {},
                        defaultProjectView: userData.preferences?.defaultProjectView || 'PROJECT',
                        notesDefaultTab: userData.preferences?.notesDefaultTab || 'OVERVIEW',
                        defaultTaskFilters: userData.preferences?.defaultTaskFilters || {},
                        archivedTraits: userData.preferences?.archivedTraits || {},
                        stats: userData.stats || DEFAULT_USER_STATS,
                        archetype: userData.archetype || 'NEO',
                        plan: ENABLE_GLOBAL_PRO ? 'PRO' : (userData.plan || 'FREE'),
                        es_pro: ENABLE_GLOBAL_PRO ? true : (userData.es_pro || false),
                        theme: userData.theme || 'MATRIX',
                        createdAt: userData.created_at ? new Date(userData.created_at).getTime() : Date.now(),
                        lastLoginAt: userData.last_login_at ? new Date(userData.last_login_at).getTime() : Date.now(),
                        onboarding: userData.onboarding || null,
                        isSkeleton: false,
                        unlockedAchievements: userData.preferences?.unlockedAchievements || [],
                        // 🏪 STORE: Inventory & unlocked items
                        inventory: userData.inventory || [],
                        unlocked_store_items: userData.unlocked_store_items || []
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

    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      appStateListener = App.addListener('appStateChange', async (state) => {
        console.log("⚡ MATRIX: App state changed to:", state.isActive ? "Foreground" : "Background");
        try {
          await WidgetAuthBridge.refreshWidgets();
        } catch (e) {
          console.error("Widget refresh error on app state change:", e);
        }
      });
    }

    return () => {
        subscription.unsubscribe();
        if (appStateListener) {
          appStateListener.then((h: any) => h.remove());
        }
    };
  }, []);

  // Handle native deep links for OAuth (Supabase redirection)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = async (event: any) => {
      console.log('🔗 [Deep Link] Received URL:', event.url);
      
      // We look for our custom scheme 'luxapp://', 'com.luxresilient.app://' or 'login-callback'
      if (event.url.includes('luxapp://') || event.url.includes('com.luxresilient.app://') || event.url.includes('login-callback')) {
        try {
          let access_token: string | null = null;
          let refresh_token: string | null = null;

          // Try parsing from hash first
          const hash = event.url.split('#')[1];
          if (hash) {
            const params = new URLSearchParams(hash);
            access_token = params.get('access_token');
            refresh_token = params.get('refresh_token');
          }

          // If not found in hash, try parsing from query string
          if (!access_token || !refresh_token) {
            const querySplit = event.url.split('?')[1];
            if (querySplit) {
              const query = querySplit.split('#')[0];
              const params = new URLSearchParams(query);
              access_token = access_token || params.get('access_token');
              refresh_token = refresh_token || params.get('refresh_token');
            }
          }

          if (access_token && refresh_token) {
            console.log('🔐 [Deep Link] Tokens found. Setting Supabase session...');
            setIsLoading(true);
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
            console.log('✅ [Deep Link] Supabase session established for user:', data.user?.id);
          } else {
            console.warn('⚠️ [Deep Link] URL does not contain access_token and refresh_token');
          }
        } catch (err: any) {
          console.error('🔥 [Deep Link] Error setting session from deep link:', err);
          toast.error(`Error al iniciar sesión con Google: ${err.message || err}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const setupListener = async () => {
      try {
        const listener = await App.addListener('appUrlOpen', handleDeepLink);
        return listener;
      } catch (err) {
        console.error('Failed to setup deep link listener:', err);
      }
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(listener => {
        if (listener) listener.remove();
      }).catch(console.error);
    };
  }, []);

  // 🔒 FIX: Sync RevenueCat subscription status ONCE per user session load.
  // BEFORE: This effect depended on [profile?.id, profile?.plan, updateProfileLocally].
  //   - When the sync detected a mismatch and called updateProfileLocally({ plan: 'PRO' }),
  //     profile.plan changed → the effect re-ran → infinite loop.
  //   - For real Google Play subscribers, this caused a cascade of re-renders that
  //     destroyed the QuestModal animation and froze the UI.
  // AFTER: The effect only depends on [profile?.id]. It runs once when the user loads.
  //   - A hasSyncedRef guard prevents it from running again if the profile re-renders.
  //   - The appStateChange listener correctly re-syncs on foreground, but reads profile
  //     from profileRef (always current) instead of a stale closure.
  const hasSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) return;

    // Guard: only run the initial sync once per user session, not on every plan change.
    const alreadySynced = hasSyncedRef.current === profileId;

    let appStateListener: any = null;

    const performSubscriptionSync = async () => {
      if (!Capacitor.isNativePlatform()) return;
      // Always read from ref so we get the latest plan without stale closures
      const currentProfile = profileRef.current;
      if (!currentProfile?.id) return;
      try {
        const active = await checkProEntitlement();
        
        // 🔒 FIX: Mark as successfully synced ONLY after a successful SDK check (no configuration/network throw)
        hasSyncedRef.current = profileId;

        const dbIsPro = currentProfile.plan === 'PRO';
        
        // Only perform upgrades from the client side.
        // Downgrades are handled securely via backend webhooks (RevenueCat/MercadoPago)
        // to prevent client-side synchronization errors from reverting developer-assigned or manually set PRO statuses.
        if (active) {
          const nextPlan = 'PRO';
          const nextEsPro = true;

          // 1. Instantly upgrade local profile state to PRO to unlock features
          if (currentProfile.plan !== nextPlan || currentProfile.es_pro !== nextEsPro || currentProfile.revenuecat_app_user_id !== currentProfile.id) {
            console.log(`[RevenueCat Sync] User is premium in RevenueCat. Optimistically updating local profile to PRO.`);
            updateProfileLocally({ plan: nextPlan, es_pro: nextEsPro, revenuecat_app_user_id: currentProfile.id });
          }

          // 2. Perform DB update in the background (fire-and-forget) to keep client synchronized with server
          if (!dbIsPro || currentProfile.revenuecat_app_user_id !== currentProfile.id) {
            console.log(`[RevenueCat Sync] Upgrading Supabase DB to PRO in the background...`);
            (async () => {
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  console.log(`[RevenueCat Sync DB Update] Attempting (attempt ${attempt}/3)...`);
                  const { error } = await supabase
                    .from('users')
                    .update({ 
                      plan: nextPlan, 
                      es_pro: nextEsPro, 
                      planExpiryDate: null,
                      revenuecat_app_user_id: currentProfile.id 
                    })
                    .eq('id', currentProfile.id);
                    
                  if (error) throw error;
                  console.log(`[RevenueCat Sync] Supabase DB successfully updated to PRO.`);
                  break;
                } catch (err) {
                  console.error(`[RevenueCat Sync DB Update] Failed at attempt ${attempt}:`, err);
                  if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                }
              }
            })();
          }
        } else {
          // If NOT active in RevenueCat, but they currently have their own app ID registered as the RevenueCat purchase holder,
          // it means their subscription was cancelled, expired, or transferred to another account.
          // In this case, we MUST downgrade them back to FREE.
          if (dbIsPro && currentProfile.revenuecat_app_user_id === currentProfile.id) {
            console.log(`[RevenueCat Sync] User is no longer premium in RevenueCat. Downgrading to FREE.`);
            
            const nextPlan = 'FREE';
            const nextEsPro = false;
            
            updateProfileLocally({ plan: nextPlan, es_pro: nextEsPro, revenuecat_app_user_id: null });
            
            (async () => {
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  const { error } = await supabase
                    .from('users')
                    .update({ 
                      plan: nextPlan, 
                      es_pro: nextEsPro, 
                      revenuecat_app_user_id: null 
                    })
                    .eq('id', currentProfile.id);
                  if (error) throw error;
                  console.log(`[RevenueCat Sync] Supabase DB successfully downgraded to FREE.`);
                  break;
                } catch (err) {
                  console.error(`[RevenueCat Sync Downgrade Update] Failed at attempt ${attempt}:`, err);
                  if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                }
              }
            })();
          } else if (dbIsPro) {
            console.log("[RevenueCat Sync] User is PRO in database but inactive in RevenueCat. Keeping PRO status (revenuecat_app_user_id is not set, meaning it is a manual or MercadoPago upgrade).");
          }
        }
      } catch (e) {
        // 🔐 CRITICAL: If RevenueCat throws ANY error (network, config, etc.),
        // we NEVER downgrade the user. We keep their current plan as-is.
        // We do NOT set hasSyncedRef.current, allowing it to retry later.
        console.warn("[RevenueCat Sync] Check failed — keeping current plan intact. Error:", e);
      }
    };

    // Run initial sync only once per user (not on every plan change)
    if (!alreadySynced) {
      performSubscriptionSync();
    }

    // Listen to foreground app state transitions
    if (Capacitor.isNativePlatform()) {
      appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          console.log("[RevenueCat Sync] App returned to foreground, checking status...");
          await performSubscriptionSync();
        }
      });
    }

    return () => {
      if (appStateListener) {
        appStateListener.then((listener: any) => listener.remove());
      }
    };
  // 🔒 KEY FIX: Removed profile?.plan and updateProfileLocally from deps.
  // This means the effect only runs when the user ID changes (login/logout),
  // NOT on every plan update, breaking the infinite loop.
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
