import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lock, Mail } from 'lucide-react';
import { AuthInput } from '../components/AuthInput';
import { BackButton, ChunkyButton, ErrorBanner, GoogleIcon, OrDivider, Shake } from '../components/AuthUI';
import { MascotSays, gazeFor } from '../components/MascotSays';
import type { MascotMood } from '../components/LuxMascot';
import { isValidEmail, PASSWORD_MIN } from '../authHelpers';

interface LoginViewProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onForgot: () => void;
  onRegister: () => void;
  onBack: () => void;
  loading: boolean;
  googleLoading: boolean;
  error: string | null;
  errorNonce: number;
}

const item = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.06 + i * 0.05, type: 'spring' as const, stiffness: 300, damping: 26 },
});

export const LoginView = (p: LoginViewProps) => {
  const { t } = useTranslation();
  const [focus, setFocus] = useState<'email' | 'password' | null>(null);
  const [peek, setPeek] = useState(false);
  const emailOk = isValidEmail(p.email);
  // Any non-empty password may be submitted: older accounts could predate the current minimum.
  const ready = emailOk && p.password.length > 0;
  const looksComplete = emailOk && p.password.length >= PASSWORD_MIN;

  let mood: MascotMood = looksComplete ? 'happy' : 'idle';
  let bubble = { id: 'hello', text: t('auth.loginFlow.bubble') };
  if (focus === 'email') bubble = { id: 'email', text: t('auth.loginFlow.bubbleEmail') };
  if (focus === 'password') {
    mood = peek ? 'peek' : 'shy';
    bubble = peek ? { id: 'peek', text: t('auth.loginFlow.bubblePeek') } : { id: 'pw', text: t('auth.loginFlow.bubblePassword') };
  }
  if (p.error) { mood = 'sad'; bubble = { id: `err-${p.errorNonce}`, text: t('auth.loginFlow.bubbleError') }; }
  if (p.loading) { mood = 'thinking'; bubble = { id: 'loading', text: t('auth.loginFlow.bubbleLoading') }; }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 h-14">
        <BackButton onClick={p.onBack} label={t('common.back', 'Back')} />
        <h1 className="flex-1 text-center pr-11 text-[19px] font-black tracking-tight">{t('auth.loginFlow.title')}</h1>
      </div>

      <motion.div {...item(0)} className="mt-3">
        <MascotSays mood={mood} look={focus === 'email' ? gazeFor(p.email) : null}
          bubbleId={bubble.id} text={bubble.text} tone={p.error ? 'error' : 'default'} />
      </motion.div>

      <form
        className="flex flex-1 flex-col mt-4"
        onSubmit={(e) => { e.preventDefault(); if (ready && !p.loading) p.onSubmit(); }}
        noValidate
      >
        <Shake trigger={p.errorNonce} className="space-y-1">
          <motion.div {...item(1)}>
            <AuthInput
              icon={Mail}
              label={t('auth.fields.email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t('auth.placeholders.email')}
              value={p.email}
              onChange={(e) => p.setEmail(e.target.value)}
              onFocus={() => setFocus('email')}
              onBlur={() => setFocus(null)}
              valid={emailOk}
              hint=""
            />
          </motion.div>
          <motion.div {...item(2)}>
            <AuthInput
              icon={Lock}
              label={t('auth.fields.password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={p.password}
              onChange={(e) => p.setPassword(e.target.value)}
              onFocus={() => setFocus('password')}
              onBlur={() => setFocus(null)}
              onVisibilityChange={setPeek}
              hint={
                <div className="flex justify-end">
                  <button type="button" onClick={p.onForgot}
                    className="text-[13px] font-extrabold text-violet-300 hover:text-violet-200 active:opacity-70 py-1 -my-1">
                    {t('auth.loginFlow.forgot')}
                  </button>
                </div>
              }
            />
          </motion.div>
        </Shake>

        <div className="mt-2"><ErrorBanner message={p.error} /></div>

        <div className="mt-auto pt-6 space-y-4">
          <motion.div {...item(3)}>
            <ChunkyButton type="submit" disabled={!ready} loading={p.loading} shine>
              {t('auth.loginFlow.submit')}
            </ChunkyButton>
          </motion.div>
          <motion.div {...item(4)}><OrDivider label={t('auth.loginFlow.or')} /></motion.div>
          <motion.div {...item(5)}>
            <ChunkyButton type="button" variant="google" size="md" onClick={p.onGoogle} loading={p.googleLoading} icon={<GoogleIcon />}>
              <span className="normal-case tracking-normal text-[15px]">{t('auth.continueGoogle')}</span>
            </ChunkyButton>
          </motion.div>
          <motion.p {...item(6)} className="text-center text-[14px] font-semibold text-white/50 pt-1">
            {t('auth.loginFlow.noAccount')}{' '}
            <button type="button" onClick={p.onRegister} className="font-extrabold text-violet-300 hover:text-violet-200">
              {t('auth.loginFlow.createOne')}
            </button>
          </motion.p>
        </div>
      </form>
    </div>
  );
};
