import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Ban, Coins, Minus, Plus, Sparkles, Ticket, X } from 'lucide-react';
import type { BadHabit, ViceOffer } from '@/types';
import { defaultOffer, offerOf, viceRarity } from './viceMarket';
import { RarityTag } from './ViceCard';

interface Props {
  habit: BadHabit | null;
  rgb: string;
  onSave: (offer: ViceOffer) => void;
  onClose: () => void;
}

const Stepper = ({ value, onChange, step, min, max, suffix }: { value: number; onChange: (v: number) => void; step: number; min: number; max: number; suffix?: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70">
      <Minus size={14} />
    </button>
    <div className="min-w-[84px] text-center text-[18px] font-black text-white tabular-nums flex items-center justify-center gap-1">
      {value.toLocaleString()} {suffix}
    </div>
    <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70">
      <Plus size={14} />
    </button>
  </div>
);

export const OfferConfigSheet = ({ habit, rgb, onSave, onClose }: Props) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ViceOffer | null>(null);

  useEffect(() => { setDraft(habit ? offerOf(habit) : null); }, [habit]);

  if (typeof document === 'undefined') return null;

  const suggested = habit ? defaultOffer(habit).passPrice : 0;

  const modes: { id: ViceOffer['mode']; icon: any; label: string; desc: string }[] = [
    { id: 'OFF', icon: Ban, label: t('store.offer.off', 'No se vende'), desc: t('store.offer.offDesc', 'No aparece en el mercado') },
    { id: 'PASS', icon: Ticket, label: t('store.offer.pass', 'Pase único'), desc: t('store.offer.passDesc', 'Cada indulgencia se compra aparte') },
  ];

  return createPortal(
    <AnimatePresence>
      {habit && draft && (
        <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <motion.div className="absolute inset-0 bg-black/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-[28px] border border-white/[0.08] bg-[#0e0e13] p-6"
          >
            <button type="button" onClick={onClose} aria-label="close" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-white/50">
              <X size={16} />
            </button>
            <div className="text-[10px] font-black uppercase tracking-[0.26em]" style={{ color: `rgb(${rgb})` }}>
              {t('store.offer.kicker', 'Oferta en el mercado')}
            </div>
            <div className="mt-1 text-[20px] font-black text-white tracking-tight">{habit.title}</div>
            <RarityTag rarity={viceRarity(habit)} className="mt-1" />
            <p className="mt-1 text-[12px] text-white/45 leading-snug">
              {t('store.offer.lead', 'Decide cómo se vende este vicio. Lo sugerido sale de su modo e impacto.')}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {modes.map(({ id, icon: Icon, label, desc }) => {
                const on = draft.mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDraft(d => d && { ...d, mode: id })}
                    className="flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors"
                    style={{
                      borderColor: on ? `rgb(${rgb} / 0.55)` : 'rgba(255,255,255,0.07)',
                      background: on ? `rgb(${rgb} / 0.12)` : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: on ? `rgb(${rgb} / 0.22)` : 'rgba(255,255,255,0.05)', color: on ? `rgb(${rgb})` : 'rgba(255,255,255,0.4)' }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-white">{label}</div>
                      <div className="text-[11px] text-white/40">{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {draft.mode === 'PASS' && (
              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/30 p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{t('store.offer.passPrice', 'Precio por pase')}</div>
                <div className="mt-3 flex justify-center">
                  <Stepper value={draft.passPrice} step={10} min={10} max={20000} onChange={v => setDraft(d => d && { ...d, passPrice: v })} suffix={<Coins size={15} className="text-amber-400" fill="currentColor" />} />
                </div>
                {draft.passPrice !== suggested && (
                  <button type="button" onClick={() => setDraft(d => d && { ...d, passPrice: suggested })} className="mt-2 mx-auto flex items-center gap-1 text-[11px] font-semibold" style={{ color: `rgb(${rgb})` }}>
                    <Sparkles size={11} /> {t('store.offer.useSuggested', 'Usar sugerido: {{price}}', { price: suggested.toLocaleString() })}
                  </button>
                )}
                <p className="mt-3 text-[11px] text-white/35 text-center">{t('store.offer.inflationNote', 'Cada pase comprado en la misma semana sube un 25%.')}</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setDraft(defaultOffer(habit))} className="rounded-2xl py-3 text-[12px] font-bold text-white/60 bg-white/[0.04] border border-white/[0.07]">
                {t('store.offer.reset', 'Sugerido')}
              </button>
              <button
                type="button"
                onClick={() => { onSave(draft); onClose(); }}
                className="rounded-2xl py-3 text-[12px] font-black uppercase tracking-[0.12em] text-black"
                style={{ background: `rgb(${rgb})` }}
              >
                {t('store.offer.save', 'Guardar')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
