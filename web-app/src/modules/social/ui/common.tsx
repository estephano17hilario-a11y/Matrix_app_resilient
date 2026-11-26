import React, { memo } from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { getAvatarPath } from '@/config/avatars';
import { RankBadge } from '@/modules/progression/ui/RankBadge';
import { RankFrameArt } from '@/modules/progression/ui/RankFrame';
import { rankStyle } from '@/modules/progression/ui/tokens';
import { useProgression } from '@/modules/progression/progressionStore';
import { LEGEND_INDEX, getRank } from '@/modules/progression/engine/ranks';
import type { PublicProfile } from '../socialService';
import type { Record2 } from '../engine';
import { DeluxeBadge } from '@/modules/monetization/DeluxeBadge';

export { EmptyState as Empty } from '@/modules/progression/ui/arena';

const FALLBACK = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=60';

export const displayName = (p: Pick<PublicProfile, 'display_name'> | undefined | null) =>
  (p?.display_name || 'Jugador').split('@')[0];

export const rankLabel = (p: Pick<PublicProfile, 'rank_index' | 'division'> | undefined | null) => {
  const r = p?.rank_index ?? 0;
  return r === LEGEND_INDEX ? getRank(r).name : `${getRank(r).name} ${['I', 'II', 'III'][p?.division ?? 0]}`;
};

export const divisionOf = (p: Pick<PublicProfile, 'rank_index' | 'division'> | undefined | null) =>
  (p?.rank_index ?? 0) === LEGEND_INDEX ? null : p?.division ?? 0;

export const Avatar: React.FC<{ profile: PublicProfile | undefined; size?: number; ring?: boolean }> = memo(({ profile, size = 40, ring }) => {
  const color = getRank(profile?.rank_index ?? 0).color;
  return (
    <img
      src={getAvatarPath(profile?.avatar_id ?? undefined) || FALLBACK}
      onError={e => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover object-[50%_20%] shrink-0"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${color}, 0 0 0 4px rgb(var(--p-bg))` : undefined }}
    />
  );
});
Avatar.displayName = 'Avatar';

// Same geometry as the HUD frame: the 128×138 art has a 73-unit hole centred at (64, 69).
const HOLE = 73;

/**
 * Avatar with a rank-coloured ring. `frame` (a rank index) draws that rank's
 * ornamental frame instead: only for my own avatar, when I equipped one.
 */
export const FramedAvatar: React.FC<{ profile: PublicProfile | undefined; size?: number; animate?: boolean; frame?: number | null }> = memo(({ profile, size = 72, animate, frame = null }) => {
  const k = size / HOLE;
  const rank = getRank(profile?.rank_index ?? 0);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {frame !== null ? (
        <div className="absolute" style={{ left: size / 2 - 64 * k, top: size / 2 - 69 * k, width: 128 * k, height: 138 * k, pointerEvents: 'none', contain: 'none' }} aria-hidden="true">
          <RankFrameArt rankIndex={frame} division={frame === profile?.rank_index ? divisionOf(profile) : 2} animate={animate} />
        </div>
      ) : (
        <div className="absolute rounded-full" style={{ inset: -4, background: `conic-gradient(from 210deg, ${rank.gradient[0]}, ${rank.gradient[1]}, ${rank.gradient[0]})` }} aria-hidden="true" />
      )}
      <div className="relative z-[1] rounded-full" style={{ boxShadow: frame === null ? '0 0 0 2px rgb(var(--p-bg))' : undefined }}><Avatar profile={profile} size={size} /></div>
    </div>
  );
});

/** The frame I wear in the HUD (null = none). */
export const useMyFrame = () => useProgression().meta.equippedFrame ?? null;
FramedAvatar.displayName = 'FramedAvatar';

/** Friend card row: avatar, name, rank, streak and an optional right slot. */
export const ProfileLine: React.FC<{ profile: PublicProfile; right?: React.ReactNode; onClick?: () => void; sub?: React.ReactNode; dot?: 'on' | 'off' | null }> = ({ profile, right, onClick, sub, dot }) => {
  const body = (
    <>
      <div className="relative shrink-0">
        <Avatar profile={profile} size={46} ring />
        {dot && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" style={{ background: dot === 'on' ? '#22c55e' : 'rgb(var(--p-text-3))', boxShadow: '0 0 0 2.5px rgb(var(--p-surface))' }} />}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[15px] font-black leading-tight flex items-center gap-1.5 min-w-0">
          <span className="truncate">{displayName(profile)}</span>
          {profile.is_deluxe && <DeluxeBadge size="xs" />}
        </p>
        <p className="mt-0.5 text-[11.5px] tabular-nums truncate flex items-center gap-1.5">
          <span className="font-bold" style={{ color: getRank(profile.rank_index).color }}>{rankLabel(profile)}</span>
          <span className="prog-text-3">· {profile.elo} ELO</span>
          {profile.hud_streak > 0 && <span className="inline-flex items-center gap-0.5 font-bold" style={{ color: '#fb923c' }}><Flame size={11} />{profile.hud_streak}</span>}
        </p>
        {sub}
      </div>
      <RankBadge rankIndex={profile.rank_index} division={divisionOf(profile)} size={34} />
      {right ?? (onClick ? <ChevronRight size={18} className="prog-text-3 -ml-1" /> : null)}
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className="prog-tap w-full flex items-center gap-3 py-2.5 px-1 rounded-[16px]">{body}</button>
    : <div className="w-full flex items-center gap-3 py-2.5 px-1">{body}</div>;
};

/** Cumulative head-to-head against one friend: days and duels. */
export const RecordBanner: React.FC<{ record: Record2; me?: PublicProfile; them?: PublicProfile }> = ({ record, me, them }) => {
  const total = record.dayWins + record.dayLosses;
  const share = total ? record.dayWins / total : 0.5;
  return (
    <div className="arena-card p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0" style={rankStyle(me?.rank_index ?? 0)}>
          {me && <Avatar profile={me} size={30} ring />}
          <span className="text-[30px] font-black tabular-nums leading-none prog-positive">{record.dayWins}</span>
        </div>
        <div className="text-center">
          <p className="arena-kicker">Días ganados</p>
          <p className="text-[11px] prog-text-3 tabular-nums">Duelos {record.duelWins} – {record.duelLosses}</p>
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="text-[30px] font-black tabular-nums leading-none prog-negative">{record.dayLosses}</span>
          {them && <Avatar profile={them} size={30} ring />}
        </div>
      </div>
      <div className="mt-3 flex h-2 rounded-full overflow-hidden gap-[3px]" aria-hidden="true">
        <span className="rounded-full" style={{ flex: Math.max(0.04, share), background: 'rgb(var(--p-positive))' }} />
        <span className="rounded-full" style={{ flex: Math.max(0.04, 1 - share), background: 'rgb(var(--p-negative))' }} />
      </div>
    </div>
  );
};

export const Section: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode; kicker?: string; icon?: React.ReactNode }> = ({ title, children, action, kicker, icon }) => (
  <section className="arena-card p-4">
    <div className="flex items-end justify-between gap-3 mb-2">
      <div className="min-w-0">
        {kicker && <p className="arena-kicker mb-1">{kicker}</p>}
        <h3 className="text-[16px] font-black leading-tight flex items-center gap-2">
          {icon && <span style={{ color: 'rgb(var(--rank))' }}>{icon}</span>}
          <span className="truncate">{title}</span>
        </h3>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, style, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`prog-tap arena-cta rounded-[16px] px-4 font-black text-[13.5px] disabled:opacity-50 disabled:shadow-none ${className ?? ''}`}
    style={style}
  />
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...rest }) => (
  <button type="button" {...rest} className={`prog-tap rounded-[16px] px-4 font-bold text-[13.5px] arena-inset disabled:opacity-50 ${className ?? ''}`} />
);
