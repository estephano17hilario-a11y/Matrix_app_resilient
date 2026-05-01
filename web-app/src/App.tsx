import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { SplashScreen } from '@capacitor/splash-screen';
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

// 🚀 PERFORMANCE: Lazy load heavy components
const AuroraBackground = lazy(() => import('@/components/AuroraBackground').then(m => ({ default: m.AuroraBackground })));
const AuthScreen = lazy(() => import('@/modules/auth/AuthScreen').then(m => ({ default: m.AuthScreen })));
const OnboardingFlow = lazy(() => import('@/modules/onboarding/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })));
const Dashboard = lazy(() => import('./Dashboard'));

const AppRoutes = () => {
  const { user, profile, isLoading, isInitializing } = useAuth();
  const canEnterLux = !!user || !!profile;
  useNotificationSystem(canEnterLux);

  useEffect(() => {
    if (user || profile) {
      import('./Dashboard');
    }
  }, [user, profile]);

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
                <Suspense fallback={<LoadingScreen />}>
                  <Dashboard />
                </Suspense>
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
        <Suspense fallback={null}>
          <AuroraBackground />
        </Suspense>
      </div>

      {/* 2. LAYER 1: APP CONTENT */}
      <div className="relative z-10 w-full h-full">
        {renderContent()}
      </div>
    </div>
  );
};

export default function App() {
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
