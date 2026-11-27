// ─────────────────────────────────────────────────────────────────────────────
// ELO COACH UI — "How do I earn ELO today?", personalised with the user's own
// habits, tasks, focus and projects. Shown at the top of Progresión → Rango
// (what opens when the rank insignia is tapped), plus a full rules guide.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Check, ChevronRight, Crown, Flame, HeartCrack, ListChecks, Repeat, Shield, ShieldCheck, Sparkles, Target, Timer, TrendingUp, Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Habit, Project, Quest } from '@/types';
import { PROGRESSION_CONFIG } from '../engine';
import { buildEloCoach, type CoachStep, type EloCoach } from '../coach';
import { progressionStore, type ProgressionSnapshot } from '../progressionStore';
import { ArenaSheet, Card, Delta, rise } from './arena';
import { RankBadge } from './RankBadge';
import { rankStyle } from './tokens';

const ELO = PROGRESSION_CONFIG.ELO;

const useTr = () => {
  const { i18n } = useTranslation();
  const es = !(i18n.language || 'es').toLowerCase().startsWith('en');
  return { es, tr: (s: string, e: string) => (es ? s : e) };
};

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

type Tone = 'gain' | 'risk' | 'done' | 'info';
const TONE: Record<Tone, string> = {
  gain: 'rgb(var(--rank))',
  risk: 'rgb(var(--p-negative))',
  done: 'rgb(var(--p-positive))',
  info: 'rgb(var(--p-text-3))',
};

const Chips: React.FC<{ items: string[]; max?: number }> = ({ items, max = 5 }) => {
  if (!items.length) return null;
  const shown = items.slice(0, max);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {shown.map((n, i) => (
        <span key={`${n}-${i}`} className="max-w-[190px] truncate rounded-full px-2.5 py-1 text-[11.5px] font-semibold arena-inset">{n}</span>
      ))}
      {items.length > max && <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold prog-text-3 arena-inset">+{items.length - max}</span>}
    </div>
  );
};

const Mission: React.FC<{
  icon: React.ReactNode; tone: Tone; title: string; value?: number; status: string; lines?: React.ReactNode[]; children?: React.ReactNode; i: number;
}> = ({ icon, tone, title, value, status, lines, children, i }) => {
  const reduce = useReducedMotion();
  return (
    <motion.li {...rise(i, reduce)} className="rounded-[20px] p-3.5 arena-inset">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-[13px] flex items-center justify-center" style={{ background: `color-mix(in srgb, ${TONE[tone]} 16%, transparent)`, color: TONE[tone] }}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14.5px] font-black leading-tight">{title}</p>
            {value !== undefined && <Delta value={value} className="text-[15px]" />}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: tone === 'info' ? 'rgb(var(--p-text-2))' : TONE[tone] }}>{status}</p>
          {lines?.map((l, k) => <div key={k} className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug prog-text-2"><ArrowRight size={13} className="mt-[2px] shrink-0 prog-text-3" /><span>{l}</span></div>)}
          {children}
        </div>
      </div>
    </motion.li>
  );
};

/** The next one or two compliance steps, in words. */
const stepLines = (steps: CoachStep[], noun: [string, string], tr: (s: string, e: string) => string) =>
  steps.slice(0, 2).map(s => (
    <>
      {tr('Completa ', 'Complete ')}<b>{s.more} {s.more === 1 ? noun[0] : noun[1]}</b>{tr(' más → ', ' more → ')}
      <b className={s.amount >= 0 ? 'prog-positive' : 'prog-negative'}>{signed(s.amount)} ELO</b>
    </>
  ));

export const EloCoachCard: React.FC<{
  snap: ProgressionSnapshot; habits: Habit[]; quests: Quest[]; projects: Project[]; userName?: string | null; onOpenGuide: () => void;
}> = ({ snap, habits, quests, projects, userName, onOpenGuide }) => {
  const { tr } = useTr();
  const reduce = useReducedMotion();
  const today = progressionStore.todayKey();
  const shieldToday = !!progressionStore.shieldActiveToday();
  const coach = useMemo<EloCoach>(
    () => buildEloCoach(snap.engine, { habits, quests, projects, meta: snap.meta, streak: snap.summary.streak, shieldToday }, today),
    [snap.engine, snap.meta, snap.summary.streak, habits, quests, projects, today, shieldToday],
  );
  const name = (userName || '').split(' ')[0];
  const gap = Math.max(0, coach.best - coach.now);
  const pct = coach.best > 0 ? Math.max(0, Math.min(1, coach.now / coach.best)) : coach.now > 0 ? 1 : 0;
  const nothingPlanned = !coach.habits && !coach.tasks && coach.projects.length === 0;

  const missions: React.ReactNode[] = [];
  let i = 0;

  // Habits
  if (coach.habits) {
    const h = coach.habits;
    const met = h.needForGoal === 0;
    missions.push(
      <Mission key="h" i={i++} icon={<Repeat size={18} />} tone={met ? 'done' : h.now < 0 ? 'risk' : 'gain'} value={h.now}
        title={tr(`Hábitos de hoy · ${h.completed}/${h.scheduled}`, `Today's habits · ${h.completed}/${h.scheduled}`)}
        status={met
          ? tr(`Meta del ${h.goalPct}% cumplida.`, `${h.goalPct}% goal reached.`) + (h.steps.length ? tr(' Aún puedes subir a excelente.', ' You can still reach excellent.') : '')
          : tr(`Tu meta hoy es el ${h.goalPct}%: te faltan ${h.needForGoal} para cumplirla.`, `Today's goal is ${h.goalPct}%: ${h.needForGoal} more to reach it.`)}
        lines={stepLines(h.steps, [tr('hábito', 'habit'), tr('hábitos', 'habits')], tr)}
      >
        <Chips items={h.pending} />
        {h.flexibleOpen > 0 && <p className="mt-1.5 text-[11.5px] prog-text-3">{tr(`Además tienes ${h.flexibleOpen} hábito(s) flexibles: hacerlos hoy también suma.`, `You also have ${h.flexibleOpen} flexible habit(s): doing them today counts too.`)}</p>}
      </Mission>,
    );
  } else {
    missions.push(
      <Mission key="h" i={i++} icon={<Repeat size={18} />} tone="info" title={tr('Hábitos', 'Habits')}
        status={tr('Hoy no te toca ningún hábito.', 'No habits are due today.')}
        lines={[tr(`Crea un hábito diario: cumplir tu meta de hábitos da +${ELO.COMPLIANCE.MET_DELTA} y hasta +${ELO.COMPLIANCE.EXCELLENT_DELTA} cada día.`, `Create a daily habit: meeting your habit goal gives +${ELO.COMPLIANCE.MET_DELTA} and up to +${ELO.COMPLIANCE.EXCELLENT_DELTA} every day.`)]} />,
    );
  }

  // Tasks
  if (coach.tasks) {
    const tk = coach.tasks;
    const all = tk.completed >= tk.planned;
    missions.push(
      <Mission key="t" i={i++} icon={<ListChecks size={18} />} tone={all ? 'done' : tk.now < 0 ? 'risk' : 'gain'} value={tk.now}
        title={tr(`Tareas con fecha de hoy · ${tk.completed}/${tk.planned}`, `Tasks due today · ${tk.completed}/${tk.planned}`)}
        status={all ? tr('¡Todas hechas! Ya tienes el máximo de tareas.', 'All done! You already have the task maximum.') : tr('Cuantas más completes, más sube.', 'The more you complete, the more you earn.')}
        lines={stepLines(tk.steps, [tr('tarea', 'task'), tr('tareas', 'tasks')], tr)}
      >
        <Chips items={tk.pending} />
      </Mission>,
    );
  } else {
    missions.push(
      <Mission key="t" i={i++} icon={<ListChecks size={18} />} tone="info" title={tr('Tareas', 'Tasks')}
        status={tr('No tienes tareas con fecha de hoy.', 'You have no tasks due today.')}
        lines={[tr(`Ponle la fecha de hoy a una tarea y complétala: hasta +${ELO.COMPLIANCE.MET_DELTA} ELO.`, `Give a task today's date and complete it: up to +${ELO.COMPLIANCE.MET_DELTA} ELO.`)]} />,
    );
  }

  // Focus
  const f = coach.focus;
  missions.push(
    <Mission key="f" i={i++} icon={<Timer size={18} />} tone={f.nextIn === null ? 'done' : 'gain'} value={f.earned}
      title={tr(`Foco con temporizador · ${fmtMin(f.minutes)}`, `Timer focus · ${fmtMin(f.minutes)}`)}
      status={f.nextIn === null
        ? tr(`Llegaste al tope de +${f.cap} por foco hoy.`, `You hit today's +${f.cap} focus cap.`)
        : tr(`Te faltan ${fmtMin(f.nextIn)} para el siguiente +1.`, `${fmtMin(f.nextIn)} left for the next +1.`)}
      lines={[tr(`Cada ${f.perPoint} min de foco con temporizador = +1 ELO (máx. +${f.cap} al día). Este punto se gana al instante.`, `Every ${f.perPoint} min of timer focus = +1 ELO (max +${f.cap} a day). Earned instantly.`), tr('Las sesiones manuales dan XP pero no ELO.', 'Manual sessions give XP but no ELO.')]} />,
  );

  // Projects
  if (coach.projects.length) {
    const missing = coach.projects.filter(p => p.missing > 0);
    missions.push(
      <Mission key="p" i={i++} icon={<Target size={18} />} tone={missing.length ? 'risk' : 'done'} value={coach.projectsNow}
        title={tr('Metas de foco de tus proyectos', 'Your projects\' focus goals')}
        status={missing.length
          ? tr(`${missing.length} proyecto(s) sin cumplir: ${ELO.PROJECT_GOAL_MISS_DELTA} ELO cada uno al cerrar el día.`, `${missing.length} project(s) not met: ${ELO.PROJECT_GOAL_MISS_DELTA} ELO each at day close.`)
          : tr('Todas las metas de hoy cumplidas. Sin penalización.', 'All of today\'s goals met. No penalty.')}
      >
        <ul className="mt-2 space-y-1.5">
          {coach.projects.map(p => (
            <li key={p.id} className="text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || 'rgb(var(--rank))' }} />
                <span className="flex-1 min-w-0 truncate font-semibold">{p.title}</span>
                <span className="tabular-nums font-black" style={{ color: p.missing ? 'rgb(var(--p-negative))' : 'rgb(var(--p-positive))' }}>
                  {p.missing ? tr(`faltan ${fmtMin(p.missing)}`, `${fmtMin(p.missing)} left`) : <Check size={14} />}
                </span>
              </div>
              <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.08)' }}>
                <div className="h-full rounded-full origin-left" style={{ transform: `scaleX(${Math.min(1, p.done / Math.max(1, p.goal))})`, background: p.missing ? 'linear-gradient(90deg, var(--rank-from), var(--rank-to))' : 'rgb(var(--p-positive))' }} />
              </div>
              <p className="mt-0.5 text-[11px] prog-text-3 tabular-nums">{p.done}/{p.goal} min{p.manual ? tr(` · ${p.manual} min manuales no cuentan`, ` · ${p.manual} manual min don't count`) : ''}</p>
            </li>
          ))}
        </ul>
      </Mission>,
    );
  }

  // Streak
  const s = coach.streak;
  missions.push(
    <Mission key="s" i={i++} icon={<Flame size={18} className="arena-flame" />} tone={s.bonusToday ? 'gain' : 'info'} value={s.bonusToday || undefined}
      title={tr(`Racha de meta · ${s.current} días`, `Goal streak · ${s.current} days`)}
      status={coach.habits
        ? tr(`Si hoy cumples tu meta de hábitos llegas a ${s.ifMet} días.`, `Meet today's habit goal to reach ${s.ifMet} days.`)
        : tr('La racha solo cuenta los días con hábitos.', 'The streak only counts days with habits.')}
      lines={[
        ...(s.bonusToday ? [<>{tr('¡Hoy desbloqueas el bono de racha: ', 'Today you unlock the streak bonus: ')}<b className="prog-positive">+{s.bonusToday} ELO</b>!</>] : []),
        ...(s.next ? [tr(`Próximo bono: ${s.next.days} días (+${s.next.bonus}) · en ${s.next.inDays} días.`, `Next bonus: ${s.next.days} days (+${s.next.bonus}) · in ${s.next.inDays} days.`)] : []),
        ...(s.atRisk ? [<span className="prog-negative">{tr(`Ojo: si no cumples la meta, la racha se rompe y pierdes ${s.atRisk} ELO.`, `Careful: missing the goal breaks the streak and costs ${s.atRisk} ELO.`)}</span>] : []),
      ]} />,
  );

  return (
    <motion.div {...rise(1, reduce)}>
      <Card glow className="p-4">
        <p className="arena-kicker">{tr('Tu plan de ELO · hoy', 'Your ELO plan · today')}</p>
        <h3 className="mt-1 text-[20px] font-black leading-tight">
          {name ? tr(`${name}, así ganas ELO hoy`, `${name}, here's how you earn ELO today`) : tr('Así ganas ELO hoy', 'How you earn ELO today')}
        </h3>
        <p className="mt-1 text-[12.5px] leading-snug prog-text-3">
          {nothingPlanned
            ? tr('Hoy no tienes nada planificado. Cada cosa que planifiques y cumplas suma ELO; el foco suma siempre.', 'Nothing is planned for today. Everything you plan and complete adds ELO; focus always counts.')
            : gap > 0
              ? tr(`Completando lo de hoy puedes sumar ${gap} ELO más.`, `Completing today's plan adds ${gap} more ELO.`)
              : tr('Vas al máximo posible de hoy. ¡Sigue así!', 'You are at today\'s maximum. Keep it up!')}
        </p>

        {/* Now → potential */}
        <div className="mt-4 rounded-[20px] p-3.5 arena-inset">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold prog-text-3">{tr('Si el día terminara ahora', 'If the day ended now')}</p>
              <Delta value={coach.now} className="text-[28px] leading-none" />
            </div>
            <TrendingUp size={20} className="mb-1 prog-text-3" />
            <div className="text-right">
              <p className="text-[11px] font-bold prog-text-3">{tr('Si completas todo', 'If you complete everything')}</p>
              <span className="text-[28px] leading-none font-black tabular-nums" style={{ color: 'rgb(var(--rank))' }}>{signed(coach.best)}</span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.08)' }}>
            <motion.div className="h-full rounded-full origin-left" style={{ background: 'linear-gradient(90deg, var(--rank-from), var(--rank-to))' }}
              initial={{ scaleX: reduce ? pct : 0 }} animate={{ scaleX: pct }} transition={{ duration: reduce ? 0 : 0.8, delay: 0.2 }} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {coach.sunday && <span className="arena-chip" style={{ background: 'rgb(var(--p-warning) / 0.14)', color: 'rgb(var(--p-warning))' }}><Sparkles size={12} /> {tr('Domingo: ganancias +25 %', 'Sunday: gains +25%')}</span>}
            {coach.firstWeek && <span className="arena-chip" style={{ background: 'rgb(var(--p-warning) / 0.14)', color: 'rgb(var(--p-warning))' }}><Crown size={12} /> {tr('Primera semana: ganancias ×2', 'First week: gains ×2')}</span>}
            {coach.shieldToday && <span className="arena-chip" style={{ background: 'rgb(56 189 248 / 0.14)', color: '#38bdf8' }}><ShieldCheck size={12} /> {tr('Escudo activo: hoy no pierdes', 'Shield on: no losses today')}</span>}
            <span className="arena-chip"><Shield size={12} /> {tr(`Pérdida máx. ${coach.lossCap}/día`, `Max loss ${coach.lossCap}/day`)}</span>
          </div>
        </div>

        <ul className="mt-3 space-y-2.5">{missions}</ul>

        <button type="button" onClick={onOpenGuide} className="prog-tap mt-3 w-full h-12 rounded-[16px] flex items-center justify-center gap-2 font-black text-[13.5px]" style={{ background: 'linear-gradient(100deg, var(--rank-from), var(--rank-to))', color: '#0b0b10' }}>
          <BookOpen size={17} /> {tr('Cómo funciona el ELO · guía completa', 'How ELO works · full guide')}
        </button>
      </Card>
    </motion.div>
  );
};

// ── Full rules guide ─────────────────────────────────────────────────────────

const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode; hint?: string; tone?: 'pos' | 'neg' | 'neu' }> = ({ label, value, hint, tone = 'neu' }) => (
  <div className="flex items-center gap-3 py-2 border-b last:border-b-0" style={{ borderColor: 'rgb(var(--p-line) / 0.06)' }}>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold">{label}</p>
      {hint && <p className="text-[11.5px] prog-text-3">{hint}</p>}
    </div>
    <span className={`text-[14px] font-black tabular-nums ${tone === 'pos' ? 'prog-positive' : tone === 'neg' ? 'prog-negative' : ''}`}>{value}</span>
  </div>
);

const GuideSection: React.FC<{ icon: React.ReactNode; title: string; intro: string; children: React.ReactNode; i: number }> = ({ icon, title, intro, children, i }) => {
  const reduce = useReducedMotion();
  return (
    <motion.section {...rise(i, reduce)} className="rounded-[22px] p-4 arena-card">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: 'rgb(var(--rank) / 0.14)', color: 'rgb(var(--rank))' }}>{icon}</span>
        <h4 className="text-[16px] font-black">{title}</h4>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed prog-text-2">{intro}</p>
      <div className="mt-2">{children}</div>
    </motion.section>
  );
};

export const EloGuideSheet: React.FC<{ open: boolean; onClose: () => void; snap: ProgressionSnapshot; habits: Habit[]; quests: Quest[]; projects: Project[] }> = ({ open, onClose, snap, habits, quests, projects }) => {
  const { tr } = useTr();
  const today = progressionStore.todayKey();
  const coach = useMemo(
    () => buildEloCoach(snap.engine, { habits, quests, projects, meta: snap.meta, streak: snap.summary.streak, shieldToday: !!progressionStore.shieldActiveToday() }, today),
    [snap.engine, snap.meta, snap.summary.streak, habits, quests, projects, today],
  );
  const C = ELO.COMPLIANCE;
  const { standing, summary } = snap;
  const pace = Math.max(1, coach.best);
  const days = standing.eloToNext ? Math.ceil(standing.eloToNext / pace) : 0;

  // Portaled: inside the screen's <main> (z-10) the floating dock would cover the sheet.
  return createPortal(
    <AnimatePresence>
      {open && (
        <ArenaSheet onClose={onClose} label={tr('Guía del ELO', 'ELO guide')} z={960} style={rankStyle(standing.rankIndex)}>
          <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-3">
            <div className="pt-1 pr-12">
              <p className="arena-kicker">{tr('Guía completa', 'Full guide')}</p>
              <h3 className="mt-1 text-[24px] font-black leading-tight">{tr('Cómo se gana y se pierde ELO', 'How ELO is won and lost')}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed prog-text-2">
                {tr('El ELO mide tu constancia. Cada noche, a tu hora de corte, la app cierra el día y suma o resta según lo que planificaste y cumpliste. El foco suma al momento.',
                  'ELO measures consistency. Each night, at your cut-off time, the app closes the day and adds or subtracts based on what you planned and did. Focus adds instantly.')}
              </p>
            </div>

            {/* Where you are */}
            <section className="rounded-[22px] p-4 arena-card flex items-center gap-3">
              <RankBadge rankIndex={standing.rankIndex} division={standing.division} size={54} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black">{standing.label} · {summary.elo} ELO</p>
                {standing.eloToNext ? (
                  <p className="text-[12.5px] prog-text-2 leading-snug">
                    {tr(`Te faltan ${standing.eloToNext} ELO para ${standing.nextLabel}. Completando todo cada día (≈${signed(pace)}/día) llegarías en unos ${days} días.`,
                      `${standing.eloToNext} ELO to ${standing.nextLabel}. Completing everything daily (≈${signed(pace)}/day) gets you there in about ${days} days.`)}
                  </p>
                ) : <p className="text-[12.5px] prog-text-2">{tr('Estás en la cima. Defiende tu puesto.', 'You are at the top. Defend your spot.')}</p>}
              </div>
            </section>

            <GuideSection i={0} icon={<Repeat size={17} />} title={tr('Hábitos y tareas: zonas de cumplimiento', 'Habits & tasks: compliance zones')}
              intro={tr(`Se compara lo que hiciste con tu meta. En hábitos la meta es un % de los que te tocan hoy (empieza en 40 % y sube con tu racha hasta 85 %; hoy es ${coach.habits?.goalPct ?? 40} %). En tareas, la meta es completar las que tienen fecha de hoy.`,
                `What you did is compared with your goal. For habits the goal is a % of those due today (starts at 40% and grows with your streak up to 85%; today it's ${coach.habits?.goalPct ?? 40}%). For tasks, the goal is completing those due today.`)}>
              <Row label={tr('Excelente', 'Excellent')} hint={tr(`≥ ${Math.round(C.EXCELLENT_R * 100)} % de la meta`, `≥ ${Math.round(C.EXCELLENT_R * 100)}% of the goal`)} value={`+${C.EXCELLENT_DELTA}`} tone="pos" />
              <Row label={tr('Meta cumplida', 'Goal met')} hint={tr('100 % de la meta', '100% of the goal')} value={`+${C.MET_DELTA}`} tone="pos" />
              <Row label={tr('Parcial', 'Partial')} hint={tr(`${Math.round(C.PARTIAL_R * 100)}–99 %`, `${Math.round(C.PARTIAL_R * 100)}–99%`)} value={`+${C.PARTIAL_MIN}…+${C.MET_DELTA - 1}`} tone="pos" />
              <Row label={tr('Neutral', 'Neutral')} hint={`${Math.round(C.NEUTRAL_R * 100)}–${Math.round(C.PARTIAL_R * 100) - 1} %`} value="0" />
              <Row label={tr('Fallo', 'Miss')} hint={tr(`menos del ${Math.round(C.NEUTRAL_R * 100)} %`, `under ${Math.round(C.NEUTRAL_R * 100)}%`)} value={`${C.FAIL_DELTA}`} tone="neg" />
              <p className="mt-2 text-[11.5px] prog-text-3">{tr('Si un día no tienes hábitos o tareas con fecha, esa parte no suma ni resta.', 'If you have no habits or dated tasks on a day, that part neither adds nor subtracts.')}</p>
            </GuideSection>

            <GuideSection i={1} icon={<Timer size={17} />} title={tr('Foco', 'Focus')}
              intro={tr('Es la única fuente que suma al instante, mientras trabajas.', 'The only source that adds instantly, while you work.')}>
              <Row label={tr(`Cada ${ELO.FOCUS.MINUTES_PER_POINT} min con temporizador`, `Every ${ELO.FOCUS.MINUTES_PER_POINT} timer minutes`)} value="+1" tone="pos" />
              <Row label={tr('Tope diario', 'Daily cap')} value={`+${ELO.FOCUS.DAILY_CAP}`} />
              <Row label={tr('Sesiones manuales', 'Manual sessions')} hint={tr('Dan XP y estadísticas', 'Give XP and stats')} value="0" />
            </GuideSection>

            <GuideSection i={2} icon={<Target size={17} />} title={tr('Metas de foco de proyectos', 'Project focus goals')}
              intro={tr('Cada proyecto tiene la meta que le pusiste al crearlo. Si es semanal o mensual, se reparte en tus días y cada día ves solo la parte de hoy. Si no la cumples con el temporizador, pierdes ELO.',
                'Each project has the goal you set when you created it. Weekly or monthly goals are split across your days and each day you only see today\'s share. Miss it with the timer and you lose ELO.')}>
              <Row label={tr('Meta de hoy no cumplida', "Today's goal missed")} hint={tr('por proyecto', 'per project')} value={`${ELO.PROJECT_GOAL_MISS_DELTA}`} tone="neg" />
              <Row label={tr('Meta cumplida', 'Goal met')} value="0" />
            </GuideSection>

            <GuideSection i={3} icon={<Flame size={17} />} title={tr('Racha de meta', 'Goal streak')}
              intro={tr('Sube un día cada vez que cumples tu meta de hábitos. Al llegar a ciertos días ganas un bono único.', 'Grows one day each time you meet your habit goal. Reaching certain lengths gives a one-off bonus.')}>
              {ELO.STREAK.MILESTONES.map(m => <Row key={m.days} label={tr(`${m.days} días`, `${m.days} days`)} value={`+${m.bonus}`} tone="pos" />)}
              <Row label={tr(`Romper una racha de ${ELO.STREAK.BREAK_MIN_LENGTH}+ días`, `Breaking a ${ELO.STREAK.BREAK_MIN_LENGTH}+ day streak`)} value={`${ELO.STREAK.BREAK_DELTA}`} tone="neg" />
            </GuideSection>

            <GuideSection i={4} icon={<ShieldCheck size={17} />} title={tr('Protecciones', 'Protections')}
              intro={tr('Para que un mal día no arruine semanas de trabajo.', 'So one bad day doesn\'t ruin weeks of work.')}>
              <Row label={tr('Pérdida máxima por día', 'Max loss per day')} value={`−${ELO.PROTECTION.DAILY_LOSS_CAP}`} />
              <Row label={tr('Margen antes de bajar de rango', 'Buffer before demotion')} value={`${ELO.PROTECTION.RANK_DEMOTION_BUFFER} ELO`} />
              <Row label={tr('Escudo de descanso', 'Rest shield')} hint={tr(`1 gratis cada ${ELO.PROTECTION.SHIELD_EVERY_STREAK_DAYS} días de racha (máx. ${ELO.PROTECTION.SHIELD_MAX}) o en la tienda`, `1 free every ${ELO.PROTECTION.SHIELD_EVERY_STREAK_DAYS} streak days (max ${ELO.PROTECTION.SHIELD_MAX}) or in the store`)} value={tr('sin pérdidas', 'no losses')} />
            </GuideSection>

            <GuideSection i={5} icon={<Zap size={17} />} title={tr('Multiplicadores', 'Multipliers')}
              intro={tr('Solo multiplican las ganancias, nunca las pérdidas.', 'They only multiply gains, never losses.')}>
              <Row label={tr('Domingos', 'Sundays')} value="×1.25" tone="pos" />
              <Row label={tr(`Primera semana (${ELO.PROTECTION.FIRST_WEEK_DAYS} días)`, `First week (${ELO.PROTECTION.FIRST_WEEK_DAYS} days)`)} value={`×${ELO.PROTECTION.FIRST_WEEK_GAIN_MULTIPLIER}`} tone="pos" />
            </GuideSection>

            <GuideSection i={6} icon={<HeartCrack size={17} />} title={tr('Lo que te hace perder', 'What makes you lose')}
              intro={tr('Resumen rápido para no caer.', 'Quick summary so you don\'t drop.')}>
              <Row label={tr('Cumplir menos del 40 % de hábitos o tareas', 'Under 40% of habits or tasks')} value={`${C.FAIL_DELTA}`} tone="neg" />
              <Row label={tr('No cumplir la meta de un proyecto', 'Missing a project goal')} value={`${ELO.PROJECT_GOAL_MISS_DELTA}`} tone="neg" />
              <Row label={tr('Romper una racha larga', 'Breaking a long streak')} value={`${ELO.STREAK.BREAK_DELTA}`} tone="neg" />
            </GuideSection>

            <button type="button" onClick={onClose} className="prog-tap w-full h-12 rounded-[16px] font-black text-[14px] flex items-center justify-center gap-2 arena-card">
              {tr('Entendido', 'Got it')} <ChevronRight size={17} />
            </button>
          </div>
        </ArenaSheet>
      )}
    </AnimatePresence>,
    document.body,
  );
};

