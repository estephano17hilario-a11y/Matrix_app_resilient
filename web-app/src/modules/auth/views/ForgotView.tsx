import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Mail } from 'lucide-react';
import { AuthInput } from '../components/AuthInput';
import { BackButton, ChunkyButton, ErrorBanner, Shake } from '../components/AuthUI';
import { MascotSays, gazeFor } from '../components/MascotSays';
import { LuxMascot } from '../components/LuxMascot';
import { isValidEmail } from '../authHelpers';

interface ForgotViewProps {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
  errorNonce: number;
}

export const ForgotView = (p: ForgotViewProps) => {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const ok = isValidEmail(p.email);
  const mood = p.loading ? 'thinking' : p.error ? 'sad' : ok ? 'happy' : 'idle';
  const bubble = p.loading
    ? { id: 'sending', text: t('auth.forgotFlow.sending') }
    : p.error ? { id: `err-${p.errorNonce}`, text: t('auth.loginFlow.bubbleError') }
    : { id: 'help', text: t('auth.forgotFlow.bubble') };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 h-14">
        <BackButton onClick={p.onBack} label={t('common.back', 'Back')} />
        <h1 className="flex-1 text-center pr-11 text-[19px] font-black tracking-tight">{t('auth.forgotFlow.title')}</h1>
      </div>
      <div className="mt-3">
        <MascotSays mood={mood} look={focused ? gazeFor(p.email) : null} bubbleId={bubble.id} text={bubble.text}
          tone={p.error ? 'error' : 'default'} />
      </div>
      <form className="flex flex-1 flex-col mt-4" noValidate
        onSubmit={(e) => { e.preventDefault(); if (ok && !p.loading) p.onSubmit(); }}>
        <Shake trigger={p.errorNonce}>
          <AuthInput
            icon={Mail}
            label={t('auth.forgotFlow.label')}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t('auth.placeholders.email')}
            value={p.email}
            onChange={(e) => p.setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            valid={ok}
            hint={t('auth.forgotFlow.hint')}
          />
        </Shake>
        <div className="mt-2"><ErrorBanner message={p.error} /></div>
        <div className="mt-auto pt-6">
          <ChunkyButton type="submit" disabled={!ok} loading={p.loading} shine>{t('auth.forgotFlow.submit')}</ChunkyButton>
        </div>
      </form>
    </div>
  );
};

/** Shared "check your inbox" moment (password reset sent / sign-up needs confirmation). */
export const MailSentView = ({ title, desc, bubble, cta, onCta, secondary, onSecondary }: {
  title: string; desc: string; bubble: string; cta: string; onCta: () => void; secondary?: string; onSecondary?: () => void;
}) => (
  <div className="flex flex-1 flex-col items-center text-center">
    <div className="flex-1 flex flex-col items-center justify-center w-full">
      <div className="relative w-[220px] h-[190px]">
        {/* Rings */}
        {[0, 1].map(i => (
          <motion.span key={i} aria-hidden
            className="absolute left-1/2 top-1/2 -ml-[80px] -mt-[80px] w-[160px] h-[160px] rounded-full border-2 border-emerald-300/40"
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.6, delay: 0.5 + i * 0.5, repeat: Infinity, repeatDelay: 0.6, ease: 'easeOut' }}
          />
        ))}
        {/* Envelope flies off… */}
        <motion.div className="absolute left-1/2 top-1/2 -ml-9 -mt-9 grid place-items-center w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)]"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.1, 1, 1, 0.6], rotate: [-20, 0, 0, -12, 18], x: [0, 0, 0, 0, 120], y: [0, 0, 0, 0, -110], opacity: [1, 1, 1, 1, 0] }}
          transition={{ duration: 1.5, times: [0, 0.25, 0.35, 0.6, 1], ease: 'easeInOut' }}>
          <Mail className="w-9 h-9 text-white" strokeWidth={2.4} />
        </motion.div>
        {/* …and Lux celebrates with a check */}
        <motion.div className="absolute inset-0 grid place-items-center"
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.25, type: 'spring', stiffness: 300, damping: 16 }}>
          <div className="relative">
            <LuxMascot mood="excited" size={150} />
            <motion.span className="absolute right-0 bottom-3 grid place-items-center w-11 h-11 rounded-full bg-emerald-500 border-4 border-[#0c0a20]"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: 'spring', stiffness: 600, damping: 14 }}>
              <Check className="w-5 h-5 text-white" strokeWidth={4} />
            </motion.span>
          </div>
        </motion.div>
      </div>

      <motion.h1 className="mt-4 text-[28px] font-black tracking-tight"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, type: 'spring', stiffness: 260, damping: 24 }}>
        {title}
      </motion.h1>
      <motion.p className="mt-3 max-w-[330px] text-[15px] font-medium leading-relaxed text-white/60 break-words"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.45, type: 'spring', stiffness: 260, damping: 24 }}>
        {desc}
      </motion.p>
      <motion.p className="mt-4 text-[14px] font-bold text-violet-200/80"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
        {bubble}
      </motion.p>
    </div>
    <motion.div className="w-full pt-6 space-y-3.5"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.55, type: 'spring', stiffness: 260, damping: 24 }}>
      <ChunkyButton onClick={onCta} shine>{cta}</ChunkyButton>
      {secondary && onSecondary && <ChunkyButton variant="secondary" size="md" onClick={onSecondary}>{secondary}</ChunkyButton>}
    </motion.div>
  </div>
);
