// The Deluxe funnel: value calculator → result reveal (time / money / life gained) → elite
// features → plans with a countdown to Dec 31. The result is saved and reminded on top.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Briefcase, Clapperboard, Crown, Flame, Gamepad2, GraduationCap,
  Hourglass, LayoutGrid, Rocket, Smartphone, Sparkles, Target, TrendingUp, X, Zap,
} from 'lucide-react';
import {
  computeValue, defaultAnswers, formatHours, formatMoney, loadSavedValue, RECOVERY_RATE, saveValue,
  type Activity, type Distraction, type SavedValue, type ValueAnswers,
} from '../valueCalc';
import { BigSwitch, Chip, CountdownBig, CountdownChip, CountUp, FunnelCTA, NiceSlider, RANGE_CSS, tr, type FL } from './FunnelParts';
import { AnalyzingScreen, CurrencyChoice, LossTicker, LUX_CSS, LuxuryBackdrop, StepSweep } from './LuxuryParts';
import { BenefitShowcase, CompareTable } from './BenefitShowcase';

type Step = 'intro' | 'work' | 'details' | 'procrastination' | 'analyzing' | 'results' | 'features' | 'plans';
const QUESTION_STEPS: Step[] = ['work', 'details', 'procrastination'];

interface Props {
  lang: FL;
  isNative: boolean;
  weekly: any;
  monthly: any;
  annual: any;
  onBuy: (pkg: any) => void;
  onRestore: () => void;
  onClose: () => void;
}

export const DeluxeFunnel = ({ lang, isNative, weekly, monthly, annual, onBuy, onRestore, onClose }: Props) => {
  const L = (es: string, en: string) => tr(lang, es, en);
  const reduce = !!useReducedMotion();
  const [saved, setSaved] = useState<SavedValue | null>(loadSavedValue);
  const [a, setA] = useState<ValueAnswers>(() => saved?.answers ?? defaultAnswers());
  // Once the user has a result, Deluxe opens straight on the offer (back arrow still reaches everything).
  const [[step, dir], setNav] = useState<[Step, number]>(() => [saved?.result ? 'plans' : 'intro', 1]);
  const order: Step[] = ['intro', 'work', 'details', 'procrastination', 'analyzing', 'results', 'features', 'plans'];
  const go = (next: Step) => setNav(([cur]) => [next, order.indexOf(next) >= order.indexOf(cur) ? 1 : -1]);
  const back = () => {
    if (step === 'results' || step === 'analyzing') return go('procrastination');
    const i = order.indexOf(step); if (i > 0) go(order[i - 1]);
  };
  const [confirmExit, setConfirmExit] = useState(false);
  const askClose = () => {
    if (saved?.result && ['results', 'features', 'plans'].includes(step)) setConfirmExit(true);
    else onClose();
  };
  const set = (patch: Partial<ValueAnswers>) => setA(prev => ({ ...prev, ...patch }));

  const live = useMemo(() => computeValue(a), [a]);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [step]);
  const result = saved?.result;
  const money = (n: number | null | undefined) => formatMoney(n, a.currency, lang);
  const qIndex = QUESTION_STEPS.indexOf(step);

  const reveal = () => { setSaved(saveValue(a)); go('analyzing'); };

  const detailsReady = a.works ? a.monthlyIncome > 0 : a.activities.length > 0;

  // Reminder line shown on top once a result exists.
  const reminder = result && (step === 'intro' || order.indexOf(step) >= order.indexOf('results'));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden text-white">
      <style>{RANGE_CSS + LUX_CSS}</style>
      <LuxuryBackdrop />
      <StepSweep trigger={step} />

      {/* ── Header ── */}
      <div className="relative z-20 shrink-0 px-4 pt-[max(env(safe-area-inset-top),14px)]">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step !== 'intro' ? (
            <button type="button" onClick={back} aria-label={L('Atrás', 'Back')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/70 active:scale-90"><ArrowLeft size={18} /></button>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.22em] text-amber-200"><Crown size={15} /> Deluxe</span>
          )}
          <div className="flex flex-1 justify-center">
            {qIndex >= 0 && (
              <div className="flex w-full max-w-[180px] gap-1.5">
                {QUESTION_STEPS.map((_, i) => (
                  <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.span className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ originX: 0 }}
                      initial={false} animate={{ scaleX: i <= qIndex ? 1 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }} />
                  </span>
                ))}
              </div>
            )}
          </div>
          <CountdownChip lang={lang} />
          <button type="button" onClick={askClose} aria-label={L('Cerrar', 'Close')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/60 active:scale-90"><X size={18} /></button>
        </div>
        <AnimatePresence>
          {reminder && result && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-auto mt-2.5 flex max-w-xl items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-2 text-[12px] font-semibold">
              <TrendingUp size={15} className="shrink-0 text-emerald-300" />
              <span className="min-w-0 flex-1 text-emerald-50/90">
                {L('Con Deluxe recuperas ', 'With Deluxe you recover ')}
                <b className="text-emerald-300">{result.moneyPerMonth != null ? `${money(result.moneyPerMonth)}/${L('mes', 'mo')}` : `${formatHours(result.hoursPerMonth)}/${L('mes', 'mo')}`}</b>
              </span>
              <span className="shrink-0 text-[11px] text-rose-200/60">
                {L('sin él: ', 'without it: ')}−{result.moneyPerDay != null ? money(result.moneyPerDay) : formatHours(result.recoveredHoursPerDay)}/{L('día', 'day')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Body ── */}
      <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 90, opacity: 0, scale: 0.94 }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (d: number) => ({ x: d * -90, opacity: 0, scale: 0.96 }),
            }}
            initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="mx-auto flex min-h-full w-full max-w-xl flex-col px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)]">

            {step === 'intro' && (
              <>
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <TimeOrb reduce={reduce} />
                  <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="mt-6 text-[34px] font-black leading-[1.05] tracking-tight">
                    {L('¿Cuánto vale', 'How much is')}<br />
                    <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-pink-400 bg-clip-text text-transparent">{L('tu tiempo?', 'your time worth?')}</span>
                  </motion.h1>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-3 max-w-[330px] text-[15px] font-medium leading-relaxed text-white/60">
                    {L('Responde 3 preguntas y te mostraré, con tus propios números, cuánto tiempo, dinero y vida puede devolverte Lux Deluxe.', 'Answer 3 questions and I will show you, with your own numbers, how much time, money and life Lux Deluxe can give back.')}
                  </motion.p>
                  {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                      className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/40">{L('Tu último cálculo', 'Your last result')}</div>
                      <div className="mt-1 text-[18px] font-black text-white">+{result.wakingMonthsIn10Years} {L('meses de vida plena en 10 años', 'months of full life in 10 years')}</div>
                    </motion.div>
                  )}
                </div>
                <div className="mt-6 space-y-3">
                  {result && <FunnelCTA onClick={() => go('results')}><Sparkles size={18} /> {L('Ver mi resultado', 'See my result')}</FunnelCTA>}
                  <FunnelCTA onClick={() => go('work')} tone={result ? 'violet' : 'gold'}><Hourglass size={18} /> {result ? L('Recalcular', 'Recalculate') : L('Calcular mi tiempo', 'Calculate my time')}</FunnelCTA>
                  <button type="button" onClick={() => go('features')} className="w-full py-2 text-[13px] font-bold text-white/45">{L('Ver funciones y planes', 'See features and plans')}</button>
                </div>
              </>
            )}

            {step === 'work' && (
              <Question title={L('¿Trabajas actualmente?', 'Do you currently work?')}
                sub={L('Con esto calculamos cuánto vale una hora de tu vida.', 'This tells us what one hour of your life is worth.')}
                onNext={() => go('details')} nextLabel={L('Continuar', 'Continue')}>
                <BigSwitch value={a.works} onChange={v => set({ works: v })} yes={L('Sí, trabajo', 'Yes, I work')} no={L('No trabajo', "I don't work")} />
                <motion.div key={String(a.works)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  {a.works ? <Briefcase className="shrink-0 text-emerald-300" /> : <GraduationCap className="shrink-0 text-indigo-300" />}
                  <p className="text-[13.5px] font-medium leading-snug text-white/70">
                    {a.works
                      ? L('Calcularemos cuánto ganas por hora y cuánto dinero puedes recuperar.', 'We will compute your hourly value and the money you can recover.')
                      : L('Calcularemos el tiempo que inviertes en tu futuro y cuánto puedes recuperar.', 'We will compute the time you invest in your future and how much you can recover.')}
                  </p>
                </motion.div>
              </Question>
            )}

            {step === 'details' && a.works && (
              <Question title={L('¿Cuánto ganas al mes?', 'How much do you earn per month?')}
                sub={L('Tu ingreso neto aproximado. Se queda solo en tu cuenta.', 'Your approximate net income. It stays in your account only.')}
                onNext={() => go('procrastination')} nextLabel={L('Continuar', 'Continue')} disabled={!detailsReady}>
                <div className="mb-2 text-[12px] font-black uppercase tracking-[0.16em] text-white/45">{L('¿En qué moneda cobras?', 'Which currency are you paid in?')}</div>
                <CurrencyChoice value={a.currency} onChange={c => set({ currency: c })} lang={lang} />
                <div className="mt-4 flex items-center gap-2">
                  <span className="grid h-16 shrink-0 place-items-center rounded-[20px] border-2 border-amber-300/30 bg-amber-400/10 px-4 text-[15px] font-black text-amber-100">{a.currency}</span>
                  <input inputMode="decimal" type="number" min={0} value={a.monthlyIncome || ''} placeholder="0"
                    onChange={e => set({ monthlyIncome: Math.max(0, Number(e.target.value) || 0) })}
                    aria-label={L('Ingreso mensual', 'Monthly income')}
                    className="h-16 min-w-0 flex-1 rounded-[20px] border-2 border-white/10 bg-white/[0.04] px-4 text-[26px] font-black tabular-nums text-white outline-none focus:border-emerald-400" />
                </div>
                <div className="mt-4 space-y-3">
                  <NiceSlider label={L('Horas de trabajo al día', 'Work hours per day')} value={a.workHoursPerDay} min={1} max={14} step={0.5}
                    onChange={v => set({ workHoursPerDay: v })} display={`${a.workHoursPerDay} h`} accent="#34d399" />
                  <NiceSlider label={L('Días trabajados al mes', 'Work days per month')} value={a.workDaysPerMonth} min={4} max={31} step={1}
                    onChange={v => set({ workDaysPerMonth: v })} display={`${a.workDaysPerMonth}`} accent="#34d399" />
                </div>
                <LiveCard icon={<Zap className="text-amber-300" />} label={L('Tu hora vale', 'Your hour is worth')} value={live.hourValue ? money(live.hourValue) : '—'} />
              </Question>
            )}

            {step === 'details' && !a.works && (
              <Question title={L('¿A qué dedicas tu tiempo?', 'What do you spend your time on?')}
                sub={L('Elige una o ambas.', 'Pick one or both.')}
                onNext={() => go('procrastination')} nextLabel={L('Continuar', 'Continue')} disabled={!detailsReady}>
                <div className="grid grid-cols-3 gap-2">
                  {([['study', L('Estudio', 'I study'), BookOpen], ['business', L('Emprendo', 'I build a business'), Rocket], ['both', L('Ambas', 'Both'), Sparkles]] as const).map(([k, label, Icon]) => {
                    const on = k === 'both' ? a.activities.length === 2 : a.activities.length === 1 && a.activities[0] === k;
                    return (
                      <motion.button key={k} type="button" whileTap={{ scale: 0.95 }}
                        onClick={() => set({ activities: k === 'both' ? ['study', 'business'] : [k as Activity] })}
                        className={`flex flex-col items-center gap-2 rounded-[20px] border-2 px-2 py-4 text-[13px] font-black ${on ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-white/55'}`}>
                        <Icon size={24} />{label}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-3">
                  {a.activities.includes('study') && (
                    <NiceSlider label={L('Horas de estudio al día', 'Study hours per day')} value={a.studyHoursPerDay} min={0.5} max={12} step={0.5}
                      onChange={v => set({ studyHoursPerDay: v })} display={`${a.studyHoursPerDay} h`} accent="#818cf8" />
                  )}
                  {a.activities.includes('business') && (
                    <NiceSlider label={L('Horas en tu emprendimiento al día', 'Hours on your business per day')} value={a.businessHoursPerDay} min={0.5} max={12} step={0.5}
                      onChange={v => set({ businessHoursPerDay: v })} display={`${a.businessHoursPerDay} h`} accent="#f472b6" />
                  )}
                </div>
                {a.activities.length > 0 && (
                  <LiveCard icon={<Target className="text-violet-300" />} label={L('Inviertes en tu futuro', 'You invest in your future')} value={`${formatHours(live.productiveHoursPerDay)}/${L('día', 'day')}`} />
                )}
              </Question>
            )}

            {step === 'procrastination' && (
              <Question title={L('¿Cuánto procrastinas al día?', 'How much do you procrastinate per day?')}
                sub={L('Redes sociales sin propósito, videojuegos, series, películas… Sé honesto, nadie más lo verá.', 'Aimless social media, games, series, movies… Be honest, no one else will see it.')}
                onNext={reveal} nextLabel={L('Revelar mi resultado', 'Reveal my result')} tone="gold">
                <div className="flex flex-wrap gap-2">
                  {([['social', L('Redes sociales', 'Social media'), Smartphone], ['games', L('Videojuegos', 'Video games'), Gamepad2], ['series', L('Series / pelis', 'Series / movies'), Clapperboard], ['other', L('Otros', 'Other'), LayoutGrid]] as const).map(([k, label, Icon]) => (
                    <Chip key={k} on={a.distractions.includes(k as Distraction)}
                      onClick={() => set({ distractions: a.distractions.includes(k as Distraction) ? a.distractions.filter(d => d !== k) : [...a.distractions, k as Distraction] })}>
                      <Icon size={16} />{label}
                    </Chip>
                  ))}
                </div>
                <div className="mt-4">
                  <NiceSlider label={L('Horas perdidas al día', 'Hours lost per day')} value={a.procrastinationHoursPerDay} min={0} max={10} step={0.5}
                    onChange={v => set({ procrastinationHoursPerDay: v })} display={formatHours(a.procrastinationHoursPerDay)} accent="#fb7185" />
                </div>
                <motion.div key={live.lostHoursPerYear} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
                  className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/[0.08] p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-200/70">{L('Lo que se va cada año', 'What leaves every year')}</div>
                  <div className="mt-1 text-[22px] font-black text-rose-100">
                    {live.lostHoursPerYear} h · {Math.round(live.lostHoursPerYear / 16)} {L('días despierto', 'waking days')} 😳
                  </div>
                  {live.lostMoneyPerDay != null && (
                    <div className="mt-0.5 text-[13px] font-semibold text-rose-200/70">≈ {money(live.lostMoneyPerDay)} {L('de tu tiempo, cada día', 'of your time, every day')}</div>
                  )}
                </motion.div>
              </Question>
            )}

            {step === 'analyzing' && <AnalyzingScreen lang={lang} onDone={() => go('results')} />}

            {step === 'results' && result && <Results lang={lang} result={result} money={money} reduce={reduce} onNext={() => go('features')} currency={a.currency} />}

            {step === 'features' && <Features lang={lang} result={result} money={money} onNext={() => go('plans')} />}

            {step === 'plans' && (
              <Plans lang={lang} result={result} money={money} isNative={isNative} weekly={weekly} monthly={monthly} annual={annual} onBuy={onBuy} onRestore={onRestore} currency={a.currency} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmExit && result && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="w-full max-w-sm rounded-[28px] border border-amber-200/20 bg-gradient-to-b from-[#1d1426] to-[#0b0911] p-6 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
              <motion.div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500"
                animate={reduce ? undefined : { rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 0.8, delay: 0.2 }}>
                <Hourglass size={30} className="text-black" />
              </motion.div>
              <h3 className="mt-4 text-[22px] font-black leading-tight">{L('¿Seguro que quieres irte?', 'Sure you want to leave?')}</h3>
              <p className="mt-2 text-[14.5px] font-medium leading-relaxed text-white/60">
                {L('Cada día sin Deluxe dejas ir ', 'Every day without Deluxe you let go of ')}
                <b className="text-rose-300">{result.moneyPerDay != null ? money(result.moneyPerDay) : formatHours(result.recoveredHoursPerDay)}</b>
                {L('. La oferta termina el 31 de diciembre.', '. The offer ends on December 31.')}
              </p>
              <div className="mt-5 space-y-2.5">
                <FunnelCTA tone="gold" onClick={() => { setConfirmExit(false); go('plans'); }}><Crown size={19} /> {L('Ver la oferta', 'See the offer')}</FunnelCTA>
                <button type="button" onClick={onClose} className="w-full py-2.5 text-[13.5px] font-bold text-white/40">{L('Salir de todos modos', 'Leave anyway')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const Question = ({ title, sub, children, onNext, nextLabel, disabled, tone }: {
  title: string; sub: string; children: React.ReactNode; onNext: () => void; nextLabel: string; disabled?: boolean; tone?: 'violet' | 'gold';
}) => (
  <>
    <div className="flex-1">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[28px] font-black leading-tight tracking-tight">{title}</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-2 mb-6 text-[14.5px] font-medium leading-relaxed text-white/55">{sub}</motion.p>
      {children}
    </div>
    <div className="mt-6"><FunnelCTA onClick={onNext} disabled={disabled} tone={tone}>{nextLabel}</FunnelCTA></div>
  </>
);

const LiveCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <motion.div layout className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-transparent p-4">
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06]">{icon}</span>
    <span className="flex-1 text-[13.5px] font-bold text-white/60">{label}</span>
    <motion.span key={value} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[22px] font-black tabular-nums text-white">{value}</motion.span>
  </motion.div>
);

const TimeOrb = ({ reduce }: { reduce: boolean }) => (
  <div className="relative grid h-[190px] w-[190px] place-items-center">
    <motion.div aria-hidden className="absolute inset-0 rounded-full"
      style={{ background: 'conic-gradient(from 0deg, #f59e0b, #ec4899, #8b5cf6, #06b6d4, #f59e0b)', WebkitMask: 'radial-gradient(circle, transparent 62%, black 63%)', mask: 'radial-gradient(circle, transparent 62%, black 63%)' }}
      animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
    <div className="absolute inset-[14px] rounded-full bg-[radial-gradient(circle_at_40%_35%,#2a1b55,#0b0a1c_70%)] shadow-[inset_0_0_40px_rgba(139,92,246,0.35)]" />
    {/* clock hands */}
    <motion.span aria-hidden className="absolute h-[54px] w-[4px] rounded-full bg-white" style={{ bottom: '50%', originY: 1, boxShadow: '0 0 12px rgba(255,255,255,0.7)' }}
      animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} />
    <motion.span aria-hidden className="absolute h-[36px] w-[5px] rounded-full bg-amber-300" style={{ bottom: '50%', originY: 1 }}
      animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }} />
    <span className="absolute h-3 w-3 rounded-full bg-white" />
    {/* floating gains */}
    {!reduce && ['+1h', '💰', '+XP', '⏳'].map((t, i) => (
      <motion.span key={t} aria-hidden className="absolute text-[13px] font-black text-amber-200"
        style={{ left: `${[8, 78, 12, 80][i]}%`, top: `${[18, 22, 78, 74][i]}%` }}
        animate={{ y: [0, -14, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.5 }}>{t}</motion.span>
    ))}
  </div>
);

const Results = ({ lang, result, money, reduce, onNext, currency }: { lang: FL; result: SavedValue['result']; money: (n: number | null | undefined) => string; reduce: boolean; onNext: () => void; currency: string }) => {
  const L = (es: string, en: string) => tr(lang, es, en);
  const works = result.moneyPerYear != null;
  const ringPct = Math.min(1, result.wakingMonthsIn10Years / 24);
  const rows: [string, string, string | null][] = [
    [L('Por día', 'Per day'), formatHours(result.recoveredHoursPerDay), works ? money(result.moneyPerDay) : null],
    [L('Por mes', 'Per month'), formatHours(result.hoursPerMonth), works ? money(result.moneyPerMonth) : null],
    [L('Por año', 'Per year'), `${result.hoursPerYear} h`, works ? money(result.moneyPerYear) : null],
    [L('En 10 años', 'In 10 years'), `${result.hoursPerYear * 10} h`, works ? money((result.moneyPerYear ?? 0) * 10) : null],
  ];
  return (
    <>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-amber-200/80">
        {L('Tu resultado', 'Your result')}
      </motion.p>
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-center text-[26px] font-black leading-tight">
        {L('Esto es lo que Lux Deluxe te devuelve', 'This is what Lux Deluxe gives back')}
      </motion.h2>

      {/* Life ring */}
      <div className="relative mx-auto mt-6 grid h-[210px] w-[210px] place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
          <motion.circle cx="60" cy="60" r="52" fill="none" stroke="url(#life-grad)" strokeWidth="9" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: ringPct }} transition={{ duration: reduce ? 0 : 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
          <defs>
            <linearGradient id="life-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient>
          </defs>
        </svg>
        <div className="text-center">
          <div className="text-[46px] font-black leading-none text-white">
            +<CountUp value={result.wakingMonthsIn10Years} format={n => n.toFixed(1)} delay={0.2} />
          </div>
          <div className="mt-1 text-[12.5px] font-bold leading-tight text-emerald-200/80">{L('meses de vida plena', 'months of full life')}<br />{L('en 10 años', 'in 10 years')}</div>
        </div>
      </div>

      {/* Hero number */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
        className="mt-4 rounded-[24px] border border-amber-300/25 bg-gradient-to-br from-amber-400/[0.12] via-orange-500/[0.06] to-transparent p-4 text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200/70">{works ? L('Dinero recuperado al año', 'Money recovered per year') : L('Horas recuperadas al año', 'Hours recovered per year')}</div>
        <div className="mt-1 text-[38px] font-black leading-none text-amber-100">
          {works
            ? <CountUp value={result.moneyPerYear ?? 0} format={n => money(n)} delay={0.5} />
            : <><CountUp value={result.hoursPerYear} format={n => String(Math.round(n))} delay={0.5} /> h</>}
        </div>
        <div className="mt-1.5 text-[12.5px] font-semibold text-white/50">≈ {result.wakingDaysPerYear} {L('días despierto cada año', 'waking days every year')}</div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-4 space-y-3">
        <FunnelCTA onClick={onNext} tone="gold"><Flame size={20} /> {L('¿Cómo lo consigo?', 'How do I get it?')}</FunnelCTA>
        <div className="flex justify-center"><LossTicker lang={lang} moneyPerDay={result.moneyPerDay} hoursPerDay={result.recoveredHoursPerDay} currency={currency} compact /></div>
      </motion.div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10">
        <div className={`grid ${works ? 'grid-cols-3' : 'grid-cols-2'} bg-white/[0.06] px-4 py-2 text-[10.5px] font-black uppercase tracking-[0.14em] text-white/45`}>
          <span>{L('Periodo', 'Period')}</span><span className="text-right">{L('Tiempo', 'Time')}</span>{works && <span className="text-right">{L('Dinero', 'Money')}</span>}
        </div>
        {rows.map(([p, t, m], i) => (
          <motion.div key={p} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.12 }}
            className={`grid ${works ? 'grid-cols-3' : 'grid-cols-2'} border-t border-white/[0.06] px-4 py-3 text-[14px] ${i === 3 ? 'bg-emerald-500/[0.07]' : ''}`}>
            <span className="font-bold text-white/70">{p}</span>
            <span className="text-right font-black tabular-nums text-white">{t}</span>
            {works && <span className="text-right font-black tabular-nums text-emerald-300">{m}</span>}
          </motion.div>
        ))}
      </div>

      {/* Before / after bars */}
      <div className="mt-4 space-y-2.5 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
        <Bar label={L('Hoy pierdes al día', 'Today you lose per day')} value={formatHours(result.recoveredHoursPerDay / RECOVERY_RATE)} pct={1} color="#fb7185" delay={1.2} />
        <Bar label={L('Con Deluxe recuperas', 'With Deluxe you recover')} value={formatHours(result.recoveredHoursPerDay)} pct={RECOVERY_RATE} color="#34d399" delay={1.4} />
      </div>

      <p className="mt-3 text-center text-[11px] leading-snug text-white/35">
        {L(`Estimación basada en tus respuestas, asumiendo que recuperas el ${Math.round(RECOVERY_RATE * 100)}% del tiempo que hoy pierdes (máx. 4 h/día). La vida plena se mide en horas despierto (16 h/día).`,
          `Estimate based on your answers, assuming you recover ${Math.round(RECOVERY_RATE * 100)}% of the time you lose today (max 4 h/day). Full life is measured in waking hours (16 h/day).`)}
      </p>

    </>
  );
};

const Bar = ({ label, value, pct, color, delay }: { label: string; value: string; pct: number; color: string; delay: number }) => (
  <div>
    <div className="flex justify-between text-[12.5px] font-bold"><span className="text-white/60">{label}</span><span style={{ color }}>{value}</span></div>
    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
      <motion.div className="h-full rounded-full" style={{ background: color, originX: 0 }} initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
    </div>
  </div>
);


const Features = ({ lang, result, money, onNext }: { lang: FL; result?: SavedValue['result']; money: (n: number | null | undefined) => string; onNext: () => void }) => {
  const L = (es: string, en: string) => tr(lang, es, en);
  return (
    <>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-300">{L('El arsenal de la élite', 'The elite arsenal')}</motion.p>
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-[28px] font-black leading-tight tracking-tight">
        {L('El 1% no espera motivación.', 'The top 1% does not wait for motivation.')}<br />
        <span className="bg-gradient-to-r from-violet-300 to-pink-300 bg-clip-text text-transparent">{L('Construye un sistema.', 'They build a system.')}</span>
      </motion.h2>
      {result && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-3 text-[14.5px] font-medium leading-relaxed text-white/60">
          {L('Imagina tu vida dentro de un año con ', 'Imagine your life a year from now with ')}
          <b className="text-white">{result.hoursPerYear} {L('horas extra', 'extra hours')}</b>
          {result.moneyPerYear != null && <>{L(' y ', ' and ')}<b className="text-emerald-300">{money(result.moneyPerYear)}</b></>}
          {L(' de vuelta. Esto es lo que lo hace posible:', ' back. This is what makes it possible:')}
        </motion.p>
      )}
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 20 }} className="mt-5">
        <FunnelCTA onClick={onNext} tone="gold"><Crown size={20} /> {L('Quiero ser élite', 'I want to be elite')}</FunnelCTA>
      </motion.div>
      <div className="mt-6 mb-1 flex items-center gap-3 text-[10.5px] font-black uppercase tracking-[0.2em] text-amber-200/60">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200/30" />{L('Tus beneficios', 'Your benefits')}<span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200/30" />
      </div>
      <div className="mt-3"><BenefitShowcase lang={lang} /></div>
      <div className="mt-6 mb-3 flex items-center gap-3 text-[10.5px] font-black uppercase tracking-[0.2em] text-amber-200/60">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200/30" />{L('Gratis vs Deluxe', 'Free vs Deluxe')}<span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200/30" />
      </div>
      <CompareTable lang={lang} />
    </>
  );
};

const perDay = (pkg: any, days: number) => {
  const p = Number(pkg?.product?.price);
  return Number.isFinite(p) && p > 0 ? p / days : null;
};

const Plans = ({ lang, result, money, isNative, weekly, monthly, annual, onBuy, onRestore, currency }: {
  lang: FL; result?: SavedValue['result']; money: (n: number | null | undefined) => string; isNative: boolean; weekly: any; monthly: any; annual: any; onBuy: (p: any) => void; onRestore: () => void; currency: string;
}) => {
  const L = (es: string, en: string) => tr(lang, es, en);
  const [showOthers, setShowOthers] = useState(false);
  const priceCur = annual?.product?.currencyCode || monthly?.product?.currencyCode || weekly?.product?.currencyCode;
  const fmt = (n: number | null) => (n == null ? null : formatMoney(n, priceCur || 'USD', lang));
  /** Post-offer price (twice the launch price), in the store's own currency. */
  const doubled = (pkg: any) => {
    const p = Number(pkg?.product?.price);
    return Number.isFinite(p) && p > 0 ? formatMoney(p * 2, pkg?.product?.currencyCode || priceCur || 'USD', lang) : null;
  };
  const mPrice = Number(monthly?.product?.price);
  const aPrice = Number(annual?.product?.price);
  const savePct = Number.isFinite(mPrice) && mPrice > 0 && Number.isFinite(aPrice) && aPrice > 0
    ? Math.round((1 - aPrice / (mPrice * 12)) * 100) : null;

  type PlanCard = { id: 'annual' | 'monthly' | 'weekly'; pkg: any; name: string; price?: string; per: string; day: string | null; after: string | null; badge?: string; note?: string };
  const main: PlanCard[] = [
    ...(annual || !monthly ? [{ id: 'annual' as const, pkg: annual, name: L('Plan anual', 'Annual plan'), price: annual?.product?.priceString, per: L('año', 'year'), day: fmt(perDay(annual, 365)), after: doubled(annual),
      badge: L('Mejor valor', 'Best value'), note: savePct && savePct > 0 ? L(`Ahorras ${savePct}% frente al mensual`, `Save ${savePct}% vs monthly`) : undefined }] : []),
    { id: 'monthly', pkg: monthly, name: L('Plan mensual', 'Monthly plan'), price: monthly?.product?.priceString, per: L('mes', 'month'), day: fmt(perDay(monthly, 30)), after: doubled(monthly),
      badge: annual ? undefined : L('Mejor valor', 'Best value') },
  ];
  const others: PlanCard[] = [
    { id: 'weekly', pkg: weekly, name: L('Plan semanal', 'Weekly plan'), price: weekly?.product?.priceString, per: L('semana', 'week'), day: fmt(perDay(weekly, 7)), after: doubled(weekly) },
  ];
  const [selected, setSelected] = useState<PlanCard['id']>(main[0].id);
  const chosen = [...main, ...others].find(p => p.id === selected) ?? main[0];

  const renderCard = (p: PlanCard, i: number) => {
    const on = p.id === selected;
    return (
      <motion.button key={p.id} type="button" onClick={() => setSelected(p.id)} aria-pressed={on}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} whileTap={{ scale: 0.98 }}
        className={`relative w-full overflow-hidden rounded-[24px] p-[2px] text-left ${on ? '' : 'bg-white/10'}`}>
        {on && (
          <motion.span aria-hidden className="absolute left-1/2 top-1/2 h-[300%] w-[300%] -ml-[150%] -mt-[150%]"
            style={{ pointerEvents: 'none', background: 'conic-gradient(from 0deg, #fde68a, #f97316, #ec4899, #fde68a 35%, rgba(253,230,138,0.2) 55%, #f59e0b 80%, #fde68a)' }}
            animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />
        )}
        <span className={`relative block rounded-[22px] p-4 ${on ? 'bg-gradient-to-br from-[#2a1a0a] to-[#1a0d1f]' : 'bg-[#0d0c18]'}`}>
          <span className="flex items-center gap-2">
            <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${on ? 'border-amber-300 bg-amber-300' : 'border-white/25'}`}>
              {on && <span className="h-2 w-2 rounded-full bg-black" />}
            </span>
            <span className="text-[13px] font-black uppercase tracking-[0.12em] text-white/70">{p.name}</span>
            {p.badge && <span className="ml-auto rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">{p.badge}</span>}
          </span>
          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[26px] font-black">{p.price ?? '…'} <span className="text-[14px] font-bold text-white/50">/ {p.per}</span></span>
            {p.after && <span className="text-[13px] font-bold text-white/35 line-through decoration-rose-400/70">{p.after}</span>}
          </span>
          {p.note && <span className="mt-0.5 block text-[12.5px] font-black text-emerald-300">{p.note}</span>}
          {p.day && <span className="mt-0.5 block text-[12.5px] font-semibold text-white/50">{L('Solo', 'Only')} {p.day} {L('al día', 'a day')}{result?.moneyPerDay ? ` · ${L('recuperas', 'you recover')} ${money(result.moneyPerDay)}/${L('día', 'day')}` : ''}</span>}
          {p.after && <span className="mt-0.5 block text-[11px] font-bold text-rose-200/70">{L('Desde el 1 de enero:', 'From January 1:')} {p.after} / {p.per}</span>}
        </span>
      </motion.button>
    );
  };

  const launchNotice = (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
      className="mt-5 flex items-center gap-2.5 rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-400/[0.14] to-rose-500/[0.08] px-3.5 py-2.5">
      <motion.span animate={{ rotate: [0, -12, 12, -6, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.5 }} className="text-[18px]">⚠️</motion.span>
      <p className="text-[12.5px] font-bold leading-snug text-amber-100">
        {L('Precio de lanzamiento. Después del 31 de diciembre los precios suben ', 'Launch price. After December 31 prices go up ')}
        <span className="font-black text-amber-300">{L('al doble', 'to double')}</span>.
      </p>
    </motion.div>
  );

  return (
    <>
      <CountdownBig lang={lang} />
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 text-center text-[28px] font-black leading-tight tracking-tight">
        {L('Activa Lux', 'Activate Lux')} <span className="bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent">Deluxe</span>
      </motion.h2>
      {result && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/70">{L('Ganas al mes', 'You gain per month')}</div>
            <div className="mt-0.5 text-[18px] font-black text-emerald-200">{result.moneyPerMonth != null ? money(result.moneyPerMonth) : formatHours(result.hoursPerMonth)}</div>
          </div>
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-200/60">{L('Sin Deluxe pierdes hoy', 'Without Deluxe, today')}</div>
            <div className="mt-0.5 text-[18px] font-black text-rose-200/90">−{result.moneyPerDay != null ? money(result.moneyPerDay) : formatHours(result.recoveredHoursPerDay)}</div>
          </div>
        </div>
      )}
      {result && <p className="mt-1.5 text-center text-[10px] font-semibold text-white/30">* {L('Valor referencial estimado', 'Estimated reference value')}</p>}

      {result && (
        <div className="mt-3 flex justify-center"><LossTicker lang={lang} moneyPerDay={result.moneyPerDay} hoursPerDay={result.recoveredHoursPerDay} currency={currency} compact /></div>
      )}

      {isNative ? (
        <div className="mt-4 space-y-3">
          {main.map((p, i) => renderCard(p, i))}
          <AnimatePresence initial={false}>
            {showOthers && others.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                {renderCard(p, i)}
              </motion.div>
            ))}
          </AnimatePresence>
          {!showOthers && (
            <button type="button" onClick={() => setShowOthers(true)} className="mx-auto block rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12.5px] font-bold text-white/55 active:scale-95">
              {L('Otros planes', 'Other plans')}
            </button>
          )}
          <FunnelCTA tone="gold" onClick={() => onBuy(chosen.pkg || chosen.id)}>
            <Crown size={18} /> {L('Desbloquear Deluxe', 'Unlock Deluxe')} · {chosen.name.replace(/^Plan /, '')}
          </FunnelCTA>
          <button type="button" onClick={onRestore} className="mx-auto block py-2 text-[12.5px] font-semibold text-white/40 underline">{L('Restaurar compras', 'Restore purchases')}</button>
          <p className="text-center text-[11px] leading-snug text-white/30">{L('Cancela cuando quieras desde Google Play.', 'Cancel anytime from Google Play.')}</p>
          {launchNotice}
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col items-center gap-3 rounded-[24px] border border-violet-400/30 bg-violet-500/10 p-5 text-center">
            <Smartphone size={30} className="text-violet-300" />
            <p className="text-[15px] font-semibold text-white">{L('Para activar Deluxe abre Lux en tu celular Android.', 'To activate Deluxe, open Lux on your Android phone.')}</p>
            <a href="https://play.google.com/store/apps/details?id=com.luxresilient.app" target="_blank" rel="noreferrer"
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 font-black text-white">{L('Descargar en Google Play', 'Get it on Google Play')}</a>
          </div>
          {launchNotice}
        </>
      )}
    </>
  );
};
