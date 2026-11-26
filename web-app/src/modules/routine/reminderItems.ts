// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL REMINDER ITEMS — little reminders pinned on a day of the Journal calendar ("escribir sobre la
// reunión", "llamar a mamá"…). They show up in the Journal calendar AND in the Routine calendar / widget.
// Pure helpers (no storage): see services/journalReminderItems.ts for persistence.
// ─────────────────────────────────────────────────────────────────────────────

export type ReminderRepeat = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface JournalReminderItem {
  id: string;
  title: string;
  /** First (or only) day, "YYYY-MM-DD". */
  date: string;
  /** "HH:mm" or absent = the whole day. */
  time?: string | null;
  repeat: ReminderRepeat;
  /** Days (date keys) on which it was ticked off. */
  doneDates: string[];
  color?: string;
  /** Calendar block length in minutes (default 20). */
  duration?: number;
  createdAt: number;
}

const parts = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
};

const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

/** Does this reminder fall on `dateKey`? Monthly / yearly ones clamp to the last day of short months. */
export const reminderOccursOn = (r: Pick<JournalReminderItem, 'date' | 'repeat'>, dateKey: string): boolean => {
  if (dateKey < r.date) return false;
  if (r.repeat === 'NONE') return dateKey === r.date;
  if (r.repeat === 'DAILY') return true;
  const a = parts(r.date);
  const b = parts(dateKey);
  if (r.repeat === 'WEEKLY') {
    const da = new Date(a.y, a.m - 1, a.d).getDay();
    const db = new Date(b.y, b.m - 1, b.d).getDay();
    return da === db;
  }
  if (r.repeat === 'MONTHLY') return b.d === Math.min(a.d, daysInMonth(b.y, b.m));
  return b.m === a.m && b.d === Math.min(a.d, daysInMonth(b.y, b.m));
};

export const newReminderId = () => `rem_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
