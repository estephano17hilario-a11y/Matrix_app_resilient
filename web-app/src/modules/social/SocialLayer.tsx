// Mounted once in the Dashboard: keeps my public card and today's numbers on
// the server, handles invite links, surfaces friend messages and owns the
// Friends screen.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import toast from 'react-hot-toast';
import type { Project } from '@/types';
import WidgetAuthBridge from '@/plugins/WidgetBridgePlugin';
import { progressionStore } from '@/modules/progression/progressionStore';
import { focusMinutesOn } from '@/modules/progression/integration';
import { localDayKey, parseInvite } from './engine';
import { socialStore, useSocial, type RewardEvent } from './socialStore';
import { FriendsScreen } from './ui/FriendsScreen';

interface Props {
  user: { id: string; displayName?: string | null; avatarId?: string | null } | null;
  score: number;
  projects: Project[];
  hudActive: boolean;
  hudStreak: number;
  gold: number;
  onReward: (r: RewardEvent) => Promise<void> | void;
}

const PUBLISH_DELAY_MS = 4000;

export const SocialLayer: React.FC<Props> = ({ user, score, projects, hudActive, hudStreak, gold, onReward }) => {
  const [open, setOpen] = useState(false);
  const snap = useSocial();
  const live = useRef({ gold, user, onReward });
  live.current = { gold, user, onReward };

  // 1. Wire the store to the host app once.
  useEffect(() => {
    socialStore.configure({
      onReward: r => live.current.onReward(r),
      getGold: () => live.current.gold,
      notify: (title, body) => {
        if (document.visibilityState === 'visible') {
          toast(`${title}: ${body}`, { duration: 5000 });
        } else if (Capacitor.isNativePlatform()) {
          LocalNotifications.schedule({ notifications: [{ id: Math.floor(Math.random() * 2 ** 30), title, body, schedule: { at: new Date(Date.now() + 300) } }] }).catch(() => {});
        }
      },
      profileExtras: () => {
        const p = progressionStore.getSnapshot();
        const u = live.current.user;
        return {
          display_name: u?.displayName ?? null,
          avatar_id: u?.avatarId ?? null,
          elo: p.summary.elo,
          rank_index: p.summary.rankIndex,
          division: p.standing.division,
          level: p.level.level,
        };
      },
    });
  }, []);

  useEffect(() => {
    if (user?.id) socialStore.init(user.id);
  }, [user?.id]);

  // 2. Publish today's score / focus / HUD streak (debounced).
  const focusMinutes = useMemo(() => Math.round(focusMinutesOn(projects, localDayKey())), [projects]);
  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(() => {
      socialStore.publishToday({ score, focusMinutes, hudActive, hudStreak }).catch(e => console.warn('[Social] publish', e));
    }, PUBLISH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user?.id, score, focusMinutes, hudActive, hudStreak]);

  // 3. Open the Friends screen from the dock "+" menu or anywhere else.
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('open-friends', show);
    return () => window.removeEventListener('open-friends', show);
  }, []);

  // 4. Invite links: luxapp://invite?code=XXXXXXXX (warm start and cold start).
  useEffect(() => {
    if (!user?.id) return;
    const handle = async (url: string | undefined) => {
      if (url && /luxapp:\/\/friends/i.test(url)) { setOpen(true); return; }
      if (!url || !/invite/i.test(url)) return;
      const code = parseInvite(url);
      if (!code) return;
      const r = await socialStore.acceptInvite(code);
      toast(r.ok ? '¡Nuevo amigo agregado!' : r.reason === 'INVITE_SELF' ? 'Abriste tu propio link de invitación' : 'Ese link de invitación no es válido');
      setOpen(true);
    };
    const sub = CapacitorApp.addListener('appUrlOpen', e => { handle(e.url); });
    CapacitorApp.getLaunchUrl().then(r => handle(r?.url)).catch(() => {});
    const webInvite = new URLSearchParams(window.location.search).get('invite');
    if (webInvite) handle(`invite?code=${webInvite}`);
    return () => { sub.then(s => s.remove()).catch(() => {}); };
  }, [user?.id]);

  // 5. Refresh when the app comes back, and tell the Android widgets.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') socialStore.refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => {
    if (!snap.loadedAt || !Capacitor.isNativePlatform()) return;
    WidgetAuthBridge.refreshSocialWidgets?.().catch(() => {});
  }, [snap.loadedAt]);

  return <FriendsScreen open={open} onClose={() => setOpen(false)} gold={gold} />;
};
