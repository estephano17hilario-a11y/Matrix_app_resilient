import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, CalendarDays, Check, ChevronDown, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { MOTION } from '@/modules/progression/ui/tokens';
import { localDayKey } from '../engine';
import type { FriendStreakRow } from '../socialService';
import { socialStore, streakWith, type SocialSnapshot } from '../socialStore';
import { NUDGE_TEXT } from './FriendProfileSheet';
import { StreakCalendar } from './StreakCalendar';
import { Avatar, GhostButton, PrimaryButton, displayName } from './common';

/** Animated flame with the streak count inside. */
export const FlameEmblem: React.FC<{ value: number; size?: number; lit?: boolean }> = ({ value, size = 96, lit = true }) => {
  const id = `fl${useId().replace(/:/g, '')}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size * 1.2 }}>
      {lit && <div className="arena-halo" style={{ inset: '10% -10% -5% -10%', background: 'radial-gradient(closest-side, rgb(249 115 22 / 0.55), transparent)' }} />}
      <svg viewBox="0 0 64 80" width={size} height={size * 1.2} className={lit ? 'arena-flame relative' : 'relative'} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}o`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? '#ea580c' : '#475569'} />
            <stop offset="0.55" stopColor={lit ? '#fb923c' : '#64748b'} />
            <stop offset="1" stopColor={lit ? '#fde047' : '#94a3b8'} />
          </linearGradient>
          <linearGradient id={`${id}i`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? '#fef3c7' : '#cbd5e1'} />
            <stop offset="1" stopColor={lit ? '#fde047' : '#94a3b8'} />
          </linearGradient>
        </defs>
        <path d="M32 2C37 17 55 26 55 48c0 18-10.5 30-23 30S9 66 9 48c0-12 7.5-18.5 12-26 2 9.5 6 12 9 12-2.5-11-.5-22 2-32Z" fill={`url(#${id}o)`} />
        <path d="M32 36c3.5 8.5 13 12.5 13 25 0 9.5-6 15-13 15s-13-5.5-13-15c0-6.5 4-10.5 6.5-14.5 1.5 5.5 4 7 5.5 7-1.5-6 0-12 1-17.5Z" fill={`url(#${id}i)`} opacity={0.95} />
      </svg>
      <span className="absolute inset-x-0 text-center font-black tabular-nums leading-none" style={{ bottom: size * 0.16, fontSize: size * 0.3, color: lit ? '#431407' : '#1e293b' }}>{value}</span>
    </div>
  );
};

export const StreakCard: React.FC<{ row: FriendStreakRow; snap: SocialSnapshot }> = ({ row, snap }) => {
  const reduce = useReducedMotion();
  const [showCal, setShowCal] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const me = snap.userId as string;
  const friendId = row.user_a === me ? row.user_b : row.user_a;
  const friend = snap.profiles[friendId];
  const meP = snap.profiles[me];

  if (row.status === 'PENDING') {
    const mine = row.requested_by === me;
    return (
      <article className="arena-card arena-card--glow p-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <Avatar profile={meP} size={42} ring />
            <Avatar profile={friend} size={42} ring />
          </div>
          <div className="flex-1 min-w-0">
            <p className="arena-kicker">Racha compartida</p>
            <p className="text-[14.5px] font-black leading-snug">{mine ? `Esperando a ${displayName(friend)}` : `${displayName(friend)} quiere una racha contigo`}</p>
          </div>
          <FlameEmblem value={0} size={38} lit={false} />
        </div>
        {!mine ? (
          <div className="mt-3 flex gap-2">
            <PrimaryButton className="flex-1 h-12" onClick={() => socialStore.respondStreak(row, true)}>Empezar racha 🔥</PrimaryButton>
            <GhostButton className="h-12" onClick={() => socialStore.respondStreak(row, false)}>Ahora no</GhostButton>
          </div>
        ) : (
          <p className="mt-3 text-[12px] prog-text-3 flex items-center gap-1.5"><Clock size={13} /> Le llegó tu propuesta. En cuanto acepte empieza a contar.</p>
        )}
      </article>
    );
  }

  const s = streakWith(row, snap);
  if (!s || !row.started_on) return null;
  const today = localDayKey();
  const both = s.today.me && s.today.friend;
  const people = [
    { who: 'Tú', p: meP, ok: s.today.me },
    { who: displayName(friend), p: friend, ok: s.today.friend },
  ];

  return (
    <article className="arena-card overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true" style={{ background: both ? 'radial-gradient(90% 70% at 20% 0%, rgb(249 115 22 / 0.3), transparent 70%)' : 'radial-gradient(90% 70% at 20% 0%, rgb(249 115 22 / 0.14), transparent 70%)' }} />
      <div className="relative p-4">
        <div className="flex items-center gap-4">
          <FlameEmblem value={s.current} size={78} lit={s.current > 0 || both} />
          <div className="flex-1 min-w-0">
            <p className="arena-kicker">Racha con {displayName(friend)}</p>
            <p className="text-[24px] font-black leading-tight">{s.current} {s.current === 1 ? 'día' : 'días'}</p>
            <p className="text-[12px] prog-text-3">Mejor marca: <b className="tabular-nums" style={{ color: '#fb923c' }}>{s.best}</b> · desde el {row.started_on.split('-').reverse().slice(0, 2).join('/')}</p>
          </div>
        </div>

        {/* Today: both must light it */}
        <div className="mt-4 flex items-center gap-2">
          {people.map((x, i) => (
            <React.Fragment key={x.who}>
              {i === 1 && (
                <div className="flex-1 h-[3px] rounded-full" style={{ background: both ? 'linear-gradient(90deg, #f97316, #facc15)' : 'rgb(var(--p-line) / 0.1)' }} />
              )}
              <div className="flex items-center gap-2 rounded-[16px] pl-1.5 pr-3 py-1.5" style={{ background: x.ok ? 'rgb(249 115 22 / 0.16)' : 'rgb(var(--p-line) / 0.05)' }}>
                <div className="relative">
                  <Avatar profile={x.p} size={30} />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: x.ok ? '#f97316' : 'rgb(var(--p-surface-2))', boxShadow: '0 0 0 2px rgb(var(--p-surface))', color: x.ok ? '#fff' : 'rgb(var(--p-text-3))' }}>
                    {x.ok ? <Check size={10} strokeWidth={3.5} /> : <Clock size={9} />}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-black truncate max-w-[84px]">{x.who}</p>
                  <p className="text-[10.5px] font-bold" style={{ color: x.ok ? '#fb923c' : 'rgb(var(--p-text-3))' }}>{x.ok ? 'Encendida' : 'Pendiente'}</p>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {!s.today.me && <p className="mt-3 text-[12px] font-bold" style={{ color: 'rgb(var(--p-warning))' }}>Activa tu racha del HUD hoy para sumar el día.</p>}
        {!s.today.friend && (
          <button
            type="button"
            onClick={async () => toast(await socialStore.send(friendId, 'NUDGE', NUDGE_TEXT) ? 'Aviso enviado 🔥' : 'No se pudo enviar')}
            className="prog-tap mt-3 w-full h-12 rounded-[16px] flex items-center justify-center gap-2 text-[13.5px] font-black"
            style={{ background: 'linear-gradient(100deg, #f97316, #facc15)', color: '#1a0f00', boxShadow: '0 12px 24px -12px #f97316' }}
          >
            <Bell size={16} /> ¡OYE, ACTIVA LA RACHA!
          </button>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => setShowCal(v => !v)} className="prog-tap flex items-center gap-1.5 text-[12.5px] font-bold prog-text-2" aria-expanded={showCal}>
            <CalendarDays size={15} /> Calendario
            <ChevronDown size={15} style={{ transform: showCal ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
          </button>
          {confirmEnd ? (
            <div className="flex items-center gap-1.5">
              <button type="button" className="prog-tap px-2 text-[12px] font-bold prog-text-3" onClick={() => setConfirmEnd(false)}>No</button>
              <button type="button" className="prog-tap px-3 rounded-[12px] text-[12px] font-black" style={{ background: 'rgb(var(--p-negative) / 0.16)', color: 'rgb(var(--p-negative))', minHeight: 36 }} onClick={() => socialStore.endStreak(row)}>Terminar</button>
            </div>
          ) : (
            <button type="button" className="prog-tap px-2 text-[12px] prog-text-3" onClick={() => setConfirmEnd(true)}>Terminar racha</button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showCal && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: MOTION.micro }}
              className="mt-2"
            >
              <StreakCalendar days={s.days} today={today} startedOn={row.started_on} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
};
