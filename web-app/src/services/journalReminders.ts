// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL REMINDERS — up to 4 daily times to be nudged to write in the journal.
//
// Stored per user in localStorage (so notificationService.syncAllNotifications can
// re-schedule them with everything else) and scheduled as repeating local
// notifications. `prompted` records that the first-open setup was already shown.
// ─────────────────────────────────────────────────────────────────────────────

import { timeToMinutes } from '../utils/dateUtils';

export const MAX_JOURNAL_REMINDERS = 4;
export const DEFAULT_JOURNAL_TIME = '21:00';

export interface JournalReminderConfig {
  times: string[];
  /** The first-open setup sheet has been shown (saved or skipped). */
  prompted: boolean;
}

const key = (uid: string) => `journal_reminders_v1_${uid}`;

/** Valid, de-duplicated, sorted, capped to MAX_JOURNAL_REMINDERS. */
export const normalizeJournalTimes = (times: unknown): string[] => {
  if (!Array.isArray(times)) return [];
  const seen = new Set<string>();
  for (const t of times) {
    const minutes = timeToMinutes(typeof t === 'string' ? t : null);
    if (minutes === null) continue;
    seen.add(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  return Array.from(seen).sort().slice(0, MAX_JOURNAL_REMINDERS);
};

export const getJournalReminders = (uid?: string | null): JournalReminderConfig => {
  if (!uid) return { times: [], prompted: true };
  try {
    const raw = localStorage.getItem(key(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { times: normalizeJournalTimes(parsed.times), prompted: !!parsed.prompted };
    }
  } catch { /* unreadable: treat as never configured */ }
  return { times: [], prompted: false };
};

export const saveJournalReminders = (uid: string, config: JournalReminderConfig): JournalReminderConfig => {
  const clean = { times: normalizeJournalTimes(config.times), prompted: config.prompted };
  try {
    localStorage.setItem(key(uid), JSON.stringify(clean));
  } catch { /* storage full/unavailable: scheduling below still applies for this session */ }
  window.dispatchEvent(new CustomEvent('journal-reminders-updated', { detail: clean }));
  return clean;
};
