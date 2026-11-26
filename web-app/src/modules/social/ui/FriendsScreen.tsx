import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell, Check, Copy, Crown, Flame, Inbox, KeyRound, MessageCircle, Plus, RefreshCw, Search, Share2, Swords, Ticket,
  Trophy, UserPlus, Users, WifiOff, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProgression } from '@/modules/progression/progressionStore';
import { MOTION, rankStyle } from '@/modules/progression/ui/tokens';
import { ArenaBackdrop, ArenaDock, ArenaHeader, ArenaSheet, Card, EmptyState, rise, useMountTransition, type DockTab } from '@/modules/progression/ui/arena';
import { localDayKey, parseInvite } from '../engine';
import type { PublicProfile } from '../socialService';
import { recordAgainst, socialStore, useSocial, type FriendEntry, type SocialSnapshot } from '../socialStore';
import { DuelCard } from './DuelCard';
import { DuelCreateSheet } from './DuelCreateSheet';
import { FriendProfileSheet } from './FriendProfileSheet';
import { StreakCard } from './StreakCard';
import { useAuth } from '@/context/AuthContext';
import { isDeluxePlan } from '@/modules/monetization/deluxe';
import { DeluxeBadge } from '@/modules/monetization/DeluxeBadge';
import { Avatar, FramedAvatar, GhostButton, PrimaryButton, ProfileLine, Section, displayName, rankLabel, useMyFrame } from './common';

type Tab = 'FRIENDS' | 'DUELS' | 'STREAKS' | 'INBOX';

export const inviteText = (code: string) =>
  `¡Agrégame en Lux y compitamos! 🔥\nToca para añadirme: luxapp://invite?code=${code}\nO escribe mi código en Amigos → Añadir: ${code}`;

export const FriendsScreen: React.FC<{ open: boolean; onClose: () => void; gold: number }> = props => {
  const mounted = useMountTransition(props.open);
  return mounted ? createPortal(<Screen {...props} />, document.body) : null;
};

/** My public card, with the local (fresher) progression numbers on top. */
const useMyProfile = (snap: SocialSnapshot): PublicProfile => {
  const prog = useProgression();
  const me = snap.userId ?? 'me';
  const base = snap.profiles[me];
  const { profile } = useAuth();
  return {
    user_id: me, display_name: base?.display_name ?? null, avatar_id: base?.avatar_id ?? null, hud_streak: base?.hud_streak ?? 0,
    elo: prog.summary.elo, rank_index: prog.summary.rankIndex, division: prog.standing.division, level: prog.level.level,
    is_deluxe: isDeluxePlan(profile?.plan),
  };
};

const Screen: React.FC<{ open: boolean; onClose: () => void; gold: number }> = ({ open, onClose, gold }) => {
  const reduce = useReducedMotion();
  const snap = useSocial();
  const prog = useProgression();
  const [tab, setTab] = useState<Tab>('FRIENDS');
  const [profile, setProfile] = useState<FriendEntry | null>(null);
  const [challenge, setChallenge] = useState<PublicProfile | null>(null);
  const [picker, setPicker] = useState<null | 'DUEL' | 'STREAK'>(null);

  useEffect(() => { socialStore.refresh(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !profile && !challenge && !picker) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, profile, challenge, picker]);
  useEffect(() => { if (tab === 'INBOX') socialStore.markAllRead(); }, [tab, snap.messages.length]);

  const me = snap.userId;
  const pendingDuels = snap.duels.filter(d => d.status === 'PENDING' && d.opponent === me).length;
  const pendingStreaks = snap.streaks.filter(s => s.status === 'PENDING' && s.requested_by !== me).length;
  const tabs: DockTab<Tab>[] = [
    { id: 'FRIENDS', label: 'Amigos', icon: <Users size={19} />, badge: snap.incoming.length },
    { id: 'DUELS', label: 'Duelos', icon: <Swords size={19} />, badge: pendingDuels },
    { id: 'STREAKS', label: 'Rachas', icon: <Flame size={19} />, badge: pendingStreaks },
    { id: 'INBOX', label: 'Mensajes', icon: <MessageCircle size={19} />, badge: snap.unread },
  ];

  const openFriend = (id: string) => { const f = snap.friends.find(x => x.profile.user_id === id); if (f) setProfile(f); };
  const pick = async (p: PublicProfile) => {
    const mode = picker;
    setPicker(null);
    if (mode === 'DUEL') setChallenge(p);
    else if (mode === 'STREAK') toast(await socialStore.proposeStreak(p.user_id) ? `Propuesta de racha enviada a ${displayName(p)}` : 'No se pudo proponer');
  };

  return (
    <motion.div
      className="prog-root fixed inset-0 z-[890] flex flex-col overflow-hidden"
      style={{ ...rankStyle(prog.standing.rankIndex), background: 'rgb(var(--p-bg))', pointerEvents: open ? undefined : 'none' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }} animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.985 }}
      transition={{ duration: MOTION.short, ease: MOTION.easeOut }}
      role="dialog" aria-modal="true" aria-label="Amigos"
    >
      <ArenaBackdrop />
      <ArenaHeader
        title={tabs.find(x => x.id === tab)?.label ?? 'Amigos'} kicker="Arena social" onBack={onClose}
        right={
          <button type="button" onClick={() => socialStore.refresh()} className="prog-tap arena-card flex items-center justify-center rounded-full" style={{ width: 44, height: 44 }} aria-label="Actualizar">
            <RefreshCw size={17} className={snap.loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      <main className="relative z-10 flex-1 min-h-0 prog-scroll px-4 pb-[calc(env(safe-area-inset-bottom)+108px)]">
        <div className="mx-auto max-w-[640px] pt-3">
          {!snap.available ? (
            <EmptyState icon={<WifiOff size={26} />} title="Amigos no disponible" text={`No se pudo conectar con el servidor de amigos. Revisa tu conexión e inténtalo de nuevo.${snap.error ? `\n\nDetalle: ${snap.error}` : ''}`}>
              <PrimaryButton className="w-full h-12" onClick={() => socialStore.refresh()}>Reintentar</PrimaryButton>
            </EmptyState>
          ) : (
            <motion.div
                key={tab} className="space-y-4"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: MOTION.micro, ease: MOTION.easeOut }}
              >
                {tab === 'FRIENDS' && <FriendsTab onOpen={setProfile} onGo={setTab} />}
                {tab === 'DUELS' && <DuelsTab onNew={() => setPicker('DUEL')} onOpen={openFriend} />}
                {tab === 'STREAKS' && <StreaksTab onNew={() => setPicker('STREAK')} />}
                {tab === 'INBOX' && <InboxTab onOpen={openFriend} />}
              </motion.div>
          )}
        </div>
      </main>

      <ArenaDock tabs={tabs} value={tab} onChange={setTab} layoutId="friends-dock" />

      <AnimatePresence>
        {profile && (
          <FriendProfileSheet
            key="profile"
            profile={snap.profiles[profile.profile.user_id] ?? profile.profile}
            friendshipId={profile.friendshipId}
            snap={snap}
            onClose={() => setProfile(null)}
            onChallenge={() => { setChallenge(snap.profiles[profile.profile.user_id] ?? profile.profile); setProfile(null); }}
            onToast={msg => toast(msg)}
          />
        )}
        {challenge && <DuelCreateSheet key="duel" friend={challenge} gold={gold} onClose={() => setChallenge(null)} onDone={msg => { toast(msg); setTab('DUELS'); }} />}
        {picker && <FriendPicker key="picker" mode={picker} onClose={() => setPicker(null)} onPick={pick} />}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Friend picker (new duel / new streak) ───────────────────────────────────

const FriendPicker: React.FC<{ mode: 'DUEL' | 'STREAK'; onClose: () => void; onPick: (p: PublicProfile) => void }> = ({ mode, onClose, onPick }) => {
  const snap = useSocial();
  const me = snap.userId;
  const busy = (id: string) => mode === 'STREAK' && snap.streaks.some(s => s.status !== 'ENDED' && (s.user_a === id || s.user_b === id) && (s.user_a === me || s.user_b === me));
  return (
    <ArenaSheet onClose={onClose} label={mode === 'DUEL' ? 'Elegir rival' : 'Elegir compañero de racha'}>
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <p className="arena-kicker">{mode === 'DUEL' ? 'Nuevo duelo' : 'Nueva racha'}</p>
        <h2 className="text-[20px] font-black">{mode === 'DUEL' ? '¿A quién retas?' : '¿Con quién mantienes la racha?'}</h2>
        {snap.friends.length === 0 ? (
          <EmptyState icon={<Users size={26} />} title="Aún no tienes amigos" text="Agrégalos desde la pestaña Amigos con su nombre o tu link." />
        ) : (
          <ul className="mt-3 space-y-1">
            {snap.friends.map(f => (
              <li key={f.friendshipId} style={{ opacity: busy(f.profile.user_id) ? 0.45 : 1 }}>
                <ProfileLine profile={snap.profiles[f.profile.user_id] ?? f.profile} onClick={busy(f.profile.user_id) ? undefined : () => onPick(snap.profiles[f.profile.user_id] ?? f.profile)}
                  right={busy(f.profile.user_id) ? <span className="text-[11px] prog-text-3">Ya tienen racha</span> : undefined} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ArenaSheet>
  );
};

// ── Friends ─────────────────────────────────────────────────────────────────

const FriendsTab: React.FC<{ onOpen: (f: FriendEntry) => void; onGo: (t: Tab) => void }> = ({ onOpen, onGo }) => {
  const reduce = useReducedMotion();
  const snap = useSocial();
  const meP = useMyProfile(snap);
  const myFrame = useMyFrame();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicProfile[] | null>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const today = localDayKey();

  useEffect(() => { socialStore.ensureInviteCode(); }, []);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => setResults(await socialStore.search(term)), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const relation = (id: string) =>
    snap.friends.some(f => f.profile.user_id === id) ? 'FRIEND' : snap.outgoing.some(f => f.profile.user_id === id) ? 'SENT' : snap.incoming.some(f => f.profile.user_id === id) ? 'RECEIVED' : null;

  const share = async () => {
    const c = snap.myCode ?? await socialStore.ensureInviteCode();
    if (!c) return toast('No se pudo crear tu código');
    const text = inviteText(c);
    const nav = navigator as Navigator & { share?: (d: { title?: string; text: string }) => Promise<void> };
    try {
      if (nav.share) await nav.share({ title: 'Lux', text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } catch { /* cancelled */ }
  };

  const copy = async () => {
    const c = snap.myCode ?? await socialStore.ensureInviteCode();
    if (!c) return;
    try { await navigator.clipboard.writeText(inviteText(c)); toast('Link copiado'); } catch { toast(c); }
  };

  const join = async () => {
    const parsed = parseInvite(code);
    if (!parsed) return toast('Código no válido');
    setBusy(true);
    const r = await socialStore.acceptInvite(parsed);
    setBusy(false);
    toast(r.ok ? '¡Ahora son amigos!' : r.reason === 'INVITE_SELF' ? 'Ese es tu propio código' : 'Código no encontrado');
    if (r.ok) { setCode(''); setShowJoin(false); }
  };

  // Friends + me, ranked by ELO
  const board = useMemo(() => {
    const rows = [
      ...snap.friends.map(f => ({ entry: f as FriendEntry | null, profile: snap.profiles[f.profile.user_id] ?? f.profile })),
      { entry: null, profile: meP },
    ];
    return rows.sort((a, b) => b.profile.elo - a.profile.elo);
  }, [snap.friends, snap.profiles, meP]);
  const myPos = board.findIndex(r => r.entry === null) + 1;
  const activeDuels = snap.duels.filter(d => d.status === 'ACTIVE').length;
  const activeStreaks = snap.streaks.filter(s => s.status === 'ACTIVE').length;
  const codeChars = (snap.myCode ?? '········').split('');

  return (
    <>
      {/* ── My card ── */}
      <motion.div {...rise(0, reduce)}>
        <Card glow className="p-4 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="p-2"><FramedAvatar profile={meP} frame={myFrame} size={64} animate /></div>
            <div className="flex-1 min-w-0">
              <p className="arena-kicker">Tu carta</p>
              <p className="text-[19px] font-black leading-tight flex items-center gap-2 min-w-0">
                <span className="truncate">{displayName(meP)}</span>
                {meP.is_deluxe && <DeluxeBadge size="sm" />}
              </p>
              <p className="text-[12px] font-bold" style={{ color: 'rgb(var(--rank))' }}>{rankLabel(meP)} · <span className="tabular-nums">{meP.elo} ELO</span></p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Amigos', value: snap.friends.length, icon: <Users size={14} />, go: 'FRIENDS' as Tab },
              { label: 'Duelos', value: activeDuels, icon: <Swords size={14} />, go: 'DUELS' as Tab },
              { label: 'Rachas', value: activeStreaks, icon: <Flame size={14} />, go: 'STREAKS' as Tab },
            ].map(s => (
              <button key={s.label} type="button" onClick={() => onGo(s.go)} className="prog-tap rounded-[14px] py-2 arena-inset flex flex-col items-center">
                <span className="flex items-center gap-1 text-[18px] font-black tabular-nums leading-none"><span style={{ color: 'rgb(var(--rank))' }}>{s.icon}</span>{s.value}</span>
                <span className="mt-1 text-[10.5px] font-bold prog-text-3">{s.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Requests ── */}
      {snap.incoming.length > 0 && (
        <motion.div {...rise(1, reduce)}>
          <Section kicker="Quieren competir contigo" title={`Solicitudes (${snap.incoming.length})`} icon={<UserPlus size={16} />}>
            <ul className="space-y-1">
              {snap.incoming.map(f => (
                <li key={f.friendshipId}>
                  <ProfileLine profile={f.profile} right={
                    <div className="flex gap-1.5">
                      <PrimaryButton className="h-10 w-10 px-0 flex items-center justify-center" onClick={() => socialStore.answerRequest(f.friendshipId, true)} aria-label="Aceptar"><Check size={17} /></PrimaryButton>
                      <GhostButton className="h-10 w-10 px-0 flex items-center justify-center" onClick={() => socialStore.answerRequest(f.friendshipId, false)} aria-label="Rechazar"><X size={17} /></GhostButton>
                    </div>
                  } />
                </li>
              ))}
            </ul>
          </Section>
        </motion.div>
      )}

      {/* ── Search ── */}
      <motion.div {...rise(2, reduce)}>
        <Card className="p-3">
          <label className="flex items-center gap-2.5 h-12 rounded-[16px] px-3.5 arena-inset">
            <Search size={17} className="prog-text-3" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar jugadores por nombre" className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px]" style={{ color: 'rgb(var(--p-text))' }} aria-label="Buscar amigos por nombre" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--p-line) / 0.1)' }}><X size={14} /></button>}
          </label>
          {results === null && <p className="mt-2 px-1 text-[12px] prog-text-3">No se pudo buscar ahora.</p>}
          {results && results.length > 0 && (
            <ul className="mt-1">
              {results.map(p => {
                const rel = relation(p.user_id);
                return (
                  <li key={p.user_id}>
                    <ProfileLine profile={p} right={
                      rel === 'FRIEND' ? <span className="arena-chip" style={{ background: 'rgb(var(--p-positive) / 0.14)', color: 'rgb(var(--p-positive))' }}><Check size={12} /> Amigo</span>
                        : rel === 'SENT' ? <span className="arena-chip">Enviada</span>
                          : rel === 'RECEIVED' ? <PrimaryButton className="h-10 px-3" onClick={() => { const f = snap.incoming.find(x => x.profile.user_id === p.user_id); if (f) socialStore.answerRequest(f.friendshipId, true); }}>Aceptar</PrimaryButton>
                            : <PrimaryButton className="h-10 px-3 flex items-center gap-1.5" onClick={async () => toast(await socialStore.addFriend(p.user_id) ? 'Solicitud enviada' : 'No se pudo enviar')}><UserPlus size={15} /> Añadir</PrimaryButton>
                    } />
                  </li>
                );
              })}
            </ul>
          )}
          {q.trim().length >= 2 && results && results.length === 0 && <p className="mt-2 px-1 text-[12px] prog-text-3">Nadie con ese nombre todavía. ¡Invítalo con tu link!</p>}
        </Card>
      </motion.div>

      {/* ── Invite ticket ── */}
      <motion.div {...rise(3, reduce)}>
        <div className="relative arena-card overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgb(var(--rank) / 0.22), transparent 55%)' }} aria-hidden="true" />
          <div className="relative p-4">
            <div className="flex items-center gap-2">
              <Ticket size={17} style={{ color: 'rgb(var(--rank))' }} />
              <p className="text-[15px] font-black">Tu pase de invitación</p>
            </div>
            <p className="mt-1 text-[12px] prog-text-3">Quien abra tu link o escriba tu código queda agregado al instante.</p>
            <div className="mt-3 flex justify-center gap-1.5" aria-label={`Código ${snap.myCode ?? ''}`}>
              {codeChars.map((ch, i) => (
                <span key={i} className="w-9 h-11 rounded-[10px] flex items-center justify-center text-[20px] font-black tabular-nums" style={{ background: 'rgb(var(--p-bg) / 0.6)', boxShadow: 'inset 0 0 0 1px rgb(var(--rank) / 0.35)', color: 'rgb(var(--rank))' }}>{ch}</span>
              ))}
            </div>
          </div>
          {/* Perforation */}
          <div className="relative flex items-center" aria-hidden="true">
            <span className="absolute -left-3 w-6 h-6 rounded-full" style={{ background: 'rgb(var(--p-bg))' }} />
            <span className="flex-1 mx-4 border-t-2 border-dashed" style={{ borderColor: 'rgb(var(--p-line) / 0.12)' }} />
            <span className="absolute -right-3 w-6 h-6 rounded-full" style={{ background: 'rgb(var(--p-bg))' }} />
          </div>
          <div className="relative p-4 pt-3 space-y-2">
            <div className="flex gap-2">
              <PrimaryButton className="flex-1 h-12 flex items-center justify-center gap-2" onClick={share}><Share2 size={16} /> Compartir link</PrimaryButton>
              <GhostButton className="h-12 w-12 px-0 flex items-center justify-center" onClick={copy} aria-label="Copiar link"><Copy size={16} /></GhostButton>
            </div>
            {showJoin ? (
              <div className="flex gap-2">
                <label className="flex-1 min-w-0 flex items-center gap-2 h-12 rounded-[16px] px-3 arena-inset">
                  <KeyRound size={15} className="prog-text-3" />
                  <input autoFocus value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') join(); }} placeholder="Código o link de un amigo" className="flex-1 min-w-0 bg-transparent text-[13.5px] uppercase outline-none" style={{ color: 'rgb(var(--p-text))' }} aria-label="Código de invitación" />
                </label>
                <PrimaryButton className="h-12" disabled={busy || !code.trim()} onClick={join}>Unirme</PrimaryButton>
              </div>
            ) : (
              <button type="button" onClick={() => setShowJoin(true)} className="prog-tap w-full flex items-center justify-center gap-2 text-[13px] font-bold prog-text-2"><KeyRound size={15} /> ¿Tienes el código de un amigo?</button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Friends ranking ── */}
      <motion.div {...rise(4, reduce)}>
        <Section kicker={snap.friends.length ? `Vas #${myPos} de ${board.length}` : undefined} title="Clasificación entre amigos" icon={<Trophy size={16} />}>
          {snap.friends.length === 0 ? (
            <EmptyState icon={<Users size={26} />} title="Aún no tienes amigos aquí" text="Búscalos por nombre o compárteles tu link para competir en duelos y rachas." />
          ) : (
            <ul className="space-y-0.5">
              {board.map((row, i) => {
                const isMe = row.entry === null;
                const rec = isMe ? null : recordAgainst(row.profile.user_id, snap);
                const played = rec && rec.dayWins + rec.dayLosses > 0;
                const hudToday = snap.stats[row.profile.user_id]?.[today]?.hud;
                const medal = ['#fde047', '#e2e8f0', '#f59e0b'][i];
                return (
                  <li key={row.profile.user_id} className="flex items-center gap-1 rounded-[18px]" style={isMe ? { background: 'rgb(var(--rank) / 0.12)', boxShadow: 'inset 0 0 0 1px rgb(var(--rank) / 0.35)' } : undefined}>
                    <span className="w-7 shrink-0 flex justify-center">
                      {medal ? <Crown size={15} style={{ color: medal }} /> : <span className="text-[12px] font-black prog-text-3 tabular-nums">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0 pr-1">
                      <ProfileLine
                        profile={isMe ? { ...row.profile, display_name: `${displayName(row.profile)} (tú)` } : row.profile}
                        dot={isMe ? null : hudToday ? 'on' : 'off'}
                        onClick={isMe || !row.entry ? undefined : () => onOpen(row.entry as FriendEntry)}
                        right={isMe ? <span /> : undefined}
                        sub={played ? <p className="text-[11px] font-bold tabular-nums"><span className="prog-positive">{rec!.dayWins}V</span> <span className="prog-text-3">·</span> <span className="prog-negative">{rec!.dayLosses}D</span> <span className="prog-text-3 font-semibold">contra ti</span></p> : null}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </motion.div>

      {snap.outgoing.length > 0 && (
        <motion.div {...rise(5, reduce)}>
          <Section title={`Solicitudes enviadas (${snap.outgoing.length})`}>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {snap.outgoing.map(f => (
                <div key={f.friendshipId} className="shrink-0 w-[76px] flex flex-col items-center text-center">
                  <Avatar profile={f.profile} size={44} ring />
                  <p className="mt-1 text-[11.5px] font-bold truncate max-w-full">{displayName(f.profile)}</p>
                  <p className="text-[10px] prog-text-3">Esperando</p>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>
      )}
    </>
  );
};

// ── Duels ───────────────────────────────────────────────────────────────────

const DuelsTab: React.FC<{ onNew: () => void; onOpen: (id: string) => void }> = ({ onNew, onOpen }) => {
  const reduce = useReducedMotion();
  const snap = useSocial();
  const groups = useMemo(() => ({
    waiting: snap.duels.filter(d => d.status === 'PENDING'),
    active: snap.duels.filter(d => d.status === 'ACTIVE'),
    done: snap.duels.filter(d => d.status === 'FINISHED').slice(0, 20),
  }), [snap.duels]);
  const total = useMemo(() => snap.friends.reduce((acc, f) => {
    const r = recordAgainst(f.profile.user_id, snap);
    return { dw: acc.dw + r.dayWins, dl: acc.dl + r.dayLosses, uw: acc.uw + r.duelWins, ul: acc.ul + r.duelLosses };
  }, { dw: 0, dl: 0, uw: 0, ul: 0 }), [snap]);

  const NewButton = <PrimaryButton className="w-full h-12 flex items-center justify-center gap-2" onClick={onNew}><Swords size={17} /> Nuevo duelo</PrimaryButton>;

  if (!snap.duels.length) {
    return (
      <Card className="p-2">
        <EmptyState icon={<Swords size={26} />} title="Sin duelos todavía" text="Reta a un amigo a 1 día, 1 semana o 1 mes. Cada día gana quien tenga más score, y el ganador del duelo se lleva el bote.">
          {NewButton}
        </EmptyState>
      </Card>
    );
  }

  const group = (title: string, items: typeof snap.duels, offset: number) => items.length ? (
    <div className="space-y-3">
      <p className="arena-kicker px-1">{title} · {items.length}</p>
      {items.map((d, i) => <motion.div key={d.id} {...rise(offset + i, reduce)}><DuelCard duel={d} snap={snap} onAction={msg => toast(msg)} onOpenFriend={onOpen} /></motion.div>)}
    </div>
  ) : null;

  return (
    <>
      <Card glow className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="arena-kicker">Días ganados</p>
            <p className="text-[28px] font-black tabular-nums leading-tight"><span className="prog-positive">{total.dw}</span><span className="prog-text-3 text-[18px]"> / </span><span className="prog-negative">{total.dl}</span></p>
          </div>
          <div className="text-right">
            <p className="arena-kicker">Duelos ganados</p>
            <p className="text-[28px] font-black tabular-nums leading-tight"><span className="prog-positive">{total.uw}</span><span className="prog-text-3 text-[18px]"> / </span><span className="prog-negative">{total.ul}</span></p>
          </div>
        </div>
        <div className="mt-3">{NewButton}</div>
      </Card>
      {group('Pendientes', groups.waiting, 1)}
      {group('En curso', groups.active, 2)}
      {group('Terminados', groups.done, 3)}
    </>
  );
};

// ── Shared streaks ──────────────────────────────────────────────────────────

const StreaksTab: React.FC<{ onNew: () => void }> = ({ onNew }) => {
  const reduce = useReducedMotion();
  const snap = useSocial();
  const live = snap.streaks.filter(s => s.status !== 'ENDED');
  const NewButton = <PrimaryButton className="w-full h-12 flex items-center justify-center gap-2" onClick={onNew}><Plus size={17} /> Nueva racha compartida</PrimaryButton>;
  if (!live.length) {
    return (
      <Card className="p-2">
        <EmptyState icon={<Flame size={26} className="arena-flame" />} title="Ninguna racha compartida" text="Para mantenerla, los dos deben activar su racha del HUD antes de que termine el día. Si uno falla, vuelve a cero.">
          {NewButton}
        </EmptyState>
      </Card>
    );
  }
  return (
    <>
      {live.map((row, i) => <motion.div key={row.id} {...rise(i, reduce)}><StreakCard row={row} snap={snap} /></motion.div>)}
      {NewButton}
    </>
  );
};

// ── Inbox ───────────────────────────────────────────────────────────────────

const DAY_FMT = (iso: string) => {
  const d = new Date(iso);
  const k = localDayKey(d);
  const today = localDayKey();
  if (k === today) return 'Hoy';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (k === localDayKey(y)) return 'Ayer';
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
};

const InboxTab: React.FC<{ onOpen: (userId: string) => void }> = ({ onOpen }) => {
  const reduce = useReducedMotion();
  const snap = useSocial();
  const me = snap.userId;
  const groups = useMemo(() => {
    const out: { day: string; items: typeof snap.messages }[] = [];
    for (const m of snap.messages) {
      const day = DAY_FMT(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [snap.messages]);

  if (!snap.messages.length) {
    return <Card className="p-2"><EmptyState icon={<Inbox size={26} />} title="Sin mensajes" text="Aquí verás los avisos de racha y los mensajes de ánimo de tus amigos. Envía uno desde su perfil." /></Card>;
  }
  return (
    <div className="space-y-5">
      {groups.map((g, gi) => (
        <div key={g.day + gi}>
          <div className="flex items-center gap-3 mb-2">
            <span className="flex-1 h-px" style={{ background: 'rgb(var(--p-line) / 0.1)' }} />
            <span className="arena-kicker first-letter:uppercase">{g.day}</span>
            <span className="flex-1 h-px" style={{ background: 'rgb(var(--p-line) / 0.1)' }} />
          </div>
          <ul className="space-y-2.5">
            {g.items.map((m, i) => {
              const incoming = m.to_user === me;
              const otherId = incoming ? m.from_user : m.to_user;
              const other = snap.profiles[otherId];
              const nudge = m.kind === 'NUDGE';
              const time = new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              return (
                <motion.li key={m.id} {...rise(i, reduce)} className={`flex items-end gap-2 ${incoming ? '' : 'flex-row-reverse'}`}>
                  <button type="button" onClick={() => onOpen(otherId)} className="shrink-0 rounded-full" aria-label={`Perfil de ${displayName(other)}`}><Avatar profile={other} size={32} ring /></button>
                  <button type="button" onClick={() => onOpen(otherId)} className={`max-w-[78%] text-left rounded-[20px] px-3.5 py-2.5 ${incoming ? 'rounded-bl-[6px]' : 'rounded-br-[6px]'}`}
                    style={nudge
                      ? { background: 'linear-gradient(120deg, #f97316, #facc15)', color: '#1a0f00', boxShadow: '0 10px 22px -12px #f97316' }
                      : incoming ? { background: 'rgb(var(--p-surface))', border: '1px solid rgb(var(--p-line) / 0.08)' } : { background: 'linear-gradient(120deg, rgb(var(--rank) / 0.32), rgb(var(--rank) / 0.16))' }}>
                    <p className="text-[11px] font-black opacity-70 flex items-center gap-1">
                      {nudge && <Bell size={11} />}{incoming ? displayName(other) : `Para ${displayName(other)}`}
                      {incoming && !m.read_at && <span className="ml-1 w-1.5 h-1.5 rounded-full" style={{ background: nudge ? '#1a0f00' : 'rgb(var(--rank))' }} />}
                    </p>
                    <p className={`text-[14px] leading-snug ${nudge ? 'font-black' : ''}`}>{m.body}</p>
                    <p className="mt-0.5 text-[10px] opacity-60 text-right tabular-nums">{time}</p>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};
