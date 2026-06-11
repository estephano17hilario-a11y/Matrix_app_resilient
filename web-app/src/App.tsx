import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from '@/services/supabase';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LuxProvider } from '@/context/LuxContext';
import { EconomyProvider } from '@/context/EconomyContext';
import { NotesProvider } from '@/modules/notes/context/NotesContext';
import { RewardProvider } from '@/modules/rewards/context/RewardContext';
import { RewardOverlay } from '@/modules/rewards/components/RewardOverlay';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MotionConfig } from 'framer-motion';
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



  // 🚀 PERFORMANCE: Hide Splash Screen ASAP (0 Delay)
  // BUT ONLY AFTER isInitializing IS FALSE
  useEffect(() => {
    // Hide immediately if we have a profile (offline/cache) or when loading finishes
    // and ONLY if Supabase has finished its initial session check
    if (!isInitializing && (!isLoading || profile)) {
      SplashScreen.hide().catch(() => {});
    }
  }, [isLoading, profile, isInitializing]);

  // If Supabase is still thinking about the session, don't render ANYTHING.
  // The native Splash Screen will stay visible, preventing flicker.
  if (isInitializing) {
    return null;
  }

  // Determine what to show in the content layer
  const renderContent = () => {
    // 🚀 FIX: Prevent "flash" of Onboarding by showing LoadingScreen if we are still checking Auth state
    // If isLoading is true and we haven't confirmed the user yet, show loading.
    const shouldShowLoading = isLoading && !user && !profile;

    if (shouldShowLoading) {
      return <LoadingScreen />;
    }

    if (!canEnterLux) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <AuthScreen />
        </Suspense>
      );
    }

    if (profile && !profile.isSkeleton && !profile.onboarding?.completedAt) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <OnboardingFlow />
        </Suspense>
      );
    }

    return (
      <div className="w-full h-full">
        <LuxProvider userId={user?.id || profile?.uid || 'phantom-user'}>
          <EconomyProvider>
            <RewardProvider>
              <NotesProvider>
                <Dashboard />
                <RewardOverlay />
              </NotesProvider>
            </RewardProvider>
          </EconomyProvider>
        </LuxProvider>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020204]">
      <div
        id="notification-stack-root"
        className="fixed top-4 left-0 right-0 z-[10000] flex flex-col items-center gap-2 pointer-events-none px-4"
      />
      {/* 1. LAYER 0: PERSISTENT BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <AuroraBackground />
      </div>

      {/* 2. LAYER 1: APP CONTENT */}
      <div className="relative z-10 w-full h-full">
        {renderContent()}
      </div>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '797112490087-lt0j7dcdh35732enp07ig3ga3oqk1q6k.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: any) => {
      console.log('🔗 [Deep Link App.tsx] Received URL:', event.url);
      if (event.url && event.url.includes('com.luxresilient.app://auth/callback')) {
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
          <MotionConfig transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }}>
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
