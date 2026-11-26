// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE WIDGET SYNC — the native Android "Lux · Rutina" / "Lux · Calendario" widgets rebuild the day from the
// cached habits / tasks themselves, but they cannot read localStorage. The Routine settings, the journal reminder
// times and the reminders pinned on the Journal calendar live there, so they are pushed to the native side
// whenever they change.
// ─────────────────────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';
import WidgetAuthBridge from '../../plugins/WidgetBridgePlugin';
import type { RoutineConfig } from './routineEngine';
import type { JournalReminderItem } from './reminderItems';

let lastConfig = '';
let lastReminders = '';

export const syncRoutineWidget = (config: RoutineConfig, journalTimes: string[]): void => {
  if (!Capacitor.isNativePlatform()) return;
  const payload = JSON.stringify({ config, journalTimes });
  if (payload === lastConfig) return;
  lastConfig = payload;
  // Older native builds do not have this method: ignore the rejection.
  WidgetAuthBridge.updateRoutineConfig?.({ config: { ...config }, journalTimes }).catch(() => { lastConfig = ''; });
};

/** Reminders pinned on the Journal calendar (only what a widget needs). */
export const syncReminderItemsWidget = (reminders: JournalReminderItem[]): void => {
  if (!Capacitor.isNativePlatform()) return;
  const slim = reminders.map(r => ({ id: r.id, title: r.title, date: r.date, time: r.time ?? null, repeat: r.repeat, doneDates: r.doneDates.slice(-120), color: r.color ?? null, duration: r.duration ?? null }));
  const payload = JSON.stringify(slim);
  if (payload === lastReminders) return;
  lastReminders = payload;
  WidgetAuthBridge.updateRoutineConfig?.({ reminders: slim }).catch(() => { lastReminders = ''; });
};
