import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, Move3d, Vibrate, AudioLines, SunMoon, ListTodo, Flame, BatteryLow, Signpost } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { ImmersionPrefs, prefersReducedMotion, setImmersionPrefs, useImmersionPrefs } from './immersionPrefs';
import { arrive, haptic } from './engine';
import { playTravel } from './spatialSound';
import { useLifeReading } from './lifeStore';
import { lifeParams } from './lifeState';
import { MOOD_DEFAULTS } from './WorldWhisper';

const PHASE_DEFAULTS: Record<string, string> = {
  dawn: 'Amanecer', morning: 'Mañana', afternoon: 'Tarde', evening: 'Atardecer', night: 'Noche',
};

// Live readout of what the adaptive world is reading from your day.
const AdaptiveReadout = () => {
  const { t } = useTranslation();
  const reading = useLifeReading();

  if (!reading) {
    return (
      <div className="mt-3 rounded-2xl border border-white/[0.06] bg-black/25 px-3 py-2.5 text-[11px] text-white/40">
        {t('settings.immersion.reading', 'Leyendo tu día…')}
      </div>
    );
  }

  const [title, detail] = MOOD_DEFAULTS[reading.mood];
  const pct = Math.round(reading.progress * 100);
  const chips: { icon: any; label: string }[] = [
    { icon: SunMoon, label: t(`world.phase.${reading.phase}`, PHASE_DEFAULTS[reading.phase]) },
    { icon: ListTodo, label: t('settings.immersion.pending', '{{count}} pendientes', { count: reading.pending }) },
    { icon: Flame, label: t('settings.immersion.streak', 'Racha {{count}}', { count: reading.streak }) },
  ];
  if (reading.eco) chips.push({ icon: BatteryLow, label: t('settings.immersion.eco', 'Modo ahorro') });

  return (
    <div
      className="mt-3 rounded-2xl border border-white/[0.06] bg-black/30 p-3 relative overflow-hidden"
      style={{ ['--lux-w' as any]: reading.sky }}
    >
      <div className="absolute inset-x-4 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--lux-w) / 0.85), transparent)' }} />
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-32 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, rgb(var(--lux-w) / 0.5), transparent 70%)' }}
      />
      <div className="relative flex items-center gap-2.5">
        <span className="lux-whisper-orb" />
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{t('settings.immersion.now', 'Ahora mismo')}</div>
          <div className="text-[13px] font-bold text-white leading-tight">{t(`world.mood.${reading.mood}.title`, title)}</div>
        </div>
      </div>
      <p className="relative mt-1.5 text-[11px] leading-snug text-white/55">
        {t(`world.mood.${reading.mood}.detail`, detail, lifeParams(reading))}
      </p>
      <div className="relative mt-2.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, rgb(var(--lux-w) / 0.6), rgb(var(--lux-w)))', boxShadow: '0 0 8px rgb(var(--lux-w) / 0.7)' }}
        />
      </div>
      <div className="relative mt-2.5 flex flex-wrap gap-1.5">
        {chips.map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
            <Icon size={10} style={{ color: 'rgb(var(--lux-w))' }} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: 'rgb(var(--lux-w))' }}>{pct}%</span>
      </div>
    </div>
  );
};

const Switch = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
    className={cn(
      'w-11 h-6 rounded-full transition-all relative shadow-md border border-white/5 shrink-0',
      on ? 'bg-gradient-to-r from-cyan-500 to-indigo-500' : 'bg-black/50',
    )}
  >
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'absolute top-0.5 w-5 h-5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.3)]',
        on ? 'bg-white left-[20px]' : 'bg-white/40 left-0.5',
      )}
    />
  </button>
);

export const ImmersionSettingsCard = () => {
  const { t } = useTranslation();
  const prefs = useImmersionPrefs();
  const reduced = prefersReducedMotion();

  const toggle = (key: keyof ImmersionPrefs) => {
    const next = !prefs[key];
    setImmersionPrefs({ [key]: next });
    // Give immediate, tangible feedback for what was just switched on.
    if (!next) return;
    if (key === 'enabled') arrive();
    if (key === 'haptics') haptic([10, 40, 14]);
    if (key === 'sound') playTravel(1);
  };

  const options: { key: keyof ImmersionPrefs; icon: any; title: string; desc: string }[] = [
    {
      key: 'adaptive',
      icon: SunMoon,
      title: t('settings.immersion.adaptive', 'Mundo adaptativo'),
      desc: t('settings.immersion.adaptiveDesc', 'La luz, las estrellas y el tono cambian según tu día: tareas, hábitos, racha, recaídas, la hora y tu batería'),
    },
    {
      key: 'motion',
      icon: Move3d,
      title: t('settings.immersion.motion', 'Profundidad por movimiento'),
      desc: t('settings.immersion.motionDesc', 'El mundo y los cristales reaccionan al inclinar el teléfono'),
    },
    {
      key: 'areaTitles',
      icon: Signpost,
      title: t('settings.immersion.areaTitles', 'Nombre de cada sección'),
      desc: t('settings.immersion.areaTitlesDesc', 'Al viajar a una sección, su nombre aparece un instante sobre el dock'),
    },
    {
      key: 'haptics',
      icon: Vibrate,
      title: t('settings.immersion.haptics', 'Respuesta háptica'),
      desc: t('settings.immersion.hapticsDesc', 'Un pulso sutil al tocar y al viajar entre secciones'),
    },
    {
      key: 'sound',
      icon: AudioLines,
      title: t('settings.immersion.sound', 'Sonido espacial'),
      desc: t('settings.immersion.soundDesc', 'Ecos suaves que siguen la dirección del viaje'),
    },
  ];

  return (
    <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-4 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
      <div
        className="absolute -top-10 -right-10 w-56 h-56 opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.45) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)' }}
      />
      <div className="flex items-center justify-between relative z-10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
            <Orbit size={16} className="text-cyan-300" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight">{t('settings.immersion.title', 'Experiencia inmersiva')}</div>
            <div className="text-[11px] text-white/40 font-medium">
              {reduced
                ? t('settings.immersion.reduced', 'Tu sistema pide reducir el movimiento: el mundo queda en calma')
                : t('settings.immersion.desc', 'Un mundo vivo con profundidad, luz y viaje entre secciones')}
            </div>
          </div>
        </div>
        <Switch on={prefs.enabled} onToggle={() => toggle('enabled')} label={t('settings.immersion.title', 'Experiencia inmersiva')} />
      </div>

      <AnimatePresence initial={false}>
        {prefs.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 overflow-hidden"
          >
            <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-3">
              {options.map(({ key, icon: Icon, title, desc }) => (
                <div key={key}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                        <Icon size={13} className={prefs[key] ? 'text-cyan-300' : 'text-white/30'} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-white/90 leading-tight">{title}</div>
                        <div className="text-[10.5px] text-white/35 leading-snug">{desc}</div>
                      </div>
                    </div>
                    <Switch on={prefs[key]} onToggle={() => toggle(key)} label={title} />
                  </div>
                  {key === 'adaptive' && prefs.adaptive && <AdaptiveReadout />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
