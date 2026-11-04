import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, Coins, Gift, Info, Sparkles, Sun, Swords, Trophy } from 'lucide-react';
import { ArenaSheet } from '@/modules/progression/ui/arena';
import { rankStyle } from '@/modules/progression/ui/tokens';
import {
  SOCIAL_CONFIG, addDays, checkExclusions, chestBelow, localDayKey, maxExcluded, periodDays, type DayKey, type DuelDuration,
} from '../engine';
import type { PublicProfile } from '../socialService';
import { socialStore, useSocial } from '../socialStore';
import { FramedAvatar, PrimaryButton, displayName, rankLabel, useMyFrame } from './common';

const WEEKDAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DURATIONS: { id: DuelDuration; label: string; sub: string; icon: React.ReactNode }[] = [
  { id: 'DAY', label: '1 día', sub: 'Sprint', icon: <Sun size={20} /> },
  { id: 'WEEK', label: '1 semana', sub: 'Clásico', icon: <CalendarRange size={20} /> },
  { id: 'MONTH', label: '1 mes', sub: 'Épico', icon: <CalendarDays size={20} /> },
];
const STAKES = [0, 100, 250, 500, 1000];

const parts = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return { y, m: m - 1, d, wd: new Date(y, m - 1, d).getDay() };
};

/** Month calendar(s) covering the contract, to pick the days that won't count. */
const PeriodCalendar: React.FC<{ days: DayKey[]; excluded: Set<DayKey>; onToggle: (k: DayKey) => void; locked: boolean }> = ({ days, excluded, onToggle, locked }) => {
  const inPeriod = new Set(days);
  const months = [...new Set(days.map(k => k.slice(0, 7)))];
  return (
    <div className="space-y-3">
      {months.map(ym => {
        const [y, m] = ym.split('-').map(Number);
        const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
        const total = new Date(y, m, 0).getDate();
        return (
          <div key={ym} className="rounded-[18px] p-3 arena-inset">
            <p className="text-[13px] font-black mb-2 capitalize text-center">{MONTHS[m - 1]} {y}</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(w => <span key={w} className="text-[10px] font-black prog-text-3">{w}</span>)}
              {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
              {Array.from({ length: total }, (_, i) => {
                const k = `${ym}-${String(i + 1).padStart(2, '0')}`;
                const active = inPeriod.has(k);
                const off = excluded.has(k);
                return (
                  <button
                    key={k} type="button" disabled={!active || (locked && !off)}
                    onClick={() => onToggle(k)}
                    aria-pressed={off}
                    aria-label={`${i + 1} de ${MONTHS[m - 1]}${off ? ', no cuenta' : ''}`}
                    className="aspect-square rounded-full text-[12px] font-black tabular-nums disabled:cursor-not-allowed transition-transform active:scale-90"
                    style={{
                      background: !active ? 'transparent' : off ? 'rgb(var(--p-negative) / 0.2)' : 'rgb(var(--rank) / 0.2)',
                      color: !active ? 'rgb(var(--p-text-3) / 0.35)' : off ? 'rgb(var(--p-negative))' : 'rgb(var(--p-text))',
                      textDecoration: off ? 'line-through' : undefined,
                      opacity: active && locked && !off ? 0.5 : 1,
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Step: React.FC<{ n: number; title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ n, title, right, children }) => (
  <section>
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: 'linear-gradient(140deg, var(--rank-from), var(--rank-to))', color: '#0b0b10' }}>{n}</span>
      <p className="flex-1 text-[14.5px] font-black">{title}</p>
      {right}
    </div>
    {children}
  </section>
);

export const DuelCreateSheet: React.FC<{ friend: PublicProfile; gold: number; onClose: () => void; onDone: (msg: string) => void }> = ({ friend, gold, onClose, onDone }) => {
  const snap = useSocial();
  const meP = snap.userId ? snap.profiles[snap.userId] : undefined;
  const myFrame = useMyFrame();
  const today = localDayKey();
  const [duration, setDuration] = useState<DuelDuration>('WEEK');
  const [start, setStart] = useState<DayKey>(addDays(today, 1));
  const [excluded, setExcluded] = useState<Set<DayKey>>(new Set());
  const [stake, setStake] = useState(0);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => periodDays(duration, start), [duration, start]);
  const max = maxExcluded(duration, days.length);
  const ex = [...excluded].filter(k => days.includes(k));
  const counted = days.length - ex.length;
  const problem = checkExclusions(duration, start, ex);
  const pot = stake * 2;
  const chest = chestBelow(pot);
  const maxStake = Math.min(gold, SOCIAL_CONFIG.MAX_STAKE);

  const toggle = (k: DayKey) => setExcluded(prev => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k);
    else if ([...next].filter(x => days.includes(x)).length < max) next.add(k);
    return next;
  });

  const changeDuration = (d: DuelDuration) => { setDuration(d); setExcluded(new Set()); };
  const changeStart = (k: DayKey) => { if (k >= today) { setStart(k); setExcluded(new Set()); } };

  const submit = async () => {
    setBusy(true);
    const r = await socialStore.challenge({ friendId: friend.user_id, duration, start, excluded: ex, stake });
    setBusy(false);
    if (r.ok) { onDone(`Reto enviado a ${displayName(friend)}`); onClose(); }
    else onDone(r.reason === 'NO_GOLD' ? 'No tienes oro suficiente' : r.reason === 'EVEN_TOTAL' ? 'Los días que cuentan deben ser impares' : 'No se pudo crear el duelo');
  };

  const hint = problem === 'EVEN_TOTAL'
    ? `Cuentan ${counted} días: debe ser un número impar para que haya ganador. ${duration === 'MONTH' && days.length % 2 === 0 ? 'Este mes tiene días pares: desmarca un número impar de días.' : 'Desmarca o vuelve a marcar un día.'}`
    : problem === 'TOO_MANY' ? `Máximo ${max} días sin contar.` : null;
  const first = parts(days[0]);
  const last = parts(days[days.length - 1]);

  return (
    <ArenaSheet
      onClose={onClose} label="Nuevo duelo" z={960}
      footer={
        <PrimaryButton className="w-full h-14 flex items-center justify-center gap-2 text-[15px]" disabled={busy || !!problem || stake > gold} onClick={submit}>
          <Swords size={18} /> {busy ? 'Enviando…' : `Enviar reto${stake ? ` · −${stake} oro` : ''}`}
        </PrimaryButton>
      }
    >
      <div className="px-5 pb-4 space-y-6">
        {/* Versus header */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <div className="flex flex-col items-center" style={rankStyle(meP?.rank_index ?? 0)}>
            <div className="p-1.5"><FramedAvatar profile={meP} frame={myFrame} size={52} /></div>
            <span className="text-[12px] font-black">Tú</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-black italic arena-cta">VS</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="p-1.5"><FramedAvatar profile={friend} size={52} /></div>
            <span className="text-[12px] font-black truncate max-w-[110px]">{displayName(friend)}</span>
          </div>
        </div>
        <div className="-mt-3 text-center">
          <h2 className="text-[21px] font-black">Retar a {displayName(friend)}</h2>
          <p className="text-[12px] prog-text-3">{rankLabel(friend)} · {friend.elo} ELO</p>
        </div>

        <Step n={1} title="Duración del duelo">
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {DURATIONS.map(d => {
              const on = duration === d.id;
              return (
                <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => changeDuration(d.id)}
                  className="prog-tap rounded-[18px] py-3 flex flex-col items-center gap-1 transition-transform active:scale-[0.97]"
                  style={on ? { background: 'linear-gradient(160deg, rgb(var(--rank) / 0.32), rgb(var(--rank) / 0.1))', boxShadow: 'inset 0 0 0 1.5px rgb(var(--rank))' } : { background: 'rgb(var(--p-line) / 0.05)', boxShadow: 'inset 0 0 0 1px rgb(var(--p-line) / 0.07)' }}>
                  <span style={{ color: on ? 'rgb(var(--rank))' : 'rgb(var(--p-text-3))' }}>{d.icon}</span>
                  <span className="text-[14px] font-black">{d.label}</span>
                  <span className="text-[10.5px] font-bold prog-text-3">{d.sub} · +{SOCIAL_CONFIG.FINAL_XP[d.id]} XP</span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={2} title="¿Cuándo empieza?">
          <div className="flex gap-2 items-center">
            {[today, addDays(today, 1)].map((k, i) => (
              <button key={k} type="button" onClick={() => changeStart(k)} className="prog-tap rounded-[14px] px-4 text-[13px] font-black"
                style={start === k ? { background: 'linear-gradient(100deg, var(--rank-from), var(--rank-to))', color: '#0b0b10' } : { background: 'rgb(var(--p-line) / 0.06)', color: 'rgb(var(--p-text-2))' }}>
                {i === 0 ? 'Hoy' : 'Mañana'}
              </button>
            ))}
            <input type="date" value={start} min={today} max={addDays(today, 60)} onChange={e => changeStart(e.target.value)}
              className="h-11 flex-1 min-w-0 rounded-[14px] px-3 arena-inset text-[13px]" style={{ color: 'rgb(var(--p-text))', colorScheme: 'dark' }} aria-label="Fecha de inicio" />
          </div>
          <p className="mt-2 text-[12px] prog-text-3">Del <b className="prog-text-2">{first.d} de {MONTHS[first.m]}</b> al <b className="prog-text-2">{last.d} de {MONTHS[last.m]}</b> · {days.length} {days.length === 1 ? 'día' : 'días'}</p>
        </Step>

        {duration !== 'DAY' && (
          <Step n={3} title="Días que no cuentan" right={<span className="arena-chip tabular-nums">{ex.length}/{max} · cuentan {counted}</span>}>
            {duration === 'WEEK' ? (
              <div className="grid grid-cols-7 gap-1.5">
                {days.map(k => {
                  const p = parts(k);
                  const off = excluded.has(k);
                  const locked = !off && ex.length >= max;
                  return (
                    <button key={k} type="button" onClick={() => toggle(k)} disabled={locked} aria-pressed={off}
                      className="rounded-[14px] py-2 flex flex-col items-center disabled:opacity-40 transition-transform active:scale-90"
                      style={{ background: off ? 'rgb(var(--p-negative) / 0.18)' : 'rgb(var(--rank) / 0.16)', color: off ? 'rgb(var(--p-negative))' : 'rgb(var(--p-text))', minHeight: 54, boxShadow: off ? 'inset 0 0 0 1px rgb(var(--p-negative) / 0.4)' : 'inset 0 0 0 1px rgb(var(--rank) / 0.3)' }}>
                      <span className="text-[10px] font-bold opacity-80">{WEEKDAY[p.wd]}</span>
                      <span className="text-[15px] font-black tabular-nums" style={{ textDecoration: off ? 'line-through' : undefined }}>{p.d}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <PeriodCalendar days={days} excluded={excluded} onToggle={toggle} locked={ex.length >= max} />
            )}
            <p className="mt-2 text-[11.5px] prog-text-3">Toca un día para dejarlo fuera (descanso, viaje…). El total que cuenta debe ser impar.</p>
            {hint && <p className="mt-2 flex gap-1.5 text-[12px] font-bold rounded-[12px] p-2.5" style={{ color: 'rgb(var(--p-warning))', background: 'rgb(var(--p-warning) / 0.1)' }}><Info size={15} className="shrink-0 mt-px" />{hint}</p>}
          </Step>
        )}

        <Step n={duration === 'DAY' ? 3 : 4} title="Apuesta (igual para los dos)" right={<span className="arena-chip tabular-nums"><Coins size={12} style={{ color: '#facc15' }} /> {gold}</span>}>
          <div className="flex flex-wrap gap-2">
            {STAKES.map(v => {
              const on = stake === v;
              return (
                <button key={v} type="button" disabled={v > gold} onClick={() => setStake(v)} className="prog-tap rounded-[14px] px-3.5 text-[13px] font-black disabled:opacity-35 flex items-center gap-1.5"
                  style={on ? { background: 'linear-gradient(100deg, #ca8a04, #fde047)', color: '#1f1300' } : { background: 'rgb(var(--p-line) / 0.06)', color: 'rgb(var(--p-text-2))' }}>
                  {v > 0 && <Coins size={13} />}{v === 0 ? 'Sin apuesta' : v}
                </button>
              );
            })}
            <input type="number" inputMode="numeric" min={0} max={maxStake} value={stake}
              onChange={e => setStake(Math.max(0, Math.min(maxStake, Math.round(Number(e.target.value) || 0))))}
              className="h-11 w-24 rounded-[14px] px-3 arena-inset text-[13px] font-bold tabular-nums" style={{ color: 'rgb(var(--p-text))' }} aria-label="Apuesta personalizada" />
          </div>
        </Step>

        {/* Prize ticket */}
        <section className="relative rounded-[22px] overflow-hidden" style={{ background: 'linear-gradient(140deg, rgb(250 204 21 / 0.16), rgb(var(--rank) / 0.1))', boxShadow: 'inset 0 0 0 1px rgb(250 204 21 / 0.25)' }}>
          <div className="p-4">
            <p className="flex items-center gap-2 text-[15px] font-black"><Trophy size={17} style={{ color: '#facc15' }} /> Lo que está en juego</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[14px] py-2.5" style={{ background: 'rgb(var(--p-bg) / 0.5)' }}>
                <p className="flex items-center justify-center gap-1 text-[17px] font-black tabular-nums" style={{ color: '#facc15' }}><Coins size={15} />{pot}</p>
                <p className="text-[10px] font-bold prog-text-3">Bote</p>
              </div>
              <div className="rounded-[14px] py-2.5" style={{ background: 'rgb(var(--p-bg) / 0.5)' }}>
                <p className="flex items-center justify-center gap-1 text-[17px] font-black tabular-nums" style={{ color: '#f472b6' }}><Gift size={15} />{chest || '—'}</p>
                <p className="text-[10px] font-bold prog-text-3">Cofre</p>
              </div>
              <div className="rounded-[14px] py-2.5" style={{ background: 'rgb(var(--p-bg) / 0.5)' }}>
                <p className="flex items-center justify-center gap-1 text-[17px] font-black tabular-nums" style={{ color: '#a78bfa' }}><Sparkles size={15} />{SOCIAL_CONFIG.FINAL_XP[duration]}</p>
                <p className="text-[10px] font-bold prog-text-3">XP + logro</p>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-dashed mx-4" style={{ borderColor: 'rgb(var(--p-line) / 0.12)' }} />
          <ul className="p-4 pt-3 space-y-1.5 text-[12px] prog-text-2">
            <li>• Cada día gana quien tenga más <b>score</b>; si empatan, más <b>minutos de foco</b>; si siguen empatados, <b>moneda</b>.</li>
            <li>• Ganador de cada día: {SOCIAL_CONFIG.DAY_WIN.gold} oro + cofre de {SOCIAL_CONFIG.DAY_WIN.chestValue} + {SOCIAL_CONFIG.DAY_WIN.xp} XP.</li>
            <li>• Ganador del duelo (más días): el bote{chest ? `, un cofre de ${chest}` : ''}, {SOCIAL_CONFIG.FINAL_XP[duration]} XP y un logro.</li>
          </ul>
        </section>
      </div>
    </ArenaSheet>
  );
};
