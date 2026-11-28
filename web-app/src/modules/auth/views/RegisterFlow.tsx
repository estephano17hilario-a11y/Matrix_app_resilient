import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Lock, Mail, Sparkles, User } from 'lucide-react';
import { AuthInput } from '../components/AuthInput';
import { BackButton, ChunkyButton, ErrorBanner, GoogleIcon, OrDivider, Shake, StepProgress } from '../components/AuthUI';
import { MascotSays, gazeFor } from '../components/MascotSays';
import type { MascotMood } from '../components/LuxMascot';
import { cn } from '../../../utils/cn';
import { isValidEmail, isValidName, NAME_MAX, PASSWORD_MIN, passwordScore, suggestEmail } from '../authHelpers';
import { CountryPicker } from '../components/CountryPicker';
import { countryName } from '../../geo/countries';

export const REGISTER_STEPS = ['country', 'lang', 'name', 'email', 'password'] as const;
export type RegisterStep = (typeof REGISTER_STEPS)[number];

interface RegisterFlowProps {
  step: number;
  dir: number;
  goTo: (step: number) => void;
  onExit: () => void;
  onLogin: () => void;
  lang: string;
  onChangeLang: (lang: string) => void;
  country: string | null;
  onChangeCountry: (code: string) => void;
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirm: string; setConfirm: (v: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
  loading: boolean;
  googleLoading: boolean;
  error: string | null;
  errorNonce: number;
}

// SVG flags: emoji flags don't render on Windows/desktop browsers.
const FlagES = () => (
  <svg viewBox="0 0 30 20" className="w-11 h-[30px] rounded-md shadow-[0_2px_0_rgba(0,0,0,0.25)]" aria-hidden>
    <rect width="30" height="20" fill="#c60b1e" />
    <rect y="5" width="30" height="10" fill="#ffc400" />
  </svg>
);
const FlagUS = () => (
  <svg viewBox="0 0 30 20" className="w-11 h-[30px] rounded-md shadow-[0_2px_0_rgba(0,0,0,0.25)]" aria-hidden>
    <rect width="30" height="20" fill="#fff" />
    {[0, 2, 4, 6, 8, 10, 12].map(i => <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#b22234" />)}
    <rect width="13" height={(20 / 13) * 7} fill="#3c3b6e" />
  </svg>
);

const LANGS = [
  { code: 'es', Flag: FlagES },
  { code: 'en', Flag: FlagUS },
];

export const RegisterFlow = (p: RegisterFlowProps) => {
  const { t } = useTranslation();
  const [focus, setFocus] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);
  const [peek, setPeek] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Callback ref that ignores the null from the exiting step (it unmounts after the new one mounts).
  const keepInput = (el: HTMLInputElement | null) => { if (el) inputRef.current = el; };
  const current = REGISTER_STEPS[p.step];
  const last = p.step === REGISTER_STEPS.length - 1;

  const nameOk = isValidName(p.name);
  const emailOk = isValidEmail(p.email);
  const rawSuggestion = suggestEmail(p.email);
  // While typing "ana@gmail" don't nag before the user had a chance to add ".com".
  const suggestion = rawSuggestion && ((p.email.split('@')[1] ?? '').includes('.') || focus !== 'email') ? rawSuggestion : null;
  const score = passwordScore(p.password);
  const lengthOk = p.password.length >= PASSWORD_MIN;
  const matchOk = lengthOk && p.confirm === p.password;

  const canContinue =
    current === 'country' ? !!p.country :
    current === 'lang' ? true :
    current === 'name' ? nameOk :
    current === 'email' ? emailOk :
    lengthOk && matchOk;

  // Focus the step's first field once the slide-in has settled (avoids keyboard jank mid-animation).
  useEffect(() => {
    if (current === 'lang' || current === 'country') return;
    const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 380);
    return () => window.clearTimeout(id);
  }, [current]);

  const next = () => {
    if (!canContinue || p.loading) return;
    if (last) p.onSubmit();
    else p.goTo(p.step + 1);
  };

  // ── Mascot script ──
  let mood: MascotMood = 'idle';
  let bubble: { id: string; text: string } = { id: current, text: t(`auth.registerFlow.${current}.bubble`) };
  if (current === 'lang') mood = 'happy';
  if (current === 'country' && p.country) {
    mood = 'excited';
    bubble = { id: `country-${p.country}`, text: t('auth.registerFlow.country.bubbleValid', { country: countryName(p.country, p.lang.startsWith('en') ? 'en' : 'es') }) };
  }
  if (current === 'name') {
    if (focus === 'name') mood = 'idle';
    if (nameOk) { mood = 'happy'; bubble = { id: 'name-ok', text: t('auth.registerFlow.name.bubbleValid', { name: p.name.trim() }) }; }
  }
  if (current === 'email') {
    if (suggestion) { mood = 'thinking'; bubble = { id: 'email-typo', text: t('auth.registerFlow.email.bubbleTypo') }; }
    else if (emailOk) { mood = 'happy'; bubble = { id: 'email-ok', text: t('auth.registerFlow.email.bubbleValid') }; }
  }
  if (current === 'password') {
    if (score === 4) { mood = 'excited'; bubble = { id: 'pw-strong', text: t('auth.registerFlow.password.bubbleStrong') }; }
    else if (matchOk) { mood = 'happy'; bubble = { id: 'pw-ok', text: t('auth.registerFlow.password.bubbleValid') }; }
    if (focus === 'password' || focus === 'confirm') {
      if (peek) mood = 'peek';
      else if (score < 4) { mood = 'shy'; if (!matchOk) bubble = { id: 'pw-shy', text: t('auth.loginFlow.bubblePassword') }; }
    }
  }
  if (p.error) { mood = 'sad'; bubble = { id: `err-${p.errorNonce}`, text: t('auth.loginFlow.bubbleError') }; }
  if (p.loading) { mood = 'thinking'; bubble = { id: 'creating', text: t('auth.registerFlow.creating') }; }

  const look = focus === 'name' ? gazeFor(p.name) : focus === 'email' ? gazeFor(p.email) : null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header: back + progress */}
      <div className="flex items-center gap-3 h-14">
        <BackButton onClick={() => (p.step === 0 ? p.onExit() : p.goTo(p.step - 1))} label={t('common.back', 'Back')} />
        <StepProgress value={(p.step + 1) / REGISTER_STEPS.length} />
        <span className="w-9 text-right text-[13px] font-black text-white/45 tabular-nums">{p.step + 1}/{REGISTER_STEPS.length}</span>
      </div>

      <div className="mt-3">
        <MascotSays mood={mood} look={look} bubbleId={bubble.id} text={bubble.text} tone={p.error ? 'error' : 'default'} />
      </div>

      <form className="flex flex-1 flex-col mt-4" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
        {/* Step content — stacked in one grid cell so enter/exit overlap without layout jumps */}
        <div className="grid">
          <AnimatePresence initial={false} custom={p.dir}>
            <motion.div
              key={current}
              custom={p.dir}
              variants={{
                enter: (d: number) => ({ x: d * 64, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -64, opacity: 0, transition: { duration: 0.16 } }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="[grid-area:1/1] min-w-0"
            >
              <Shake trigger={p.errorNonce}>
                {current === 'country' && (
                  <CountryPicker
                    value={p.country}
                    onChange={p.onChangeCountry}
                    lang={p.lang}
                    labels={{
                      search: t('auth.registerFlow.country.search'),
                      suggested: t('auth.registerFlow.country.suggested'),
                      popular: t('auth.registerFlow.country.popular'),
                      all: t('auth.registerFlow.country.all'),
                      empty: t('auth.registerFlow.country.empty'),
                    }}
                  />
                )}

                {current === 'lang' && (
                  <div className="space-y-3.5" role="radiogroup" aria-label={t('onboarding.language.title')}>
                    {LANGS.map((l, i) => {
                      const selected = p.lang.startsWith(l.code);
                      return (
                        <motion.button
                          key={l.code}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => p.onChangeLang(l.code)}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + i * 0.06, type: 'spring', stiffness: 320, damping: 26 }}
                          className="chunky relative block w-full h-[84px] text-left touch-manipulation"
                        >
                          <span aria-hidden className={cn('absolute inset-x-0 bottom-0 top-[5px] rounded-[20px] transition-colors duration-150',
                            selected ? 'bg-violet-700' : 'bg-white/[0.1]')} />
                          <span className={cn(
                            'chunky-face absolute inset-x-0 top-0 bottom-[5px] rounded-[20px] border-2 flex items-center gap-4 px-4 transition-colors duration-150',
                            selected ? 'border-violet-400 bg-[#2a1d55]' : 'border-white/[0.1] bg-[#15142a]',
                          )}>
                            <span className="shrink-0 overflow-hidden rounded-md"><l.Flag /></span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[17px] font-extrabold">{t(`onboarding.language.${l.code}.name`)}</span>
                              <span className="block text-[13px] font-semibold text-white/45">{t(`onboarding.language.${l.code}.region`)}</span>
                            </span>
                            <span className={cn('grid place-items-center w-8 h-8 rounded-full border-2 transition-colors duration-150',
                              selected ? 'border-violet-300 bg-violet-500' : 'border-white/20')}>
                              <AnimatePresence initial={false}>
                                {selected && (
                                  <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                    transition={{ type: 'spring', stiffness: 600, damping: 18 }}>
                                    <Check className="w-4 h-4 text-white" strokeWidth={3.5} />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {current === 'name' && (
                  <AuthInput
                    ref={keepInput}
                    icon={User}
                    label={t('auth.registerFlow.name.label')}
                    type="text"
                    autoComplete="nickname"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    maxLength={NAME_MAX}
                    placeholder={t('auth.registerFlow.name.placeholder')}
                    value={p.name}
                    onChange={(e) => p.setName(e.target.value.slice(0, NAME_MAX))}
                    onFocus={() => setFocus('name')}
                    onBlur={() => setFocus(null)}
                    valid={nameOk}
                    hint={
                      <div className="flex justify-between">
                        <span>{t('auth.registerFlow.name.hint')}</span>
                        <span className={cn('tabular-nums', p.name.length >= NAME_MAX && 'text-amber-300')}>{p.name.length}/{NAME_MAX}</span>
                      </div>
                    }
                  />
                )}

                {current === 'email' && (
                  <div>
                    <AuthInput
                      ref={keepInput}
                      icon={Mail}
                      label={t('auth.registerFlow.email.label')}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="next"
                      placeholder={t('auth.placeholders.email')}
                      value={p.email}
                      onChange={(e) => p.setEmail(e.target.value)}
                      onFocus={() => setFocus('email')}
                      onBlur={() => setFocus(null)}
                      valid={emailOk && !suggestion}
                      hint={t('auth.registerFlow.email.hint')}
                    />
                    <AnimatePresence initial={false}>
                      {suggestion && (
                        <motion.button
                          key="suggest"
                          type="button"
                          onClick={() => p.setEmail(suggestion)}
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="mt-1 w-full flex items-center gap-2.5 rounded-2xl border-2 border-amber-300/30 bg-amber-400/10 px-4 py-3 text-left text-[14px] font-semibold text-amber-100 active:scale-[0.98] transition-transform duration-100"
                        >
                          <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
                          <span className="min-w-0 break-all">
                            {t('auth.registerFlow.email.suggestPrefix')} <b className="font-extrabold text-white">{suggestion}</b>?
                          </span>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {current === 'password' && (
                  <div className="space-y-1">
                    <AuthInput
                      ref={keepInput}
                      icon={Lock}
                      label={t('auth.registerFlow.password.label')}
                      type="password"
                      autoComplete="new-password"
                      enterKeyHint="next"
                      placeholder="••••••••"
                      value={p.password}
                      onChange={(e) => p.setPassword(e.target.value)}
                      onFocus={() => setFocus('password')}
                      onBlur={() => setFocus(null)}
                      onVisibilityChange={setPeek}
                      valid={lengthOk}
                      hint={<StrengthMeter score={score} />}
                    />
                    <AuthInput
                      icon={Lock}
                      label={t('auth.registerFlow.password.confirmLabel')}
                      type="password"
                      autoComplete="new-password"
                      enterKeyHint="done"
                      placeholder="••••••••"
                      value={p.confirm}
                      onChange={(e) => p.setConfirm(e.target.value)}
                      onFocus={() => setFocus('confirm')}
                      onBlur={() => setFocus(null)}
                      onVisibilityChange={setPeek}
                      valid={matchOk}
                      error={p.confirm.length >= p.password.length && p.confirm.length > 0 && !matchOk && lengthOk
                        ? t('auth.errors.passwordMismatch') : undefined}
                      hint=""
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Rule ok={lengthOk} label={t('auth.registerFlow.password.ruleLength', { count: PASSWORD_MIN })} />
                      <Rule ok={matchOk} label={t('auth.registerFlow.password.ruleMatch')} />
                    </div>
                  </div>
                )}
              </Shake>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3"><ErrorBanner message={p.error} /></div>

        {/* Not pinned to the very bottom of the screen (it sat under the thumb's reach, next to the gesture bar):
            it follows the content, with room to breathe below so it never hugs the edge. */}
        <div className="mt-4 pb-12 space-y-4">
          <ChunkyButton type="submit" size="xl" disabled={!canContinue} loading={p.loading} shine={canContinue}
            variant={last && canContinue ? 'success' : 'primary'}>
            {last ? t('auth.registerFlow.create') : t('auth.registerFlow.continue')}
          </ChunkyButton>

          {current === 'email' && (
            <>
              <OrDivider label={t('auth.loginFlow.or')} />
              <ChunkyButton type="button" variant="google" size="md" onClick={p.onGoogle} loading={p.googleLoading} icon={<GoogleIcon />}>
                <span className="normal-case tracking-normal text-[15px]">{t('auth.registerFlow.email.google')}</span>
              </ChunkyButton>
            </>
          )}

          {current === 'country' && (
            <p className="text-center text-[14px] font-semibold text-white/50">
              {t('auth.registerFlow.haveAccount')}{' '}
              <button type="button" onClick={p.onLogin} className="font-extrabold text-violet-300 hover:text-violet-200">
                {t('auth.registerFlow.login')}
              </button>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

const STRENGTH_COLORS = ['', 'bg-rose-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'];
const STRENGTH_TEXT = ['', 'text-rose-300', 'text-amber-300', 'text-lime-300', 'text-emerald-300'];

const StrengthMeter = ({ score }: { score: number }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="relative h-[6px] flex-1 rounded-full bg-white/[0.08] overflow-hidden">
            <motion.div
              className={cn('absolute inset-0 rounded-full origin-left', STRENGTH_COLORS[Math.max(score, 1)])}
              initial={false}
              animate={{ scaleX: score >= i ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, delay: score >= i ? (i - 1) * 0.04 : 0 }}
            />
          </div>
        ))}
      </div>
      <span className={cn('w-[86px] text-right text-[12px] font-extrabold', score ? STRENGTH_TEXT[score] : 'text-white/30')}>
        {score ? t(`auth.registerFlow.password.strength${score}`) : t('auth.registerFlow.password.strength0')}
      </span>
    </div>
  );
};

const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={cn(
    'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[12px] font-bold transition-colors duration-200',
    ok ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-white/[0.08] text-white/40',
  )}>
    <span className={cn('grid place-items-center w-4 h-4 rounded-full transition-colors duration-200', ok ? 'bg-emerald-500' : 'bg-white/10')}>
      <AnimatePresence initial={false}>
        {ok && (
          <motion.span key="ok" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}>
            <Check className="w-3 h-3 text-white" strokeWidth={4} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
    {label}
  </span>
);
