import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import type { Habit } from '../../../types';
import type { SuperHabitTheme } from '../catalog';
import {
  SUPER_MILESTONES, earnedMilestones, nextMilestone, daysToNextMilestone, worldLevel, flameTierFor,
} from '../engine';
import { StreakFlame } from '../StreakFlame';
import { BadgeEmblem, BADGE_METALS } from '../BadgeEmblem';
import type { WorldCtx, WorldDef, NodeState } from './types';
import './worlds.css';

export const SCENE_W = 360;
export const SCENE_H = 520;

/** Fixed-aspect box that fits the free space; SVG and HTML nodes share its coordinates. */
export const SceneBox: React.FC<{ children: React.ReactNode; overlay?: React.ReactNode }> = ({ children, overlay }) => (
  <div className="absolute inset-0 flex items-center justify-center" style={{ containerType: 'size' }}>
    <div
      className="relative"
      style={{ width: `min(100cqw, calc(100cqh * ${SCENE_W / SCENE_H}))`, height: `min(100cqh, calc(100cqw * ${SCENE_H / SCENE_W}))` }}
    >
      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }} aria-hidden>
        {children}
      </svg>
      {overlay}
    </div>
  </div>
);

interface WorldNodeProps {
  ctx: WorldCtx;
  i: number;
  /** Position in scene coordinates (360×520). */
  x: number;
  y: number;
  size?: number;
  /** Show "D14" under the node. */
  label?: boolean;
}

/** A tappable milestone badge placed inside the scene. */
export const WorldNode: React.FC<WorldNodeProps> = ({ ctx, i, x, y, size = 46, label = true }) => {
  const state = ctx.stateOf(i);
  const selected = ctx.selected === i;
  return (
    <button
      type="button"
      className="w-node"
      onClick={() => ctx.select(i)}
      aria-label={`Día ${SUPER_MILESTONES[i]}: ${ctx.theme.badges[i]}`}
      style={{ left: `${(x / SCENE_W) * 100}%`, top: `${(y / SCENE_H) * 100}%`, width: size, height: size, ['--w-ring' as any]: ctx.theme.colors.secondary, zIndex: selected ? 5 : 3 }}
    >
      {state === 'next' && <span className="w-node-ring" />}
      <div style={{ transform: selected ? 'scale(1.14)' : undefined, transition: 'transform .25s' }}>
        <BadgeEmblem level={i} icon={ctx.theme.icon} size={size} state={state} accent={ctx.theme.colors.primary} animate={false} />
      </div>
      {label && (
        <span
          className="absolute left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider whitespace-nowrap px-1.5 rounded-full"
          style={{ top: size + 1, background: 'rgba(0,0,0,0.55)', color: state === 'locked' ? 'rgba(255,255,255,0.5)' : '#fff' }}
        >
          D{SUPER_MILESTONES[i]}
        </span>
      )}
    </button>
  );
};

const MilestoneSheet: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const { theme, selected, streak } = ctx;
  const i = selected;
  const state = ctx.stateOf(i);
  const m = SUPER_MILESTONES[i];
  const tier = flameTierFor(streak);
  const go = (d: number) => ctx.select((i + d + 8) % 8);
  return (
    <div className="relative z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-1">
      <div
        key={i}
        className="w-sheet rounded-[26px] px-3.5 py-3 border"
        style={{ background: 'rgba(8,8,14,0.82)', borderColor: `${theme.colors.primary}66`, boxShadow: `0 -8px 34px -12px ${theme.colors.primary}88` }}
      >
        <div className="flex items-center gap-3">
          <BadgeEmblem level={i} icon={theme.icon} size={58} state={state} accent={theme.colors.primary} animate={false} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-[0.16em] uppercase whitespace-nowrap" style={{ color: theme.colors.secondary }}>Día {m} · {BADGE_METALS[i].name}</span>
              <span
                className="text-[8.5px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                style={{
                  color: state === 'earned' ? '#86efac' : state === 'next' ? theme.colors.secondary : 'rgba(255,255,255,0.45)',
                  borderColor: state === 'earned' ? '#86efac55' : state === 'next' ? `${theme.colors.secondary}66` : 'rgba(255,255,255,0.14)',
                }}
              >
                {state === 'earned' ? 'Conseguida' : state === 'next' ? `Faltan ${m - streak} d` : 'Bloqueada'}
              </span>
            </div>
            <h3 className="text-[17px] font-black leading-tight tracking-tight text-white truncate">{theme.badges[i]}</h3>
            <p className="text-[11.5px] leading-snug text-white/60 font-medium line-clamp-2">{theme.lines[i]}</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => go(-1)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90" aria-label="Anterior"><ChevronLeft size={16} /></button>
            <button onClick={() => go(1)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90" aria-label="Siguiente"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[10.5px] font-bold text-white/60">
          <StreakFlame streak={streak} size={20} lit={ctx.lit || streak > 0} />
          <span className="text-white font-black">{streak} {streak === 1 ? 'día' : 'días'}</span>
          <span>· Llama {tier.name}</span>
          <span className="ml-auto flex gap-1">
            {SUPER_MILESTONES.map((mm, k) => (
              <span key={mm} className="rounded-full" style={{ width: k === i ? 14 : 6, height: 6, transition: 'width .25s', background: streak >= mm ? theme.colors.secondary : 'rgba(255,255,255,0.2)' }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
};

interface WorldShellProps {
  habit: Habit;
  theme: SuperHabitTheme;
  def: WorldDef;
  onClose: () => void;
  onOpenStats?: (habit: Habit) => void;
}

export const WorldShell: React.FC<WorldShellProps> = ({ habit, theme, def, onClose, onOpenStats }) => {
  const streak = habit.streak || 0;
  const earned = useMemo(() => earnedMilestones(streak), [streak]);
  const next = nextMilestone(streak);
  const initial = next ? SUPER_MILESTONES.indexOf(next) : 7;
  const [selected, setSelected] = useState(initial);
  const select = useCallback((i: number) => setSelected(i), []);
  const stateOf = useCallback((i: number): NodeState => (streak >= SUPER_MILESTONES[i] ? 'earned' : next === SUPER_MILESTONES[i] ? 'next' : 'locked'), [streak, next]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const ctx: WorldCtx = {
    habit, theme, streak, level: worldLevel(streak), earned, next, daysLeft: daysToNextMilestone(streak),
    lit: habit.completedToday, selected, select, stateOf,
  };
  const Scene = def.Scene;
  const showSheet = def.sheet !== false;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[99990] flex flex-col text-white overflow-hidden"
      style={{ background: def.bg }}
      role="dialog"
      aria-label={`Mundo de ${theme.name}`}
    >
      <div className="relative z-30 flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),14px)] pb-2">
        <button onClick={onClose} className="flex items-center gap-0.5 pl-2 pr-3.5 h-10 rounded-full bg-black/35 border border-white/10 text-sm font-bold active:scale-95 transition-transform">
          <ChevronLeft size={19} /> Volver
        </button>
        <div className="text-center min-w-0 px-2">
          <div className="text-[10px] font-black tracking-[0.28em] uppercase" style={{ color: theme.colors.secondary }}>{theme.name}</div>
          <div className="text-[13px] font-extrabold text-white truncate">{def.headline(ctx)}</div>
        </div>
        {onOpenStats ? (
          <button onClick={() => onOpenStats(habit)} className="w-10 h-10 rounded-full bg-black/35 border border-white/10 flex items-center justify-center active:scale-95 transition-transform" aria-label="Ver estadísticas">
            <BarChart3 size={18} />
          </button>
        ) : <span className="w-10" />}
      </div>

      <div className={`relative flex-1 min-h-0 ${def.scroll ? 'overflow-y-auto overscroll-contain scrollbar-hide' : 'overflow-hidden'}`}>
        <Scene {...ctx} />
      </div>

      {showSheet && <MilestoneSheet ctx={ctx} />}
    </motion.div>,
    document.body,
  );
};
