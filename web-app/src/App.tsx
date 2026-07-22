import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from '@/services/supabase';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

import { RewardProvider } from '@/modules/rewards/context/RewardContext';
import { RewardOverlay } from '@/modules/rewards/components/RewardOverlay';
import { LuxProvider } from '@/context/LuxContext';
import { EconomyProvider } from '@/context/EconomyContext';
import { NotesProvider } from '@/modules/notes/context/NotesContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MotionConfig, motion, AnimatePresence } from 'framer-motion';
import { useNotificationSystem } from './hooks/useNotificationSystem';
import { TourProvider } from '@/components/TourGuide';

import { AuroraBackground } from '@/components/AuroraBackground';
import Dashboard from './Dashboard';

// 🚀 PERFORMANCE: Lazy load heavy components
const AuthScreen = lazy(() => import('@/modules/auth/AuthScreen').then(m => ({ default: m.AuthScreen })));
const OnboardingFlow = lazy(() => import('@/modules/onboarding/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })));

const AppRoutes = () => {
  const { user, profile, isLoading, isInitializing } = useAuth();
  const canEnterLux = !!user || !!profile;
  useNotificationSystem(canEnterLux);

  // 🔒 CRITICAL FIX: Once Dashboard is unlocked, NEVER unmount it.
  // The previous logic (`shouldShowLoading = isLoading || profile.isSkeleton`)
  // was unmounting Dashboard every time AuthContext refreshed the profile
  // (e.g., after RevenueCat sync, Supabase re-fetch, or token refresh).
  // When Dashboard unmounts, ALL local state (activeModal, editingQuest, etc.)
  // is destroyed — this caused modals to appear for 1ms then vanish.
  //
  // Solution: use a ref that latches to `true` the first time a real,
  // non-skeleton profile is available and never goes back to false.
  const dashboardUnlockedRef = useRef(false);
  if (profile && !profile.isSkeleton && !isLoading) {
    dashboardUnlockedRef.current = true;
  }
  const dashboardUnlocked = dashboardUnlockedRef.current;

  // 🚀 PERFORMANCE: Hide Splash Screen ASAP (0 Delay)
  // BUT ONLY AFTER isInitializing IS FALSE
  useEffect(() => {
    // Hide immediately if we have a profile (offline/cache) or when loading finishes
    // and ONLY if Supabase has finished its initial session check
    if (!isInitializing && (!isLoading || profile)) {
      SplashScreen.hide().catch(() => {});
    }
  }, [isLoading, profile, isInitializing]);

  const [showSplash, setShowSplash] = useState(true);

  // Reset splash screen status on logout so it triggers again on next login
  useEffect(() => {
    if (!canEnterLux) {
      setShowSplash(true);
      dashboardUnlockedRef.current = false;
    }
  }, [canEnterLux]);

  useEffect(() => {
    if (dashboardUnlocked) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dashboardUnlocked]);

  // If Supabase is still thinking about the session, don't render ANYTHING.
  // The native Splash Screen will stay visible, preventing flicker.
  if (isInitializing) {
    return null;
  }

  // Determine what to show in the content layer
  const renderContent = () => {
    // Not logged in at all
    if (!canEnterLux) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <AuthScreen />
        </Suspense>
      );
    }

    // Onboarding: only show if we KNOW the profile is real and onboarding is incomplete
    if (profile && !profile.isSkeleton && !profile.onboarding?.completedAt) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <OnboardingFlow />
        </Suspense>
      );
    }

    // Show LoadingScreen ONLY on the very first load (before dashboardUnlocked latches).
    // Once dashboardUnlocked=true, we ALWAYS render the Dashboard tree — never a LoadingScreen.
    // This prevents Dashboard unmounts from destroying modal state mid-interaction.
    if (!dashboardUnlocked) {
      return <LoadingScreen />;
    }

    return (
      <div className="w-full h-full">
        <LuxProvider userId={user?.id || profile?.uid || 'phantom-user'}>
          <EconomyProvider>
            <NotesProvider>
              <div 
                className="w-full h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center"
                style={{
                  opacity: showSplash ? 0 : 1,
                  transform: showSplash ? 'scale(0.95)' : 'scale(1)',
                  pointerEvents: showSplash ? 'none' : 'auto',
                  visibility: showSplash ? 'hidden' : 'visible'
                }}
              >
                <Dashboard />
              </div>
              <AnimatePresence>
                {showSplash && (
                  <motion.div
                    key="startup-splash-overlay"
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[9999] pointer-events-auto"
                  >
                    <LoadingScreen />
                  </motion.div>
                )}
              </AnimatePresence>
            </NotesProvider>
          </EconomyProvider>
        </LuxProvider>
      </div>
    );
  };

  return (
    <RewardProvider>
      <div className="relative w-full h-full overflow-hidden bg-[#020204]">
        {/* 1. LAYER 0: PERSISTENT BACKGROUND */}
        <div className="fixed inset-0 z-0">
          <AuroraBackground />
        </div>

        {/* 2. LAYER 1: APP CONTENT */}
        <div className="relative z-10 w-full h-full">
          {renderContent()}
        </div>
      </div>

      {/* RewardOverlay: rendered OUTSIDE any stacking context so position:fixed
          with z-99999 is truly at the top of the paint order. */}
      {dashboardUnlocked && <RewardOverlay />}

      {/* Portal target for AchievementToast — fixed, outside overflow-hidden so it's never clipped */}
      <div
        id="notification-stack-root"
        className="fixed top-4 left-0 right-0 z-[10000] flex flex-col items-center gap-2 pointer-events-none px-4"
      />
    </RewardProvider>
  );
};

export default function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '797112490087-eiupmiitso6du7mos9cif0n407mq2qfl.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: any) => {
      console.log('🔗 [Deep Link App.tsx] Received URL:', event.url);
      if (!event.url) return;

      if (event.url.includes('luxapp://focus-session')) {
        try {
          const urlObj = new URL(event.url);
          const projectId = urlObj.searchParams.get('projectId');
          if (projectId) {
            console.log('💾 [Deep Link App.tsx] Saving cold start project ID:', projectId);
            localStorage.setItem('cold_start_focus_project_id', projectId);
            window.dispatchEvent(new CustomEvent('cold_start_focus_trigger', { detail: { projectId } }));
          }
        } catch (e) {
          console.error('Error parsing focus-session from App.tsx:', e);
        }
      } else if (event.url.includes('luxapp://journal')) {
        try {
          const urlObj = new URL(event.url);
          const dateStr = urlObj.searchParams.get('date');
          if (dateStr) {
            console.log('💾 [Deep Link App.tsx] Saving cold start journal date:', dateStr);
            localStorage.setItem('cold_start_journal_date', dateStr);
            window.dispatchEvent(new CustomEvent('cold_start_journal_trigger', { detail: { dateStr } }));
          }
        } catch (e) {
          console.error('Error parsing journal from App.tsx:', e);
        }
      } else if (event.url.includes('com.luxresilient.app://auth/callback')) {
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
            console.log('🔐 [Deep Link App.tsx] Tokens found. Setting Supabase session...');
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
            console.log('✅ [Deep Link App.tsx] Session established successfully');
          } else {
            console.warn('⚠️ [Deep Link App.tsx] Missing access_token or refresh_token in URL');
          }
        } catch (err: any) {
          console.error('🔥 [Deep Link App.tsx] Error setting session:', err);
        }
      }
    };

    const setupListener = async () => {
      try {
        const listener = await CapacitorApp.addListener('appUrlOpen', handleDeepLink);
        
        // Check for cold start launch URL
        const launchUrlResult = await CapacitorApp.getLaunchUrl();
        if (launchUrlResult && launchUrlResult.url) {
          console.log('🚀 [App.tsx cold start] Found launch URL:', launchUrlResult.url);
          handleDeepLink(launchUrlResult);
        }
        
        return listener;
      } catch (err) {
        console.error('Failed to setup App.tsx deep link listener:', err);
      }
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(listener => {
        if (listener) listener.remove();
      }).catch(console.error);
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <TourProvider>
          <MotionConfig transition={{ type: 'tween', duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 2000,
                style: {
                  background: 'rgba(0, 0, 0, 0.9)',
                  color: '#fff',
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <AppRoutes />
          </MotionConfig>
        </TourProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
