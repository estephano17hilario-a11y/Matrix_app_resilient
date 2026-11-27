import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Coins, Flame, Ticket } from 'lucide-react';
import './shop.css';
import { TourLightbulb } from '@/components/TourLightbulb';

export const GoldCounter = ({ value }: { value: number }) => {
  const spring = useSpring(value, { stiffness: 50, damping: 20 });
  const displayValue = useTransform(spring, current => Math.round(current));
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
    const unsubscribe = displayValue.on('change', latest => setDisplay(latest));
    return () => unsubscribe();
  }, [value, spring, displayValue]);

  return <span>{display.toLocaleString()}</span>;
};

// Burnt orange and cream, the way a corner shop's canvas awning looks at night.
const AWNING = ['#c2410c', '#f5deb3'];
const STRIPES = 9;
const BULBS = 11;

/** Striped canvas awning with a scalloped edge, swaying a hair. */
const Awning = () => (
  <div className="shop-awning relative z-10 mx-1 drop-shadow-[0_10px_10px_rgba(0,0,0,0.55)]" aria-hidden>
    <div className="flex">
      {Array.from({ length: STRIPES }).map((_, i) => (
        <div key={i} className="flex-1" style={{ color: AWNING[i % 2] }}>
          <div className="h-3 bg-current" />
          <div className="h-[18px] rounded-b-full bg-current" />
        </div>
      ))}
    </div>
    {/* canvas shading + top rail */}
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[30px] rounded-b-[14px] bg-gradient-to-b from-white/25 via-transparent to-black/25" />
    <div className="absolute -top-1 inset-x-[-4px] h-2 rounded-full bg-gradient-to-b from-[#7a4d28] to-[#3b2410] shadow-[inset_0_1px_0_rgba(255,223,175,0.3)]" />
  </div>
);

/** A sagging string of bulbs over the awning. */
const StringLights = () => (
  <div className="pointer-events-none absolute inset-x-3 -top-4 z-20 flex h-6 items-start justify-between" aria-hidden>
    {Array.from({ length: BULBS }).map((_, i) => {
      const sag = Math.round(Math.sin((i / (BULBS - 1)) * Math.PI) * 9);
      return (
        <span
          key={i}
          className="shop-bulb block h-[7px] w-[7px] rounded-full"
          style={{
            marginTop: sag,
            background: i % 3 === 0 ? '#fde68a' : i % 3 === 1 ? '#fdba74' : '#fef3c7',
            boxShadow: '0 0 10px 2px rgba(253,224,71,0.7)',
            animationDelay: `${i * -0.35}s`,
          }}
        />
      );
    })}
  </div>
);

interface ShopFrontProps {
  gold: number;
  /** Cheapest price on the shelves (null = nothing for sale). */
  cheapest: number | null;
  vices: number;
  passesOwned: number;
  daysAtStake: number;
  spentThisWeek: number;
  control: { planned: number; falls: number; rank: string; rgb: string };
}

export const ShopFront = ({ gold, cheapest, vices, passesOwned, daysAtStake, spentThisWeek, control }: ShopFrontProps) => {
  const { t } = useTranslation();

  // The shopkeeper reads the room: nothing for sale, can't afford anything, holding passes… or just greets.
  const line = useMemo(() => {
    if (vices === 0) return t('store.keeper.empty', 'El mostrador está vacío. Crea un mal hábito y lo pongo en el estante.');
    if (cheapest !== null && gold < cheapest) {
      return t('store.keeper.broke', 'Hoy no te alcanza para nada… junta {{amount}} de oro más y vuelve.', { amount: (cheapest - gold).toLocaleString() });
    }
    if (passesOwned > 0) {
      return t('store.keeper.passes', 'Guardas {{count}} pase(s). Úsalos con intención, no por impulso.', { count: passesOwned });
    }
    const h = new Date().getHours();
    if (h < 6) return t('store.keeper.night', '¿A estas horas? Piénsalo bien antes de comprar.');
    if (h < 13) return t('store.keeper.morning', 'Buenos días. Lo que compres aquí, lo decides tú.');
    if (h < 20) return t('store.keeper.afternoon', 'Pasa, mira con calma. Aquí nada se cae: se compra.');
    return t('store.keeper.evening', 'Buenas noches. Elige con la cabeza fría.');
  }, [t, vices, cheapest, gold, passesOwned]);

  const stats = [
    { icon: Coins, label: t('store.vault.week', 'Gasto 7d'), value: spentThisWeek.toLocaleString(), tone: 'text-amber-300' },
    { icon: Ticket, label: t('store.vault.passes', 'Pases'), value: passesOwned, tone: 'text-sky-300' },
    { icon: Flame, label: t('store.vault.atStake', 'En juego'), value: daysAtStake, tone: 'text-orange-300' },
  ];

  return (
    <div data-tour="store-header" className="relative mb-5 pt-3">
      <StringLights />
      <Awning />

      {/* shop window */}
      <div
        className="relative -mt-4 overflow-hidden rounded-b-[28px] border border-t-0 border-amber-300/15 px-4 pb-4 pt-7"
        style={{ background: 'linear-gradient(170deg, rgba(120,66,24,0.34) 0%, rgba(28,20,15,0.96) 40%, rgba(11,9,8,0.98) 100%)', boxShadow: '0 26px 50px -30px rgba(245,158,11,0.55), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.22), transparent 70%)' }} />

        {/* sign + open */}
        <div className="relative flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[20px] font-black leading-none tracking-tight text-amber-100">{t('store.shop.name', 'El Mercado')}</div>
            <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-amber-300/60">{t('store.shop.tagline', 'Vicios con conciencia')}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <TourLightbulb tourId="store" />
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.18em] text-emerald-300">
            <span className="shop-open-dot h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            {t('store.shop.open', 'Abierto')}
          </span>
          </div>
        </div>

        {/* shopkeeper */}
        <div className="relative mt-3.5 flex items-end gap-2.5">
          <div className="shop-bob flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-gradient-to-br from-amber-500/25 to-amber-900/30 text-[22px] shadow-[0_6px_16px_-6px_rgba(245,158,11,0.6)]" aria-hidden>
            🦉
          </div>
          <div className="relative min-w-0 flex-1 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.06] px-3 py-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={line}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[12px] font-medium leading-snug text-amber-50/85"
              >
                {line}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* purse */}
        <div className="relative mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/15 bg-black/30 px-3.5 py-3">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-[9.5px] font-black uppercase tracking-[0.2em] text-amber-300/70">{t('store.vault.kicker', 'Tu monedero')}</div>
            <div className="mt-1 flex items-center gap-2">
              <Coins className="shop-coin shrink-0 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" size={24} fill="currentColor" />
              <span className="text-[28px] font-black leading-none tracking-tight text-white tabular-nums"><GoldCounter value={gold} /></span>
            </div>
          </div>

          {/* self-control rank */}
          <div
            className="flex shrink-0 flex-col items-center gap-0.5"
            title={t('store.vault.controlLine', '{{planned}} plan. · {{falls}} caídas', { planned: control.planned, falls: control.falls })}
          >
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-[4px] rotate-45 rounded-[8px] border-2" style={{ borderColor: `rgb(${control.rgb})`, boxShadow: `0 0 14px rgb(${control.rgb} / 0.55), inset 0 0 8px rgb(${control.rgb} / 0.3)` }} />
              <span className="relative text-[16px] font-black" style={{ color: `rgb(${control.rgb})`, textShadow: `0 0 12px rgb(${control.rgb} / 0.8)` }}>{control.rank}</span>
            </div>
            <div className="whitespace-nowrap text-[8px] font-black uppercase tracking-[0.12em] text-white/45">{t('store.vault.control', 'Autocontrol')}</div>
          </div>
        </div>

        <div className="relative mt-2 grid grid-cols-3 gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-white/[0.05] bg-black/25 px-2.5 py-2">
              <div className="truncate text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/35">{s.label}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[15px] font-black tabular-nums text-white">
                <s.icon size={12} className={s.tone} /> {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
