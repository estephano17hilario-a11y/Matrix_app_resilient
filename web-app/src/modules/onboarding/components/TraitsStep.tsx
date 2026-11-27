import { motion } from 'framer-motion';
import { Check, Lock, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TRAITS_LIST } from '../../dashboard/constants';

type Trait = (typeof TRAITS_LIST)[number];

interface TraitsStepProps {
  selected: string[];
  lockedIds: string[];
  min: number;
  max: number;
  onToggle: (id: string) => void;
}

/**
 * Traits as a build: six slots (2 included + up to 4 of yours) that fill with the
 * colour of every trait you tap, and big tappable cards that say in a few words
 * what each trait trains.
 */
export function TraitsStep({ selected, lockedIds, min, max, onToggle }: TraitsStepProps) {
  const { t } = useTranslation();
  const byId = (id: string) => TRAITS_LIST.find(x => x.id === id) as Trait;
  const picked = selected.filter(id => !lockedIds.includes(id));
  const full = picked.length >= max;

  const slots: Array<{ key: string; trait?: Trait; locked?: boolean; optional?: boolean }> = [
    ...lockedIds.map(id => ({ key: `l-${id}`, trait: byId(id), locked: true })),
    ...Array.from({ length: max }, (_, i) => ({
      key: picked[i] ? `p-${picked[i]}` : `e-${i}`,
      trait: picked[i] ? byId(picked[i]) : undefined,
      optional: i >= min,
    })),
  ];

  return (
    <div className="pt-1">
      {/* The matrix being built */}
      <div className="mb-4 flex items-center justify-between gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] px-3 py-3">
        {slots.map(s => {
          const Icon = (s.trait?.icon || Sparkles) as any;
          return (
            <div key={s.key} className="relative flex min-w-0 flex-1 justify-center">
              {s.trait ? (
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                  className="relative grid aspect-square w-full max-w-[48px] place-items-center rounded-2xl"
                  style={{ background: s.trait.color, boxShadow: `0 6px 16px -6px ${s.trait.color}` }}
                >
                  <Icon className="h-[46%] w-[46%] text-white" strokeWidth={2.4} />
                  {s.locked && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/80 ring-1 ring-white/20">
                      <Lock className="h-2.5 w-2.5 text-white/80" strokeWidth={3} />
                    </span>
                  )}
                </motion.div>
              ) : (
                <div
                  className={`grid aspect-square w-full max-w-[48px] place-items-center rounded-2xl border-2 border-dashed ${
                    s.optional ? 'border-white/10 text-white/15' : 'border-white/30 text-white/40'
                  }`}
                >
                  <Plus className="h-[40%] w-[40%]" strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-2.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/40">
          {t('onboarding.flow.traits.pick', 'Elige 3 o 4')}
        </span>
        <span className={`text-[12px] font-black tabular-nums ${picked.length >= min ? 'text-emerald-300' : 'text-white/55'}`}>
          {picked.length} / {max}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TRAITS_LIST.filter(x => !lockedIds.includes(x.id)).map(trait => {
          const on = selected.includes(trait.id);
          const off = full && !on;
          const Icon = (trait.icon || Sparkles) as any;
          return (
            <button
              key={trait.id}
              type="button"
              aria-pressed={on}
              onClick={() => { if (!off) onToggle(trait.id); }}
              className={`relative flex min-h-[92px] touch-manipulation flex-col items-start gap-1.5 rounded-[20px] border-2 p-3 text-left transition-colors duration-150 ${off ? 'opacity-35' : ''}`}
              style={{
                borderColor: on ? trait.color : 'rgba(255,255,255,0.08)',
                background: on ? `${trait.color}22` : 'rgba(255,255,255,0.035)',
              }}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-xl transition-colors duration-150"
                style={{ background: on ? trait.color : `${trait.color}22`, color: on ? '#fff' : trait.color }}
              >
                <Icon size={19} strokeWidth={2.3} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold leading-tight text-white">{t(trait.label)}</span>
                <span className="mt-0.5 line-clamp-2 block text-[11.5px] font-medium leading-snug text-white/50">
                  {t(`onboarding.flow.traitDesc.${trait.id}`, trait.desc)}
                </span>
              </span>
              {on && (
                <span
                  className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full"
                  style={{ background: trait.color }}
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={4} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
