import React, { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, ChevronLeft, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { atomicRegister, atomicLogin, loginWithGoogle } from '../../services/supabaseService';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { AuthLayout } from './components/AuthLayout';
import { AuthInput } from './components/AuthInput';
import { retryOperation, isNetworkAvailable } from '../../utils/networkUtils';
import { PersistenceService } from '../../services/persistence';

// --- TYPES & CONSTANTS ---
type AuthViewMode = 'LANDING' | 'LOGIN' | 'REGISTER_LANG' | 'REGISTER_CREDENTIALS';

// ULTRA-FAST, NO-LAG TRANSITIONS (0 delay, minimal GPU load)
const FAST_TRANSITION: Transition = { type: 'tween', ease: 'linear', duration: 0 };

// --- SUB-COMPONENTS ---

// 1. LANDING VIEW
const GoogleIcon = () => (
 <svg className="w-5 h-5" viewBox="0 0 24 24">
 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
 </svg>
);

const LandingView = ({ onStart, onLogin, onGoogleLogin, isLoading }: { onStart: () => void, onLogin: () => void, onGoogleLogin: () => void, isLoading: boolean }) => {
 const { t } = useTranslation();
 
 return (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={FAST_TRANSITION}
 className="flex flex-col items-center justify-center w-full space-y-8"
 >
 <div className="text-center space-y-2">
 <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white">
 Lux
 </h1>
 <p className="text-white/40 font-medium tracking-wide text-sm md:text-base max-w-xs mx-auto">
 {t('auth.landing.subtitle', 'Gamify Your Life')}
 </p>
 </div>

 <div className="w-full max-w-xs space-y-6">
 {/* BIG START BUTTON */}
 <button
 onClick={onStart}
 className="group w-full h-16 flex items-center justify-center gap-3 bg-white text-black rounded-xl font-bold text-lg tracking-tight transition-transform active:scale-95"
 >
 <Play className="w-5 h-5 fill-current" />
 <span>{t('auth.landing.start', 'EMPEZAR')}</span>
 </button>

 {/* LOGIN LINK (Arriba y más delgado) */}
 <div className="flex flex-col items-center gap-3">
 <span className="text-white/20 text-xs uppercase tracking-widest font-semibold">{t('auth.orContinue', 'O')}</span>
 <button 
 onClick={onLogin}
 className="w-full h-12 text-white font-bold transition-all flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95"
 >
 <span>{t('auth.landing.login', 'Iniciar Sesión')}</span>
 <ArrowRight className="w-4 h-4 opacity-70" />
 </button>
 </div>

 {/* GOOGLE BUTTON (Abajo) */}
 <button
 onClick={onGoogleLogin}
 disabled={isLoading}
 className="w-full h-12 bg-white/10 border border-white/10 text-white font-bold transition-all flex items-center justify-center gap-3 rounded-xl hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isLoading ? (
 <Loader2 className="w-5 h-5 animate-spin text-white/40" />
 ) : (
 <>
 <GoogleIcon />
 <span>Continuar con Google</span>
 </>
 )}
 </button>
 </div>
 </motion.div>
 );
};

// 2. LANGUAGE SELECTION
const LanguageView = ({ onNext, onBack, currentLang, onChangeLang }: { onNext: () => void, onBack: () => void, currentLang: string, onChangeLang: (l: string) => void }) => {
 const { t } = useTranslation();
 const languages = [
 { code: 'en', flag: '🇺🇸', label: t('onboarding.language.en.name', 'English'), sub: t('onboarding.language.en.region', 'United States') },
 { code: 'es', flag: '🇪🇸', label: t('onboarding.language.es.name', 'Español'), sub: t('onboarding.language.es.region', 'España / Latinoamérica') },
 ];

 return (
 <motion.div 
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0 }}
 className="w-full max-w-sm flex flex-col"
 >
 <div className="flex items-center justify-between mb-8">
 <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
 <ChevronLeft className="w-5 h-5" />
 </button>
 <h2 className="text-xl font-bold text-white">{t('onboarding.language.title', 'Select Language')}</h2>
 <div className="w-9" />
 </div>

 <div className="space-y-3 mb-8">
 {languages.map((lang) => (
 <button
 key={lang.code}
 onClick={() => onChangeLang(lang.code)}
 className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors duration-150 active:scale-95 ${
 currentLang === lang.code 
 ? 'bg-indigo-500/10 border-indigo-500/50' 
 : 'bg-[#0a0a0f] border-white/5 hover:bg-white/5'
 }`}
 >
 <div className="flex items-center gap-4">
 <span className="text-3xl leading-none">{lang.flag}</span>
 <div className="text-left">
 <div className={`font-bold text-lg ${currentLang === lang.code ? 'text-white' : 'text-white/70'}`}>
 {lang.label}
 </div>
 <div className="text-xs text-white/40 font-medium tracking-wide">
 {lang.sub}
 </div>
 </div>
 </div>
 {currentLang === lang.code && <Sparkles className="w-5 h-5 text-indigo-400" />}
 </button>
 ))}
 </div>

 <button
 onClick={onNext}
 className="w-full h-14 bg-white text-black rounded-xl font-bold text-lg tracking-tight transition-transform active:scale-95 flex items-center justify-center gap-2"
 >
 <span>{t('rewards.continue', 'Continuar')}</span>
 <ArrowRight className="w-5 h-5" />
 </button>
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
 const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);

 // Validation State (Perfect Audit)
 const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 const isPasswordValid = password.length >= 6;
 const isNameValid = name.trim().length >= 2 && name.trim().length <= 12;
 const isConfirmValid = confirmPassword === password && confirmPassword.length > 0;

 // Check Redirects
 useEffect(() => {
 // Supabase handles OAuth redirects automatically via onAuthStateChange in AuthContext.
 // No need to manually check getRedirectResult.
 }, []);

 // Hardware Back Button Handler
 useEffect(() => {
 const handleBackButton = async () => {
 if (view === 'LANDING') {
 App.exitApp();
 } else if (view === 'REGISTER_LANG') {
 setView('LANDING');
 } else if (view === 'REGISTER_CREDENTIALS') {
 setView('REGISTER_LANG');
 } else if (view === 'LOGIN') {
 setView('LANDING');
 }
 };

 const setupListener = async () => {
 try {
 return await App.addListener('backButton', handleBackButton);
 } catch (e) {
 // Ignore on web
 }
 };

 const listenerPromise = setupListener();
 return () => {
 listenerPromise.then(handle => handle && handle.remove()).catch(() => {});
 };
 }, [view]);

 const changeLanguage = (lang: string) => {
 i18n.changeLanguage(lang);
 localStorage.setItem('i18nextLng', lang);
 };

 const handleRegister = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isEmailValid || !isPasswordValid || !isNameValid || !isConfirmValid) {
 return setError(t('auth.errors.required', 'Please fill all fields correctly'));
 }
 
 setIsLoading(true);
 setError(null);
 
 try {
 const isOnline = await isNetworkAvailable();
 if (!isOnline) {
 throw new Error(t('auth.errors.network', "No network connection. Please check your internet and try again."));
 }

 // 1. CREATE USER IN AUTH
 const user = await retryOperation(() => atomicRegister(email.trim(), password, name.trim(), i18n.language));

 try {
   await Purchases.logIn({ appUserID: user.id });
 } catch (rcError) {
   console.error('RevenueCat register sync error:', rcError);
 }

 // 2. SAVE SESSION
 PersistenceService.setSession(user.id);
 
 setIsLoading(false);
 } catch (err: any) {
 console.error('Registration error:', err);
 if (err.code === 'auth/email-already-in-use') {
 setError(t('auth.errors.emailInUse', 'Email is already in use.'));
 } else if (err.code === 'auth/weak-password') {
 setError(t('auth.errors.weakPassword', 'Password is too weak.'));
 } else {
 setError(err.message || t('auth.errors.generic', 'An error occurred during registration.'));
 }
 setIsLoading(false);
 }
 };

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email || !password) return setError(t('auth.errors.required', 'Please enter email and password'));
 
 setIsLoading(true);
 setError(null);
 try {
 const isOnline = await isNetworkAvailable();
 if (!isOnline) {
 throw new Error(t('auth.errors.network', "No network connection. Please check your internet and try again."));
 }

 // 1. LOGIN
 const user = await retryOperation(() => atomicLogin(email.trim(), password));

 try {
   await Purchases.logIn({ appUserID: user.id });
 } catch (rcError) {
   console.error('RevenueCat login sync error:', rcError);
 }

 // 2. SAVE SESSION
 PersistenceService.setSession(user.id);
 
 setIsLoading(false);
 } catch (err: any) {
 console.error('Login error:', err);
 if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
 setError(t('auth.errors.invalidCredentials', 'Invalid email or password.'));
 } else {
 setError(err.message || t('auth.errors.generic', 'An error occurred during login.'));
 }
 setIsLoading(false);
 }
 };

 const handleGoogleLogin = async () => {
 if (isGoogleLoggingIn) return;
 setIsGoogleLoggingIn(true);
 setIsLoading(true);
 setError(null);
 try {
 const isOnline = await isNetworkAvailable();
 if (!isOnline) {
 throw new Error(t('auth.errors.network', "No network connection."));
 }
 
 const user = await loginWithGoogle();
 
 // If loginWithGoogle returned null, it means it fell back to redirect method
 // The redirect result will be handled by the useEffect above
 if (user) {
   try {
     await Purchases.logIn({ appUserID: user.id });
   } catch (rcError) {
     console.error('RevenueCat google login sync error:', rcError);
   }
   setIsLoading(false);
 // The global onAuthStateChanged in AuthContext will handle the rest
 }
 } catch (err: any) {
 console.error('Google login error:', err);
 if (err.code === 'auth/popup-blocked') {
 setError(t('auth.errors.popupBlocked', 'Popup was blocked. Please allow popups for this site.'));
 } else if (err.code === 'auth/cancelled-popup-request') {
 // Just ignore cancellation, don't show error
 } else {
 setError(err.message || t('auth.errors.generic', 'An error occurred with Google sign-in.'));
 }
 setIsLoading(false);
 } finally {
 setIsGoogleLoggingIn(false);
 }
 };

 return (
 <AuthLayout>
 <AnimatePresence mode="wait">
 {view === 'LANDING' && (
 <LandingView 
 key="landing"
 onStart={() => setView('REGISTER_LANG')}
 onLogin={() => setView('LOGIN')}
 onGoogleLogin={handleGoogleLogin}
 isLoading={isLoading}
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
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={FAST_TRANSITION}
 className="w-full max-w-sm relative"
 >
 {/* Animated Exquisite Cosmic Container Background */}
 <div 
 className={`
 absolute inset-0 rounded-2xl transition-all duration-200 ease-out pointer-events-none
 ${(view === 'REGISTER_CREDENTIALS' && isEmailValid && isPasswordValid && isNameValid && isConfirmValid) || 
 (view === 'LOGIN' && isEmailValid && isPasswordValid) 
 ? 'opacity-100 scale-100' 
 : 'opacity-0 scale-95'
 }
 `}
 style={{
 background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.4) 60%, rgba(0,0,0,0) 100%)',
 boxShadow: '0 0 40px -10px rgba(99, 102, 241, 0.3), inset 0 0 20px -5px rgba(139, 92, 246, 0.2)'
 }}
 />

 <div className={`
 relative z-10 p-6 sm:p-8 rounded-2xl transition-all duration-200 ease-out border
 ${(view === 'REGISTER_CREDENTIALS' && isEmailValid && isPasswordValid && isNameValid && isConfirmValid) || 
 (view === 'LOGIN' && isEmailValid && isPasswordValid)
 ? 'bg-black/60 border-indigo-500/50 '
 : 'bg-[#0a0a0f] border-white/10'
 }
 `}>
 <div className="flex items-center mb-6">
 <button 
 onClick={() => setView(view === 'LOGIN' ? 'LANDING' : 'REGISTER_LANG')}
 className="mr-4 text-white/50 hover:text-white transition-colors"
 type="button"
 >
 <ChevronLeft className="w-5 h-5" />
 </button>
 <h2 className="text-xl font-bold text-white">
 {view === 'LOGIN' ? t('auth.login.title', 'Welcome Back') : t('auth.register.title', 'Create Account')}
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
 onChange={e => {
 const val = e.target.value;
 if (val.length <= 12) {
 setName(val);
 }
 }}
 isValid={isNameValid}
 showValidation={name.length > 0}
 autoComplete="name"
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
 autoComplete="email"
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
 autoComplete={view === 'LOGIN' ? 'current-password' : 'new-password'}
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
 autoComplete="new-password"
 />
 )}
 
 {error && (
 <div className="text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-xl transition-all">
 {error}
 </div>
 )}

 <button
 type="submit"
 disabled={isLoading || (view === 'REGISTER_CREDENTIALS' && (!isEmailValid || !isPasswordValid || !isNameValid || !isConfirmValid))}
 className={`
 w-full h-14 mt-6 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden group
 ${isLoading || (view === 'REGISTER_CREDENTIALS' && (!isEmailValid || !isPasswordValid || !isNameValid || !isConfirmValid))
 ? 'bg-white/5 text-white/30 cursor-not-allowed' 
 : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)]'
 }
 `}
 >
 {/* Cosmic Glow inside button when active */}
 {!(isLoading || (view === 'REGISTER_CREDENTIALS' && (!isEmailValid || !isPasswordValid || !isNameValid || !isConfirmValid))) && (
 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_2s_infinite]" />
 )}
 
 {isLoading ? (
 <Loader2 className="w-5 h-5 animate-spin text-white/70" />
 ) : (
 <div className="relative z-10 flex items-center gap-2">
 <span className="text-[15px] tracking-wide">{view === 'LOGIN' ? t('auth.login.button', 'Enter Matrix') : t('auth.register.button', 'Create Account')}</span>
 <ArrowRight className="w-4 h-4" />
 </div>
 )}
 </button>

 {view === 'LOGIN' && (
 <>
 <div className="flex items-center gap-3 my-4">
 <div className="flex-1 h-px bg-white/10" />
 <span className="text-white/30 text-xs uppercase tracking-widest">o</span>
 <div className="flex-1 h-px bg-white/10" />
 </div>
 <button
 type="button"
 onClick={handleGoogleLogin}
 disabled={isLoading}
 className="w-full h-12 bg-white text-gray-700 font-bold rounded-xl transition-all flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-95 disabled:opacity-50"
 >
 {isLoading ? (
 <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
 ) : (
 <>
 <GoogleIcon />
 <span>Continuar con Google</span>
 </>
 )}
 </button>
 </>
 )}
 </form>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </AuthLayout>
 );
};
