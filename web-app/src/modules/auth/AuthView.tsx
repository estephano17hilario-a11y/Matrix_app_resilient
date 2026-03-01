import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, ChevronLeft, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  doc,
  setDoc,
  getRedirectResult,
  updateProfile
} from '../../services/firebase';
import { AuthLayout } from './components/AuthLayout';
import { GlassCard } from '../../components/ui/GlassCard';
import { AuthInput } from './components/AuthInput';

// --- TYPES & CONSTANTS ---
type AuthViewMode = 'LANDING' | 'LOGIN' | 'REGISTER_LANG' | 'REGISTER_CREDENTIALS';

const SPRING_CONFIG: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 };

// --- SUB-COMPONENTS ---

// 1. LANDING VIEW
const LandingView = ({ onStart, onLogin }: { onStart: () => void, onLogin: () => void }) => {
  const { t } = useTranslation();
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={SPRING_CONFIG}
      className="flex flex-col items-center justify-center w-full space-y-8"
    >
      <div className="text-center space-y-2">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-4 backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.3)]"
        >
          <Sparkles className="w-3 h-3 animate-pulse" />
          <span>Lux OS 2.0</span>
        </motion.div>
        
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-sm">
          Lux
        </h1>
        <p className="text-white/40 font-medium tracking-wide text-sm md:text-base max-w-xs mx-auto">
          {t('auth.landing.subtitle', 'Gamify Your Life')}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-6">
        {/* BIG START BUTTON */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="group relative w-full h-20 flex items-center justify-center gap-3 bg-white text-black rounded-2xl font-bold text-xl tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.6)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Play className="w-6 h-6 fill-current transition-transform group-hover:translate-x-1" />
          <span>{t('auth.landing.start', 'EMPEZAR')}</span>
        </motion.button>

        {/* LOGIN LINK */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-white/20 text-xs uppercase tracking-widest">Or</span>
          <button 
            onClick={onLogin}
            className="text-white/50 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-white/5"
          >
            <span>{t('auth.landing.login', 'Ya tengo cuenta')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// 2. LANGUAGE SELECTION
const LanguageView = ({ onNext, onBack, currentLang, onChangeLang }: { onNext: () => void, onBack: () => void, currentLang: string, onChangeLang: (l: string) => void }) => {
  const { t } = useTranslation();
  const languages = [
    { 
      code: 'en', 
      label: t('onboarding.language.en.name', 'English'), 
      sub: t('onboarding.language.en.region', 'International') 
    },
    { 
      code: 'es', 
      label: t('onboarding.language.es.name', 'Español'), 
      sub: t('onboarding.language.es.region', 'Latam / España') 
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING_CONFIG}
      className="w-full max-w-sm"
    >
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white">{t('onboarding.language.title', 'Select Language')}</h2>
        <div className="w-9" /> {/* Spacer */}
      </div>

      <div className="space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              onChangeLang(lang.code);
              // Small delay for visual feedback
              setTimeout(onNext, 150);
            }}
            className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all duration-200 ${
              currentLang === lang.code 
                ? 'bg-white/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="text-left">
              <div className={`font-bold text-lg ${currentLang === lang.code ? 'text-white' : 'text-white/70'}`}>
                {lang.label}
              </div>
              <div className="text-xs text-white/30 font-medium tracking-wide">
                {lang.sub}
              </div>
            </div>
            {currentLang === lang.code && (
              <motion.div layoutId="check" className="text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// 4. MAIN VIEW COMPONENT
export const AuthView = () => {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<AuthViewMode>('LANDING');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation State
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isNameValid = name.trim().length >= 2;
  const isConfirmValid = confirmPassword === password && confirmPassword.length > 0;

  // Initialize
  useEffect(() => {
    // Check if we have a redirect result pending
    const checkRedirect = async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result?.user) setIsLoading(true);
        } catch (e) {
            console.error(e);
        }
    };
    checkRedirect();
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || !isPasswordValid || !isNameValid || !isConfirmValid) {
        return setError(t('auth.errors.required', 'Please fill all fields'));
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update Profile Name
        await updateProfile(userCred.user, { displayName: name });

        // Save language preference immediately
        await setDoc(doc(db, 'users', userCred.user.uid), {
            onboarding: {
                language: i18n.language,
                completedAt: null // Explicitly null to trigger OnboardingFlow
            },
            email: email,
            displayName: name,
            updatedAt: Date.now()
        }, { merge: true });
        
        // App.tsx will detect user and switch to OnboardingFlow
    } catch (err: any) {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError(t('auth.errors.required'));
    
    setIsLoading(true);
    setError(null);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Success handled by auth state listener
    } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
        {/* OPTIMIZED BACKGROUND (CSS Gradients instead of heavy blurs) */}
        <div className="fixed inset-0 -z-10 bg-[#020204] overflow-hidden">
            {/* Top Left Gradient */}
            <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-20"
                 style={{ background: 'radial-gradient(circle, rgba(79, 70, 229, 0.4) 0%, transparent 70%)', transform: 'translateZ(0)' }} 
            />
            
            {/* Bottom Right Gradient */}
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-15"
                 style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, transparent 70%)', transform: 'translateZ(0)' }}
            />

        </div>

        <AnimatePresence mode="wait">
            {view === 'LANDING' && (
                <LandingView 
                    key="landing"
                    onStart={() => setView('REGISTER_LANG')}
                    onLogin={() => setView('LOGIN')}
                />
            )}

            {view === 'REGISTER_LANG' && (
                <LanguageView 
                    key="lang"
                    currentLang={i18n.language}
                    onChangeLang={changeLanguage}
                    onNext={() => setView('REGISTER_CREDENTIALS')}
                    onBack={() => setView('LANDING')}
                />
            )}

            {(view === 'REGISTER_CREDENTIALS' || view === 'LOGIN') && (
                <motion.div
                    key="auth-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={SPRING_CONFIG}
                    className="w-full max-w-sm"
                >
                    <GlassCard className="p-8 backdrop-blur-sm bg-black/40 border-white/10">
                        <div className="flex items-center mb-6">
                            <button 
                                onClick={() => setView(view === 'LOGIN' ? 'LANDING' : 'REGISTER_LANG')}
                                className="mr-4 text-white/50 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold text-white">
                                {view === 'LOGIN' ? t('auth.login.title', 'Login') : t('auth.register.title', 'Create Account')}
                            </h2>
                        </div>

                        <form onSubmit={view === 'LOGIN' ? handleLogin : handleRegister} className="space-y-4">
                            {view === 'REGISTER_CREDENTIALS' && (
                                <AuthInput 
                                    icon={User}
                                    label={t('auth.fields.name', 'Name')}
                                    type="text"
                                    placeholder="Neo"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    isValid={isNameValid}
                                    showValidation={name.length > 0}
                                />
                            )}

                            <AuthInput 
                                icon={Mail}
                                label={t('auth.fields.email', 'Email')}
                                type="email"
                                placeholder="neo@matrix.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                isValid={isEmailValid}
                                showValidation={email.length > 0}
                            />
                            
                            <AuthInput 
                                icon={Lock}
                                label={t('auth.fields.password', 'Password')}
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                isValid={isPasswordValid}
                                showValidation={password.length > 0}
                            />

                            {view === 'REGISTER_CREDENTIALS' && (
                                <AuthInput 
                                    icon={Lock}
                                    label={t('auth.fields.confirmPassword', 'Confirm Password')}
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    isValid={isConfirmValid}
                                    showValidation={confirmPassword.length > 0}
                                    error={confirmPassword.length > 0 && !isConfirmValid ? t('auth.errors.passwordMismatch', 'Passwords do not match') : undefined}
                                />
                            )}
                            
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-400 text-xs p-2 bg-red-500/10 border border-red-500/20 rounded-lg"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={isLoading || (view === 'REGISTER_CREDENTIALS' && (!isEmailValid || !isPasswordValid || !isNameValid || !isConfirmValid))}
                                className={`
                                    w-full h-12 mt-6 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2
                                    ${isLoading || (view === 'REGISTER_CREDENTIALS' && (!isEmailValid || !isPasswordValid || !isNameValid || !isConfirmValid))
                                        ? 'bg-gray-800 text-white/30 cursor-not-allowed shadow-none' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                                ) : (
                                    <>
                                        <span>{view === 'LOGIN' ? t('auth.login.button', 'Enter Matrix') : t('auth.register.button', 'Initialize System')}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </motion.button>
                        </form>
                    </GlassCard>
                </motion.div>
            )}
        </AnimatePresence>
    </AuthLayout>
  );
};
