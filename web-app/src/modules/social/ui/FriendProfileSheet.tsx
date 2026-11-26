import React, { useState } from 'react';
import { Bell, Flame, MessageCircle, Send, Star, Swords, UserMinus, Zap } from 'lucide-react';
import { RankBadge } from '@/modules/progression/ui/RankBadge';
import { ArenaSheet } from '@/modules/progression/ui/arena';
import { getRank } from '@/modules/progression/engine/ranks';
import { rankStyle } from '@/modules/progression/ui/tokens';
import { DeluxeBadge } from '@/modules/monetization/DeluxeBadge';
import { SOCIAL_CONFIG, localDayKey } from '../engine';
import type { PublicProfile } from '../socialService';
import { recordAgainst, socialStore, standingOf, type SocialSnapshot } from '../socialStore';
import { FramedAvatar, GhostButton, PrimaryButton, RecordBanner, displayName, divisionOf, rankLabel } from './common';

export const NUDGE_TEXT = '¡Oye, activa la racha antes de que termine el día! 🔥';
const PRESETS = ['¡Hoy vamos con todo! 💪', 'No sueltes la racha, tú puedes 🔥', 'Te estoy alcanzando 😏', 'Un día más, un paso más 🚀'];

export const FriendProfileSheet: React.FC<{
  profile: PublicProfile;
  friendshipId: string;
  snap: SocialSnapshot;
  onClose: () => void;
  onChallenge: () => void;
  onToast: (msg: string) => void;
}> = ({ profile, friendshipId, snap, onClose, onChallenge, onToast }) => {
  const [text, setText] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const record = recordAgainst(profile.user_id, snap);
  const me = snap.userId as string;
  const streak = snap.streaks.find(s => s.status !== 'ENDED' && (s.user_a === profile.user_id || s.user_b === profile.user_id) && (s.user_a === me || s.user_b === me));
  const legend = profile.rank_index === 7;
  const today = snap.stats[profile.user_id]?.[localDayKey()];
  const duel = snap.duels.find(d => (d.status === 'ACTIVE' || d.status === 'PENDING') && (d.challenger === profile.user_id || d.opponent === profile.user_id));
  const duelScore = duel && duel.status === 'ACTIVE' ? (() => { const st = standingOf(duel, snap); const mineA = duel.challenger === me; return { mine: mineA ? st.winsA : st.winsB, theirs: mineA ? st.winsB : st.winsA }; })() : null;
  const thread = snap.messages.filter(m => m.from_user === profile.user_id || m.to_user === profile.user_id).slice(0, 3);

  const send = async (kind: 'NUDGE' | 'MESSAGE', body: string) => {
    if (!body.trim()) return;
    const ok = await socialStore.send(profile.user_id, kind, body);
    onToast(ok ? (kind === 'NUDGE' ? 'Aviso enviado 🔥' : 'Mensaje enviado') : 'No se pudo enviar');
    if (ok) setText('');
  };

  const stats = [
    { icon: <Zap size={14} />, value: profile.elo, label: 'ELO' },
    { icon: <Star size={14} />, value: profile.level, label: 'Nivel' },
    { icon: <Flame size={14} />, value: profile.hud_streak, label: 'Racha' },
    { icon: <Swords size={14} />, value: today ? Math.round(today.score) : '—', label: 'Score hoy' },
  ];

  return (
    <ArenaSheet onClose={onClose} label={`Perfil de ${displayName(profile)}`} style={rankStyle(profile.rank_index)}>
      {/* Cover */}
      <div className="relative h-36 overflow-hidden rounded-t-[20px] mx-2" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgb(var(--rank) / 0.55), rgb(var(--rank) / 0.08) 60%, transparent)' }} />
        <div className="absolute -right-8 -top-6 opacity-25" style={{ transform: 'rotate(12deg)' }}>
          <RankBadge rankIndex={profile.rank_index} division={divisionOf(profile)} size={190} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(to top, rgb(var(--p-bg)), transparent)' }} />
      </div>

      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] -mt-20 space-y-4">
        <div className="relative flex flex-col items-center text-center">
          <div className="p-4"><FramedAvatar profile={profile} size={92} animate /></div>
          <h2 className="text-[26px] font-black leading-tight">{displayName(profile)}</h2>
          {profile.is_deluxe && (
            <div className="mt-1.5">
              <DeluxeBadge size="md" title="Suscriptor Deluxe" />
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <RankBadge rankIndex={profile.rank_index} division={legend ? null : profile.division ?? 0} size={30} />
            <span className={`text-[15px] font-black ${legend ? 'arena-rainbow-text' : ''}`} style={legend ? undefined : { color: getRank(profile.rank_index).color }}>{rankLabel(profile)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {stats.map(s => (
            <div key={s.label} className="arena-card py-2.5 flex flex-col items-center">
              <span className="flex items-center gap-1 text-[16px] font-black tabular-nums"><span style={{ color: 'rgb(var(--rank))' }}>{s.icon}</span>{s.value}</span>
              <span className="mt-0.5 text-[10px] font-bold prog-text-3">{s.label}</span>
            </div>
          ))}
        </div>

        <div>
          <p className="arena-kicker mb-2 px-1">Tu historial contra {displayName(profile)}</p>
          <RecordBanner record={record} me={snap.profiles[me]} them={profile} />
        </div>

        {duel && (
          <div className="arena-card arena-card--glow p-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-[13px] flex items-center justify-center" style={{ background: 'rgb(var(--rank) / 0.16)', color: 'rgb(var(--rank))' }}><Swords size={18} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-black">{duel.status === 'PENDING' ? 'Duelo pendiente' : 'Duelo en curso'}</p>
              <p className="text-[11.5px] prog-text-3">{duel.status === 'PENDING' ? (duel.challenger === me ? 'Esperando que acepte' : 'Te retó: revísalo en Duelos') : `Del ${duel.start_day.slice(8)}/${duel.start_day.slice(5, 7)} al ${duel.end_day.slice(8)}/${duel.end_day.slice(5, 7)}`}</p>
            </div>
            {duelScore && <span className="text-[22px] font-black tabular-nums"><span className="prog-positive">{duelScore.mine}</span><span className="prog-text-3">–</span><span className="prog-negative">{duelScore.theirs}</span></span>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton className="h-14 flex items-center justify-center gap-2 text-[14.5px]" onClick={onChallenge}><Swords size={18} /> Retar a duelo</PrimaryButton>
          {streak
            ? <GhostButton className="h-14 flex items-center justify-center gap-2" disabled><Flame size={17} style={{ color: '#fb923c' }} /> {streak.status === 'PENDING' ? 'Racha pendiente' : 'Racha activa'}</GhostButton>
            : <GhostButton className="h-14 flex items-center justify-center gap-2" onClick={async () => onToast(await socialStore.proposeStreak(profile.user_id) ? 'Propuesta de racha enviada' : 'No se pudo proponer')}><Flame size={17} style={{ color: '#fb923c' }} /> Racha juntos</GhostButton>}
        </div>

        <section className="arena-card p-4 space-y-3">
          <p className="text-[15px] font-black flex items-center gap-2"><MessageCircle size={17} style={{ color: 'rgb(var(--rank))' }} /> Motívalo</p>
          <button type="button" onClick={() => send('NUDGE', NUDGE_TEXT)} className="prog-tap w-full h-12 rounded-[16px] flex items-center justify-center gap-2 text-[14px] font-black"
            style={{ background: 'linear-gradient(100deg, #f97316, #facc15)', color: '#1a0f00', boxShadow: '0 12px 24px -12px #f97316' }}>
            <Bell size={17} /> ¡OYE, ACTIVA LA RACHA!
          </button>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p} type="button" onClick={() => send('MESSAGE', p)} className="prog-tap rounded-full px-3 text-[12.5px] font-semibold arena-inset" style={{ minHeight: 38 }}>{p}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center rounded-[18px] p-1.5 arena-inset">
            <input
              value={text} maxLength={SOCIAL_CONFIG.MESSAGE_MAX} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send('MESSAGE', text); }}
              placeholder="Escribe un mensaje motivador…"
              className="flex-1 min-w-0 h-10 bg-transparent px-2 text-[14px] outline-none" style={{ color: 'rgb(var(--p-text))' }}
              aria-label="Mensaje"
            />
            <span className="text-[10.5px] prog-text-3 tabular-nums">{text.length}/{SOCIAL_CONFIG.MESSAGE_MAX}</span>
            <PrimaryButton className="h-10 w-10 px-0 flex items-center justify-center" disabled={!text.trim()} onClick={() => send('MESSAGE', text)} aria-label="Enviar"><Send size={16} /></PrimaryButton>
          </div>
          {thread.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {thread.map(m => {
                const mine = m.from_user === me;
                return (
                  <li key={m.id} className={`flex ${mine ? 'justify-end' : ''}`}>
                    <span className={`max-w-[85%] rounded-[16px] px-3 py-1.5 text-[12.5px] ${mine ? 'rounded-br-[5px]' : 'rounded-bl-[5px]'}`}
                      style={mine ? { background: 'rgb(var(--rank) / 0.22)' } : { background: 'rgb(var(--p-line) / 0.07)' }}>
                      {m.kind === 'NUDGE' ? '🔥 ' : ''}{m.body}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="pt-1">
          {confirmRemove ? (
            <div className="flex gap-2">
              <GhostButton className="flex-1 h-12" onClick={() => setConfirmRemove(false)}>No</GhostButton>
              <button type="button" className="prog-tap flex-1 h-12 rounded-[16px] font-black text-[13.5px]" style={{ background: 'rgb(var(--p-negative) / 0.18)', color: 'rgb(var(--p-negative))' }}
                onClick={async () => { if (await socialStore.removeFriend(friendshipId)) { onToast('Amigo eliminado'); onClose(); } }}>
                Sí, eliminar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className="prog-tap w-full flex items-center justify-center gap-2 text-[13px] prog-text-3"><UserMinus size={15} /> Eliminar amigo</button>
          )}
        </div>
      </div>
    </ArenaSheet>
  );
};
