import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Flame, Star, Swords, Trophy } from 'lucide-react';
import { LuxMascot, type MascotMood } from '../components/LuxMascot';
import { ChunkyButton, GoogleIcon, SpeechBubble } from '../components/AuthUI';

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, type: 'spring' as const, stiffness: 260, damping: 24 },
});

const ORBIT = [
  { Icon: Flame, pos: 'left-[2%] top-[14%]', tone: 'text-orange-300 bg-orange-500/15 border-orange-400/30', delay: 0.35, bob: '0s' },
  { Icon: Trophy, pos: 'right-[0%] top-[6%]', tone: 'text-amber-200 bg-amber-400/15 border-amber-300/30', delay: 0.45, bob: '-1.1s' },
  { Icon: CheckCircle2, pos: 'left-[6%] bottom-[8%]', tone: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30', delay: 0.55, bob: '-2s' },
  { Icon: Star, pos: 'right-[4%] bottom-[14%]', tone: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30', delay: 0.65, bob: '-0.6s' },
];

interface WelcomeViewProps {
  onStart: () => void;
  onLogin: () => void;
  onGoogle: () => void;
  googleLoading: boolean;
}

export const WelcomeView = ({ onStart, onLogin, onGoogle, googleLoading }: WelcomeViewProps) => {
  const { t } = useTranslation();
  const [mood, setMood] = useState<MascotMood>('excited');
  const [poke, setPoke] = useState(-1);
  const timer = useRef<number>();

  useEffect(() => {
    timer.current = window.setTimeout(() => setMood('happy'), 1700);
    return () => window.clearTimeout(timer.current);
  }, []);

  const pokes = [t('auth.welcome.poke1'), t('auth.welcome.poke2'), t('auth.welcome.poke3')];
  const onPoke = () => {
    setPoke(p => (p + 1) % pokes.length);
    setMood('excited');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMood('happy'), 1400);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 flex flex-col items-center justify-center pt-2">
        {/* Speech bubble */}
        <div className="h-[58px] flex items-end">
          <motion.div {...rise(0.25)}>
            <SpeechBubble id={`poke-${poke}`} tail="bottom" text={poke < 0 ? t('auth.welcome.hello') : pokes[poke]} />
          </motion.div>
        </div>

        {/* Mascot + orbiting chips */}
        <div className="relative w-[270px] h-[214px] mt-3">
          {ORBIT.map(({ Icon, pos, tone, delay, bob }, i) => (
            <motion.div
              key={i}
              className={`absolute ${pos}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay, type: 'spring', stiffness: 420, damping: 16 }}
            >
              <div className={`auth-bob grid place-items-center w-11 h-11 rounded-2xl border-2 ${tone}`}
                style={{ animationDelay: bob }}>
                <Icon className="w-5 h-5" strokeWidth={2.4} />
              </div>
            </motion.div>
          ))}
          <div className="absolute inset-0 grid place-items-center">
            <motion.button
              type="button"
              onClick={onPoke}
              aria-label="Lux"
              className="rounded-full outline-none bg-transparent touch-manipulation"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.05 }}
            >
              <LuxMascot mood={mood} size={168} />
            </motion.button>
          </div>
        </div>

        <motion.h1 {...rise(0.2)} className="mt-5 text-center text-[32px] leading-[1.08] font-black tracking-tight">
          {t('auth.welcome.title')}
        </motion.h1>
        <motion.p {...rise(0.28)} className="mt-2.5 text-center text-[15.5px] font-medium text-white/55 max-w-[320px]">
          {t('auth.welcome.subtitle')}
        </motion.p>

        <motion.div {...rise(0.36)} className="w-full mt-6">
          <FeatureCarousel />
        </motion.div>
      </div>

      <div className="space-y-3.5 pt-6">
        <motion.div {...rise(0.44)}>
          <ChunkyButton onClick={onStart} shine>{t('auth.welcome.start')}</ChunkyButton>
        </motion.div>
        <motion.div {...rise(0.5)}>
          <ChunkyButton variant="secondary" onClick={onLogin}>{t('auth.welcome.haveAccount')}</ChunkyButton>
        </motion.div>
        <motion.div {...rise(0.56)}>
          <ChunkyButton variant="google" size="md" onClick={onGoogle} loading={googleLoading} icon={<GoogleIcon />}>
            <span className="normal-case tracking-normal text-[15px]">{t('auth.continueGoogle')}</span>
          </ChunkyButton>
        </motion.div>
      </div>
    </div>
  );
};

// ─── "What is Lux" carousel ─────────────────────────────────────────────────

const SLIDES = [
  { key: 'habits', Icon: Flame, grad: 'from-orange-400 to-rose-500', badge: '+1' },
  { key: 'rank', Icon: Trophy, grad: 'from-amber-300 to-orange-500', badge: 'XP' },
  { key: 'friends', Icon: Swords, grad: 'from-violet-400 to-fuchsia-500', badge: 'VS' },
] as const;

const FeatureCarousel = () => {
  const { t } = useTranslation();
  const [[index, dir], setState] = useState<[number, number]>([0, 1]);
  const go = (next: number, d: number) => setState([(next + SLIDES.length) % SLIDES.length, d]);

  useEffect(() => {
    const id = window.setTimeout(() => go(index + 1, 1), 4200);
    return () => window.clearTimeout(id);
  }, [index]);

  const s = SLIDES[index];
  return (
    <div className="w-full">
      <div className="relative h-[88px]">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={s.key}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 70, opacity: 0, scale: 0.96 }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (d: number) => ({ x: d * -70, opacity: 0, scale: 0.96 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40 || info.velocity.x < -300) go(index + 1, 1);
              else if (info.offset.x > 40 || info.velocity.x > 300) go(index - 1, -1);
            }}
            className="absolute inset-0 flex items-center gap-4 rounded-[22px] border-2 border-white/[0.08] bg-white/[0.045] px-4 cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <div className="relative shrink-0">
              <motion.div
                initial={{ scale: 0.4, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.08 }}
                className={`grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br ${s.grad} shadow-[inset_0_-4px_0_rgba(0,0,0,0.18)]`}
              >
                <s.Icon className="w-7 h-7 text-white" strokeWidth={2.4} />
              </motion.div>
              <span className="auth-pop-up absolute -top-2 -right-2 rounded-full bg-white px-1.5 py-[1px] text-[10px] font-black text-slate-800">
                {s.badge}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[15.5px] font-extrabold leading-tight">{t(`auth.welcome.slides.${s.key}.title`)}</div>
              <div className="mt-0.5 text-[13px] font-medium text-white/55 leading-snug">{t(`auth.welcome.slides.${s.key}.desc`)}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {SLIDES.map((sl, i) => (
          <button key={sl.key} type="button" aria-label={`${i + 1}`} onClick={() => go(i, i > index ? 1 : -1)}
            className="relative h-2.5 w-2.5 rounded-full bg-white/15 p-0 touch-manipulation">
            {i === index && (
              <motion.span className="absolute -inset-y-0 -left-1 -right-1 rounded-full bg-violet-300"
                initial={{ scaleX: 0.3, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
