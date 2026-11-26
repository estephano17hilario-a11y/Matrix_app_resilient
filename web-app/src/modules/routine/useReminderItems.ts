import { useCallback, useEffect, useState } from 'react';
import { getReminderItems, onReminderItemsChanged, saveReminderItems } from '../../services/journalReminderItems';
import { notificationService } from '../../services/notificationService';
import { syncReminderItemsWidget } from './routineWidgetSync';
import type { JournalReminderItem } from './reminderItems';

/**
 * The reminders pinned on the Journal calendar, kept in sync between the Journal calendar, the Routine calendar
 * and the Android widgets. Every change is persisted, scheduled as a local notification and pushed to the widgets.
 */
export const useReminderItems = (uid?: string | null) => {
  const [items, setItems] = useState<JournalReminderItem[]>(() => getReminderItems(uid));

  useEffect(() => {
    setItems(getReminderItems(uid));
    return onReminderItemsChanged(setItems);
  }, [uid]);

  // Always starts from what is stored (not from a possibly stale render), so quick consecutive edits never clobber each other.
  const commit = useCallback((change: (current: JournalReminderItem[]) => JournalReminderItem[]) => {
    if (!uid) return [] as JournalReminderItem[];
    const saved = saveReminderItems(uid, change(getReminderItems(uid)));
    syncReminderItemsWidget(saved);
    return saved;
  }, [uid]);

  const upsert = useCallback((reminder: JournalReminderItem) => {
    commit(cur => (cur.some(r => r.id === reminder.id) ? cur.map(r => (r.id === reminder.id ? reminder : r)) : [...cur, reminder]));
    notificationService.scheduleReminderItem(reminder).catch(() => { /* notifications unavailable */ });
  }, [commit]);

  const patch = useCallback((id: string, data: Partial<JournalReminderItem>) => {
    let updated: JournalReminderItem | undefined;
    commit(cur => cur.map(r => {
      if (r.id !== id) return r;
      updated = { ...r, ...data, id: r.id };
      return updated;
    }));
    if (updated) notificationService.scheduleReminderItem(updated).catch(() => { /* notifications unavailable */ });
  }, [commit]);

  const remove = useCallback((id: string) => {
    commit(cur => cur.filter(r => r.id !== id));
    notificationService.cancelReminderItem(id).catch(() => { /* notifications unavailable */ });
  }, [commit]);

  /** Ticks (or unticks) the reminder for one day. */
  const toggleDone = useCallback((id: string, dateKey: string) => {
    commit(cur => cur.map(r => {
      if (r.id !== id) return r;
      const done = r.doneDates.includes(dateKey);
      return { ...r, doneDates: done ? r.doneDates.filter(d => d !== dateKey) : [...r.doneDates, dateKey] };
    }));
  }, [commit]);

  return { items, upsert, patch, remove, toggleDone };
};
