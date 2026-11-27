// Coach messages: motivational lines in the tone the user picked, written by the assistant they
// named, plus urgent-task alerts. Native: chat-style notifications (CoachNotify plugin, Android
// MessagingStyle). In the app (and on web) they also appear as a chat heads-up card.
// Routine reminders (habit / project / journal times) are NOT coach messages and keep their style.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { getRandomToneMessage, type NotificationTone } from '@/services/notificationTonesService';
import { getAssistantName } from './coachIdentity';

interface CoachNotifyPlugin {
  schedule(opts: { messages: { id: number; at: number; name: string; body: string }[] }): Promise<{ scheduled: number }>;
  cancel(opts: { ids: number[] }): Promise<void>;
  show(opts: { id: number; name: string; body: string }): Promise<void>;
}
export const CoachNotify = registerPlugin<CoachNotifyPlugin>('CoachNotify');

export const COACH_BASE_ID = 7_300_000;
const DAYS = 7;
const SLOTS: [number, number][] = [[9, 0], [13, 30], [19, 30]];
export const WELCOME_PENDING_KEY = 'lux_coach_welcome_pending';

const tone = (): NotificationTone => {
  try { return (localStorage.getItem('matrix_notification_tone') as NotificationTone) || 'NEUTRAL'; } catch { return 'NEUTRAL'; }
};
const phrase = () => {
  try { return localStorage.getItem('matrix_anti_procrastination_phrase') || ''; } catch { return ''; }
};

// ── In-app inbox (heads-up cards) ──
export interface CoachMessage { id: number; name: string; body: string }
type Listener = (m: CoachMessage) => void;
const listeners = new Set<Listener>();
export const coachInbox = {
  push: (body: string, id = Date.now()) => {
    const m = { id, name: getAssistantName(), body };
    listeners.forEach(l => l(m));
  },
  subscribe: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; },
};

// ── Motivational schedule ──
const slotDates = (now = new Date()) => {
  const out: { id: number; at: Date }[] = [];
  for (let d = 0; d < DAYS; d++) {
    SLOTS.forEach(([h, m], s) => {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, m, 0, 0);
      if (at.getTime() > now.getTime() + 60_000) out.push({ id: COACH_BASE_ID + d * SLOTS.length + s, at });
    });
  }
  return out;
};

let webTimers: ReturnType<typeof setTimeout>[] = [];

/** (Re)schedules the next 7 days of coach messages. Safe to call on every launch. */
export const scheduleCoachMessages = async () => {
  const name = getAssistantName();
  const slots = slotDates();
  const messages = slots.map(s => ({ id: s.id, at: s.at.getTime(), name, body: getRandomToneMessage(tone(), 'general', phrase()) }));

  if (Capacitor.isNativePlatform()) {
    try {
      const allIds = Array.from({ length: DAYS * SLOTS.length }, (_, i) => COACH_BASE_ID + i);
      await CoachNotify.cancel({ ids: allIds });
      await CoachNotify.schedule({ messages });
    } catch (e) {
      console.warn('[coach] native schedule failed', e);
    }
    return;
  }

  // Web: only while the app is open, today's remaining slots appear as heads-up cards.
  webTimers.forEach(clearTimeout);
  webTimers = messages
    .filter(m => m.at - Date.now() < 24 * 3600_000)
    .map(m => setTimeout(() => { if (document.visibilityState === 'visible') coachInbox.push(m.body, m.id); }, m.at - Date.now()));
};

// ── Urgent tasks ──
const URGENT: Record<NotificationTone, (t: string) => string> = {
  NEUTRAL: t => `⏰ «${t}» vence ahora. Es buen momento para completarla.`,
  SUPREME_MOTIVATOR: t => `🚀 ¡Hora de «${t}»! Termínala ahora y celebra tu victoria, ¡tú puedes!`,
  GOGGINS_BRUTAL: t => `💀 «${t}» vence YA. Sin excusas. Levántate y hazla.`,
};
export const urgentTaskMessage = (title: string) => URGENT[tone()]?.(title) ?? URGENT.NEUTRAL(title);

export const welcomeMessage = (userName?: string | null) => {
  const first = (userName || '').split(' ')[0];
  const hi = first ? `¡Hola, ${first}! ` : '¡Hola! ';
  switch (tone()) {
    case 'GOGGINS_BRUTAL': return `${hi}Soy ${getAssistantName()}. Te voy a escribir cada día y no te voy a dejar rendirte. 💀`;
    case 'SUPREME_MOTIVATOR': return `${hi}Soy ${getAssistantName()}, tu coach. ¡Te escribiré cada día para que brilles! ✨`;
    default: return `${hi}Soy ${getAssistantName()}. Te escribiré cada día para ayudarte a mantener el rumbo. 📊`;
  }
};
