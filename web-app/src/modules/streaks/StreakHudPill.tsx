import React from 'react';
import { Snowflake } from 'lucide-react';
import { StreakFlame } from '@/modules/superHabits/StreakFlame';
import { Embers, timeToMidnight, useStreakMeta } from './StreakFx';

interface StreakHudPillProps {
  streak: number;
  /** Today's protocol is complete. */
  secured: boolean;
  /** 0..3 requirements met today (tasks, habit, focus). */
  progress: number;
  onClick: (e: React.MouseEvent) => void;
}

const SIZE = 22;
const R = 9.5;
const C = 2 * Math.PI * R;

/**
 * The streak in the HUD: the flame sits inside a 3-segment ring that fills
 * with today's protocol. It burns (embers) once secured, frosts over when the
 * day is protected, pulses red in the last hours and shows a badge when a lost
 * streak can still be bought back.
 */
export const StreakHudPill = React.memo(({ streak, secured, progress, onClick }: StreakHudPillProps) => {
  const meta = useStreakMeta();
  const risk = !secured && !meta.protectedToday && streak > 0 && timeToMidnight().mins <= 4 * 60;
  const frozen = !secured && meta.protectedToday;
  const seg = C / 3 - 2.2;

  const tone = secured
    ? { border: 'rgba(251,146,60,0.45)', bg: 'linear-gradient(135deg, rgba(249,115,22,0.28), rgba(239,68,68,0.12))', text: '#fed7aa', ring: '#fb923c' }
    : frozen
      ? { border: 'rgba(125,211,252,0.45)', bg: 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(14,165,233,0.06))', text: '#e0f2fe', ring: '#7dd3fc' }
      : risk
        ? { border: 'rgba(251,113,133,0.5)', bg: 'linear-gradient(135deg, rgba(244,63,94,0.18), rgba(10,10,12,0.4))', text: '#fecdd3', ring: '#fb7185' }
        : { border: 'rgba(255,255,255,0.12)', bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.55)', ring: '#fdba74' };

  return (
    <button
      type="button"
      onClick={onClick}
      data-tour="streak-display"
      aria-label={`Racha de ${streak} días${secured ? ', asegurada hoy' : frozen ? ', protegida hoy' : ''}`}
      className={`relative flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full border shrink-0 active:scale-95 transition-transform ${risk ? 'sk-risk' : ''}`}
      style={{ borderColor: tone.border, background: tone.bg, boxShadow: secured ? '0 0 14px -4px rgba(249,115,22,0.7)' : undefined }}
    >
      <span className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden>
          {[0, 1, 2].map(i => (
            <circle
              key={i}
              cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={1.8} strokeLinecap="round"
              stroke={i < progress ? tone.ring : 'rgba(255,255,255,0.12)'}
              strokeDasharray={`${seg} ${C}`}
              strokeDashoffset={-(i * C) / 3}
              style={{ transition: 'stroke 0.5s ease' }}
            />
          ))}
        </svg>
        {secured && <Embers count={4} height={22} spread={6} />}
        <StreakFlame streak={streak} size={12} lit={secured || frozen} />
        {frozen && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-300 flex items-center justify-center">
            <Snowflake size={7} className="text-sky-900" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="text-[10px] font-mono font-black tabular-nums transition-colors" style={{ color: tone.text }}>{streak}</span>
      {meta.loss && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 border border-black/40" />
        </span>
      )}
    </button>
  );
});
