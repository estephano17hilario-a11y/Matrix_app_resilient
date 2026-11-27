import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { atomicLogin, atomicRegister, loginWithGoogle } from '../../services/supabaseService';
import { loginRevenueCat } from '../../services/revenueCatService';
import { PersistenceService } from '../../services/persistence';
import { isNetworkAvailable, retryOperation } from '../../utils/networkUtils';
import { requestPasswordReset } from './passwordRecovery';
import { authErrorKey } from './authHelpers';
import { getCountry, guessCountry, languageForCountry, setCountry as persistCountry } from '../geo/countries';
import { AuthLayout } from './components/AuthLayout';
import { WelcomeView } from './views/WelcomeView';
import { LoginView } from './views/LoginView';
import { RegisterFlow, REGISTER_STEPS } from './views/RegisterFlow';
import { ForgotView, MailSentView } from './views/ForgotView';

type View = 'welcome' | 'login' | 'register' | 'forgot' | 'forgotSent' | 'checkEmail';

// Navigation depth decides the slide direction (deeper = slides in from the right).
const DEPTH: Record<View, number> = { welcome: 0, login: 1, register: 1, forgot: 2, forgotSent: 3, checkEmail: 2 };

const offlineError = () => Object.assign(new Error('offline'), { code: 'network' });

const celebrate = () => {
  import('canvas-confetti')
    .then(({ default: confetti }) => {
      const opts = { disableForReducedMotion: true, zIndex: 10050, ticks: 220, gravity: 1.1, scalar: 0.9,
        colors: ['#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#ffffff'] };
      confetti({ ...opts, particleCount: 70, spread: 75, startVelocity: 42, origin: { x: 0.5, y: 0.75 } });
      window.setTimeout(() => {
        confetti({ ...opts, particleCount: 35, angle: 60, spread: 55, origin: { x: 0, y: 0.8 } });
        confetti({ ...opts, particleCount: 35, angle: 120, spread: 55, origin: { x: 1, y: 0.8 } });
      }, 180);
    })
    .catch(() => {});
};

export const AuthView = () => {
  const { t, i18n } = useTranslation();

  const [[view, dir], setNav] = useState<[View, number]>(['welcome', 1]);
  const [[step, stepDir], setStepNav] = useState<[number, number]>([0, 1]);

  const [email, setEmailRaw] = useState('');
  const [password, setPasswordRaw] = useState('');
  const [name, setNameRaw] = useState('');
  const [confirm, setConfirmRaw] = useState('');
  const [country, setCountryState] = useState<string | null>(() => getCountry() || guessCountry());

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);

  const fail = useCallback((err: unknown) => {
    setError(t(`auth.errors.${authErrorKey(err)}`));
    setErrorNonce(n => n + 1);
  }, [t]);

  // Typing again dismisses the last error.
  const edit = (setter: (v: string) => void) => (v: string) => { setter(v); setError(null); };
  const setEmail = edit(setEmailRaw);
  const setPassword = edit(setPasswordRaw);
  const setName = edit(setNameRaw);
  const setConfirm = edit(setConfirmRaw);

  const go = useCallback((next: View) => {
    setError(null);
    setNav(([cur]) => [next, DEPTH[next] >= DEPTH[cur] ? 1 : -1]);
  }, []);
  const goStep = useCallback((next: number) => {
    setError(null);
    setStepNav(([cur]) => [next, next >= cur ? 1 : -1]);
  }, []);

  const startRegister = () => { goStep(0); go('register'); };

  // ── Android hardware back ──
  const backRef = useRef<() => void>(() => {});
  backRef.current = () => {
    if (loading) return;
    if (view === 'welcome') App.exitApp();
    else if (view === 'register' && step > 0) goStep(step - 1);
    else if (view === 'login' || view === 'register') go('welcome');
    else go('login');
  };
  useEffect(() => {
    const handle = (async () => {
      try { return await App.addListener('backButton', () => backRef.current()); } catch { return null; } // web
    })();
    return () => { handle.then(h => h?.remove()).catch(() => {}); };
  }, []);

  const changeCountry = (code: string) => {
    setCountryState(code);
    persistCountry(code);
    changeLanguage(languageForCountry(code));
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    try { localStorage.setItem('i18nextLng', lang); } catch { /* private mode */ }
  };

  // ── Actions (same backend contract as before) ──

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!(await isNetworkAvailable())) throw offlineError();
      const user = await retryOperation(() => atomicLogin(email.trim(), password));
      await loginRevenueCat(user.id).catch((e: unknown) => console.warn('RevenueCat login failed', e));
      PersistenceService.setSession(user.id);
    } catch (err) {
      console.error('Login error:', err);
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!(await isNetworkAvailable())) throw offlineError();
      const user = await retryOperation(() => atomicRegister(email.trim(), password, name.trim(), i18n.language, country || undefined));
      celebrate();
      await loginRevenueCat(user.id).catch((e: unknown) => console.warn('RevenueCat login failed', e));
      PersistenceService.setSession(user.id);
    } catch (err) {
      const key = authErrorKey(err);
      if (key === 'confirmationRequired') {
        celebrate();
        go('checkEmail');
      } else {
        console.error('Registration error:', err);
        if (key === 'emailInUse' || key === 'invalidEmail') goStep(REGISTER_STEPS.indexOf('email'));
        if (key === 'weakPassword') goStep(REGISTER_STEPS.indexOf('password'));
        fail(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!(await isNetworkAvailable())) throw offlineError();
      await requestPasswordReset(email);
      go('forgotSent');
    } catch (err) {
      console.error('Password reset error:', err);
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError(null);
    try {
      if (!(await isNetworkAvailable())) throw offlineError();
      await loginWithGoogle();
      // Web navigates away; native resolves once the session exists and this screen unmounts.
      // Release the button if neither happens.
      window.setTimeout(() => setGoogleLoading(false), 5000);
    } catch (err) {
      setGoogleLoading(false);
      const key = authErrorKey(err);
      if (key === 'cancelled') return;
      console.error('Google login error:', err);
      if (view === 'login' || view === 'register') fail(err);
      else toast.error(t(`auth.errors.${key}`));
    }
  };

  const shared = { loading, googleLoading, error, errorNonce };

  return (
    <MotionConfig reducedMotion="user">
      <AuthLayout>
        <div className="grid grid-rows-[1fr] flex-1">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={view}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 90, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -90, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="[grid-area:1/1] flex flex-col min-w-0"
            >
              {view === 'welcome' && (
                <WelcomeView onStart={startRegister} onLogin={() => go('login')} onGoogle={handleGoogle} googleLoading={googleLoading} />
              )}

              {view === 'login' && (
                <LoginView
                  {...shared}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  onSubmit={handleLogin}
                  onGoogle={handleGoogle}
                  onForgot={() => go('forgot')}
                  onRegister={startRegister}
                  onBack={() => go('welcome')}
                />
              )}

              {view === 'register' && (
                <RegisterFlow
                  {...shared}
                  step={step} dir={stepDir} goTo={goStep}
                  onExit={() => go('welcome')}
                  onLogin={() => go('login')}
                  lang={i18n.language} onChangeLang={changeLanguage}
                  country={country} onChangeCountry={changeCountry}
                  name={name} setName={setName}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  confirm={confirm} setConfirm={setConfirm}
                  onSubmit={handleRegister}
                  onGoogle={handleGoogle}
                />
              )}

              {view === 'forgot' && (
                <ForgotView {...shared} email={email} setEmail={setEmail} onSubmit={handleForgot} onBack={() => go('login')} />
              )}

              {view === 'forgotSent' && (
                <MailSentView
                  title={t('auth.forgotFlow.sentTitle')}
                  desc={t('auth.forgotFlow.sentDesc', { email: email.trim() })}
                  bubble={t('auth.forgotFlow.sentBubble')}
                  cta={t('auth.forgotFlow.backToLogin')}
                  onCta={() => go('login')}
                  secondary={t('auth.forgotFlow.resend')}
                  onSecondary={() => go('forgot')}
                />
              )}

              {view === 'checkEmail' && (
                <MailSentView
                  title={t('auth.checkEmail.title')}
                  desc={t('auth.checkEmail.desc', { email: email.trim() })}
                  bubble={t('auth.checkEmail.bubble')}
                  cta={t('auth.checkEmail.cta')}
                  onCta={() => go('login')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </AuthLayout>
    </MotionConfig>
  );
};
