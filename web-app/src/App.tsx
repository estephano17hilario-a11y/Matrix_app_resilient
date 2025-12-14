import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingFlow } from './modules/onboarding/OnboardingFlow';
import Dashboard from './Dashboard';
import LoginScreen from './modules/auth/LoginScreen';

function MatrixApp() {
  const { user, isLoading, isNewUser, completeOnboarding } = useAuth();

  // STATE 1: LOADING (The Void)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-green-500 selection:bg-green-900">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
            <div className="absolute inset-0 border-2 border-green-500/10 rounded-full blur-[2px]" />
          </div>
          <p className="text-xs tracking-[0.3em] animate-pulse font-bold">ESTABLISHING CONNECTION...</p>
        </div>
      </div>
    );
  }

  // STATE 2: NO AUTH (The Gate)
  if (!user) {
    return <LoginScreen />;
  }

  // STATE 3: NEW RECRUIT (The Training)
  if (isNewUser) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  // STATE 4: VETERAN (The Matrix)
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MatrixApp />
    </AuthProvider>
  );
}
