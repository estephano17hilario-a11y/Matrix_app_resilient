import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { SUPER_HABITS, pickDoneLine } from './catalog';
import { SUPER_HABIT_EVENT, type SuperHabitFxDetail } from './superHabitEvents';
import { SUPER_MILESTONES, unlockedMilestone, flameTierFor, type SuperMilestone } from './engine';
import { playSuperBadgeSound, playSuperHabitSound } from './superHabitSounds';
import { StreakFlame } from './StreakFlame';
import { BadgeEmblem, BADGE_METALS } from './BadgeEmblem';
import { BannerBackdrop } from './BannerBackdrop';
import './superHabits.css';

// Mounted once. Listens for completed super habits and plays the themed scene:
//  • ordinary day → a short non-blocking burst + banner toast,
//  • milestone day → a full-screen "badge unlocked" moment.

interface Active extends SuperHabitFxDetail {
  key: number;
  milestone: SuperMilestone | null;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const SuperHabitFX: React.FC = () => {
  const [active, setActive] = useState<Active | null>(null);
  const timer = useRef<number>();
  const counter = useRef(0);
  const lockedMilestone = useRef(false);

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    lockedMilestone.current = false;
    setActive(null);
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent<SuperHabitFxDetail>).detail;
      if (!d) return;
      const milestone = unlockedMilestone(d.before, d.streak);
      // Never let a plain toast cover a badge unlock that is on screen.
      if (lockedMilestone.current && !milestone) return;

      const theme = SUPER_HABITS[d.superHabit];
      window.clearTimeout(timer.current);
      lockedMilestone.current = !!milestone;
      setActive({ ...d, milestone, key: ++counter.current });

      const level = milestone ? SUPER_MILESTONES.indexOf(milestone) : -1;
      const secs = milestone ? playSuperBadgeSound(d.superHabit, level) : playSuperHabitSound(d.superHabit);
      try { navigator.vibrate?.(milestone ? [25, 40, 30, 40, 110] : [18, 30, 24]); } catch { /* not supported */ }

      if (!reducedMotion()) {
        const colors = [theme.colors.primary, theme.colors.secondary, '#ffffff'];
        const origin = d.origin ?? { x: 0.5, y: 0.5 };
        confetti({ particleCount: milestone ? 90 : 34, spread: milestone ? 110 : 70, startVelocity: milestone ? 48 : 34, origin, colors, scalar: 0.9, ticks: 140 });
        if (milestone) {
          setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }), 260);
          setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }), 260);
          if (level === 7) {
            let n = 0;
            const rain = window.setInterval(() => {
              confetti({ particleCount: 14, spread: 360, startVelocity: 14, gravity: 0.7, origin: { x: Math.random(), y: -0.05 }, colors, ticks: 200 });
              if (++n > 14) window.clearInterval(rain);
            }, 180);
          }
        }
      }

      timer.current = window.setTimeout(close, milestone ? Math.max(6500, secs * 1000) : 2600);
    };
    window.addEventListener(SUPER_HABIT_EVENT, onEvent);
    return () => {
      window.removeEventListener(SUPER_HABIT_EVENT, onEvent);
      window.clearTimeout(timer.current);
    };
  }, [close]);

  if (typeof document === 'undefined') return null;

  const theme = active ? SUPER_HABITS[active.superHabit] : null;
  const Icon = theme?.icon;
  const level = active?.milestone ? SUPER_MILESTONES.indexOf(active.milestone) : -1;
  const burst = !reducedMotion();
  const origin = active?.origin ?? { x: 0.5, y: 0.5 };

  return createPortal(
    <AnimatePresence>
      {active && theme && Icon && (
        <motion.div
          key={active.key}
          className={`fixed inset-0 z-[100000] ${active.milestone ? 'pointer-events-auto' : 'pointer-events-none'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={active.milestone ? close : undefined}
        >
          {/* Colour flash */}
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at ${origin.x * 100}% ${origin.y * 100}%, ${theme.colors.primary}${active.milestone ? '99' : '55'} 0%, transparent 65%)` }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, active.milestone ? 0.6 : 0] }} transition={{ duration: 0.9 }}
          />
          {active.milestone && <div className="absolute inset-0 bg-black/88" />}

          {/* Themed icons flying out */}
          {burst && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: active.milestone ? 26 : 14 }).map((_, i) => {
                const P = theme.particles[i % theme.particles.length];
                const angle = (i / (active.milestone ? 26 : 14)) * Math.PI * 2 + (i % 3) * 0.2;
                const dist = (active.milestone ? 150 : 100) + ((i * 37) % 90);
                return (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%`, color: i % 2 ? theme.colors.secondary : theme.colors.primary }}
                    initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
                    animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 30, scale: [0.2, 1.2, 0.8], opacity: [1, 1, 0], rotate: (i % 2 ? 1 : -1) * 220 }}
                    transition={{ duration: active.milestone ? 1.5 : 1.1, ease: 'easeOut', delay: (i % 4) * 0.03 }}
                  >
                    <P size={20 + (i % 3) * 6} strokeWidth={2.4} style={{ filter: `drop-shadow(0 0 8px ${theme.colors.primary})` }} />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Ordinary completion: banner toast */}
          {!active.milestone && (
            <div className="absolute inset-x-0 top-[max(env(safe-area-inset-top),18px)] flex justify-center px-3">
            <motion.div
              className="w-full max-w-[380px]"
              initial={{ y: -90, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            >
              <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: `${theme.colors.primary}99`, boxShadow: `0 14px 40px -10px ${theme.colors.primary}aa` }}>
                <BannerBackdrop motif={theme.motif} primary={theme.colors.primary} secondary={theme.colors.secondary} deep={theme.colors.deep} animate={false} />
                <div className="relative flex items-center gap-3 px-3 py-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: theme.colors.secondary }}>Super hábito · {theme.name}</div>
                    <div className="text-[13px] font-bold text-white leading-snug truncate">{pickDoneLine(theme, active.streak)}</div>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <StreakFlame streak={active.streak} size={26} />
                    <span className="text-[11px] font-black text-white leading-none">{active.streak}</span>
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          )}

          {/* Milestone: badge unlocked */}
          {active.milestone && level >= 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
                className="px-6 py-1.5 mb-6 text-[11px] font-black tracking-[0.3em] uppercase text-black"
                style={{ background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})`, clipPath: 'polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%)' }}
              >
                ¡Insignia desbloqueada!
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: -200 }} animate={{ scale: [0, 1.25, 1], rotate: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.25 }}
                className="relative"
              >
                <div className="absolute -inset-10 rounded-full blur-2xl opacity-70" style={{ background: `radial-gradient(circle, ${theme.colors.primary}, transparent 70%)` }} />
                <BadgeEmblem level={level} icon={theme.icon} size={150} state="earned" accent={theme.colors.primary} />
              </motion.div>

              <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="mt-6 text-[26px] font-black tracking-tight text-white leading-tight">
                {theme.badges[level]}
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="mt-1 text-[11px] font-black tracking-[0.25em] uppercase" style={{ color: theme.colors.secondary }}>
                Día {active.milestone} · {BADGE_METALS[level].name} · {theme.name}
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                className="mt-3 max-w-[300px] text-[14px] leading-snug text-white/80 font-medium">
                {theme.lines[level]}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
                className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
                <StreakFlame streak={active.streak} size={26} />
                <span className="text-sm font-black text-white">{active.streak} días</span>
                <span className="text-[11px] font-bold text-white/55">· Llama {flameTierFor(active.streak).name}</span>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-6 text-[11px] text-white/35">
                Toca para continuar
              </motion.p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
