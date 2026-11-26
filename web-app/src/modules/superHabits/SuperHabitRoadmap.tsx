import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, AlertTriangle, BarChart3, Trophy, Target, Medal } from 'lucide-react';
import type { Habit } from '../../types';
import { getSuperTheme } from './catalog';
import {
  SUPER_MILESTONES, ROADMAP_DAYS, earnedMilestones, nextMilestone, daysToNextMilestone,
  roadmapProgress, bestStreakFromHistory, flameTierFor, nextFlameTier, type SuperMilestone,
} from './engine';
import { StreakFlame } from './StreakFlame';
import { BadgeEmblem, BADGE_METALS } from './BadgeEmblem';
import { BannerBackdrop } from './BannerBackdrop';
import './superHabits.css';

interface SuperHabitRoadmapProps {
  habit: Habit | null;
  onClose: () => void;
  /** Opens the regular statistics view of the habit. */
  onOpenStats?: (habit: Habit) => void;
}

/** The days between two milestones, shown as small dots on the path. */
const gapDays = (from: number, to: number) => Array.from({ length: Math.max(0, to - from - 1) }, (_, i) => from + 1 + i);

export const SuperHabitRoadmap: React.FC<SuperHabitRoadmapProps> = ({ habit, onClose, onOpenStats }) => {
  const theme = getSuperTheme(habit?.superHabit);
  const hereRef = useRef<HTMLDivElement>(null);
  const streak = habit?.streak || 0;

  useEffect(() => {
    if (!habit) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [habit?.id]);

  useEffect(() => {
    if (!habit) return;
    const timer = setTimeout(() => hereRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600);
    return () => clearTimeout(timer);
  }, [habit?.id]);

  const view = useMemo(() => {
    const earned = earnedMilestones(streak);
    const next = nextMilestone(streak);
    return {
      earned,
      next,
      daysLeft: daysToNextMilestone(streak),
      progress: roadmapProgress(streak),
      best: bestStreakFromHistory(habit?.history, streak),
      tier: flameTierFor(streak),
      nextTier: nextFlameTier(streak),
    };
  }, [streak, habit?.history]);

  if (!habit || !theme || typeof document === 'undefined') return null;

  const { primary, secondary, deep } = theme.colors;
  const Icon = theme.icon;
  const lit = habit.completedToday;
  const lost = streak === 0 && view.best > 0;

  const dot = (day: number) => {
    const done = day <= streak;
    const current = day === streak;
    return (
      <div key={day} ref={current && !SUPER_MILESTONES.includes(day as SuperMilestone) ? hereRef : undefined} className="relative flex items-center justify-center h-4 w-full">
        <div
          className={`rounded-full ${current ? 'sh-pulse' : ''}`}
          style={{
            width: current ? 12 : done ? 8 : 5,
            height: current ? 12 : done ? 8 : 5,
            background: done ? `linear-gradient(135deg, ${secondary}, ${primary})` : 'rgba(255,255,255,0.14)',
            boxShadow: done ? `0 0 8px ${primary}` : 'none',
            ['--sh-pulse' as any]: `${primary}99`,
          }}
        />
        {current && (
          <div className="absolute left-1/2 ml-4 flex items-center gap-1.5 whitespace-nowrap">
            <StreakFlame streak={streak} size={20} lit={lit} />
            <span className="text-[10px] font-black tracking-wider" style={{ color: secondary }}>TÚ · DÍA {day}</span>
          </div>
        )}
      </div>
    );
  };

  const prevOf = (i: number) => (i === 0 ? 0 : SUPER_MILESTONES[i - 1]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
      className="fixed inset-0 z-[99990] flex flex-col bg-[#05050a] text-white overflow-hidden"
      role="dialog"
      aria-label={`Roadmap de ${theme.name}`}
    >
      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button onClick={onClose} className="flex items-center gap-1 pr-3 h-10 rounded-full bg-white/10 backdrop-blur text-sm font-bold active:scale-95 transition-transform">
          <ChevronLeft size={20} /> Volver
        </button>
        <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/50">Super Hábito</span>
        {onOpenStats ? (
          <button onClick={() => onOpenStats(habit)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center active:scale-95 transition-transform" aria-label="Ver estadísticas">
            <BarChart3 size={18} />
          </button>
        ) : <span className="w-10" />}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide pb-24 -mt-14">
        {/* Hero banner */}
        <div className="relative pt-16 pb-6 px-5 overflow-hidden" style={{ borderBottom: `1px solid ${primary}44` }}>
          <BannerBackdrop motif={theme.motif} primary={primary} secondary={secondary} deep={deep} />
          <Icon className="absolute -right-6 -bottom-6 opacity-[0.08]" size={190} />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, boxShadow: `0 6px 18px ${primary}66` }}>
                  <Icon size={19} className="text-white" />
                </div>
                <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: secondary }}>Roadmap · 60 días</span>
              </div>
              <h1 className="text-[28px] leading-[1.05] font-black tracking-tight">{theme.name}</h1>
              <p className="text-[13px] text-white/70 font-medium mt-1">{theme.tagline}</p>
            </div>
            <div className="flex flex-col items-center shrink-0">
              <StreakFlame streak={streak} size={58} lit={lit || streak > 0} />
              <span className="text-2xl font-black leading-none mt-1">{streak}</span>
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/50">días</span>
            </div>
          </div>

          {/* Progress rail with the 8 milestones */}
          <div className="relative mt-5">
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})`, boxShadow: `0 0 12px ${primary}` }}
                initial={{ width: 0 }}
                animate={{ width: `${view.progress * 100}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
            {SUPER_MILESTONES.map(m => (
              <span key={m} className="absolute top-1/2 w-2 h-2 rounded-full border"
                style={{
                  left: `${(m / ROADMAP_DAYS) * 100}%`, transform: 'translate(-50%, -50%)',
                  background: streak >= m ? '#fff' : '#0b0b12', borderColor: streak >= m ? secondary : 'rgba(255,255,255,0.3)',
                }} />
            ))}
            <div className="flex justify-between mt-2 text-[10px] font-bold text-white/50">
              <span>Día 1</span><span>Día {ROADMAP_DAYS}</span>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2 mt-4">
            {[
              { icon: Trophy, label: 'Insignias', value: `${view.earned.length}/8` },
              { icon: Target, label: view.next ? 'Próxima' : 'Roadmap', value: view.next ? `Día ${view.next}` : 'Completo' },
              { icon: Medal, label: 'Récord', value: `${view.best} d` },
            ].map(({ icon: I, label, value }) => (
              <div key={label} className="rounded-2xl bg-black/35 backdrop-blur-sm border border-white/10 px-3 py-2">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/45"><I size={10} /> {label}</div>
                <div className="text-base font-black mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          <p className="relative mt-4 text-[13px] leading-snug text-white/85 font-medium">
            {lost
              ? `Tu racha se reinició y las insignias se perdieron. Tu récord es de ${view.best} días: vuelve a superarlo.`
              : streak === 0
                ? theme.startLine
                : view.next
                  ? `Faltan ${view.daysLeft} ${view.daysLeft === 1 ? 'día' : 'días'} para «${theme.badges[SUPER_MILESTONES.indexOf(view.next)]}».`
                  : theme.legendLine}
          </p>
          <div className="relative mt-2 flex items-center gap-2 text-[10px] font-bold text-white/45">
            <span className="px-2 py-0.5 rounded-full border border-white/15" style={{ color: secondary }}>Llama {view.tier.name}</span>
            {view.nextTier && <span>Siguiente: {view.nextTier.tier.name} en {view.nextTier.daysLeft} d</span>}
          </div>
        </div>

        <div className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-300 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-snug text-amber-100/80 font-medium">
            Las insignias duran lo que dure tu racha en este hábito. Si la pierdes, las pierdes: tendrás que ganarlas otra vez.
          </p>
        </div>

        {/* Path */}
        <div className="relative mx-auto max-w-[420px] px-4 pt-8">
          <div className="absolute left-1/2 top-8 bottom-20 w-[3px] -translate-x-1/2 rounded-full bg-white/[0.07]" />

          {/* Day 1 */}
          <div className="relative flex justify-center mb-1">
            <div className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border" style={{ background: deep, borderColor: `${primary}66`, color: secondary }}>
              Día 1 · Inicio
            </div>
          </div>
          {streak >= 1 && streak < SUPER_MILESTONES[0] && dot(1)}
          {streak < 1 && <div className="h-4" />}

          {SUPER_MILESTONES.map((m, i) => {
            const state: 'earned' | 'next' | 'locked' = streak >= m ? 'earned' : view.next === m ? 'next' : 'locked';
            const metal = BADGE_METALS[i];
            const left = i % 2 === 0;
            const isCurrentNode = streak === m;
            return (
              <React.Fragment key={m}>
                {gapDays(prevOf(i), m).map(dot)}
                <motion.div
                  ref={isCurrentNode ? hereRef : undefined}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="relative my-3"
                >
                  <div
                    className="relative rounded-3xl overflow-hidden border"
                    style={{
                      borderColor: state === 'earned' ? `${metal.a}88` : state === 'next' ? `${primary}99` : 'rgba(255,255,255,0.08)',
                      background: '#0a0a12',
                      boxShadow: state === 'earned' ? `0 10px 30px -10px ${primary}88` : state === 'next' ? `0 0 0 1px ${primary}55, 0 10px 30px -12px ${primary}66` : 'none',
                      opacity: state === 'locked' ? 0.7 : 1,
                    }}
                  >
                    {/* Banner ribbon */}
                    <div
                      className="relative flex items-center justify-between px-4 h-8"
                      style={{
                        background: state === 'locked' ? 'rgba(255,255,255,0.06)' : `linear-gradient(90deg, ${primary}, ${secondary})`,
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)',
                        paddingBottom: 6,
                      }}
                    >
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: state === 'locked' ? 'rgba(255,255,255,0.45)' : '#0b0b12' }}>
                        Día {m}
                      </span>
                      <span className="text-[10px] font-black tracking-wider uppercase" style={{ color: state === 'locked' ? 'rgba(255,255,255,0.35)' : '#0b0b12' }}>
                        {metal.name}
                      </span>
                    </div>

                    <div className={`flex items-center gap-4 px-4 pt-3 pb-4 ${left ? '' : 'flex-row-reverse text-right'}`}>
                      <BadgeEmblem level={i} icon={theme.icon} size={72} state={state} accent={primary} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-black leading-tight tracking-tight">{theme.badges[i]}</h3>
                        <p className="text-[12px] leading-snug text-white/65 mt-1 font-medium">{theme.lines[i]}</p>
                        <div className={`mt-2 flex ${left ? '' : 'justify-end'}`}>
                          <span
                            className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border"
                            style={{
                              color: state === 'earned' ? '#86efac' : state === 'next' ? secondary : 'rgba(255,255,255,0.4)',
                              borderColor: state === 'earned' ? '#86efac55' : state === 'next' ? `${secondary}66` : 'rgba(255,255,255,0.12)',
                              background: state === 'earned' ? '#86efac12' : 'transparent',
                            }}
                          >
                            {state === 'earned' ? 'Conseguida' : state === 'next' ? `Faltan ${m - streak} d` : 'Bloqueada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}

          {/* Legend */}
          <div className="relative text-center mt-4 mb-6 px-4">
            <div className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border"
              style={{ background: deep, borderColor: `${secondary}77`, color: secondary }}>
              Día {ROADMAP_DAYS} · Leyenda
            </div>
            <p className="text-[12px] text-white/55 mt-2 font-medium">{theme.legendLine}</p>
            <p className="text-[11px] text-white/35 mt-1">La llama sigue evolucionando aunque el roadmap termine.</p>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
};
