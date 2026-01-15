import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  auth, 
  db, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  doc,
  setDoc,
  GoogleAuthProvider
} from '../../services/firebase';
import { AuthLayout } from './components/AuthLayout';
import { GlassCard } from '../../components/ui/GlassCard';
import { AuthInput } from './components/AuthInput';

const googleProvider = new GoogleAuthProvider();

export const AuthView = () => {
  const { t, i18n } = useTranslation();
  // FORCE DEFAULT TO LOGIN (true)
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  // RESET TO LOGIN ON MOUNT
  // Whenever this component is remounted (e.g. after logout), it will start at Login
  useEffect(() => {
      setIsLogin(true);
  }, []);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // AUTO-FOCUS
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, [isLogin]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Login Failed:", err);
      setError(err.message.replace('Firebase: ', ''));
      setShake(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Auth Submit:", { isLogin, email, name: isLogin ? 'N/A' : name });
    
    // FAST VALIDATION
    if (!email || !password) {
      setError(t('auth.errors.required') || "Email and password are required");
      setShake(s => s + 1);
      return;
    }

    if (!isLogin) {
      if (!name) {
        setError(t('auth.errors.nameRequired') || "Name is required");
        setShake(s => s + 1);
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.errors.passwordMismatch'));
        setShake(s => s + 1);
        return;
      }
    }

    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        console.log("Attempting login...");
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Login successful");
      } else {
        // REGISTER
        console.log("Attempting registration...");
        if (password.length < 6) {
          throw new Error(t('auth.errors.passwordLength'));
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User created:", userCredential.user.uid);
        
        // Update Profile with Name
        if (name) {
          console.log("Updating profile with name:", name);
          // Fire and forget name updates to keep UI moving
          updateProfile(userCredential.user, { displayName: name });
          setDoc(doc(db, 'users', userCredential.user.uid), {
            displayName: name,
            email: email
          }, { merge: true }).catch(e => console.warn("Background sync failed", e));
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      
      let errorMessage = err.message.replace('Firebase: ', '');
      if (err.code === 'auth/operation-not-allowed') {
        errorMessage = t('auth.errors.authDisabled');
      } else if (err.code === 'auth/network-request-failed') {
         console.warn("⚠️ NETWORK FAILURE DETECTED. ENGAGING PHANTOM PROTOCOL.");
         localStorage.setItem('MATRIX_FORCE_OFFLINE', 'true');
         window.location.reload();
         return;
      }
      
      setError(errorMessage);
      setShake(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  // ULTRA-FAST SPRING PHYSICS
  const springConfig = { type: "spring" as const, stiffness: 500, damping: 40, mass: 0.5 };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setShake(0);
  };

  const changeLanguage = (lang: string) => {
    console.log("Changing language to:", lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <AuthLayout>
      {/* BACKGROUND EFFECT FOR AUTH (Same as Avatar Selector) */}
      <div className="fixed inset-0 -z-10 bg-[#020204]">
          {/* 1. Global Tint (Subtle Color Wash) */}
          <div 
              className="absolute inset-0 transition-colors duration-700"
              style={{ 
                  backgroundColor: '#4f46e5', // Indigo Default for Auth
                  opacity: 0.15 
              }}
          />

          {/* 2. The "Gradient" Overlay (Darkness from bottom/top) */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020204]/60 to-[#020204]" />

          {/* 3. The Radial Aura (Centered Glow) */}
          <div 
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-40 pointer-events-none blur-[100px]"
             style={{ 
                 background: `radial-gradient(circle, #4f46e5 0%, transparent 70%)` 
             }}
          />
      </div>

      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.3 }}
      >
        <GlassCard className="p-8 backdrop-blur-lg bg-black/40 border-white/10 relative overflow-hidden">
          
          {/* Language Selector */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <Globe className="w-3 h-3 text-white/40" />
            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => changeLanguage('es')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                  i18n.language.startsWith('es') 
                    ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('en')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                  i18n.language.startsWith('en') 
                    ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center mb-8 pt-4">
            <motion.h1 
              key={isLogin ? "login-title" : "register-title"}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springConfig}
              className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight text-center"
            >
              {isLogin ? t('auth.login.title') : t('auth.register.title')}
            </motion.h1>
            <motion.p 
              className="text-white/40 text-sm mt-2 font-medium tracking-wide text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {isLogin ? t('auth.login.subtitle') : t('auth.register.subtitle')}
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={springConfig}
                >
                  <AuthInput 
                    icon={User} 
                    type="text" 
                    placeholder={t('auth.fields.name')} 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </motion.div>
              )}

              <motion.div layout key="email-field" transition={springConfig}>
                <AuthInput 
                  ref={emailRef}
                  icon={Mail} 
                  type="email" 
                  placeholder={t('auth.fields.email')} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </motion.div>

              <motion.div layout key="password-field" transition={springConfig}>
                <AuthInput 
                  icon={Lock} 
                  type="password" 
                  placeholder={t('auth.fields.password')} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </motion.div>

              {!isLogin && (
                <motion.div
                  key="confirm-password-field"
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={springConfig}
                >
                  <AuthInput 
                    icon={Lock} 
                    type="password" 
                    placeholder={t('auth.fields.confirmPassword')} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={springConfig}
                  className="text-red-400 text-xs text-center font-mono bg-red-950/30 p-2 rounded-lg border border-red-500/20"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              layout
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springConfig}
              className="w-full relative group overflow-hidden rounded-xl bg-white text-black font-bold py-4 text-lg shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <>
                    {isLogin ? t('auth.login.button') : t('auth.register.button')}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* Toggle Mode */}
          <motion.div layout className="mt-8 relative flex items-center justify-center mb-6" transition={springConfig}>
            <div className="absolute inset-0 flex items-center">
               <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
            <div className="relative bg-black/40 px-4 text-sm text-gray-400">
              {t('auth.orContinue')}
            </div>
          </motion.div>

          <motion.button
            layout
            onClick={handleGoogleLogin}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={springConfig}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
          >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                />
                <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                />
            </svg>
            <span className="text-white font-medium">{t('auth.google')}</span>
          </motion.button>

          <motion.div layout className="mt-6 text-center" transition={springConfig}>
            <button 
              onClick={toggleMode}
              className="text-sm text-white/60 hover:text-white transition-colors duration-300 font-medium"
            >
              {isLogin ? (
                <span>{t('auth.login.footer')} <span className="text-indigo-400 hover:underline">{t('auth.login.footerAction')}</span></span>
              ) : (
                <span>{t('auth.register.footer')} <span className="text-indigo-400 hover:underline">{t('auth.register.footerAction')}</span></span>
              )}
            </button>
          </motion.div>

        </GlassCard>
      </motion.div>
    </AuthLayout>
  );
};
