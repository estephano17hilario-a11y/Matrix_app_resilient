import React, { useMemo } from 'react';
import {
  Snowflake, Mountain, Feather, ShieldCheck, RotateCcw, Heart, HeartPulse, ScrollText, Gift, Flame, Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toLocalISOString } from '@/utils/dateUtils';
import { isDayProtected } from '@/utils/streakRules';
import { hudLoss, protectedDays } from './recovery';
import './streaks.css';

// ── Visual metadata of every power (store, HUD sheet, inventory) ─────────────
export interface PowerMeta {
  rgb: string;        // "r g b"
  icon: React.ElementType;
  tag: string;        // one-line effect chip
}

export const POWER_META: Record<string, PowerMeta> = {
  freeze_streak: { rgb: '125 211 252', icon: Snowflake, tag: 'Protege hoy' },
  glacier_streak: { rgb: '103 232 249', icon: Mountain, tag: 'Protege 3 días' },
  phoenix_feather: { rgb: '251 146 60', icon: Feather, tag: 'Automático' },
  rest_shield: { rgb: '167 139 250', icon: ShieldCheck, tag: 'ELO + rachas' },
  redemption_token: { rgb: '251 191 36', icon: RotateCcw, tag: 'Restaura' },
  potion_hp_small: { rgb: '251 113 133', icon: Heart, tag: '+10 HP' },
  potion_hp_full: { rgb: '244 63 94', icon: HeartPulse, tag: 'HP al máximo' },
  potion_xp_restore: { rgb: '52 211 153', icon: ScrollText, tag: '+250 XP' },
  mystery_chest: { rgb: '232 121 249', icon: Gift, tag: 'Premio al azar' },
};

export const powerMeta = (id: string): PowerMeta =>
  POWER_META[id] || { rgb: '251 191 36', icon: id.startsWith('chest_') ? Gift : Zap, tag: '' };

// ── Embers rising from a flame ───────────────────────────────────────────────
export const Embers = React.memo(({ count = 10, color = '#fb923c', height = 90, spread = 40, className = '' }: {
  count?: number; color?: string; height?: number; spread?: number; className?: string;
}) => {
  const embers = useMemo(() => Array.from({ length: count }, (_, i) => {
    // Deterministic pseudo-random layout (no re-shuffle on re-render).
    const r = (n: number) => ((Math.sin((i + 1) * 12.9898 * n) * 43758.5453) % 1 + 1) % 1;
    return {
      x: (r(1) - 0.5) * spread * 2,
      d: r(2) * 2.6,
      s: 2 + r(3) * 3,
      t: 2 + r(4) * 1.8,
      h: -(height * (0.6 + r(5) * 0.5)),
      off: (r(6) - 0.5) * spread,
    };
  }), [count, height, spread]);
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {embers.map((e, i) => (
        <span
          key={i}
          className="sk-ember"
          style={{
            marginLeft: e.off,
            ['--x' as any]: `${e.x}px`,
            ['--d' as any]: `${e.d}s`,
            ['--s' as any]: `${e.s}px`,
            ['--t' as any]: `${e.t}s`,
            ['--h' as any]: `${e.h}px`,
            ['--c' as any]: color,
          }}
        />
      ))}
    </div>
  );
});

// ── Frost motes for protected days ───────────────────────────────────────────
export const Frost = React.memo(({ count = 12, height = 180 }: { count?: number; height?: number }) => {
  const flakes = useMemo(() => Array.from({ length: count }, (_, i) => {
    const r = (n: number) => ((Math.sin((i + 3) * 78.233 * n) * 12543.123) % 1 + 1) % 1;
    return { l: `${r(1) * 100}%`, d: r(2) * 4, s: 1.5 + r(3) * 2.5, t: 3.5 + r(4) * 3, x: (r(5) - 0.5) * 30 };
  }), [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="sk-flake"
          style={{
            ['--l' as any]: f.l,
            ['--d' as any]: `${f.d}s`,
            ['--s' as any]: `${f.s}px`,
            ['--t' as any]: `${f.t}s`,
            ['--x' as any]: `${f.x}px`,
            ['--h' as any]: `${height}px`,
          }}
        />
      ))}
    </div>
  );
});

// ── Streak meta read straight from the profile (no prop drilling) ───────────
export const useStreakMeta = () => {
  const { profile } = useAuth();
  const stats: any = profile?.stats || {};
  return useMemo(() => {
    const today = toLocalISOString(new Date());
    const frozenDays = protectedDays(stats);
    return {
      stats,
      today,
      frozenDays,
      restoredDays: (Array.isArray(stats.streakRestoredDays) ? stats.streakRestoredDays : []) as string[],
      protectedToday: isDayProtected({ frozenUntil: stats.streakFrozenUntil, frozenDays }, today),
      loss: hudLoss(stats),
      longest: Math.max(Number(stats.longestStreak) || 0, Number(stats.streak) || 0),
      previous: Number(stats.previousStreak) || 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.streak, stats.lastStreakDate, stats.previousStreak, stats.streakLostAt, stats.longestStreak,
      stats.streakFrozenUntil, JSON.stringify(stats.streakFrozenDays || []), JSON.stringify(stats.streakRestoredDays || [])]);
};

/** Time left until local midnight, e.g. "4h 12m". */
export const timeToMidnight = (now = new Date()) => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { mins, label: h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m` };
};

export { Flame };
