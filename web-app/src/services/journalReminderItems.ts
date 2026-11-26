// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL REMINDER ITEMS (storage) — reminders pinned on the Journal calendar. Kept per user in localStorage
// (synced with the other local prefs, see syncedPrefs.ts), scheduled as local notifications, and pushed to the
// Android widgets through routineWidgetSync. Pure rules live in modules/routine/reminderItems.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { newReminderId, reminderOccursOn, type JournalReminderItem, type ReminderRepeat } from '../modules/routine/reminderItems';
import { timeToMinutes } from '../utils/dateUtils';

const key = (uid: string) => `journal_reminder_items_v1_${uid}`;
const EVENT = 'journal-reminder-items-updated';
export const MAX_REMINDER_ITEMS = 300;

const clean = (raw: unknown): JournalReminderItem[] => {
  if (!Array.isArray(raw)) return [];
  const out: JournalReminderItem[] = [];
  for (const r of raw as Partial<JournalReminderItem>[]) {
    if (!r || typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    const repeat: ReminderRepeat = (['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).includes(r.repeat as ReminderRepeat) ? (r.repeat as ReminderRepeat) : 'NONE';
    out.push({
      id: r.id, title: r.title.slice(0, 120), date: r.date,
      time: timeToMinutes(r.time ?? null) === null ? null : r.time,
      repeat, doneDates: Array.isArray(r.doneDates) ? r.doneDates.filter(d => typeof d === 'string').slice(-400) : [],
      color: typeof r.color === 'string' ? r.color : undefined,
      duration: typeof r.duration === 'number' ? r.duration : undefined,
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    });
  }
  return out.slice(0, MAX_REMINDER_ITEMS);
};

export const getReminderItems = (uid?: string | null): JournalReminderItem[] => {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(key(uid));
    if (raw) return clean(JSON.parse(raw));
  } catch { /* unreadable: no reminders */ }
  return [];
};

export const saveReminderItems = (uid: string, items: JournalReminderItem[]): JournalReminderItem[] => {
  const next = clean(items);
  try { localStorage.setItem(key(uid), JSON.stringify(next)); } catch { /* storage full/unavailable: kept in memory by the caller */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { uid, items: next } }));
  return next;
};

/** Subscribes to changes (same tab). Returns the unsubscribe function. */
export const onReminderItemsChanged = (cb: (items: JournalReminderItem[]) => void): (() => void) => {
  const handler = (e: Event) => cb((e as CustomEvent<{ items: JournalReminderItem[] }>).detail.items);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
};

export const makeReminder = (draft: { title: string; date: string; time?: string | null; repeat?: ReminderRepeat; color?: string }): JournalReminderItem => ({
  id: newReminderId(), title: draft.title.trim(), date: draft.date, time: draft.time || null,
  repeat: draft.repeat || 'NONE', doneDates: [], color: draft.color, createdAt: Date.now(),
});

export const remindersOn = (items: JournalReminderItem[], dateKey: string) => items.filter(r => reminderOccursOn(r, dateKey));
