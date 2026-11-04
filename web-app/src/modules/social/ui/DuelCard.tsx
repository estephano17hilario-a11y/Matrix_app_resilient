import React, { memo } from 'react';
import { CalendarOff, Clock, Coins, Gift, Sparkles, Swords, Trophy } from 'lucide-react';
import { RankBadge } from '@/modules/progression/ui/RankBadge';
import { rankRgb } from '@/modules/progression/ui/tokens';
import { SOCIAL_CONFIG, chestBelow, localDayKey } from '../engine';
import type { DuelRow, PublicProfile } from '../socialService';
import { socialStore, standingOf, type SocialSnapshot } from '../socialStore';
import { FramedAvatar, GhostButton, PrimaryButton, displayName, divisionOf, useMyFrame } from './common';

const LENGTH = { DAY: '1 día', WEEK: '1 semana', MONTH: '1 mes' } as const;
const STATUS: Record<DuelRow['status'], { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: '251 191 36' },
  ACTIVE: { label: 'En curso', color: '52 211 153' },
  DECLINED: { label: 'Rechazado', color: '148 163 184' },
  CANCELLED: { label: 'Cancelado', color: '148 163 184' },
  FINISHED: { label: 'Terminado', color: '167 139 250' },
};
const BY = { SCORE: 'score', FOCUS: 'foco', COIN: 'moneda' } as const;

const fmt = (k: string) => {
  const [, m, d] = k.split('-').map(Number);
  return `${d}/${m}`;
};

/** Live head-to-head bar: my share on the left, theirs on the right. */
const VersusBar: React.FC<{ label: string; mine: number; theirs: number; unit: string }> = ({ label, mine, theirs, unit }) => {
  const total = mine + theirs;
  const share = total > 0 ? mine / total : 0.5;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11.5px] tabular-nums">
        <span className="font-black" style={{ color: 'rgb(var(--me))' }}>{mine}{unit}</span>
        <span className="arena-kicker">{label}</span>
        <span className="font-black" style={{ color: 'rgb(var(--them))' }}>{theirs}{unit}</span>
      </div>
      <div className="mt-1 flex h-2 gap-[3px]">
        <span className="rounded-full transition-[flex] duration-500" style={{ flex: Math.max(0.03, share), background: 'rgb(var(--me))' }} />
        <span className="rounded-full transition-[flex] duration-500" style={{ flex: Math.max(0.03, 1 - share), background: 'rgb(var(--them))' }} />
      </div>
    </div>
  );
};

/** Versus banner of a duel: both players, score, per-day track, today's live numbers and prizes. */
export const DuelCard: React.FC<{ duel: DuelRow; snap: SocialSnapshot; onAction?: (msg: string) => void; onOpenFriend?: (id: string) => void }> = memo(({ duel, snap, onAction, onOpenFriend }) => {
  const me = snap.userId as string;
  const mineIsA = duel.challenger === me;
  const themId = mineIsA ? duel.opponent : duel.challenger;
  const meP = snap.profiles[me];
  const them = snap.profiles[themId] as PublicProfile | undefined;
  const st = standingOf(duel, snap);
  const myFrame = useMyFrame();
  const myWins = mineIsA ? st.winsA : st.winsB;
  const theirWins = mineIsA ? st.winsB : st.winsA;
  const today = localDayKey();
  const liveMine = snap.stats[me]?.[today];
  const liveTheirs = snap.stats[themId]?.[today];
  const pot = duel.stake * 2;
  const chest = chestBelow(pot);
  const incoming = duel.status === 'PENDING' && duel.opponent === me;
  const outgoing = duel.status === 'PENDING' && duel.challenger === me;
  const won = duel.status === 'FINISHED' && duel.winner === me;
  const lost = duel.status === 'FINISHED' && !won;
  const status = STATUS[duel.status];
  const meRgb = rankRgb(meP?.rank_index ?? 0);
  const themRgb = rankRgb(them?.rank_index ?? 0);
  const played = st.results.length;
  const leading = myWins > theirWins ? 'me' : theirWins > myWins ? 'them' : null;

  const act = async (fn: () => Promise<{ ok: boolean; reason?: string | null } | boolean>) => {
    const r = await fn();
    const ok = typeof r === 'boolean' ? r : r.ok;
    const reason = typeof r === 'boolean' ? null : r.reason;
    onAction?.(ok ? 'Listo' : reason === 'NO_GOLD' ? 'No tienes oro suficiente para la apuesta' : reason === 'EXPIRED' ? 'El duelo ya debía haber empezado' : 'No se pudo completar');
  };

  return (
    <article className="arena-card overflow-hidden" style={{ '--me': meRgb, '--them': themRgb } as React.CSSProperties}>
      {/* Split glow: my colour left, theirs right */}
      <div className="absolute inset-0" aria-hidden="true" style={{ background: 'linear-gradient(105deg, rgb(var(--me) / 0.26), transparent 46%, transparent 54%, rgb(var(--them) / 0.26))' }} />
      {won && <div className="absolute inset-0" aria-hidden="true" style={{ background: 'radial-gradient(80% 60% at 50% 0%, rgb(250 204 21 / 0.22), transparent 70%)' }} />}

      <div className="relative p-4">
        <header className="flex items-center justify-between gap-2">
          <span className="arena-chip"><Swords size={12} /> {LENGTH[duel.duration]}</span>
          <span className="text-[11px] prog-text-3 tabular-nums">{fmt(duel.start_day)} – {fmt(duel.end_day)}</span>
          <span className="arena-chip" style={{ background: `rgb(${status.color} / 0.15)`, color: `rgb(${status.color})` }}>
            {duel.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full arena-pulse" style={{ background: 'currentColor' }} />}
            {status.label}
          </span>
        </header>

        {/* Versus */}
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="p-1.5"><FramedAvatar profile={meP} frame={myFrame} size={50} /></div>
            <span className="mt-1 text-[13px] font-black truncate max-w-full">Tú</span>
            <span className="flex items-center gap-1 text-[10.5px] prog-text-3"><RankBadge rankIndex={meP?.rank_index ?? 0} division={divisionOf(meP)} size={16} />{meP?.elo ?? '—'}</span>
          </div>
          <div className="flex flex-col items-center px-1">
            <div className="flex items-center gap-2">
              <span className="text-[40px] font-black tabular-nums leading-none" style={{ color: leading === 'me' ? 'rgb(var(--p-positive))' : undefined }}>{myWins}</span>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-black italic" style={{ background: 'linear-gradient(135deg, rgb(var(--me)), rgb(var(--them)))', color: '#0b0b10', boxShadow: '0 0 0 3px rgb(var(--p-surface))' }}>VS</span>
              <span className="text-[40px] font-black tabular-nums leading-none" style={{ color: leading === 'them' ? 'rgb(var(--p-negative))' : undefined }}>{theirWins}</span>
            </div>
            <p className="mt-1.5 text-[10.5px] prog-text-3 tabular-nums">{played}/{st.counted.length} días jugados</p>
          </div>
          <button type="button" onClick={() => onOpenFriend?.(themId)} className="flex flex-col items-center text-center min-w-0" aria-label={`Perfil de ${displayName(them)}`}>
            <div className="p-1.5"><FramedAvatar profile={them} size={50} /></div>
            <span className="mt-1 text-[13px] font-black truncate max-w-full">{displayName(them)}</span>
            <span className="flex items-center gap-1 text-[10.5px] prog-text-3"><RankBadge rankIndex={them?.rank_index ?? 0} division={divisionOf(them)} size={16} />{them?.elo ?? '—'}</span>
          </button>
        </div>

        {/* Day track: one segment per counted day */}
        <div className="mt-4 flex gap-[3px]" aria-label="Resultados por día">
          {st.counted.map(d => {
            const r = st.results.find(x => x.day === d);
            const mineWon = r && (r.winner === 'A') === mineIsA;
            const isLive = d === st.live;
            return (
              <span
                key={d}
                title={r ? `${fmt(d)}: ${mineWon ? 'ganaste' : 'perdiste'} por ${BY[r.by]}` : isLive ? `${fmt(d)}: hoy` : fmt(d)}
                className={`flex-1 h-2.5 rounded-full ${isLive ? 'arena-pulse' : ''}`}
                style={{ maxWidth: 34, background: !r ? (isLive ? 'rgb(var(--rank))' : 'rgb(var(--p-line) / 0.1)') : mineWon ? 'rgb(var(--p-positive))' : 'rgb(var(--p-negative))' }}
              />
            );
          })}
        </div>

        {duel.status === 'ACTIVE' && st.live && (
          <div className="mt-4 rounded-[18px] p-3 space-y-2.5" style={{ background: 'rgb(var(--p-bg) / 0.45)' }}>
            <p className="flex items-center gap-1.5 text-[11.5px] font-black"><span className="w-2 h-2 rounded-full arena-pulse" style={{ background: '#ef4444' }} /> HOY EN VIVO</p>
            <VersusBar label="Score" mine={Math.round(liveMine?.score ?? 0)} theirs={Math.round(liveTheirs?.score ?? 0)} unit="" />
            <VersusBar label="Foco" mine={Math.round(liveMine?.focusMinutes ?? 0)} theirs={Math.round(liveTheirs?.focusMinutes ?? 0)} unit="m" />
          </div>
        )}
        {st.clinched && duel.status === 'ACTIVE' && (
          <p className="mt-3 text-center text-[12.5px] font-black" style={{ color: (st.clinched === 'A') === mineIsA ? 'rgb(var(--p-positive))' : 'rgb(var(--p-warning))' }}>
            {(st.clinched === 'A') === mineIsA ? '¡Victoria asegurada! 🔒' : `${displayName(them)} ya tiene la victoria asegurada`}
          </p>
        )}

        {/* Prizes */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Prize icon={<Coins size={15} />} color="#facc15" value={pot} label="Bote" />
          <Prize icon={<Gift size={15} />} color="#f472b6" value={chest ? chest : '—'} label="Cofre final" />
          <Prize icon={<Sparkles size={15} />} color="#a78bfa" value={`+${SOCIAL_CONFIG.FINAL_XP[duel.duration]}`} label="XP final" />
        </div>
        <p className="mt-2 text-center text-[11px] prog-text-3">
          Cada día ganado: {SOCIAL_CONFIG.DAY_WIN.gold} oro + cofre de {SOCIAL_CONFIG.DAY_WIN.chestValue} + {SOCIAL_CONFIG.DAY_WIN.xp} XP
          {duel.stake > 0 ? ` · Apuesta ${duel.stake} cada uno` : ''}
        </p>
        {duel.excluded_days.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
            <CalendarOff size={12} className="prog-text-3" />
            {duel.excluded_days.map(d => <span key={d} className="rounded-full px-1.5 py-[1px] text-[10px] font-bold tabular-nums" style={{ background: 'rgb(var(--p-line) / 0.07)', color: 'rgb(var(--p-text-3))' }}>{fmt(d)}</span>)}
          </div>
        )}

        {won && (
          <div className="mt-4 rounded-[18px] p-3 flex items-center justify-center gap-2 font-black text-[15px]" style={{ background: 'linear-gradient(110deg, #f59e0b, #fde047)', color: '#1f1300' }}>
            <Trophy size={18} /> ¡Ganaste este duelo!
          </div>
        )}
        {lost && <p className="mt-4 text-center text-[13px] font-bold prog-text-2">Ganó {displayName(them)} · la próxima es tuya</p>}

        {incoming && (
          <div className="mt-4 flex gap-2">
            <PrimaryButton className="flex-1 h-12" onClick={() => act(() => socialStore.respondDuel(duel, true))}>Aceptar duelo{duel.stake ? ` · −${duel.stake} oro` : ''}</PrimaryButton>
            <GhostButton className="h-12" onClick={() => act(() => socialStore.respondDuel(duel, false))}>Rechazar</GhostButton>
          </div>
        )}
        {outgoing && (
          <div className="mt-4 flex items-center gap-2">
            <span className="flex-1 flex items-center gap-1.5 text-[12px] prog-text-3"><Clock size={14} /> Esperando que acepte…</span>
            <GhostButton className="h-11" onClick={() => act(() => socialStore.cancelDuel(duel))}>Cancelar</GhostButton>
          </div>
        )}
      </div>
    </article>
  );
});
DuelCard.displayName = 'DuelCard';

const Prize: React.FC<{ icon: React.ReactNode; color: string; value: React.ReactNode; label: string }> = ({ icon, color, value, label }) => (
  <div className="rounded-[14px] py-2 flex flex-col items-center" style={{ background: 'rgb(var(--p-bg) / 0.4)' }}>
    <span className="flex items-center gap-1 text-[14px] font-black tabular-nums" style={{ color }}>{icon}{value}</span>
    <span className="mt-0.5 text-[10px] font-bold prog-text-3">{label}</span>
  </div>
);
