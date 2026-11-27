import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { Coins, X, Flame, Repeat, FolderKanban, Check, Clock, Lock, Feather, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { StreakFlame } from '@/modules/superHabits/StreakFlame';
import { Embers } from './StreakFx';
import {
  BUNDLE_DISCOUNT, LostStreak, OPEN_RECOVERY_EVENT, RestoreCategory, bundlePrice, habitLosses, hudLoss,
  markLossesSeen, projectLosses, seenLosses,
} from './recovery';
import './streaks.css';

interface StreakRecoveryCenterProps {
  /** Data is loaded (don't report "losses" from half-loaded state). */
  ready: boolean;
  stats: any;
  habits: any[];
  projects: any[];
  gold: number;
  weekStartDay?: 0 | 1;
  onRestore: (category: RestoreCategory, targetId?: string, cost?: number) => Promise<boolean>;
  onRestoreAll: (items: { category: RestoreCategory; targetId?: string }[], totalCost: number) => Promise<boolean>;
  onOpenStore?: () => void;
}

const CAT_META: Record<RestoreCategory, { label: string; icon: React.ElementType; rgb: string }> = {
  HUD: { label: 'Racha diaria', icon: Flame, rgb: '249 115 22' },
  HABIT: { label: 'Hábito', icon: Repeat, rgb: '52 211 153' },
  PROJECT: { label: 'Proyecto', icon: FolderKanban, rgb: '129 140 248' },
};

const hexToRgb = (hex?: string) => {
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex.replace('#', '').slice(0, 6))) return null;
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
};

/**
 * The streak loss report + recovery center. Opens by itself once per new loss
 * when the app starts, and on demand (store, HUD sheet, habits banner) through
 * `openStreakRecovery()`. Each lost streak can be bought back, or all of them
 * at once with a discount.
 */
export const StreakRecoveryCenter = ({ ready, stats, habits, projects, gold, weekStartDay, onRestore, onRestoreAll, onOpenStore }: StreakRecoveryCenterProps) => {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<{ category?: RestoreCategory; targetId?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [restored, setRestored] = useState<Record<string, number>>({});
  const [auto, setAuto] = useState(false);

  const losses = useMemo<LostStreak[]>(() => {
    if (!ready) return [];
    const hud = hudLoss(stats);
    return [
      ...(hud ? [hud] : []),
      ...habitLosses(habits, { weekStartDay, stats }),
      ...projectLosses(projects),
    ];
  }, [ready, stats, habits, projects, weekStartDay]);

  // Losses currently shown (keep restored ones visible as "done" until closed).
  const [snapshot, setSnapshot] = useState<LostStreak[]>([]);
  const visible = useMemo(() => {
    const live = new Map(losses.map(l => [l.key, l]));
    const list = snapshot.filter(l => live.has(l.key) || restored[l.key]).map(l => live.get(l.key) || l);
    losses.forEach(l => { if (!list.some(x => x.key === l.key)) list.push(l); });
    if (focus.category) list.sort((a, b) => Number(b.category === focus.category && (!focus.targetId || b.targetId === focus.targetId)) - Number(a.category === focus.category && (!focus.targetId || a.targetId === focus.targetId)));
    return list;
  }, [losses, snapshot, restored, focus]);
  const pending = visible.filter(l => !restored[l.key]);

  // Auto-open once per new loss, a moment after the app settles.
  useEffect(() => {
    if (!ready || open || !losses.length) return;
    const seen = seenLosses();
    const fresh = losses.filter(l => !seen.has(l.key));
    if (!fresh.length) return;
    const id = window.setTimeout(() => {
      setSnapshot(losses);
      setAuto(true);
      setFocus({});
      setOpen(true);
      markLossesSeen(losses.map(l => l.key));
    }, 2200);
    return () => window.clearTimeout(id);
  }, [ready, losses, open]);

  // Open on demand.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setFocus(detail);
      setSnapshot(losses);
      setRestored({});
      setAuto(false);
      setOpen(true);
      markLossesSeen(losses.map(l => l.key));
    };
    window.addEventListener(OPEN_RECOVERY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_RECOVERY_EVENT, onOpen);
  }, [losses]);

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => { setRestored({}); setSnapshot([]); }, 300);
  }, []);

  const celebrate = () => {
    confetti({ particleCount: 90, spread: 70, startVelocity: 38, origin: { y: 0.55 }, colors: ['#fb923c', '#fbbf24', '#f43f5e', '#fde68a'] });
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  };

  const restoreOne = async (l: LostStreak) => {
    if (busy) return;
    if (gold < l.price) { toast.error(`Te faltan ${(l.price - gold).toLocaleString()} de oro`); return; }
    setBusy(l.key);
    try {
      const ok = await onRestore(l.category, l.targetId, l.price);
      if (ok) {
        setRestored(r => ({ ...r, [l.key]: l.restored }));
        celebrate();
        toast.success(`🔥 ${l.title}: racha de ${l.restored} días restaurada`);
      } else {
        toast.error('No se pudo restaurar esta racha');
      }
    } finally {
      setBusy(null);
    }
  };

  const total = bundlePrice(pending);
  const fullTotal = pending.reduce((s, l) => s + l.price, 0);
  const restoreAll = async () => {
    if (busy || pending.length < 2) return;
    if (gold < total) { toast.error(`Te faltan ${(total - gold).toLocaleString()} de oro`); return; }
    setBusy('ALL');
    try {
      const ok = await onRestoreAll(pending.map(l => ({ category: l.category, targetId: l.targetId })), total);
      if (ok) {
        setRestored(r => ({ ...r, ...Object.fromEntries(pending.map(l => [l.key, l.restored])) }));
        celebrate();
        setTimeout(celebrate, 350);
        toast.success(`🔥 ${pending.length} rachas restauradas`);
      } else {
        toast.error('No se pudo completar el restablecimiento');
      }
    } finally {
      setBusy(null);
    }
  };

  const daysLost = pending.reduce((s, l) => s + l.lost, 0);
  const allDone = visible.length > 0 && pending.length === 0;
  const biggest = visible.reduce((m, l) => Math.max(m, l.lost), 0);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[10000] bg-[#030305]/92"
          />
          <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center pointer-events-none sm:p-6">
            <motion.div
              key="sheet"
              initial={{ y: 80, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              className="pointer-events-auto w-full sm:max-w-[420px]"
              role="dialog"
              aria-label="Informe de rachas perdidas"
            >
              <div className="relative overflow-hidden rounded-t-[32px] sm:rounded-[32px] border border-white/10 bg-[#0a0a0d] max-h-[90vh] flex flex-col">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-72"
                  style={{ background: allDone
                    ? 'radial-gradient(120% 90% at 50% 0%, rgba(249,115,22,0.35), rgba(249,115,22,0.06) 50%, transparent 78%)'
                    : 'radial-gradient(120% 90% at 50% 0%, rgba(100,116,139,0.30), rgba(244,63,94,0.06) 50%, transparent 78%)' }} />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between px-4 pt-4">
                  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1">
                    <Coins size={12} className="text-amber-400" />
                    <span className="text-[11px] font-black tabular-nums text-amber-200">{gold.toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{auto ? 'Informe del día' : 'Centro de rachas'}</span>
                  <button onClick={close} aria-label="Cerrar" className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/50 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div className="relative z-10 overflow-y-auto no-scrollbar px-5 pb-5">
                  {/* Hero: a dead flame, or a reborn one */}
                  <div className="flex flex-col items-center pt-3 text-center">
                    <div className="relative h-[112px] w-[112px] flex items-center justify-center">
                      <div className="absolute inset-2 rounded-full sk-breathe"
                        style={{ background: allDone ? 'radial-gradient(circle, rgba(249,115,22,0.5), transparent 70%)' : 'radial-gradient(circle, rgba(148,163,184,0.28), transparent 70%)' }} />
                      {allDone ? (
                        <>
                          <Embers count={16} height={120} spread={36} />
                          <motion.div initial={{ scale: 0.3, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }}>
                            <StreakFlame streak={Math.max(biggest, 3)} size={74} lit />
                          </motion.div>
                        </>
                      ) : (
                        <>
                          <div className="sk-dying"><StreakFlame streak={Math.max(biggest, 1)} size={70} lit={false} animate={false} /></div>
                          <span className="sk-smoke" style={{ ['--d' as any]: '0s', ['--x' as any]: '-10px' }} />
                          <span className="sk-smoke" style={{ ['--d' as any]: '1.1s', ['--x' as any]: '12px' }} />
                          <span className="sk-smoke" style={{ ['--d' as any]: '2.2s', ['--x' as any]: '0px' }} />
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 text-[21px] font-black tracking-tight text-white">
                      {allDone ? '¡La llama vuelve a arder!' : visible.length === 0 ? 'Tus rachas están a salvo' : visible.length === 1 ? 'Perdiste una racha' : `Perdiste ${visible.length} rachas`}
                    </h2>
                    <p className="mx-auto mt-1 max-w-[300px] text-[12.5px] leading-relaxed text-white/50">
                      {allDone
                        ? 'Todo restaurado. Protégete la próxima vez con un Congelador o una Pluma de fénix.'
                        : visible.length === 0
                          ? 'No hay rachas perdidas que puedas recuperar ahora mismo.'
                          : <>Se apagaron <b className="text-white/80">{daysLost} días</b> de constancia. Puedes recuperarlas con oro antes de que venza el plazo.</>}
                    </p>
                  </div>

                  {/* Lost streaks */}
                  {visible.length > 0 && (
                    <div className="mt-5 space-y-2.5">
                      {visible.map((l, i) => {
                        const cm = CAT_META[l.category];
                        const rgb = hexToRgb(l.color) || cm.rgb;
                        const done = restored[l.key] !== undefined;
                        const afford = gold >= l.price;
                        const urgent = l.daysLeft <= 1;
                        const Icon = cm.icon;
                        const focused = focus.category === l.category && (!focus.targetId || focus.targetId === l.targetId);
                        return (
                          <motion.div
                            key={l.key}
                            layout
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.07 }}
                            className="relative overflow-hidden rounded-[22px] border p-3"
                            style={{
                              borderColor: done ? 'rgba(251,146,60,0.45)' : focused ? `rgb(${rgb} / 0.55)` : `rgb(${rgb} / 0.22)`,
                              background: done
                                ? 'linear-gradient(120deg, rgba(249,115,22,0.22), rgba(10,10,13,0.92) 70%)'
                                : `linear-gradient(120deg, rgb(${rgb} / 0.12), rgba(10,10,13,0.94) 62%)`,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center border"
                                style={{ borderColor: `rgb(${rgb} / 0.35)`, background: `rgb(${rgb} / 0.12)` }}>
                                {done
                                  ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}><StreakFlame streak={l.restored} size={26} lit /></motion.div>
                                  : <Icon size={20} style={{ color: `rgb(${rgb})` }} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9.5px] font-black uppercase tracking-[0.14em]" style={{ color: `rgb(${rgb})` }}>{cm.label}</span>
                                  {!done && (
                                    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-black ${urgent ? 'bg-rose-500/20 text-rose-300' : 'bg-white/[0.06] text-white/50'}`}>
                                      <Clock size={9} /> {urgent ? 'Último día' : `${l.daysLeft} días`}
                                    </span>
                                  )}
                                </div>
                                <div className="truncate text-[14.5px] font-bold text-white">{l.category === 'HUD' ? 'Racha diaria (HUD)' : l.title}</div>
                                <div className="text-[11.5px] text-white/45">
                                  {done
                                    ? <span className="text-orange-300 font-bold">Restaurada · {restored[l.key]} días</span>
                                    : <>Racha de <b className="text-white/80">{l.lost}</b> días{l.restored !== l.lost ? <> → vuelve a <b className="text-white/80">{l.restored}</b></> : null}</>}
                                </div>
                              </div>
                              {done ? (
                                <span className="shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_14px_rgba(249,115,22,0.6)]">
                                  <Check size={16} strokeWidth={3.5} className="text-black" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => restoreOne(l)}
                                  disabled={!!busy || !afford}
                                  className="shrink-0 flex flex-col items-center rounded-2xl px-3 py-2 active:scale-95 transition-transform disabled:active:scale-100"
                                  style={afford
                                    ? { background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 6px 20px -8px rgba(245,158,11,0.8)' }
                                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                  {busy === l.key
                                    ? <span className="w-4 h-4 my-1 border-2 border-black/25 border-t-black rounded-full animate-spin" />
                                    : <>
                                      <span className={`text-[10px] font-black uppercase tracking-wide ${afford ? 'text-black/70' : 'text-white/40'}`}>{afford ? 'Restaurar' : <Lock size={10} className="inline" />}</span>
                                      <span className={`flex items-center gap-0.5 text-[12.5px] font-black tabular-nums ${afford ? 'text-black' : 'text-white/60'}`}>
                                        <Coins size={11} /> {l.price.toLocaleString()}
                                      </span>
                                    </>}
                                </button>
                              )}
                            </div>
                            {!done && !afford && (
                              <div className="mt-2.5">
                                <div className="flex justify-between text-[10px] font-bold text-white/40">
                                  <span>Te faltan {(l.price - gold).toLocaleString()} de oro</span>
                                  <span className="tabular-nums">{Math.round(Math.min(1, gold / l.price) * 100)}%</span>
                                </div>
                                <div className="mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${Math.min(100, (gold / l.price) * 100)}%` }} />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Restore everything */}
                  {pending.length > 1 && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                      onClick={restoreAll}
                      disabled={!!busy || gold < total}
                      className="sk-sheen mt-3 w-full rounded-[22px] p-[1.5px] disabled:opacity-60 active:scale-[0.99] transition-transform"
                      style={{ background: 'linear-gradient(120deg, #fbbf24, #f43f5e, #a855f7)' }}
                    >
                      <div className="flex items-center gap-3 rounded-[21px] bg-[#120c0a] px-4 py-3">
                        <Sparkles size={20} className="text-amber-300 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="text-[13.5px] font-black text-white">Restablecimiento total</div>
                          <div className="text-[11px] text-white/50">{pending.length} rachas · ahorras {Math.round(BUNDLE_DISCOUNT * 100)}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-white/35 line-through tabular-nums">{fullTotal.toLocaleString()}</div>
                          <div className="flex items-center gap-1 text-[15px] font-black tabular-nums text-amber-300">
                            {busy === 'ALL' ? <span className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" /> : <><Coins size={13} />{total.toLocaleString()}</>}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  )}

                  {/* Prevention tip */}
                  <button
                    onClick={() => { close(); onOpenStore?.(); }}
                    className="mt-4 w-full flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-left active:scale-[0.99] transition-transform"
                  >
                    <div className="flex -space-x-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center border border-orange-300/30" style={{ background: 'radial-gradient(circle at 40% 30%, rgba(251,146,60,0.6), rgba(251,146,60,0.12))' }}><Feather size={14} className="text-orange-200" /></span>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center border border-violet-300/30" style={{ background: 'radial-gradient(circle at 40% 30%, rgba(167,139,250,0.6), rgba(167,139,250,0.12))' }}><ShieldCheck size={14} className="text-violet-200" /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-bold text-white/85">Que no vuelva a pasar</div>
                      <div className="text-[11px] text-white/45">La Pluma de fénix salva tu racha sola el día que falles.</div>
                    </div>
                    <ChevronRight size={16} className="text-white/30" />
                  </button>

                  <button onClick={close} className="mt-3 w-full rounded-2xl py-3 text-[12px] font-bold text-white/45 hover:text-white/75">
                    {allDone ? 'Continuar' : 'Ahora no'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
