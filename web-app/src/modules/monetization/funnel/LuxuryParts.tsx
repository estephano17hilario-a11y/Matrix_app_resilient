// Luxury layer of the Deluxe funnel: aurora backdrop with gold dust, step light-sweep, flip
// digits, live "time slipping away" ticker (from the user's own numbers), the analysing
// interstitial and the currency chooser (home country / USD / any other).
// Motion is transform / opacity only (plus a short one-off clip-path on the analysing ring).

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Globe2, Search, X } from 'lucide-react';
import { allCurrencies, currencyName, getCountry, guessCountry, homeCurrency, matches } from '../../geo/countries';
import { Flag } from '../../geo/Flag';
import { formatHours } from '../valueCalc';
import { tr, type FL } from './FunnelParts';

export const LUX_CSS = `
@keyframes lux-dust { 0% { transform: translate3d(0, 0, 0) scale(0.6); opacity: 0 } 15% { opacity: 1 } 100% { transform: translate3d(var(--dx), -110vh, 0) scale(1); opacity: 0 } }
@keyframes lux-aurora { to { transform: rotate(360deg) } }
@keyframes lux-breathe { 0%,100% { transform: scale(0.96); opacity: 0.55 } 50% { transform: scale(1.04); opacity: 1 } }
.lux-dust { position: absolute; bottom: -10px; border-radius: 99px; background: radial-gradient(circle, #fff7d6, #f5c542 55%, transparent 70%); animation: lux-dust linear infinite; will-change: transform, opacity; }
.lux-aurora { animation: lux-aurora 28s linear infinite; will-change: transform; }
.lux-breathe { animation: lux-breathe 2.4s ease-in-out infinite; will-change: transform, opacity; }
@media (prefers-reduced-motion: reduce) { .lux-dust, .lux-aurora, .lux-breathe { animation: none !important; } }
`;

/** Slow aurora + rising gold dust behind the whole funnel. */
export const LuxuryBackdrop = memo(() => {
  const dust = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: `${(i * 53) % 100}%`, size: 2 + (i % 3) * 1.5, dur: 9 + (i % 5) * 2.5, delay: -(i * 1.37) % 12, dx: `${((i % 7) - 3) * 12}px`,
  })), []);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
      <div className="lux-aurora absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -ml-[80vmax] -mt-[80vmax] opacity-[0.22]"
        style={{ background: 'conic-gradient(from 0deg, #f59e0b, transparent 18%, #8b5cf6 32%, transparent 48%, #ec4899 62%, transparent 76%, #06b6d4 88%, #f59e0b)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 70% at 50% 40%, rgba(5,4,12,0.55), #030208 80%)' }} />
      {dust.map((d, i) => (
        <span key={i} className="lux-dust" style={{ left: d.left, width: d.size, height: d.size, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s`, ['--dx' as string]: d.dx }} />
      ))}
    </div>
  );
});
LuxuryBackdrop.displayName = 'LuxuryBackdrop';

/** A gold light band that sweeps across the screen whenever `trigger` changes. */
export const StepSweep = ({ trigger }: { trigger: string }) => {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <AnimatePresence>
      <motion.div key={trigger} aria-hidden className="absolute inset-y-0 z-30 w-[45%]"
        style={{ pointerEvents: 'none', background: 'linear-gradient(100deg, transparent, rgba(255,214,120,0.16) 45%, rgba(255,255,255,0.22) 50%, rgba(255,214,120,0.16) 55%, transparent)' }}
        initial={{ x: '-120%', skewX: -12 }} animate={{ x: '320%' }} exit={{ opacity: 0 }}
        transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }} />
    </AnimatePresence>
  );
};

/** Digit that flips like a split-flap board when it changes. */
export const FlipDigits = ({ value, className }: { value: string; className?: string }) => (
  <span className={`inline-flex ${className ?? ''}`} style={{ perspective: 300 }}>
    {value.split('').map((ch, i) => (
      <span key={i} className="relative inline-block overflow-hidden" style={{ minWidth: '0.62em', textAlign: 'center' }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={ch} className="inline-block"
            initial={{ rotateX: -90, y: '-40%', opacity: 0 }} animate={{ rotateX: 0, y: '0%', opacity: 1 }} exit={{ rotateX: 90, y: '40%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }} style={{ transformOrigin: '50% 50%' }}>
            {ch}
          </motion.span>
        </AnimatePresence>
      </span>
    ))}
  </span>
);

/**
 * Live ticker: what slips away while this screen is open, from the user's OWN result
 * (recoverable money or time per waking second). Honest urgency — no invented numbers.
 */
export const LossTicker = ({ lang, moneyPerDay, hoursPerDay, currency, compact }: {
  lang: FL; moneyPerDay: number | null; hoursPerDay: number; currency: string; compact?: boolean;
}) => {
  const start = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(id); }, []);
  const secs = (now - start.current) / 1000;
  const perWakingSecond = 1 / (16 * 3600);
  let text: string;
  if (moneyPerDay != null) {
    const amount = moneyPerDay * perWakingSecond * secs;
    try {
      text = new Intl.NumberFormat(lang, { style: 'currency', currency, minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(amount);
    } catch {
      text = `${currency} ${amount.toFixed(3)}`;
    }
  } else {
    text = `${(hoursPerDay * 3600 * perWakingSecond * secs).toFixed(1)} s`;
  }
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${compact ? 'text-[11px]' : 'text-[12.5px]'} font-bold text-rose-200/80`}>
      <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" /><span className="relative h-2 w-2 rounded-full bg-rose-400" /></span>
      <span>{tr(lang, 'Mientras lees esto se te escapan', 'While you read this you are losing')}</span>
      <span className="relative inline-grid">
        <motion.span key={text} className="font-black tabular-nums"
          initial={{ scale: 1.22, color: '#ffffff', textShadow: '0 0 14px rgba(251,113,133,1), 0 0 4px rgba(255,255,255,0.9)' }}
          animate={{ scale: 1, color: '#fda4af', textShadow: '0 0 0px rgba(251,113,133,0), 0 0 0px rgba(255,255,255,0)' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}>
          {text}
        </motion.span>
      </span>
      {moneyPerDay == null && <span className="text-rose-200/50">· {formatHours(hoursPerDay)}/{tr(lang, 'día', 'day')}</span>}
    </div>
  );
};

/** Dramatic "calculating" interstitial before the reveal (~2.4 s). */
export const AnalyzingScreen = ({ lang, onDone }: { lang: FL; onDone: () => void }) => {
  const reduce = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  const lines = [tr(lang, 'Valor de tu hora', 'Your hourly value'), tr(lang, 'Tiempo que se escapa', 'Time slipping away'), tr(lang, 'Proyección a 10 años', '10-year projection')];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 70);
    const end = setTimeout(() => done.current(), reduce ? 300 : 2500);
    return () => { clearInterval(id); clearTimeout(end); };
  }, [reduce]);
  const scramble = (tick * 7919) % 100000;
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative grid h-[200px] w-[200px] place-items-center">
        {[0, 1, 2].map(i => (
          <motion.span key={i} aria-hidden className="absolute rounded-full border-2"
            style={{ inset: i * 18, borderColor: ['#f5c542', '#ec4899', '#8b5cf6'][i], borderTopColor: 'transparent', borderLeftColor: i === 1 ? 'transparent' : undefined }}
            animate={reduce ? undefined : { rotate: i % 2 ? -360 : 360 }} transition={{ duration: 1.6 + i * 0.5, repeat: Infinity, ease: 'linear' }} />
        ))}
        <div className="lux-breathe absolute inset-[64px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,197,66,0.55), transparent 70%)' }} />
        <span className="relative font-mono text-[22px] font-black tabular-nums text-amber-100">{String(scramble).padStart(5, '0')}</span>
      </div>
      <h2 className="mt-6 text-[24px] font-black tracking-tight">{tr(lang, 'Calculando tu futuro…', 'Calculating your future…')}</h2>
      <div className="mt-5 w-full max-w-[280px] space-y-2.5 text-left">
        {lines.map((l, i) => (
          <motion.div key={l} className="flex items-center gap-3 text-[14px] font-bold"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.6 }}>
            <motion.span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.75 + i * 0.6, type: 'spring', stiffness: 600, damping: 15 }}>
              <Check size={14} strokeWidth={3.5} className="text-white" />
            </motion.span>
            <span className="text-white/80">{l}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/** Currency chooser: the user's country currency, US dollars, or any other (searchable). */
export const CurrencyChoice = ({ value, onChange, lang }: { value: string; onChange: (c: string) => void; lang: FL }) => {
  const home = homeCurrency();
  const country = getCountry() || guessCountry();
  const [open, setOpen] = useState(false);
  const isOther = value !== home && value !== 'USD';
  const pill = (active: boolean) => `relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[20px] border-2 px-2 py-3 text-center transition-colors ${active ? 'border-amber-300 bg-amber-400/[0.12]' : 'border-white/10 bg-white/[0.04]'}`;
  const Tick = () => (
    <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 18 }} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-amber-300 text-black shadow-lg">
      <Check size={14} strokeWidth={3.5} />
    </motion.span>
  );
  return (
    <>
      <div className="flex gap-2">
        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => onChange(home)} className={pill(value === home)}>
          {value === home && <Tick />}
          <Flag code={country} size={24} />
          <span className="text-[15px] font-black">{home}</span>
          <span className="w-full truncate text-[10.5px] font-semibold text-white/45">{currencyName(home, lang)}</span>
        </motion.button>
        {home !== 'USD' && (
          <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => onChange('USD')} className={pill(value === 'USD')}>
            {value === 'USD' && <Tick />}
            <Flag code="US" size={24} />
            <span className="text-[15px] font-black">USD</span>
            <span className="w-full truncate text-[10.5px] font-semibold text-white/45">{currencyName('USD', lang)}</span>
          </motion.button>
        )}
        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => setOpen(true)} className={pill(isOther)}>
          {isOther && <Tick />}
          <Globe2 size={24} className="text-violet-300" />
          <span className="text-[15px] font-black">{isOther ? value : tr(lang, 'Otros', 'Other')}</span>
          <span className="w-full truncate text-[10.5px] font-semibold text-white/45">{isOther ? currencyName(value, lang) : tr(lang, 'Busca cualquiera', 'Search any')}</span>
        </motion.button>
      </div>
      <AnimatePresence>
        {open && <CurrencySheet lang={lang} value={value} onPick={c => { onChange(c); setOpen(false); }} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
};

const CurrencySheet = ({ lang, value, onPick, onClose }: { lang: FL; value: string; onPick: (c: string) => void; onClose: () => void }) => {
  const [q, setQ] = useState('');
  const list = useMemo(() => allCurrencies().map(c => ({ c, n: currencyName(c, lang) })).sort((a, b) => a.n.localeCompare(b.n, lang)), [lang]);
  const hits = list.filter(x => matches(q, x.c, x.n));
  return (
    <motion.div className="fixed inset-0 z-[100050] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div className="relative flex max-h-[82vh] w-full max-w-xl flex-col rounded-t-[30px] border-t border-amber-200/20 bg-gradient-to-b from-[#17122a] to-[#08070f] px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 34 }}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" style={{ pointerEvents: 'none' }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={tr(lang, 'Busca una moneda o país', 'Search a currency')}
              className="h-12 w-full rounded-2xl border-2 border-white/10 bg-white/[0.05] pl-11 pr-3 text-[15.5px] font-semibold text-white outline-none focus:border-amber-300/70" />
          </div>
          <button type="button" onClick={onClose} aria-label={tr(lang, 'Cerrar', 'Close')} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.07] text-white/60"><X size={18} /></button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {hits.map(x => (
            <button key={x.c} type="button" onClick={() => onPick(x.c)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${value === x.c ? 'bg-amber-400/15 ring-1 ring-amber-300/60' : 'active:bg-white/[0.06]'}`}>
              <span className="w-12 shrink-0 rounded-lg bg-white/[0.07] py-1 text-center text-[12px] font-black tracking-wide text-amber-100">{x.c}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/85">{x.n}</span>
              {value === x.c && <Check size={18} className="text-amber-300" />}
            </button>
          ))}
          {!hits.length && <p className="py-8 text-center text-[13.5px] font-semibold text-white/40">{tr(lang, 'Sin resultados', 'No results')}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
};
