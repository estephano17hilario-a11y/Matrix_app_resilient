import { StreakFlame } from '../../superHabits/StreakFlame';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Activity, Clock, Snowflake, Trophy, Coins, ChevronRight, RotateCcw, Info, Check, Flame, Sparkles, Lock } from 'lucide-react';
import { DailyLimits } from '@/types/User';
import { useTranslation } from 'react-i18next';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek } from '../../../utils/dateUtils';
import { toLocalISOString } from '@/utils/dateUtils';
import { shiftDayKey } from '@/utils/streakRules';
import { FLAME_TIERS, flameTierFor, nextFlameTier } from '../../superHabits/engine';
import { useEconomy } from '@/context/EconomyContext';
import { useLux } from '@/context/LuxContext';
import { Embers, Frost, powerMeta, timeToMidnight, useStreakMeta } from '@/modules/streaks/StreakFx';
import { openStreakRecovery } from '@/modules/streaks/recovery';

interface StreakStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    dailyLimits: DailyLimits;
    streak?: number;
    lastStreakDate?: string;
    onNavigate?: (view: string) => void;
    questsTotalToday?: number;
    tasksDoneToday?: number;
    /** Live gold (same value as the HUD pill). */
    gold?: number;
}

type DayState = 'fire' | 'ice' | 'gold' | 'missed' | 'today' | 'future' | 'empty' | 'iceFuture';

const POWERS = ['freeze_streak', 'glacier_streak', 'phoenix_feather', 'rest_shield'] as const;
const POWER_NAMES: Record<string, string> = {
    freeze_streak: 'Congelador',
    glacier_streak: 'Glaciar',
    phoenix_feather: 'Fénix',
    rest_shield: 'Escudo',
};

const RING = 172;
const STROKE = 9;

/** One of the three arcs of the day ring (tasks / habits / focus). */
const Arc = ({ index, fraction, color }: { index: number; fraction: number; color: string }) => {
    const r = (RING - STROKE) / 2 - 4;
    const c = 2 * Math.PI * r;
    const gap = 10; // px between arcs
    const seg = c / 3 - gap;
    const rot = -90 + index * 120 + (gap / c) * 180;
    return (
        <g transform={`rotate(${rot} ${RING / 2} ${RING / 2})`}>
            <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE}
                strokeLinecap="round" strokeDasharray={`${seg} ${c}`} />
            <motion.circle
                cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${c}` }}
                animate={{ strokeDasharray: `${Math.max(0.001, seg * Math.min(1, fraction))} ${c}` }}
                transition={{ duration: 1.1, delay: 0.25 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{ filter: fraction >= 1 ? `drop-shadow(0 0 6px ${color})` : undefined }}
            />
        </g>
    );
};

export const StreakStatusModal: React.FC<StreakStatusModalProps> = ({ isOpen, onClose, dailyLimits, streak = 0, lastStreakDate, onNavigate, questsTotalToday, tasksDoneToday, gold: goldProp }) => {
    const { t } = useTranslation();
    const meta = useStreakMeta();
    const { inventory, storeItems, useItem, purchase, isTransactionPending } = useEconomy();
    const { user: luxUser } = useLux();
    const gold = goldProp ?? (luxUser?.stats as any)?.gold ?? 0;
    const [busy, setBusy] = useState<string | null>(null);
    const [showRules, setShowRules] = useState(false);
    const [, setClock] = useState(0);

    // Keep the countdown fresh while open.
    useEffect(() => {
        if (!isOpen) return;
        const id = window.setInterval(() => setClock(c => c + 1), 30000);
        return () => window.clearInterval(id);
    }, [isOpen]);

    const tasksTarget = questsTotalToday ?? 0;
    const tasksDone = tasksDoneToday ?? (dailyLimits.tasksCompleted || 0);
    const habitsDone = dailyLimits.habitsCompleted || 0;
    const focusMin = Math.floor((dailyLimits.focusSeconds || 0) / 60);

    const reqs = [
        { id: 'tasks', label: 'Tareas', icon: Target, color: '#60a5fa', view: 'TASKS',
          value: tasksTarget === 0 ? 'Libre' : `${tasksDone}/${tasksTarget}`,
          fraction: tasksTarget === 0 ? 1 : tasksDone / tasksTarget },
        { id: 'habits', label: 'Hábito', icon: Activity, color: '#34d399', view: 'HABITS',
          value: `${Math.min(habitsDone, 1)}/1`, fraction: Math.min(1, habitsDone) },
        { id: 'focus', label: 'Enfoque', icon: Clock, color: '#fbbf24', view: 'FOCUS',
          value: `${Math.min(focusMin, 60)}/60m`, fraction: focusMin / 60 },
    ];
    const doneCount = reqs.filter(r => r.fraction >= 1).length;
    const secured = doneCount === 3;

    const countdown = timeToMidnight();
    const state: 'secured' | 'protected' | 'risk' | 'pending' | 'lost' | 'cold' =
        secured ? 'secured'
            : meta.protectedToday ? 'protected'
                : streak > 0 && countdown.mins <= 4 * 60 ? 'risk'
                    : streak > 0 ? 'pending'
                        : meta.loss ? 'lost' : 'cold';

    const palette = {
        secured: { glow: '249 115 22', accent: '#fb923c', title: '¡Racha asegurada!', sub: 'Vuelve mañana para que siga ardiendo.' },
        protected: { glow: '56 189 248', accent: '#7dd3fc', title: 'Racha protegida hoy', sub: 'Un poder de racha cubre este día. Si cumples, suma igual.' },
        risk: { glow: '244 63 94', accent: '#fb7185', title: `Quedan ${countdown.label}`, sub: 'Tu racha se apaga a medianoche si no completas el protocolo.' },
        pending: { glow: '251 146 60', accent: '#fdba74', title: `${3 - doneCount} ${3 - doneCount === 1 ? 'paso' : 'pasos'} para asegurarla`, sub: `Tienes ${countdown.label} para mantener la llama.` },
        lost: { glow: '148 163 184', accent: '#cbd5e1', title: 'Tu racha se apagó', sub: 'Aún puedes recuperarla antes de que venza el plazo.' },
        cold: { glow: '148 163 184', accent: '#e2e8f0', title: 'Enciende tu primera llama', sub: 'Completa el protocolo de hoy para empezar una racha.' },
    }[state];

    const tier = flameTierFor(streak);
    const next = nextFlameTier(streak);
    const tierProgress = next ? 1 - next.daysLeft / Math.max(1, next.tier.min - tier.min) : 1;

    // ── Week strip ──
    const week = useMemo(() => {
        const today = meta.today;
        const frozen = new Set(meta.frozenDays);
        const restored = new Set(meta.restoredDays);
        const states = new Map<string, DayState>();
        // Walk back from the last counted day, painting counted days as fire,
        // protected days as ice and restored (bridged) days as gold.
        const anchor = secured ? today : (streak > 0 ? (lastStreakDate === today ? today : shiftDayKey(today, -1)) : null);
        if (anchor) {
            let left = streak;
            let k = anchor;
            for (let i = 0; i < 400 && left > 0; i++) {
                if (frozen.has(k) && k !== lastStreakDate) states.set(k, 'ice');
                else if (restored.has(k)) states.set(k, 'gold');
                else { states.set(k, 'fire'); left--; }
                k = shiftDayKey(k, -1);
            }
        }
        const start = startOfWeek(new Date());
        return Array.from({ length: 7 }, (_, i) => {
            const date = addDays(start, i);
            const key = toLocalISOString(date);
            const s: DayState = states.get(key)
                ?? (frozen.has(key) ? (key > today ? 'iceFuture' : 'ice')
                    : key === today ? 'today'
                        : key < today ? 'missed' : 'future');
            return { key, label: format(date, 'EEEEE', { locale: es }).toUpperCase(), num: date.getDate(), state: s, isToday: key === today };
        });
    }, [meta.today, meta.frozenDays, meta.restoredDays, secured, streak, lastStreakDate]);

    const owned = (id: string) => inventory.find(i => i.itemId === id)?.quantity || 0;

    const runPower = async (id: string) => {
        if (busy || isTransactionPending) return;
        setBusy(id);
        try {
            if (owned(id) > 0) {
                await useItem(id);
            } else {
                const item = storeItems.find(i => i.id === id);
                if (!item) return;
                const ok = await purchase(item);
                if (ok && id !== 'phoenix_feather') await useItem(id);
            }
        } finally {
            setBusy(null);
        }
    };

    const go = (view: string) => {
        if (onNavigate) { onNavigate(view); onClose(); }
    };

    const dayCell = (d: typeof week[number]) => {
        const base = 'relative w-9 h-9 rounded-full flex items-center justify-center';
        switch (d.state) {
            case 'fire': return (
                <div className={base} style={{ background: 'radial-gradient(circle at 50% 35%, #fdba74, #ea580c 70%)', boxShadow: '0 0 14px -2px rgba(249,115,22,0.75), inset 0 1px 0 rgba(255,255,255,0.35)' }}>
                    <Flame size={15} className="text-white drop-shadow" fill="currentColor" />
                </div>);
            case 'ice': return (
                <div className={base} style={{ background: 'radial-gradient(circle at 50% 35%, #e0f2fe, #38bdf8 75%)', boxShadow: '0 0 14px -2px rgba(56,189,248,0.7), inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                    <Snowflake size={15} className="text-sky-900" />
                </div>);
            case 'iceFuture': return (
                <div className={`${base} border border-dashed border-sky-300/50 bg-sky-400/10`}>
                    <Snowflake size={13} className="text-sky-300/80" />
                </div>);
            case 'gold': return (
                <div className={base} style={{ background: 'radial-gradient(circle at 50% 35%, #fef3c7, #f59e0b 75%)', boxShadow: '0 0 12px -2px rgba(245,158,11,0.7)' }}>
                    <RotateCcw size={13} className="text-amber-900" strokeWidth={2.6} />
                </div>);
            case 'missed': return (
                <div className={`${base} bg-white/[0.03] border border-white/[0.06]`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
                </div>);
            case 'today': return (
                <div className={`${base} border-2 border-dashed`} style={{ borderColor: `rgb(${palette.glow} / 0.6)` }}>
                    <span className="text-[11px] font-black text-white/80">{d.num}</span>
                </div>);
            default: return (
                <div className={`${base} border border-white/[0.05]`}>
                    <span className="text-[11px] font-bold text-white/20">{d.num}</span>
                </div>);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#020204]/90 z-[9998]"
                    />
                    <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[9999] pointer-events-none sm:p-6">
                        <motion.div
                            initial={{ opacity: 0, y: 60, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 60, scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            className="w-full sm:max-w-[400px] pointer-events-auto"
                            role="dialog"
                            aria-label="Estado de tu racha"
                        >
                            <div className="relative overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-[#09090c] border border-white/10 max-h-[92vh] flex flex-col"
                                style={{ boxShadow: `0 -20px 60px -30px rgb(${palette.glow} / 0.6)` }}>

                                {/* Ambient sky */}
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
                                    style={{ background: `radial-gradient(120% 80% at 50% 0%, rgb(${palette.glow} / 0.32) 0%, rgb(${palette.glow} / 0.08) 45%, transparent 75%)` }} />
                                {state === 'protected' && <Frost count={16} height={360} />}

                                {/* Top bar */}
                                <div className="relative z-20 flex items-center justify-between px-4 pt-4">
                                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1">
                                        <Coins size={12} className="text-amber-400" />
                                        <span className="text-[11px] font-black tabular-nums text-amber-200">{gold.toLocaleString()}</span>
                                    </div>
                                    <div className="sm:hidden h-1 w-10 rounded-full bg-white/15" />
                                    <button onClick={onClose} aria-label="Cerrar" className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full border border-white/10">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="relative z-10 overflow-y-auto no-scrollbar px-5 pb-6">
                                    {/* ── HERO: flame in the day ring ── */}
                                    <div className="flex flex-col items-center pt-1">
                                        <div className="relative" style={{ width: RING, height: RING }}>
                                            <div className="absolute inset-3 rounded-full sk-spin opacity-60"
                                                style={{ background: `conic-gradient(from 0deg, transparent, rgb(${palette.glow} / 0.35), transparent 40%, rgb(${palette.glow} / 0.2), transparent 75%)` }} />
                                            <div className="absolute inset-7 rounded-full bg-[#09090c]" />
                                            <div className="absolute inset-8 rounded-full sk-breathe"
                                                style={{ background: `radial-gradient(circle, rgb(${palette.glow} / 0.45) 0%, transparent 70%)` }} />
                                            <svg width={RING} height={RING} className="absolute inset-0">
                                                {reqs.map((r, i) => <Arc key={r.id} index={i} fraction={r.fraction} color={r.color} />)}
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {(state === 'secured') && <Embers count={14} height={110} spread={34} className="top-[-10px]" />}
                                                <motion.div
                                                    initial={{ scale: 0.4, opacity: 0, y: 12 }}
                                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                                    transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
                                                    className={state === 'lost' ? 'sk-dying' : ''}
                                                >
                                                    <StreakFlame streak={Math.max(streak, state === 'lost' ? meta.previous : 0)} size={78} lit={secured || state === 'protected'} />
                                                </motion.div>
                                                {state === 'protected' && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
                                                        className="absolute bottom-7 right-8 w-8 h-8 rounded-full flex items-center justify-center border border-sky-200/60"
                                                        style={{ background: 'radial-gradient(circle at 40% 30%, #f0f9ff, #38bdf8)', boxShadow: '0 0 16px rgba(56,189,248,0.8)' }}>
                                                        <Snowflake size={16} className="text-sky-900" />
                                                    </motion.div>
                                                )}
                                                {state === 'lost' && <>
                                                    <span className="sk-smoke" style={{ ['--d' as any]: '0s', ['--x' as any]: '-8px' }} />
                                                    <span className="sk-smoke" style={{ ['--d' as any]: '1.2s', ['--x' as any]: '10px' }} />
                                                    <span className="sk-smoke" style={{ ['--d' as any]: '2.3s', ['--x' as any]: '2px' }} />
                                                </>}
                                            </div>
                                        </div>

                                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="-mt-1 text-center">
                                            <div className="flex items-baseline justify-center gap-1.5">
                                                <span className="text-[56px] leading-none font-black tracking-tighter tabular-nums text-transparent bg-clip-text"
                                                    style={{ backgroundImage: state === 'protected' ? 'linear-gradient(180deg,#f0f9ff,#38bdf8)' : state === 'lost' || state === 'cold' ? 'linear-gradient(180deg,#f8fafc,#64748b)' : 'linear-gradient(180deg,#fff7ed,#fb923c 55%,#dc2626)' }}>
                                                    {streak}
                                                </span>
                                                <span className="text-[15px] font-black uppercase tracking-[0.18em]" style={{ color: palette.accent }}>{streak === 1 ? 'día' : 'días'}</span>
                                            </div>
                                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]"
                                                style={{ borderColor: `rgb(${palette.glow} / 0.35)`, background: `rgb(${palette.glow} / 0.1)`, color: palette.accent }}>
                                                <Sparkles size={10} /> Llama {tier.name}
                                            </div>
                                            <h2 className="mt-3 text-[18px] font-black text-white tracking-tight">{palette.title}</h2>
                                            <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-relaxed text-white/50">{palette.sub}</p>
                                        </motion.div>
                                    </div>

                                    {/* ── Lost streak: recover it ── */}
                                    {meta.loss && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                            onClick={() => { onClose(); setTimeout(() => openStreakRecovery({ category: 'HUD' }), 180); }}
                                            className="sk-sheen mt-4 w-full flex items-center gap-3 rounded-2xl border border-amber-400/30 p-3 text-left active:scale-[0.98] transition-transform"
                                            style={{ background: 'linear-gradient(120deg, rgba(245,158,11,0.18), rgba(239,68,68,0.10) 60%, rgba(10,10,12,0.9))' }}
                                        >
                                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-amber-400/15 border border-amber-400/30">
                                                <RotateCcw size={18} className="text-amber-300" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-black text-white">Recupera tu racha de {meta.loss.lost} días</div>
                                                <div className="text-[11px] text-amber-200/70">
                                                    {meta.loss.daysLeft === 1 ? 'Último día para restaurarla' : `Quedan ${meta.loss.daysLeft} días para restaurarla`}
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-black">
                                                <Coins size={11} /> {meta.loss.price.toLocaleString()}
                                            </div>
                                        </motion.button>
                                    )}

                                    {/* ── Today's protocol ── */}
                                    <div className="mt-5 grid grid-cols-3 gap-2">
                                        {reqs.map((r, i) => {
                                            const done = r.fraction >= 1;
                                            const Icon = r.icon;
                                            return (
                                                <motion.button
                                                    key={r.id}
                                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.07 }}
                                                    onClick={() => !done && go(r.view)}
                                                    className="relative overflow-hidden rounded-2xl border p-2.5 text-left active:scale-95 transition-transform"
                                                    style={{
                                                        borderColor: done ? `${r.color}55` : 'rgba(255,255,255,0.07)',
                                                        background: done ? `linear-gradient(160deg, ${r.color}26, rgba(10,10,12,0.9))` : 'rgba(255,255,255,0.025)',
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <Icon size={15} style={{ color: done ? r.color : 'rgba(255,255,255,0.35)' }} />
                                                        {done
                                                            ? <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: r.color }}><Check size={10} strokeWidth={4} className="text-black" /></span>
                                                            : <ChevronRight size={13} className="text-white/25" />}
                                                    </div>
                                                    <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/45">{r.label}</div>
                                                    <div className="text-[14px] font-black tabular-nums text-white">{r.value}</div>
                                                    <div className="mt-1.5 h-1 rounded-full bg-white/[0.07] overflow-hidden">
                                                        <motion.div className="h-full rounded-full" style={{ background: r.color }}
                                                            initial={{ width: 0 }} animate={{ width: `${Math.min(100, r.fraction * 100)}%` }}
                                                            transition={{ duration: 0.9, delay: 0.4 + i * 0.1 }} />
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {/* ── This week ── */}
                                    <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                                        <div className="mb-2.5 flex items-center justify-between px-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Esta semana</span>
                                            <div className="flex items-center gap-2.5 text-[9px] font-bold text-white/35">
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />Fuego</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" />Protegido</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Restaurado</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            {week.map((d, i) => (
                                                <motion.div key={d.key} className="flex flex-col items-center gap-1.5"
                                                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 400, damping: 20 }}>
                                                    <span className={`text-[9px] font-black ${d.isToday ? 'text-white' : 'text-white/35'}`}>{d.label}</span>
                                                    {dayCell(d)}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── Flame path ── */}
                                    <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                                        <div className="flex items-center justify-between px-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Camino de la llama</span>
                                            <span className="text-[10.5px] font-bold text-white/55">
                                                {next ? <>Faltan <b className="text-white">{next.daysLeft}</b> para {next.tier.name}</> : 'Llama máxima alcanzada'}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                            <motion.div className="h-full rounded-full"
                                                style={{ background: 'linear-gradient(90deg,#fb923c,#f43f5e,#a855f7)' }}
                                                initial={{ width: 0 }} animate={{ width: `${Math.round(tierProgress * 100)}%` }}
                                                transition={{ duration: 1, delay: 0.5 }} />
                                        </div>
                                        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto no-scrollbar px-1 pb-0.5">
                                            {FLAME_TIERS.slice(1).map(ft => {
                                                const reached = streak >= ft.min;
                                                const current = ft.index === tier.index;
                                                return (
                                                    <div key={ft.key} className={`flex min-w-[54px] flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 ${current ? 'bg-white/[0.07] border border-white/15' : 'border border-transparent'}`}>
                                                        <div className={reached ? '' : 'opacity-30 grayscale'}>
                                                            <StreakFlame streak={ft.min} size={20} lit={reached} animate={current} />
                                                        </div>
                                                        <span className={`text-[9px] font-black ${reached ? 'text-white/80' : 'text-white/30'}`}>{ft.name}</span>
                                                        <span className="text-[8.5px] font-bold tabular-nums text-white/30">{reached ? <Check size={9} className="inline" /> : `${ft.min}d`}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ── Streak powers ── */}
                                    <div className="mt-4">
                                        <div className="mb-2 flex items-center justify-between px-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Poderes de racha</span>
                                            <button onClick={() => go('STORE')} className="text-[10.5px] font-bold text-amber-300/90 flex items-center gap-0.5">
                                                Tienda <ChevronRight size={12} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {POWERS.map((id, i) => {
                                                const pm = powerMeta(id);
                                                const Icon = pm.icon;
                                                const n = owned(id);
                                                const item = storeItems.find(s => s.id === id);
                                                const price = item?.price || 0;
                                                const passive = id === 'phoenix_feather';
                                                const blocked = (id === 'freeze_streak' || id === 'rest_shield') && meta.protectedToday;
                                                const canBuy = gold >= price;
                                                const label = passive
                                                    ? (n > 0 ? 'Lista' : price.toLocaleString())
                                                    : blocked ? 'Activo' : n > 0 ? 'Usar' : price.toLocaleString();
                                                const disabled = !!busy || blocked || (passive && n > 0) || (n === 0 && !canBuy);
                                                return (
                                                    <motion.div key={id}
                                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.06 }}
                                                        className="relative flex flex-col items-center rounded-2xl border px-1.5 pt-2.5 pb-2"
                                                        style={{ borderColor: `rgb(${pm.rgb} / ${n > 0 ? 0.4 : 0.14})`, background: `linear-gradient(170deg, rgb(${pm.rgb} / ${n > 0 ? 0.16 : 0.06}), rgba(10,10,12,0.92) 70%)` }}>
                                                        {n > 0 && (
                                                            <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9.5px] font-black flex items-center justify-center text-black"
                                                                style={{ background: `rgb(${pm.rgb})` }}>×{n}</span>
                                                        )}
                                                        <div className="sk-float w-9 h-9 rounded-full flex items-center justify-center"
                                                            style={{ animationDelay: `${i * 0.4}s`, background: `radial-gradient(circle at 40% 30%, rgb(${pm.rgb} / 0.55), rgb(${pm.rgb} / 0.12) 70%)`, boxShadow: `0 0 16px -4px rgb(${pm.rgb} / 0.8)` }}>
                                                            <Icon size={17} style={{ color: `rgb(${pm.rgb})` }} className="brightness-150" />
                                                        </div>
                                                        <span className="mt-1.5 text-[10.5px] font-black text-white/85">{POWER_NAMES[id]}</span>
                                                        <span className="text-[8.5px] font-semibold text-white/35 text-center leading-tight">{pm.tag}</span>
                                                        <button
                                                            onClick={() => runPower(id)}
                                                            disabled={disabled}
                                                            className="mt-1.5 w-full rounded-lg py-1 text-[10px] font-black flex items-center justify-center gap-0.5 disabled:opacity-45 active:scale-95 transition-transform"
                                                            style={{
                                                                background: n > 0 && !passive && !blocked ? `rgb(${pm.rgb})` : 'rgba(255,255,255,0.06)',
                                                                color: n > 0 && !passive && !blocked ? '#000' : 'rgba(255,255,255,0.8)',
                                                            }}
                                                        >
                                                            {busy === id
                                                                ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                                                : <>{n === 0 && !blocked && (canBuy ? <Coins size={9} className="text-amber-300" /> : <Lock size={9} />)}{label}</>}
                                                        </button>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ── Records ── */}
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Actual', value: streak, color: '#fb923c', icon: Flame },
                                            { label: 'Récord', value: Math.max(meta.longest, streak), color: '#fbbf24', icon: Trophy },
                                            { label: 'Perdida', value: meta.loss ? meta.loss.lost : meta.previous || 0, color: '#94a3b8', icon: RotateCcw },
                                        ].map(rec => (
                                            <div key={rec.label} className="rounded-2xl border border-white/[0.06] bg-black/30 p-2.5">
                                                <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-white/40">
                                                    <rec.icon size={11} style={{ color: rec.color }} /> {rec.label}
                                                </div>
                                                <div className="mt-1 flex items-baseline gap-1">
                                                    <span className="text-[20px] font-black tabular-nums" style={{ color: rec.color }}>{rec.value}</span>
                                                    <span className="text-[10px] font-bold text-white/40">días</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── Rules ── */}
                                    <button onClick={() => setShowRules(v => !v)} className="mt-4 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white/40 hover:text-white/70">
                                        <Info size={12} /> {showRules ? 'Ocultar reglas' : '¿Cómo funciona la racha?'}
                                    </button>
                                    <AnimatePresence>
                                        {showRules && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                <div className="mt-2 space-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-white/55">
                                                    <p>• Cada día suma si completas <b className="text-white/80">todas las tareas de hoy</b>, <b className="text-white/80">1 hábito</b> y <b className="text-white/80">60 min de enfoque</b>.</p>
                                                    <p>• Un día protegido (Congelador, Glaciar, Escudo o Fénix) no rompe ninguna racha: ni la diaria, ni las de hábitos o proyectos.</p>
                                                    <p>• Si la pierdes, tienes <b className="text-white/80">3 días</b> para restaurarla con oro. {t('common.streakWhy', '')}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
