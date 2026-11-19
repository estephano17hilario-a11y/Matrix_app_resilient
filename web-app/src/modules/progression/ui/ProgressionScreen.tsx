import React, { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays, ChevronRight, Clock, Crown, Flame, HeartCrack, ListChecks, Minus, Moon, Mountain, Palette, Plus, Repeat,
  Shield, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star, Target, Timer, TrendingDown, TrendingUp, Trophy,
  Users, Vibrate, Volume2, FileText, Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Habit, Project, Quest } from '@/types';
import { useEconomy } from '@/context/EconomyContext';
import { getAvatarPath } from '@/config/avatars';
import { getHistoryDateKey } from '@/utils/dateUtils';
import {
  PROGRESSION_CONFIG, addDaysToKey, compareStandings, dayTotal, getStanding, isFirstWeek, replay, weeklyBoostFor,
  type EloEvent,
} from '../engine';
import { LEGEND_INDEX } from '../engine/ranks';
import { emptyMemory, generateWeeklySummary, slotOf, type ReportMemory, type TimeSlot } from '../report';
import { buildDayCloseInput, focusMinutesOn, habitGoalPctFor, isManualSession, sessionKey } from '../integration';
import { progressionStore, useProgression, type ProgressionSnapshot } from '../progressionStore';
import type { LeaderboardRow } from '../leaderboardService';
import { RankBadge } from './RankBadge';
import { CountUp, Typewriter, haptic } from './primitives';
import { VirtualList } from './VirtualList';
import { RankLadderFull } from './RankLadder';
import { FrameInventory } from './FrameInventory';
import { MOTION, RANKS, rankStyle } from './tokens';
import { ArenaBackdrop, ArenaDock, ArenaHeader, Card, Delta, useMountTransition, EmptyState, Segmented, SectionHead, StatTile, Toggle, rise, type DockTab } from './arena';
import { useSocial } from '@/modules/social/socialStore';

export type ProgressionTab = 'RANK' | 'LADDER' | 'BOARD' | 'WEEK' | 'SETTINGS';
type Tab = ProgressionTab;

interface Props {
  open: boolean;
  onClose: () => void;
  habits: Habit[];
  quests: Quest[];
  projects: Project[];
  userName?: string | null;
  avatarId?: string | null;
  onUpdateProject: (p: Project) => void;
  onOpenStore: () => void;
  initialTab?: ProgressionTab;
}

export const ProgressionScreen: React.FC<Props> = memo(props => {
  const mounted = useMountTransition(props.open);
  return mounted ? createPortal(<Screen {...props} />, document.body) : null;
});
ProgressionScreen.displayName = 'ProgressionScreen';

const AVATAR_FALLBACK = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=60';

const Screen: React.FC<Props> = ({ open, onClose, habits, quests, projects, userName, avatarId, onUpdateProject, onOpenStore, initialTab }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const snap = useProgression();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'RANK');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabs: DockTab<Tab>[] = [
    { id: 'RANK', label: t('progression.tabs.rank', 'Rango'), icon: <Shield size={19} /> },
    { id: 'LADDER', label: t('progression.tabs.ladder', 'Rangos'), icon: <Mountain size={19} /> },
    { id: 'BOARD', label: t('progression.tabs.board', 'Top'), icon: <Trophy size={19} /> },
    { id: 'WEEK', label: t('progression.tabs.week', 'Semana'), icon: <CalendarDays size={19} /> },
    { id: 'SETTINGS', label: t('progression.tabs.settings', 'Ajustes'), icon: <SlidersHorizontal size={19} /> },
  ];

  return (
    <motion.div
      className="prog-root fixed inset-0 z-[880] flex flex-col overflow-hidden"
      data-prog-theme={snap.meta.appearance === 'LIGHT' ? 'light' : snap.meta.appearance === 'SYSTEM' ? 'system' : 'dark'}
      style={{ ...rankStyle(snap.standing.rankIndex), background: 'rgb(var(--p-bg))', pointerEvents: open ? undefined : 'none' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
      animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.985 }}
      transition={{ duration: MOTION.short, ease: MOTION.easeOut }}
      role="dialog" aria-modal="true" aria-label={t('progression.title', 'Progresión')}
    >
      <ArenaBackdrop />
      <ArenaHeader
        title={t('progression.title', 'Progresión')}
        kicker={tabs.find(x => x.id === tab)?.label}
        onBack={onClose}
        backLabel={t('progression.back', 'Volver')}
        right={
          <button type="button" onClick={() => setTab('RANK')} className="prog-tap arena-card flex items-center gap-1.5 rounded-full pl-1 pr-3" style={{ height: 44 }} aria-label={snap.standing.label}>
            <RankBadge rankIndex={snap.standing.rankIndex} division={snap.standing.division} size={30} />
            <span className="text-[13px] font-black tabular-nums">{snap.summary.elo}</span>
            <span className="text-[10px] font-bold prog-text-3">ELO</span>
          </button>
        }
      />

      <main className="relative z-10 flex-1 min-h-0 prog-scroll px-4 pb-[calc(env(safe-area-inset-bottom)+108px)]">
        <div className="mx-auto max-w-[640px] pt-3">
            <motion.div
              key={tab}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: MOTION.micro, ease: MOTION.easeOut }}
            >
              {tab === 'RANK' && <RankTab snap={snap} habits={habits} quests={quests} projects={projects} onOpenStore={onOpenStore} onShowLadder={() => setTab('LADDER')} />}
              {tab === 'LADDER' && <RankLadderFull standing={snap.standing} elo={snap.summary.elo} />}
              {tab === 'BOARD' && <BoardTab snap={snap} userName={userName} avatarId={avatarId} />}
              {tab === 'WEEK' && <WeekTab snap={snap} quests={quests} projects={projects} userName={userName} />}
              {tab === 'SETTINGS' && <SettingsTab snap={snap} habits={habits} projects={projects} onUpdateProject={onUpdateProject} />}
            </motion.div>
        </div>
      </main>

      <ArenaDock tabs={tabs} value={tab} onChange={setTab} layoutId="prog-dock" />
    </motion.div>
  );
};

// ── Rank tab ────────────────────────────────────────────────────────────────

const REASON: Record<string, (e: EloEvent) => string> = {
  HABITS_COMPLIANCE: e => `Hábitos del día (${e.meta?.completed ?? 0}/${e.meta?.scheduled ?? 0})`,
  TASKS_COMPLIANCE: e => `Tareas del día (${e.meta?.completed ?? 0}/${e.meta?.planned ?? 0})`,
  FOCUS_HOUR: e => `Hora de foco n.º ${e.meta?.hour ?? 1}`,
  PROJECT_GOAL_MISSED: () => 'Meta de foco de proyecto no cumplida',
  STREAK_MILESTONE: e => `Bono de racha: ${e.meta?.days} días`,
  STREAK_BROKEN: e => `Racha de ${e.meta?.days} días rota`,
};

const REASON_ICON: Record<string, React.ReactNode> = {
  HABITS_COMPLIANCE: <Repeat size={15} />,
  TASKS_COMPLIANCE: <ListChecks size={15} />,
  FOCUS_HOUR: <Timer size={15} />,
  PROJECT_GOAL_MISSED: <Target size={15} />,
  STREAK_MILESTONE: <Flame size={15} />,
  STREAK_BROKEN: <HeartCrack size={15} />,
};

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dayTitle = (k: string, today: string) => {
  if (k === today) return 'Hoy';
  if (k === addDaysToKey(today, -1)) return 'Ayer';
  const [y, m, d] = k.split('-').map(Number);
  return `${WEEKDAYS_LONG[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`;
};

type HistoryRow = { kind: 'day'; dayKey: string; total: number } | { kind: 'event'; e: EloEvent };

const RankTab: React.FC<{ snap: ProgressionSnapshot; habits: Habit[]; quests: Quest[]; projects: Project[]; onOpenStore: () => void; onShowLadder: () => void }> = ({ snap, habits, quests, projects, onOpenStore, onShowLadder }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { purchase, useItem, inventory, storeItems, isTransactionPending } = useEconomy();
  const { standing, summary, level, meta, engine } = snap;
  const today = progressionStore.todayKey();
  const projection = useMemo(
    () => progressionStore.project(buildDayCloseInput(today, { habits, quests, projects, meta })),
    [today, habits, quests, projects, meta, engine],
  );
  const owned = inventory.find(i => i.itemId === PROGRESSION_CONFIG.SHIELD_ITEM_ID)?.quantity ?? 0;
  const shieldToday = progressionStore.shieldActiveToday();
  const boosted = weeklyBoostFor(today) > 1;
  const firstWeek = isFirstWeek(engine, today);
  const projectName = (id?: string) => projects.find(p => p.id === id)?.title;
  const describe = (e: EloEvent) => e.source === 'PROJECT_GOAL' ? `${REASON.PROJECT_GOAL_MISSED(e)}: ${projectName(e.ref) ?? ''}` : (REASON[e.reason]?.(e) ?? e.reason);
  const isLegend = standing.division === null;
  const legendPos = isLegend && snap.leaderboard.status === 'READY' ? snap.leaderboard.legendPosition : null;
  const next = standing.division === null ? null : standing.division < PROGRESSION_CONFIG.DIVISIONS_PER_RANK - 1
    ? { rankIndex: standing.rankIndex, division: standing.division + 1 }
    : { rankIndex: standing.rankIndex + 1, division: standing.rankIndex + 1 === LEGEND_INDEX ? null : 0 };

  const history = useMemo<HistoryRow[]>(() => {
    const sorted = [...engine.events].sort((a, b) => b.dayKey.localeCompare(a.dayKey) || b.at - a.at);
    const rows: HistoryRow[] = [];
    let current = '';
    for (const e of sorted) {
      if (e.dayKey !== current) {
        current = e.dayKey;
        rows.push({ kind: 'day', dayKey: e.dayKey, total: sorted.filter(x => x.dayKey === e.dayKey).reduce((s, x) => s + x.amount, 0) });
      }
      rows.push({ kind: 'event', e });
    }
    return rows;
  }, [engine.events]);

  const activate = async () => {
    if (shieldToday) return;
    if (snap.earnedShieldsAvailable > 0) {
      const r = progressionStore.activateShield('EARNED');
      if (r.ok) { haptic(meta.hapticsEnabled, 20); toast.success(t('progression.shield.activated', 'Escudo activado: hoy es día de descanso')); }
      return;
    }
    if (owned > 0) {
      await useItem(PROGRESSION_CONFIG.SHIELD_ITEM_ID);
      return;
    }
    const item = storeItems.find(i => i.id === PROGRESSION_CONFIG.SHIELD_ITEM_ID);
    if (item && await purchase(item)) await useItem(PROGRESSION_CONFIG.SHIELD_ITEM_ID);
  };

  const todayRows = [
    { id: 'focus', icon: <Timer size={15} />, label: t('progression.todayFocus', 'Foco (ya ganado)'), value: projection.earnedSoFar },
    ...projection.events.map(e => ({ id: e.id, icon: REASON_ICON[e.source === 'PROJECT_GOAL' ? 'PROJECT_GOAL_MISSED' : e.reason] ?? <Zap size={15} />, label: describe(e), value: e.amount })),
  ];
  const maxRow = Math.max(1, ...todayRows.map(r => Math.abs(r.value)));

  return (
    <div className="space-y-4">
      {/* ── Hero ── */}
      <section className="relative pt-2 pb-1 flex flex-col items-center text-center">
        <div className="relative flex items-center justify-center" style={{ width: 260, height: 230 }}>
          <div className="arena-rays" style={{ width: 340, height: 340, left: -40, top: -55 }} aria-hidden="true" />
          <div className="arena-halo" style={{ width: 230, height: 230, left: 15, top: 0 }} aria-hidden="true" />
          <motion.div
            className="relative"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 220, damping: 16, delay: 0.05 }}
          >
            <RankBadge rankIndex={standing.rankIndex} division={standing.division} size={176} animate />
          </motion.div>
        </div>
        <p className="arena-kicker">{t('progression.hero.kicker', 'Tu rango actual')}</p>
        <h2 className={`mt-1 text-[38px] font-black leading-none tracking-[-0.02em] ${isLegend ? 'arena-rainbow-text' : 'arena-grad-text'}`}>
          {standing.label}{legendPos ? ` #${legendPos}` : ''}
        </h2>
        <div className="mt-3 flex items-center gap-2">
          <span className="arena-chip" style={{ background: 'rgb(var(--rank) / 0.14)', color: 'rgb(var(--rank))' }}>
            <Zap size={12} /> <CountUp value={summary.elo} duration={900} className="tabular-nums" /> ELO
          </span>
          <span className="arena-chip" style={{ background: projection.projectedTotal >= 0 ? 'rgb(var(--p-positive) / 0.12)' : 'rgb(var(--p-negative) / 0.12)' }}>
            {projection.projectedTotal >= 0 ? <TrendingUp size={12} className="prog-positive" /> : <TrendingDown size={12} className="prog-negative" />}
            <span className={projection.projectedTotal >= 0 ? 'prog-positive' : 'prog-negative'}>{projection.projectedTotal > 0 ? '+' : ''}{projection.projectedTotal} {t('progression.hero.today', 'hoy')}</span>
          </span>
          {standing.protected && <span className="arena-chip" style={{ background: 'rgb(var(--p-warning) / 0.14)', color: 'rgb(var(--p-warning))' }}><ShieldCheck size={12} /> {t('progression.protected', 'Protección de rango activa')}</span>}
        </div>
        {standing.division !== null && standing.progress !== null && (
          <div className="mt-5 w-full max-w-[400px]">
            <DivisionTrack division={standing.division} progress={standing.progress} />
            <div className="mt-3 flex items-center gap-3 rounded-[18px] px-3 py-2.5 arena-card text-left">
              {next && <RankBadge rankIndex={next.rankIndex} division={next.division} size={34} />}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] prog-text-3">{t('progression.hero.next', 'Siguiente')}</p>
                <p className="text-[14px] font-black truncate">{standing.nextLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[18px] font-black tabular-nums leading-none" style={{ color: 'rgb(var(--rank))' }}>{standing.eloToNext}</p>
                <p className="text-[10.5px] prog-text-3">{t('progression.hero.eloLeft', 'ELO restantes')}</p>
              </div>
            </div>
          </div>
        )}

        {(boosted || firstWeek) && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {boosted && <span className="arena-chip" style={{ background: 'rgb(var(--p-warning) / 0.14)', color: 'rgb(var(--p-warning))' }}><Sparkles size={12} /> {t('progression.boost.sunday', 'Domingo: +25% oro, XP y ELO')}</span>}
            {firstWeek && <span className="arena-chip" style={{ background: 'rgb(var(--p-warning) / 0.14)', color: 'rgb(var(--p-warning))' }}><Crown size={12} /> {t('progression.boost.firstWeek', 'Primera semana: ganancias ×2')}</span>}
          </div>
        )}
      </section>

      {/* ── Stats ── */}
      <motion.section className="grid grid-cols-3 gap-2.5" {...rise(1, reduce)}>
        <StatTile
          icon={<Star size={16} />} label={t('progression.level', 'Nivel')} value={level.level}
          sub={<><div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.08)' }}><div className="h-full rounded-full origin-left" style={{ transform: `scaleX(${level.progress})`, background: 'linear-gradient(90deg, var(--rank-from), var(--rank-to))' }} /></div><p className="text-[10.5px] prog-text-3 mt-1 tabular-nums">{level.intoLevel}/{level.levelSpan} XP</p></>}
        />
        <StatTile icon={<Flame size={16} className="arena-flame" />} tint="#fb923c" label={t('progression.streakTitle', 'Racha de meta')} value={summary.streak} sub={<p className="text-[10.5px] prog-text-3 mt-0.5">{t('progression.stat.days', 'días')}</p>} />
        <StatTile icon={<Shield size={16} />} tint="#38bdf8" label={t('progression.shield.short', 'Escudos')} value={snap.earnedShieldsAvailable + owned} sub={<p className="text-[10.5px] prog-text-3 mt-0.5">{t('progression.shield.split', '{{earned}} ganados · {{owned}} comprados', { earned: snap.earnedShieldsAvailable, owned })}</p>} />
      </motion.section>

      {/* ── Today ── */}
      <motion.div {...rise(2, reduce)}>
        <Card glow className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[18px] font-black leading-tight">{t('progression.todayTitle', 'Hoy')}</h3>
              <p className="mt-0.5 text-[12px] prog-text-3">{t('progression.todayHint', 'ELO proyectado si el día terminara ahora')}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: projection.projectedTotal >= 0 ? 'rgb(var(--p-positive) / 0.12)' : 'rgb(var(--p-negative) / 0.12)' }}>
              {projection.projectedTotal >= 0 ? <TrendingUp size={16} className="prog-positive" /> : <TrendingDown size={16} className="prog-negative" />}
              <Delta value={projection.projectedTotal} className="text-[22px] leading-none" />
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {todayRows.map(r => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center arena-inset" style={{ color: r.value > 0 ? 'rgb(var(--p-positive))' : r.value < 0 ? 'rgb(var(--p-negative))' : 'rgb(var(--p-text-3))' }}>{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate">{r.label}</p>
                  <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.06)' }}>
                    <div className="h-full rounded-full origin-left" style={{ transform: `scaleX(${Math.abs(r.value) / maxRow})`, background: r.value >= 0 ? 'rgb(var(--p-positive))' : 'rgb(var(--p-negative))' }} />
                  </div>
                </div>
                <Delta value={r.value} className="w-9 text-right text-[14px]" />
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* ── Shields ── */}
      <motion.div {...rise(3, reduce)}>
        <Card className="p-4 overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-[0.08]" aria-hidden="true"><Shield size={140} strokeWidth={1.2} /></div>
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center shrink-0" style={{ background: shieldToday ? 'linear-gradient(140deg, #0ea5e9, #67e8f9)' : 'rgb(56 189 248 / 0.14)', color: shieldToday ? '#04131c' : '#38bdf8' }}>
              {shieldToday ? <ShieldCheck size={26} /> : <Shield size={26} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-black">{t('progression.shield.title', 'Escudos de descanso')}</h3>
              <p className="text-[12px] prog-text-3">{t('progression.shield.counts', 'Ganados {{earned}}/{{max}} · Comprados {{owned}}', { earned: snap.earnedShieldsAvailable, max: PROGRESSION_CONFIG.ELO.PROTECTION.SHIELD_MAX, owned })}</p>
            </div>
          </div>
          <div className="relative mt-3 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: PROGRESSION_CONFIG.ELO.PROTECTION.SHIELD_MAX }, (_, i) => (
              <span key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i < snap.earnedShieldsAvailable ? '#38bdf8' : 'rgb(var(--p-line) / 0.1)' }} />
            ))}
          </div>
          <p className="relative mt-3 text-[12.5px] leading-relaxed prog-text-2">{t('progression.shield.desc', 'Un día protegido: sin pérdidas y sin romper la racha. Los hábitos y tareas no suman, el foco sí.')}</p>
          <div className="relative mt-3 flex gap-2">
            <button
              type="button" onClick={activate} disabled={!!shieldToday || isTransactionPending}
              className="prog-tap flex-1 h-12 rounded-[16px] font-black text-[13.5px] disabled:opacity-70"
              style={shieldToday ? { background: 'rgb(56 189 248 / 0.16)', color: '#38bdf8' } : { background: 'linear-gradient(100deg, #0284c7, #67e8f9)', color: '#04131c', boxShadow: '0 10px 24px -12px #38bdf8' }}
            >
              {shieldToday
                ? t('progression.shield.active', 'Escudo activo hoy')
                : snap.earnedShieldsAvailable > 0 || owned > 0
                  ? t('progression.shield.use', 'Activar para hoy')
                  : t('progression.shield.buy', 'Comprar y activar · {{price}} oro', { price: PROGRESSION_CONFIG.SHIELD_PRICE_GOLD })}
            </button>
            <button type="button" onClick={onOpenStore} className="prog-tap h-12 w-12 rounded-[16px] arena-inset flex items-center justify-center" aria-label={t('progression.shield.store', 'Ir a la tienda')}>
              <ShoppingBag size={18} />
            </button>
          </div>
        </Card>
      </motion.div>

      {/* ── Path teaser ── */}
      <motion.div {...rise(4, reduce)}>
        <button type="button" onClick={onShowLadder} className="prog-tap w-full text-left arena-card p-4 block">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[16px] font-black leading-tight">{t('progression.ladderView.all', 'Ver todos los rangos')}</p>
              <p className="mt-0.5 text-[12px] prog-text-3">{t('progression.ladderView.allHint', 'Los 8 rangos y sus subrangos, con el ELO de cada uno')}</p>
            </div>
            <ChevronRight size={20} className="prog-text-3" />
          </div>
          <div className="relative mt-4 flex items-center justify-between">
            <div className="absolute left-3 right-3 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: 'rgb(var(--p-line) / 0.08)' }} />
            <div className="absolute left-3 top-1/2 h-[3px] -translate-y-1/2 rounded-full origin-left" style={{ right: 12, transform: `translateY(-50%) scaleX(${standing.rankIndex / (RANKS.length - 1)})`, background: 'linear-gradient(90deg, var(--rank-from), var(--rank-to))' }} />
            {RANKS.map((r, i) => (
              <div key={r.id} className="relative flex items-center justify-center" style={{ width: 34, height: 34, opacity: i > standing.rankIndex ? 0.4 : 1, filter: i > standing.rankIndex ? 'grayscale(0.7)' : undefined }}>
                {i === standing.rankIndex && <span className="absolute inset-[-6px] rounded-full arena-pulse" style={{ background: 'rgb(var(--rank) / 0.25)' }} />}
                <RankBadge rankIndex={i} division={i === LEGEND_INDEX ? null : 0} size={i === standing.rankIndex ? 32 : 24} />
              </div>
            ))}
          </div>
        </button>
      </motion.div>

      {/* ── History ── */}
      <motion.div {...rise(5, reduce)}>
        <Card className="p-4">
          <SectionHead kicker={t('progression.history.kicker', 'Cada punto, explicado')} title={t('progression.historyTitle', 'Historial de ELO')} icon={<Clock size={16} />} />
          {history.length === 0 ? (
            <EmptyState icon={<Trophy size={26} />} title={t('progression.historyEmpty', 'Aún no hay movimientos')} text={t('progression.historyEmptyHint', 'Completa hábitos, tareas o una hora de foco para estrenar tu historial.')} />
          ) : (
            <VirtualList
              items={history} rowHeight={50} height={Math.min(400, history.length * 50)} getKey={(r, i) => r.kind === 'day' ? `d:${r.dayKey}` : `e:${r.e.id}:${i}`} ariaLabel={t('progression.historyTitle', 'Historial de ELO')}
              renderRow={r => r.kind === 'day' ? (
                <div className="h-full flex items-end justify-between pb-1.5 pr-1">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] prog-text-3 first-letter:uppercase">{dayTitle(r.dayKey, today)}</span>
                  <Delta value={r.total} className="text-[12px]" />
                </div>
              ) : (
                <div className="h-full flex items-center gap-3">
                  <span className="relative w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center" style={{ background: r.e.amount > 0 ? 'rgb(var(--p-positive) / 0.12)' : 'rgb(var(--p-negative) / 0.12)', color: r.e.amount > 0 ? 'rgb(var(--p-positive))' : 'rgb(var(--p-negative))' }}>
                    {REASON_ICON[r.e.source === 'PROJECT_GOAL' ? 'PROJECT_GOAL_MISSED' : r.e.reason] ?? <Zap size={15} />}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[13px]">{describe(r.e)}</span>
                  <Delta value={r.e.amount} className="text-[14px] pr-1" />
                </div>
              )}
            />
          )}
        </Card>
      </motion.div>
    </div>
  );
};

/** Three segments, one per sub-rank: passed ones full, the current one partial. */
const DivisionTrack: React.FC<{ division: number; progress: number }> = ({ division, progress }) => {
  const reduce = useReducedMotion();
  return (
    <div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((division + progress) / 3) * 100)}>
      {[0, 1, 2].map(d => {
        const v = d < division ? 1 : d === division ? progress : 0;
        return (
          <div key={d} className="flex-1">
            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.08)' }}>
              <motion.div
                className="absolute inset-0 rounded-full origin-left"
                style={{ background: 'linear-gradient(90deg, var(--rank-from), var(--rank-to))', boxShadow: d === division ? '0 0 12px rgb(var(--rank) / 0.6)' : undefined }}
                initial={{ scaleX: reduce ? v : 0 }} animate={{ scaleX: v }}
                transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.25 + d * 0.18, ease: MOTION.easeOut }}
              />
            </div>
            <p className="mt-1 text-[10px] font-black tracking-[0.12em]" style={{ color: d <= division ? 'rgb(var(--rank))' : 'rgb(var(--p-text-3))' }}>{['I', 'II', 'III'][d]}</p>
          </div>
        );
      })}
    </div>
  );
};

// ── Leaderboard tab ─────────────────────────────────────────────────────────

const avatarSrc = (id: string | null | undefined) => getAvatarPath(id ?? undefined) || AVATAR_FALLBACK;

const BoardTab: React.FC<{ snap: ProgressionSnapshot; userName?: string | null; avatarId?: string | null }> = ({ snap, userName, avatarId }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const lb = snap.leaderboard;
  const social = useSocial();
  const [scope, setScope] = useState<'GLOBAL' | 'FRIENDS'>('GLOBAL');
  const friendRows = useMemo<LeaderboardRow[]>(() => {
    const mine: LeaderboardRow = { user_id: snap.userId ?? 'me', display_name: userName ?? null, avatar_id: avatarId ?? null, elo: snap.summary.elo, rank_index: snap.summary.rankIndex, level: snap.level.level };
    const others = social.friends.map(f => ({ user_id: f.profile.user_id, display_name: f.profile.display_name, avatar_id: f.profile.avatar_id, elo: f.profile.elo, rank_index: f.profile.rank_index, level: f.profile.level }));
    return [mine, ...others].sort((x, y) => y.elo - x.elo);
  }, [social.friends, snap.userId, snap.summary.elo, snap.summary.rankIndex, snap.level.level, userName, avatarId]);
  useEffect(() => {
    if (lb.status === 'IDLE' || (lb.status === 'READY' && Date.now() - lb.fetchedAt > 60_000)) {
      progressionStore.refreshLeaderboard({ displayName: userName, avatarId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const friendsScope = scope === 'FRIENDS';
  if (!friendsScope && (lb.status === 'LOADING' || lb.status === 'IDLE')) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="prog-skeleton h-[220px] rounded-[24px]" />
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="prog-skeleton h-14" />)}
      </div>
    );
  }
  if (!friendsScope && lb.status === 'UNAVAILABLE') {
    return <EmptyState icon={<Users size={28} />} title={t('progression.board.unavailable', 'Clasificación no disponible')} text={t('progression.board.unavailableHint', 'No se pudo conectar con la clasificación. Inténtalo más tarde.')} />;
  }

  const rows = friendsScope ? friendRows : (lb.status === 'READY' ? lb.rows : []);
  const myPosition = friendsScope ? friendRows.findIndex(r => r.user_id === (snap.userId ?? 'me')) + 1 : (lb.status === 'READY' ? lb.myPosition : null);
  const legends = rows.filter(r => r.rank_index === LEGEND_INDEX);
  const me = snap.userId;
  const name = (r: LeaderboardRow) => (r.display_name || t('progression.board.anonymous', 'Jugador')).split('@')[0];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  const Row = (r: LeaderboardRow, i: number) => (
    <div className="h-full py-1">
      <div className="h-full flex items-center gap-3 px-3 rounded-[16px]" style={{ ...rankStyle(r.rank_index), background: r.user_id === me ? 'rgb(var(--rank) / 0.14)' : 'rgb(var(--p-line) / 0.035)', boxShadow: r.user_id === me ? 'inset 0 0 0 1px rgb(var(--rank) / 0.4)' : undefined }}>
        <span className="w-7 text-center text-[13px] font-black tabular-nums prog-text-3">{i + 4}</span>
        <img src={avatarSrc(r.avatar_id)} alt="" className="w-9 h-9 rounded-full object-cover object-[50%_20%]" style={{ boxShadow: '0 0 0 2px rgb(var(--rank) / 0.7)' }} onError={e => { e.currentTarget.src = AVATAR_FALLBACK; }} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate">{name(r)}{r.user_id === me ? ` · ${t('progression.board.you', 'tú')}` : ''}</p>
          <p className="text-[11px] prog-text-3">{RANKS[r.rank_index]?.name} · Nv {r.level}</p>
        </div>
        <RankBadge rankIndex={r.rank_index} division={r.rank_index === LEGEND_INDEX ? null : 0} size={26} />
        <span className="w-12 text-right text-[14px] font-black tabular-nums" style={{ color: 'rgb(var(--rank))' }}>{r.elo}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Segmented
        label={t('progression.board.scope', 'Clasificación')}
        value={scope}
        onChange={setScope}
        options={[
          { id: 'GLOBAL', label: t('progression.board.global', 'Global') },
          { id: 'FRIENDS', label: `${t('progression.board.friends', 'Amigos')}${social.friends.length ? ` · ${social.friends.length}` : ''}` },
        ]}
      />
      {friendsScope && social.friends.length === 0 && (
        <button type="button" onClick={() => window.dispatchEvent(new Event('open-friends'))} className="prog-tap w-full arena-card p-3.5 flex items-center gap-3 text-left">
          <span className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--rank) / 0.14)', color: 'rgb(var(--rank))' }}><Users size={18} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-black">{t('progression.board.inviteTitle', 'Compite con tus amigos')}</span>
            <span className="block text-[12px] prog-text-3">{t('progression.board.inviteHint', 'Añade amigos para ver quién va primero.')}</span>
          </span>
          <ChevronRight size={18} className="prog-text-3" />
        </button>
      )}
      {/* My position */}
      <Card glow className="p-4 flex items-center gap-4">
        <RankBadge rankIndex={snap.standing.rankIndex} division={snap.standing.division} size={56} animate />
        <div className="flex-1 min-w-0">
          <p className="arena-kicker">{t('progression.board.position', 'Tu posición')}</p>
          <p className="text-[34px] font-black leading-none tabular-nums arena-grad-text">#{myPosition ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-black tabular-nums">{snap.summary.elo}</p>
          <p className="text-[10.5px] prog-text-3">ELO</p>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title={t('progression.board.empty', 'Sé el primero en la tabla')} text={t('progression.board.emptyHint', 'Tu ELO aparecerá aquí en cuanto lo publiques.')} />
      ) : (
        <>
          {/* Podium: 2 · 1 · 3 */}
          <section className="relative pt-4">
            <div className="grid grid-cols-3 items-end gap-2">
              {[1, 0, 2].map(pos => {
                const r = podium[pos];
                if (!r) return <div key={pos} />;
                const h = [128, 96, 76][pos];
                const crown = ['#fde047', '#e2e8f0', '#f59e0b'][pos];
                return (
                  <motion.div key={r.user_id} className="flex flex-col items-center" style={rankStyle(r.rank_index)} {...rise(pos, reduce)}>
                    <div className="relative mb-2">
                      {pos === 0 && <Crown size={22} className="absolute -top-5 left-1/2 -translate-x-1/2" style={{ color: crown, filter: 'drop-shadow(0 2px 6px rgb(0 0 0 / 0.5))' }} />}
                      <img src={avatarSrc(r.avatar_id)} alt="" className="rounded-full object-cover object-[50%_20%]" style={{ width: pos === 0 ? 72 : 58, height: pos === 0 ? 72 : 58, boxShadow: `0 0 0 3px ${crown}, 0 10px 24px -8px rgb(var(--rank) / 0.8)` }} onError={e => { e.currentTarget.src = AVATAR_FALLBACK; }} />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: crown, color: '#111' }}>{pos + 1}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] font-black truncate max-w-full px-1">{name(r)}</p>
                    <p className="text-[11px] font-bold tabular-nums" style={{ color: 'rgb(var(--rank))' }}>{r.elo} ELO</p>
                    <div className="arena-step w-full mt-2 flex items-start justify-center pt-2" style={{ height: h }}>
                      <RankBadge rankIndex={r.rank_index} division={r.rank_index === LEGEND_INDEX ? null : 0} size={pos === 0 ? 40 : 32} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="h-px" style={{ background: 'rgb(var(--p-line) / 0.12)' }} />
          </section>

          {legends.length > 0 && (
            <Card className="p-4" style={rankStyle(LEGEND_INDEX)}>
              <SectionHead title={t('progression.board.legends', 'Leyendas')} icon={<Crown size={16} />} />
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {legends.map((r, i) => (
                  <div key={r.user_id} className="shrink-0 w-[92px] flex flex-col items-center text-center rounded-[16px] p-2 arena-inset">
                    <RankBadge rankIndex={LEGEND_INDEX} division={null} size={44} />
                    <p className="mt-1 text-[12px] font-black arena-rainbow-text">#{i + 1}</p>
                    <p className="text-[11.5px] font-bold truncate max-w-full">{name(r)}</p>
                    <p className="text-[10.5px] prog-text-3 tabular-nums">{r.elo}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {rest.length > 0 && (
            <section>
              <p className="arena-kicker mb-2 px-1">{t('progression.board.general', 'General')}</p>
              <VirtualList items={rest} rowHeight={62} height={Math.min(560, rest.length * 62)} getKey={r => r.user_id} renderRow={(r, i) => Row(r, i)} ariaLabel={t('progression.board.general', 'General')} />
            </section>
          )}
        </>
      )}
    </div>
  );
};

// ── Weekly tab ──────────────────────────────────────────────────────────────

const WD = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const WeekTab: React.FC<{ snap: ProgressionSnapshot; quests: Quest[]; projects: Project[]; userName?: string | null }> = ({ snap, quests, projects, userName }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const today = progressionStore.todayKey();
  const start = addDaysToKey(today, -6);

  const { input, summary } = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
    const prevDays = Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i - 7));
    const minutes = days.map(d => ({ dayKey: d, minutes: focusMinutesOn(projects, d) }));
    const sessions = projects.flatMap(p => p.sessions || []).filter(s => sessionKey(s) >= start && sessionKey(s) <= today);
    const closes = days.map(d => snap.engine.dayCloses[d]).filter(c => c && c.habitRatio !== null);
    const before = replay({ ...snap.engine, events: snap.engine.events.filter(e => e.dayKey < start) });
    const startStanding = getStanding(before.elo, before.rankIndex);
    const slotMinutes = new Map<TimeSlot, number>();
    sessions.filter(s => !isManualSession(s)).forEach(s => {
      const slot = slotOf(new Date(s.date).getHours());
      slotMinutes.set(slot, (slotMinutes.get(slot) ?? 0) + (s.duration || 0) / 60);
    });
    const bestSlot = [...slotMinutes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const best = [...minutes].sort((a, b) => b.minutes - a.minutes)[0];
    const memory: ReportMemory = snap.meta.weeklyMemory ?? emptyMemory();
    const input = {
      weekStartKey: start,
      todayKey: today,
      userName,
      focusMinutes: Math.round(minutes.reduce((s, d) => s + d.minutes, 0)),
      prevFocusMinutes: Math.round(prevDays.reduce((s, d) => s + focusMinutesOn(projects, d), 0)),
      sessions: sessions.length,
      habitRatioAvg: closes.length ? closes.reduce((s, c) => s + (c!.habitRatio as number), 0) / closes.length : null,
      habitDaysMet: closes.filter(c => (c!.habitRatio as number) >= 1).length,
      tasksDone: quests.filter(q => q.completed && q.completedAt && getHistoryDateKey(q.completedAt) >= start && getHistoryDateKey(q.completedAt) <= today).length,
      eloDelta: days.reduce((s, d) => s + dayTotal(snap.engine, d), 0),
      startLabel: startStanding.label,
      endLabel: snap.standing.label,
      rankChange: compareStandings(startStanding, snap.standing),
      bestDay: best && best.minutes > 0 ? { dayKey: best.dayKey, minutes: Math.round(best.minutes) } : null,
      bestSlot,
      streak: snap.summary.streak,
      memory,
    };
    return { input, summary: generateWeeklySummary(input) };
  }, [start, today, projects, quests, snap.engine, snap.standing, snap.summary.streak, snap.meta.weeklyMemory, userName]);

  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
  const totals = days.map(d => dayTotal(snap.engine, d));
  const maxAbs = Math.max(1, ...totals.map(Math.abs));
  const focusH = Math.floor(input.focusMinutes / 60);
  const focusM = input.focusMinutes % 60;
  const focusTrend = input.prevFocusMinutes > 0 ? Math.round(((input.focusMinutes - input.prevFocusMinutes) / input.prevFocusMinutes) * 100) : null;
  const toneColor = summary.tone === 'EXCELLENT' || summary.tone === 'GOOD' ? 'rgb(var(--p-positive))' : summary.tone === 'DIFFICULT' ? 'rgb(var(--p-warning))' : 'rgb(var(--rank))';

  return (
    <div className="space-y-4">
      <Card glow className="p-5 overflow-hidden">
        <div className="absolute -right-4 -top-6 text-[140px] leading-none font-black opacity-[0.05] select-none" aria-hidden="true">“</div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-[11px] flex items-center justify-center" style={{ background: 'rgb(var(--rank) / 0.16)', color: toneColor }}><Sparkles size={16} /></span>
          <div>
            <p className="arena-kicker leading-none">{t('progression.week.kicker', 'Crónica de 7 días')}</p>
            <p className="text-[15px] font-black leading-tight">{t('progression.week.title', 'Tu semana')}</p>
          </div>
        </div>
        <Typewriter key={summary.text} text={summary.text} cps={260} className="relative mt-3 text-[15.5px] leading-[1.65]" />
      </Card>

      <motion.section className="grid grid-cols-2 gap-2.5" {...rise(1, reduce)}>
        <StatTile icon={<Timer size={16} />} label={t('progression.week.focus', 'Foco total')} value={`${focusH}h ${focusM}m`}
          sub={focusTrend !== null ? <p className={`mt-0.5 text-[11px] font-bold ${focusTrend >= 0 ? 'prog-positive' : 'prog-negative'}`}>{focusTrend >= 0 ? '▲' : '▼'} {Math.abs(focusTrend)} % {t('progression.week.vsPrev', 'vs semana anterior')}</p> : null} />
        <StatTile icon={<Zap size={16} />} label={t('progression.week.eloDelta', 'ELO de la semana')} value={<Delta value={input.eloDelta} />} sub={<p className="mt-0.5 text-[11px] prog-text-3 truncate">{input.startLabel} → {input.endLabel}</p>} />
        <StatTile icon={<Repeat size={16} />} tint="#34d399" label={t('progression.week.habitDays', 'Días con meta de hábitos')} value={`${input.habitDaysMet}/7`} />
        <StatTile icon={<ListChecks size={16} />} tint="#a78bfa" label={t('progression.week.tasks', 'Tareas completadas')} value={input.tasksDone} />
      </motion.section>

      <motion.div {...rise(2, reduce)}>
        <Card className="p-4">
          <SectionHead title={t('progression.week.elo', 'ELO por día')} icon={<TrendingUp size={16} />} />
          <div className="relative h-[168px]" role="img" aria-label={totals.map((v, i) => `${days[i]}: ${v}`).join(', ')}>
            <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: 'rgb(var(--p-line) / 0.14)' }} />
            <div className="absolute inset-0 grid grid-cols-7 gap-2">
              {totals.map((v, i) => {
                const k = Math.max(0.03, Math.abs(v) / maxAbs);
                const isToday = days[i] === today;
                return (
                  <div key={days[i]} className="relative flex flex-col items-center">
                    <div className="relative w-full flex-1 flex items-end justify-center">
                      {v >= 0 && (
                        <motion.div className="w-full max-w-[28px] rounded-t-[8px] rounded-b-[3px] origin-bottom" style={{ height: '82%', background: 'linear-gradient(to top, var(--rank-from), var(--rank-to))', boxShadow: isToday ? '0 0 16px rgb(var(--rank) / 0.6)' : undefined }}
                          initial={{ scaleY: reduce ? k : 0 }} animate={{ scaleY: k }} transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : i * 0.05, ease: MOTION.easeOut }} />
                      )}
                      {v > 0 && <span className="absolute text-[10.5px] font-black prog-positive tabular-nums" style={{ bottom: `calc(${k * 82}% + 4px)` }}>+{v}</span>}
                    </div>
                    <div className="relative w-full flex-1 flex items-start justify-center">
                      {v < 0 && (
                        <motion.div className="w-full max-w-[28px] rounded-b-[8px] rounded-t-[3px] origin-top" style={{ height: '82%', background: 'linear-gradient(to bottom, rgb(var(--p-negative) / 0.9), rgb(var(--p-negative) / 0.35))' }}
                          initial={{ scaleY: reduce ? k : 0 }} animate={{ scaleY: k }} transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : i * 0.05, ease: MOTION.easeOut }} />
                      )}
                      {v < 0 && <span className="absolute text-[10.5px] font-black prog-negative tabular-nums" style={{ top: `calc(${k * 82}% + 4px)` }}>{v}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2 text-center">
            {days.map(d => (
              <span key={d} className="text-[11px] font-black" style={{ color: d === today ? 'rgb(var(--rank))' : 'rgb(var(--p-text-3))' }}>
                {WD[new Date(`${d}T12:00:00`).getDay()]}
              </span>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

// ── Settings tab ────────────────────────────────────────────────────────────

const CUTOFFS = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'];

const SettingsTab: React.FC<{ snap: ProgressionSnapshot; habits: Habit[]; projects: Project[]; onUpdateProject: (p: Project) => void }> = ({ snap, habits, projects, onUpdateProject }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { meta } = snap;
  const active = projects.filter(p => !p.archived && !p.deleted && !p.completed);
  const goalPct = habitGoalPctFor(habits, progressionStore.todayKey());

  const setGoal = (p: Project, minutes: number) => onUpdateProject({ ...p, dailyFocusGoalMinutes: Math.max(0, Math.min(600, minutes)) });

  return (
    <div className="space-y-4">
      <motion.div {...rise(0, reduce)}>
        <Card glow className="p-4 flex items-center gap-4">
          <div className="relative w-[68px] h-[68px] shrink-0">
            <svg viewBox="0 0 68 68" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
              <circle cx="34" cy="34" r="29" fill="none" stroke="rgb(var(--p-line) / 0.09)" strokeWidth="7" />
              <circle cx="34" cy="34" r="29" fill="none" stroke="rgb(var(--rank))" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(goalPct / 100) * 182.2} 182.2`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[15px] font-black tabular-nums">{goalPct}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-black flex items-center gap-1.5"><Target size={15} style={{ color: 'rgb(var(--rank))' }} /> {t('progression.settings.habitGoal', 'Meta diaria de hábitos')}</p>
            <p className="mt-1 text-[12px] leading-relaxed prog-text-3">{t('progression.settings.habitGoalAuto', 'La marca tu racha de hábitos: 40 % los primeros días y sube hasta 85 %.')}</p>
          </div>
        </Card>
      </motion.div>

      <motion.div {...rise(1, reduce)}>
        <Card className="p-4">
          <SectionHead title={t('progression.settings.frame', 'Marco de perfil')} icon={<Crown size={16} />} />
          <p className="-mt-2 mb-3 text-[12px] prog-text-3">{t('progression.settings.frameHint', 'Ganas el marco de cada rango al alcanzarlo y queda en tu inventario. Ponértelo es opcional.')}</p>
          <FrameInventory compact />
        </Card>
      </motion.div>

      <motion.div {...rise(1, reduce)}>
        <Card className="p-4">
          <SectionHead title={t('progression.settings.cutoff', 'Hora de corte del día')} icon={<Moon size={16} />} />
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }} role="radiogroup" aria-label={t('progression.settings.cutoff', 'Hora de corte del día')}>
            {CUTOFFS.map(c => {
              const on = meta.dayCutoff === c;
              return (
                <button key={c} type="button" role="radio" aria-checked={on} onClick={() => progressionStore.updateSettings({ dayCutoff: c })}
                  className="prog-tap shrink-0 rounded-[14px] px-3.5 text-[13px] font-black tabular-nums"
                  style={on ? { background: 'linear-gradient(100deg, var(--rank-from), var(--rank-to))', color: '#0b0b10' } : { background: 'rgb(var(--p-line) / 0.06)', color: 'rgb(var(--p-text-2))' }}>
                  {c}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] prog-text-3">{t('progression.settings.cutoffHint', 'Lo que hagas antes de esta hora cuenta para el día anterior.')}</p>
        </Card>
      </motion.div>

      <motion.div {...rise(2, reduce)}>
        <Card className="p-4">
          <SectionHead title={t('progression.settings.projectGoals', 'Meta diaria de foco por proyecto')} icon={<Timer size={16} />} />
          <p className="-mt-2 mb-3 text-[12px] prog-text-3">{t('progression.settings.projectGoalsHint', 'Si no la cumples con el temporizador: −2 ELO por proyecto.')}</p>
          {active.length === 0 ? (
            <p className="text-[13px] prog-text-2">{t('progression.settings.noProjects', 'Aún no tienes proyectos activos.')}</p>
          ) : (
            <ul className="space-y-2">
              {active.map(p => {
                const goal = p.dailyFocusGoalMinutes ?? 0;
                return (
                  <li key={p.id} className="flex items-center gap-2 rounded-[16px] pl-3 pr-1.5 py-1.5 arena-inset">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || 'rgb(var(--rank))', boxShadow: `0 0 10px ${p.color || 'rgb(var(--rank))'}` }} />
                    <span className="flex-1 min-w-0 truncate text-[14px] font-semibold">{p.title}</span>
                    <button type="button" className="prog-tap rounded-[12px] flex items-center justify-center" style={{ background: 'rgb(var(--p-line) / 0.07)' }} onClick={() => setGoal(p, goal - 15)} aria-label={t('progression.settings.less', 'Menos')}><Minus size={16} /></button>
                    <span className="w-[68px] text-center text-[13px] font-black tabular-nums" style={{ color: goal ? 'rgb(var(--rank))' : 'rgb(var(--p-text-3))' }}>{goal ? `${goal} min` : t('progression.settings.none', 'Sin meta')}</span>
                    <button type="button" className="prog-tap rounded-[12px] flex items-center justify-center" style={{ background: 'rgb(var(--p-line) / 0.07)' }} onClick={() => setGoal(p, goal + 15)} aria-label={t('progression.settings.more', 'Más')}><Plus size={16} /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </motion.div>

      <motion.div {...rise(3, reduce)}>
        <Card className="p-1.5">
          <Toggle icon={<FileText size={17} />} label={t('progression.settings.reports', 'Informe al completar')} hint={t('progression.settings.reportsHint', 'Un resumen con métricas cada vez que completas algo')} value={meta.reportsEnabled} onChange={v => progressionStore.updateSettings({ reportsEnabled: v })} />
          <Toggle icon={<Vibrate size={17} />} label={t('progression.settings.haptics', 'Vibración')} value={meta.hapticsEnabled} onChange={v => progressionStore.updateSettings({ hapticsEnabled: v })} />
          <Toggle icon={<Volume2 size={17} />} label={t('progression.settings.sound', 'Efectos de sonido')} value={meta.soundEnabled} onChange={v => progressionStore.updateSettings({ soundEnabled: v })} />
        </Card>
      </motion.div>

      <motion.div {...rise(4, reduce)}>
        <Card className="p-4">
          <SectionHead title={t('progression.settings.theme', 'Tema de progresión')} icon={<Palette size={16} />} />
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {(['DARK', 'LIGHT', 'SYSTEM'] as const).map(a => {
              const on = meta.appearance === a;
              const preview = a === 'DARK' ? ['#0b0b10', '#1d1d25'] : a === 'LIGHT' ? ['#f6f6fa', '#ffffff'] : ['#0b0b10', '#f6f6fa'];
              return (
                <button key={a} type="button" role="radio" aria-checked={on} onClick={() => progressionStore.updateSettings({ appearance: a })}
                  className="prog-tap rounded-[16px] p-2 flex flex-col items-center gap-2"
                  style={{ background: on ? 'rgb(var(--rank) / 0.14)' : 'rgb(var(--p-line) / 0.04)', boxShadow: on ? 'inset 0 0 0 1.5px rgb(var(--rank))' : 'inset 0 0 0 1px rgb(var(--p-line) / 0.08)' }}>
                  <span className="w-full h-12 rounded-[10px] overflow-hidden flex" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--p-line) / 0.1)' }}>
                    <span className="flex-1" style={{ background: preview[0] }} />
                    <span className="flex-1" style={{ background: preview[1] }} />
                  </span>
                  <span className="text-[12.5px] font-bold" style={{ color: on ? 'rgb(var(--rank))' : 'rgb(var(--p-text-2))' }}>
                    {a === 'DARK' ? t('progression.settings.dark', 'Oscuro') : a === 'LIGHT' ? t('progression.settings.light', 'Claro') : t('progression.settings.system', 'Sistema')}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
