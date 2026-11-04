import React, { memo, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayKey, StreakDay } from '../engine';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const ME = '56 189 248';
const FRIEND = '244 114 182';

const key = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const STYLE: Record<StreakDay, { bg: string; fg: string; label: string }> = {
  BOTH: { bg: 'linear-gradient(140deg, #ea580c, #facc15)', fg: '#1a0f00', label: 'Ambos' },
  ME: { bg: `linear-gradient(90deg, rgb(${ME} / 0.8) 50%, rgb(${ME} / 0.12) 50%)`, fg: 'rgb(var(--p-text))', label: 'Solo tú' },
  FRIEND: { bg: `linear-gradient(90deg, rgb(${FRIEND} / 0.12) 50%, rgb(${FRIEND} / 0.8) 50%)`, fg: 'rgb(var(--p-text))', label: 'Solo tu amigo' },
  NONE: { bg: 'rgb(var(--p-line) / 0.06)', fg: 'rgb(var(--p-text-3))', label: 'Nadie' },
};

/** Month grid of a shared streak: both / only me / only my friend / nobody. */
export const StreakCalendar: React.FC<{ days: Record<DayKey, StreakDay>; today: DayKey; startedOn: DayKey }> = memo(({ days, today, startedOn }) => {
  const [y0, m0] = today.split('-').map(Number);
  const [offset, setOffset] = useState(0);
  const { year, month, cells } = useMemo(() => {
    const first = new Date(y0, m0 - 1 + offset, 1);
    const year = first.getFullYear();
    const month = first.getMonth();
    const lead = (first.getDay() + 6) % 7; // Monday first
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: total }, (_, i) => i + 1)];
    return { year, month, cells };
  }, [y0, m0, offset]);
  const canBack = key(year, month, 1) > startedOn.slice(0, 8) + '01';
  const counts = useMemo(() => {
    const c = { BOTH: 0, ME: 0, FRIEND: 0, NONE: 0 } as Record<StreakDay, number>;
    const prefix = key(year, month, 1).slice(0, 8);
    Object.entries(days).forEach(([k, v]) => { if (k.startsWith(prefix) && k >= startedOn && k <= today) c[v]++; });
    return c;
  }, [days, year, month, startedOn, today]);

  return (
    <div className="rounded-[18px] p-3" style={{ background: 'rgb(var(--p-bg) / 0.45)' }}>
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="prog-tap flex items-center justify-center rounded-full disabled:opacity-30" onClick={() => setOffset(o => o - 1)} disabled={!canBack} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-[14px] font-black">{MONTHS[month]} {year}</p>
          <p className="text-[10.5px] prog-text-3 tabular-nums">🔥 {counts.BOTH} días juntos</p>
        </div>
        <button type="button" className="prog-tap flex items-center justify-center rounded-full disabled:opacity-30" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map(w => <span key={w} className="text-[10px] font-black prog-text-3">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const k = key(year, month, d);
          const st = days[k];
          const outside = k < startedOn || k > today;
          const s = st && !outside ? STYLE[st] : null;
          const isToday = k === today;
          return (
            <span
              key={k}
              title={s?.label}
              className="aspect-square rounded-full flex items-center justify-center text-[11.5px] font-black tabular-nums"
              style={{
                background: s?.bg ?? 'transparent',
                color: s?.fg ?? 'rgb(var(--p-text-3))',
                opacity: outside ? 0.3 : 1,
                boxShadow: isToday ? '0 0 0 2px rgb(var(--p-bg)), 0 0 0 4px rgb(var(--rank))' : st === 'BOTH' && !outside ? '0 4px 12px -4px #f97316' : undefined,
              }}
            >
              {d}
            </span>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] prog-text-2">
        {(['BOTH', 'ME', 'FRIEND', 'NONE'] as StreakDay[]).map(k => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: STYLE[k].bg }} />
            {STYLE[k].label}
            <span className="ml-auto font-black tabular-nums prog-text-3">{counts[k]}</span>
          </span>
        ))}
      </div>
    </div>
  );
});
StreakCalendar.displayName = 'StreakCalendar';
