import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Coins, FileSignature, Percent, ScrollText, Ticket, X } from 'lucide-react';
import { DynamicIcon } from '@/components/DynamicIcon';
import { pulseWorld } from '@/immersion/engine';
import { getImmersionPrefs } from '@/immersion/immersionPrefs';
import { playCoins, playSeal } from '@/immersion/spatialSound';
import type { BadHabit, ViceLedgerEntry } from '@/types';
import { HoldToConfirm } from './HoldToConfirm';
import { receiptCode, streakAtStake, viceRarity } from './viceMarket';
import { RarityTag } from './ViceCard';

type Stage = 'contract' | 'sealing' | 'receipt' | 'used';

interface PurchaseRitualProps {
  habit: BadHabit | null;
  rgb: string;
  price: number;
  /** Price before the deal-of-the-day discount. */
  fullPrice: number;
  inflation: number;
  deal: boolean;
  gold: number;
  onBuy: () => ViceLedgerEntry | null;
  onUseNow: () => boolean;
  onOpenLedger: () => void;
  onClose: () => void;
}

const COINS = 7;

export const PurchaseRitual = ({ habit, rgb, price: livePrice, fullPrice: liveFull, inflation: liveInflation, deal: liveDeal, gold, onBuy, onUseNow, onOpenLedger, onClose }: PurchaseRitualProps) => {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<Stage>('contract');
  const [receipt, setReceipt] = useState<ViceLedgerEntry | null>(null);
  // The terms are frozen when the contract opens: once signed, the live quote
  // already shows the *next* (inflated) price, but this contract was for this one.
  const [terms, setTerms] = useState({ gold, price: livePrice, full: liveFull, inflation: liveInflation, deal: liveDeal });
  const { gold: openingGold, price, full, inflation, deal } = terms;

  useEffect(() => {
    if (habit) { setStage('contract'); setReceipt(null); setTerms({ gold, price: livePrice, full: liveFull, inflation: liveInflation, deal: liveDeal }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habit?.id]);

  if (typeof document === 'undefined') return null;

  const stake = habit ? streakAtStake(habit) : 0;
  const rarity = habit ? viceRarity(habit) : null;
  const missing = Math.max(0, price - openingGold);
  const sound = getImmersionPrefs().sound;

  const sign = () => {
    const entry = onBuy();
    if (!entry) return;
    setReceipt(entry);
    setStage('sealing');
    if (sound) playCoins(5);
    window.setTimeout(() => {
      if (sound) playSeal();
      pulseWorld(window.innerWidth / 2, window.innerHeight * 0.42, `rgb(${rgb.split(' ').join(',')})`);
    }, 620);
    window.setTimeout(() => setStage('receipt'), 1500);
  };

  const useNow = () => {
    if (onUseNow()) setStage('used');
  };

  const clauses = habit ? [
    t('store.ritual.p1', 'Te concede 1 indulgencia de «{{title}}», cuando tú lo decidas.', { title: habit.title }),
    stake > 0 ? t('store.ritual.streak', 'Tu racha de {{count}} días se mantiene.', { count: stake }) : t('store.ritual.noReset', 'Tu progreso no se reinicia.'),
    t('store.ritual.noDamage', 'Sin daño de vida ni de XP.'),
    t('store.ritual.ledger', 'Queda escrita en tu registro de compras.'),
  ] : [];

  const when = receipt ? new Date(receipt.createdAt) : new Date();
  const dateLabel = when.toLocaleString(i18n.language?.startsWith('es') ? 'es' : 'en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return createPortal(
    <AnimatePresence>
      {habit && (
        <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => stage !== 'sealing' && onClose()}
          />

          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar rounded-[30px] border"
            style={{
              borderColor: `rgb(${rgb} / 0.3)`,
              background: `linear-gradient(170deg, rgb(${rgb} / 0.14) 0%, #0d0d12 34%, #08080b 100%)`,
              boxShadow: `0 30px 80px -30px rgb(${rgb} / 0.6)`,
            }}
          >
            <div className="absolute inset-x-10 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, rgb(${rgb}), transparent)` }} />
            {stage !== 'sealing' && (
              <button type="button" onClick={onClose} aria-label="close" className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-white/50">
                <X size={16} />
              </button>
            )}

            <AnimatePresence mode="wait">
              {(stage === 'contract' || stage === 'sealing') && (
                <motion.div key="contract" exit={{ opacity: 0, y: -10 }} className="relative p-6 pt-7">
                  <div className="flex items-center gap-2 pr-10 text-[10px] font-black uppercase tracking-[0.24em] whitespace-nowrap" style={{ color: `rgb(${rgb})` }}>
                    <FileSignature size={13} /> {t('store.ritual.contract', 'Contrato de indulgencia')}
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-[20px] flex items-center justify-center border shrink-0"
                      style={{ background: `rgb(${rgb} / 0.18)`, borderColor: `rgb(${rgb} / 0.4)`, color: `rgb(${rgb})`, boxShadow: `0 0 30px rgb(${rgb} / 0.35)` }}
                    >
                      <DynamicIcon icon={habit.iconName || 'Skull'} size={30} fallback="⛓" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[24px] font-black text-white tracking-tight leading-tight">{habit.title}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {rarity && <RarityTag rarity={rarity} />}
                        {deal && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-black">
                            <Percent size={9} strokeWidth={3} /> {t('store.deal.title', 'Oferta del día')}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-white/45 mt-1">{t('store.ritual.subtitle', 'Una decisión consciente, no una caída.')}</div>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5">
                    {clauses.map((c, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 + i * 0.07 }}
                        className="flex items-start gap-2.5 text-[13px] leading-snug text-white/75"
                      >
                        <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: `rgb(${rgb} / 0.2)` }}>
                          <Check size={10} style={{ color: `rgb(${rgb})` }} strokeWidth={3} />
                        </span>
                        {c}
                      </motion.li>
                    ))}
                  </ul>

                  {/* The cost, as a ledger line */}
                  <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/35 p-4">
                    <div className="flex items-center justify-between text-[12px] text-white/45">
                      <span>{t('store.ritual.balance', 'Tu bóveda')}</span>
                      <span className="tabular-nums font-semibold text-white/70">{openingGold.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[12px] text-white/45">
                      <span className="flex items-center gap-1.5">
                        {t('store.ritual.price', 'Precio')}
                        {inflation > 0 && (
                          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-300">
                            +{Math.round(inflation * 100)}%
                          </span>
                        )}
                        {deal && (
                          <span className="rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-200">−30%</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 tabular-nums font-black text-amber-300">
                        {deal && <span className="text-[11px] font-bold text-white/30 line-through">{full.toLocaleString()}</span>}
                        −{price.toLocaleString()} <Coins size={12} fill="currentColor" />
                      </span>
                    </div>
                    <div className="my-3 h-px bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.15)_0_6px,transparent_6px_10px)]" />
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-white/60">{t('store.ritual.after', 'Queda')}</span>
                      <span className={`text-[20px] font-black tabular-nums ${missing > 0 ? 'text-rose-400' : 'text-white'}`}>
                        {(openingGold - price).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <HoldToConfirm
                      accent={rgb}
                      disabled={missing > 0 || stage === 'sealing'}
                      label={t('store.ritual.hold', 'Mantén para firmar')}
                      holdingLabel={t('store.ritual.holding', 'Firmando…')}
                      disabledLabel={missing > 0 ? t('store.ritual.missing', 'Te faltan {{count}} de oro', { count: missing }) : t('store.ritual.signed', 'Firmado')}
                      onComplete={sign}
                    />
                    <p className="mt-2.5 text-center text-[10.5px] text-white/30">
                      {t('store.ritual.holdHint', 'Suelta antes de tiempo para cancelar.')}
                    </p>
                  </div>

                  {/* Sealing: coins pour in and the seal comes down */}
                  <AnimatePresence>
                    {stage === 'sealing' && (
                      <motion.div className="absolute inset-0 z-10 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="absolute inset-0 bg-black/55 rounded-[30px]" />
                        {Array.from({ length: COINS }).map((_, i) => (
                          <motion.span
                            key={i}
                            className="absolute w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 60%, #b45309)', boxShadow: '0 0 12px rgba(245,158,11,0.8)' }}
                            initial={{ x: (i - 3) * 34, y: 180, opacity: 0, scale: 0.6 }}
                            animate={{ x: 0, y: 0, opacity: [0, 1, 1, 0], scale: [0.6, 1, 0.8, 0.3] }}
                            transition={{ duration: 0.65, delay: i * 0.05, ease: [0.3, 0.7, 0.4, 1] }}
                          />
                        ))}
                        <motion.div
                          className="relative px-6 py-3 rounded-xl border-[3px] text-[22px] font-black uppercase tracking-[0.3em]"
                          style={{ color: `rgb(${rgb})`, borderColor: `rgb(${rgb})`, textShadow: `0 0 18px rgb(${rgb} / 0.8)`, boxShadow: `0 0 40px rgb(${rgb} / 0.4), inset 0 0 20px rgb(${rgb} / 0.25)` }}
                          initial={{ scale: 2.4, rotate: -14, opacity: 0 }}
                          animate={{ scale: 1, rotate: -8, opacity: 1 }}
                          transition={{ delay: 0.6, type: 'spring', stiffness: 520, damping: 18 }}
                        >
                          {t('store.ritual.stamp', 'Adquirido')}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {(stage === 'receipt' || stage === 'used') && receipt && (
                <motion.div key="receipt" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 pt-8">
                  {/* Receipt */}
                  <div className="relative rounded-2xl bg-[#f6f1e6] text-[#1b1b1f] p-5 pb-12 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)]">
                    <div className="absolute -left-2 top-1/2 w-4 h-4 rounded-full bg-[#0b0b0e]" />
                    <div className="absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-[#0b0b0e]" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em]">
                        <ScrollText size={13} /> {t('store.ritual.receipt', 'Recibo')}
                      </div>
                      <div className="font-mono text-[11px] text-black/50">{receiptCode(receipt.id)}</div>
                    </div>
                    <div className="mt-1 font-mono text-[10.5px] text-black/45">{dateLabel}</div>
                    <div className="my-3 h-px bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.25)_0_5px,transparent_5px_9px)]" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-bold leading-tight">{habit.title}</div>
                        <div className="text-[11px] text-black/50 mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-1">
                          <Ticket size={11} />
                          {t('store.ritual.receiptPass', 'Pase de indulgencia ×1')}
                          {receipt.deal && <span className="whitespace-nowrap rounded bg-black/10 px-1 text-[9.5px] font-black uppercase tracking-[0.1em]">{t('store.deal.short', 'Oferta')} −30%</span>}
                        </div>
                      </div>
                      <div className="font-mono text-[15px] font-black">−{receipt.price.toLocaleString()}</div>
                    </div>
                    <div className="my-3 h-px bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.25)_0_5px,transparent_5px_9px)]" />
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/55">{t('store.ritual.newBalance', 'Saldo de la bóveda')}</span>
                      <span className="font-mono font-black">{(receipt.balanceAfter ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="absolute right-5 bottom-3 rotate-[-8deg] rounded-md border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] opacity-70" style={{ color: `rgb(${rgb})`, borderColor: `rgb(${rgb})` }}>
                      {t('store.ritual.paid', 'Pagado')}
                    </div>
                  </div>

                  {stage === 'used' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
                      <div className="text-[14px] font-black text-emerald-200">{t('store.ritual.usedTitle', 'Indulgencia registrada')}</div>
                      <div className="text-[12px] text-emerald-100/60 mt-1">{t('store.ritual.usedDesc', 'Tu racha sigue intacta. Disfrútalo con intención.')}</div>
                    </motion.div>
                  ) : (
                    <div className="mt-5 grid gap-2.5">
                      <button
                        type="button"
                        onClick={useNow}
                        className="w-full rounded-2xl py-3.5 text-[12px] font-black uppercase tracking-[0.14em] text-black"
                        style={{ background: `rgb(${rgb})`, boxShadow: `0 0 24px rgb(${rgb} / 0.45)` }}
                      >
                        {t('store.ritual.useNow', 'Usar ahora')}
                      </button>
                      <button type="button" onClick={onClose} className="w-full rounded-2xl py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/80 bg-white/[0.05] border border-white/[0.08]">
                        {t('store.ritual.keep', 'Guardar para después')}
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={onOpenLedger} className="mt-3 w-full text-center text-[11.5px] font-semibold text-white/40 hover:text-white/70">
                    {t('store.ritual.openLedger', 'Ver registro de compras')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
