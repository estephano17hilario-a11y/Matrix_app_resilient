import { supabase } from './supabase';
import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import FocusSession from '../plugins/FocusPlugin';
import { PersistenceService } from './persistence';
import { parseLocalDate } from '../utils/dateUtils';

// VAPID Key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push Certificates
// const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; 

export interface NotificationInitResult {
 success: boolean;
 token?: string;
 error?: string;
 details?: any;
}

 // Simple numeric hash function (djb2) to avoid collisions
 const generateId = (strId: string, prefix: number) => {
    let hash = 5381;
    for (let i = 0; i < strId.length; i++) {
      hash = ((hash << 5) + hash) + strId.charCodeAt(i); /* hash * 33 + c */
    }
    // Keep it positive and within a safe range (e.g., 0 to 999999)
    return prefix + (Math.abs(hash) % 1000000);
 };

export const notificationService = {
 /**
 * Initialize Notifications (Hybrid Strategy)
 */
 initialize: async (): Promise<NotificationInitResult> => {
 if (!Capacitor.isNativePlatform()) {
 return await notificationService.initWeb();
 } else {
 return await notificationService.initNative();
 }
 },

 // --- NATIVE (CAPACITOR) STRATEGY ---
 initNative: async (): Promise<NotificationInitResult> => {
 try {
 console.log('Initializing Native Push Notifications...');
 
 // 1. Request Permissions
 // Check Push first (includes Local in some versions)
 let permStatus = await PushNotifications.checkPermissions();
 if (permStatus.receive === 'prompt') {
 permStatus = await PushNotifications.requestPermissions();
 }

 if (permStatus.receive !== 'granted') {
 console.warn('User denied push permissions, trying Local fallback...');
 const localPerm = await LocalNotifications.requestPermissions();
 if (localPerm.display !== 'granted') {
 return { success: false, error: 'denied' };
 }
 }

 // 2. Register
 try {
 await PushNotifications.register();
 } catch (regError) {
 console.warn('Push Registration failed (might be expected without google-services.json)', regError);
 // Do not return error, continue for Local Notifications support
 }

 // 3. Listeners
 PushNotifications.addListener('registration', async (token) => {
 console.log('Push Registration Success:', token.value);
 await notificationService.saveTokenToDatabase(token.value, 'mobile');
 });

 PushNotifications.addListener('registrationError', (error) => {
 console.error('Push Registration Error:', error);
 });

 PushNotifications.addListener('pushNotificationReceived', (notification) => {
 console.log('Push Received:', notification);
 
 // Haptics for Push
 if (typeof navigator !== 'undefined' && navigator.vibrate) {
 navigator.vibrate([200, 100, 200]);
 }

 toast(notification.title || 'New Message', {
 icon: '📱',
 duration: 6000,
 className: '!bg-[#050505]/95 !border !border-white/10 !text-white !shadow-[0_0_30px_rgba(255,255,255,0.1)] !rounded-xl',
 style: {
 // Overridden by className, but kept for backup
 background: '#050505',
 color: '#fff',
 border: '1px solid rgba(255,255,255,0.1)'
 }
 });
 });

 PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
 console.log('Push Action:', notification);
 // Navigate to specific screen if needed
 });

 // Initialize Local Notifications Channel (Android 8+)
 try {
 await LocalNotifications.createChannel({
 id: 'lux_daily',
 name: 'Daily Protocol',
 importance: 5,
 description: 'Reminders for your daily goals',
 sound: 'lux_sound.wav', // optional
 visibility: 1
 });
 
 await LocalNotifications.createChannel({
 id: 'lux_focus',
 name: 'Focus Session',
 importance: 2,
 description: 'Active Focus Session Timer',
 sound: undefined,
 visibility: 1
 });
 } catch (channelError) {
 console.warn('Failed to create channels', channelError);
 }

 return { success: true, token: "native-registered" }; // Token handled by listener

 } catch (e: any) {
 console.error("Native Init Failed", e);
 return { success: false, error: 'unknown', details: e.message };
 }
 },

 // --- WEB (PWA) STRATEGY ---
 initWeb: async (): Promise<NotificationInitResult> => {
 try {
 if (typeof window === 'undefined' || !('Notification' in window)) {
 return { success: false, error: 'unsupported_browser' };
 }

 const permission = await Notification.requestPermission();
 if (permission !== 'granted') {
 console.warn("Notification Service: Permission denied.");
 return { success: false, error: 'denied' };
 }

 console.warn("Web Push is currently disabled in favor of Native Push.");
 return { success: true, token: 'local-only-mode' };
 } catch (error: any) {
 console.error("Notification Service: Error during initialization", error);
 return { success: false, error: 'unknown', details: error.message };
 }
 },

 /**
 * Save Token to Supabase
 */
 saveTokenToDatabase: async (token: string, type: 'web' | 'mobile') => {
 try {
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return;

 const { error } = await supabase.from('fcm_tokens').upsert({
 user_id: user.id,
 token: token,
 created_at: new Date().toISOString(),
 last_seen: new Date().toISOString(),
 device_type: type,
 platform: Capacitor.getPlatform(),
 user_agent: navigator.userAgent
 }, { onConflict: 'token' });
 
 if (error) throw error;
 console.log("Notification Service: Token saved to database.");
 } catch (error) {
 console.error("Notification Service: Error saving token", error);
 }
 },

 /**
 * Listen for foreground messages (Web Only helper)
 */
 onMessageListener: () => {
 if (Capacitor.isNativePlatform()) return Promise.resolve(); // Handled by Native Listeners

 // Web Push disabled in favor of Native Push
 return new Promise(() => {});
 },

 /**
  * Ensure EXACT ALARMS permission (Android 14+)
  */
 ensureExactAlarmPermission: async () => {
    if (!Capacitor.isNativePlatform()) return true;
    try {
        const perms = await FocusSession.checkPermissions();
        if (perms.exactAlarms === false) {
            console.warn("Exact Alarms permission missing. Requesting...");
            await FocusSession.requestExactAlarmPermission();
            toast('Please allow "Alarms & Reminders" for precise notifications', { icon: '⏰', duration: 4000 });
            return false;
        }
        return true;
    } catch (e) {
        console.error("Failed to check exact alarm permission", e);
        return true; // Fallback
    }
 },

 /**
 * Schedule Local Notification (The "Excellence" Feature)
 * Uses Capacitor LocalNotifications for offline-first reliability.
 */
 scheduleDailyReminder: async (hour: number, minute: number, days: number[]) => {
 if (!Capacitor.isNativePlatform()) {
 console.log("Web Schedule: Relying on Cloud Functions.");
 return;
 }

 const hasExact = await notificationService.ensureExactAlarmPermission();
 if (!hasExact) return;

 try {
 // 1. Cancel existing "Lux Awaits" (IDs 100-106)
 const pending = await LocalNotifications.getPending();
 const toCancel = pending.notifications.filter(n => n.id >= 100 && n.id <= 106);
 if (toCancel.length > 0) {
 await LocalNotifications.cancel({ notifications: toCancel });
 }

 // 2. Schedule for each day
 // Note: Capacitor LocalNotifications schedule `on` property is powerful
 // We create one ID per day of week to manage them easily (100 + dayIndex)
 
 const notifications = days.map(dayIndex => {
 // dayIndex: 0 = Sun, 1 = Mon... matches Capacitor? 
 // Capacitor Date Match: weekday (1=Sun, 7=Sat)
 // Our UI (0=Sun, 6=Sat) -> Cap (1=Sun, 7=Sat) -> So +1
 
 return {
 id: 100 + dayIndex,
 title: "Lux Awaits",
 body: "It is time to synchronize your daily protocol.",
 schedule: { 
 on: { 
 weekday: dayIndex + 1, 
 hour: hour, 
 minute: minute 
 },
 allowWhileIdle: true 
 },
 channelId: 'lux_daily',
 smallIcon: 'ic_stat_lux', // The Lux Logo
 largeIcon: 'lux_logo',
 actionTypeId: 'OPEN_APP'
 };
 });

 await LocalNotifications.schedule({ notifications });
 console.log(`Scheduled ${notifications.length} local notifications.`);
 toast.success("Neural Link Calibrated (Local)");

 } catch (e) {
 console.error("Failed to schedule local", e);
 toast.error("Calibration Failed");
 }
 },

 scheduleHabitReminder: async (habitId: string, title: string, time: string, days: number[], color?: string) => {
  if (!Capacitor.isNativePlatform()) {
  console.log(`Web fallback: Habit reminder for ${title} scheduled for ${time} on days ${days}`);
  return;
  }

  const hasExact = await notificationService.ensureExactAlarmPermission();
  if (!hasExact) return;

  try {
  const baseId = generateId(habitId, 2000000); 

  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return;

  const pending = await LocalNotifications.getPending();
  const toCancel = pending.notifications.filter(n => n.id === baseId || (n.id >= baseId && n.id <= baseId + 6));
  if (toCancel.length > 0) {
  await LocalNotifications.cancel({ notifications: toCancel });
  }

  const activeDays = days && days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6];
  let notifications: any[] = [];

  if (activeDays.length === 7) {
  notifications.push({
  id: baseId,
  title: "Habit Protocol",
  body: title,
  schedule: {
  on: {
  hour: h,
  minute: m
  },
  allowWhileIdle: true
  },
  channelId: 'lux_daily',
  smallIcon: 'ic_stat_lux',
  largeIcon: 'lux_logo',
  iconColor: color || '#6366f1',
  actionTypeId: 'OPEN_APP'
  });
  } else {
  notifications = activeDays.map(dayIndex => ({
  id: baseId + dayIndex,
  title: "Habit Protocol",
  body: title,
  schedule: {
  on: {
  weekday: dayIndex + 1,
  hour: h,
  minute: m
  },
  allowWhileIdle: true
  },
  channelId: 'lux_daily',
  smallIcon: 'ic_stat_lux',
  largeIcon: 'lux_logo',
  iconColor: color || '#6366f1',
  actionTypeId: 'OPEN_APP'
  }));
  }

  await LocalNotifications.schedule({ notifications });
  console.log(`Scheduled ${notifications.length} reminders for habit ${title}`);
  } catch (e) {
  console.error("Failed to schedule habit reminder", e);
  }
  },

  cancelHabitReminder: async (habitId: string) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
  const baseId = generateId(habitId, 2000000);

  const pending = await LocalNotifications.getPending();
  const toCancel = pending.notifications.filter(n => n.id === baseId || (n.id >= baseId && n.id <= baseId + 6));
  if (toCancel.length > 0) {
  await LocalNotifications.cancel({ notifications: toCancel });
  }
  } catch (e) {
  console.error("Failed to cancel habit reminder", e);
  }
  },

 scheduleProjectReminder: async (projectId: string, title: string, time: string, days: number[], color?: string) => {
  if (!Capacitor.isNativePlatform()) {
  console.log(`Web fallback: Project reminder for ${title} scheduled for ${time} on days ${days}`);
  return;
  }

  const hasExact = await notificationService.ensureExactAlarmPermission();
  if (!hasExact) return;

  try {
  const baseId = generateId(projectId, 5000000);

  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return;

  const pending = await LocalNotifications.getPending();
  const toCancel = pending.notifications.filter(n => n.id === baseId || (n.id >= baseId && n.id <= baseId + 6));
  if (toCancel.length > 0) {
  await LocalNotifications.cancel({ notifications: toCancel });
  }

  const activeDays = days && days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6];
  let notifications: any[] = [];

  if (activeDays.length === 7) {
  notifications.push({
  id: baseId,
  title: "Project Protocol",
  body: title,
  schedule: {
  on: {
  hour: h,
  minute: m
  },
  allowWhileIdle: true
  },
  channelId: 'lux_daily',
  smallIcon: 'ic_stat_lux',
  largeIcon: 'lux_logo',
  iconColor: color || '#6366f1',
  actionTypeId: 'OPEN_APP'
  });
  } else {
  notifications = activeDays.map(dayIndex => ({
  id: baseId + dayIndex,
  title: "Project Protocol",
  body: title,
  schedule: {
  on: {
  weekday: dayIndex + 1,
  hour: h,
  minute: m
  },
  allowWhileIdle: true
  },
  channelId: 'lux_daily',
  smallIcon: 'ic_stat_lux',
  largeIcon: 'lux_logo',
  iconColor: color || '#6366f1',
  actionTypeId: 'OPEN_APP'
  }));
  }

  await LocalNotifications.schedule({ notifications });
  console.log(`Scheduled ${notifications.length} reminders for project ${title}`);
  } catch (e) {
  console.error("Failed to schedule project reminder", e);
  }
  },

  cancelProjectReminder: async (projectId: string) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
  const baseId = generateId(projectId, 5000000);

  const pending = await LocalNotifications.getPending();
  const toCancel = pending.notifications.filter(n => n.id === baseId || (n.id >= baseId && n.id <= baseId + 6));
  if (toCancel.length > 0) {
  await LocalNotifications.cancel({ notifications: toCancel });
  }
  } catch (e) {
  console.error("Failed to cancel project reminder", e);
  }
  },

 scheduleTaskReminder: async (taskId: string, title: string, dueDate: Date, color?: string) => {
 if (!Capacitor.isNativePlatform()) {
 const diff = dueDate.getTime() - Date.now();
 if (diff > 0 && diff < 86400000) { // Only schedule if within 24 hours for web
 setTimeout(() => {
 if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
 new Notification("Task Due", { body: title, icon: '/vite.svg' });
 }
 }, diff);
 }
 return;
 }

 const hasExact = await notificationService.ensureExactAlarmPermission();
 if (!hasExact) return;

 try {
 const baseId = generateId(taskId, 8000000);

 await LocalNotifications.schedule({
 notifications: [{
 id: baseId,
 title: "Task Due",
 body: title,
 schedule: { at: dueDate, allowWhileIdle: true },
 channelId: 'lux_daily',
 smallIcon: 'ic_stat_lux',
 largeIcon: 'lux_logo',
 iconColor: color || '#6366f1',
 actionTypeId: 'OPEN_APP'
 }]
 });
 console.log(`Scheduled reminder for task ${title} at ${dueDate.toISOString()}`);
 } catch (e) {
 console.error("Failed to schedule task reminder", e);
 }
 },

 cancelTaskReminder: async (taskId: string) => {
 if (!Capacitor.isNativePlatform()) return;
 try {
 const baseId = generateId(taskId, 8000000);
 await LocalNotifications.cancel({ notifications: [{ id: baseId }] });
 } catch (e) {
 console.error("Failed to cancel task reminder", e);
 }
 },

 /**
 * Test: Schedule a local notification (Simulation)
 */
 testLocalNotification: async (title: string, body: string) => {
 if (Capacitor.isNativePlatform()) {
 await LocalNotifications.schedule({
 notifications: [{
 title,
 body,
 id: 999,
 schedule: { at: new Date(Date.now() + 1000 * 5) }, // 5 sec delay
 sound: 'beep.wav',
 smallIcon: 'ic_stat_lux',
 largeIcon: 'lux_logo',
 iconColor: '#a855f7',
 attachments: [],
 actionTypeId: '',
 extra: null
 }]
 });
 } else {
 // Web Fallback
 if (!("Notification" in window)) {
 alert("This browser does not support desktop notification");
 return;
 }
 if (Notification.permission === "granted") {
 new Notification(title, { body, icon: '/vite.svg' });
 }
 }
 },

 /**
 * Schedule a one-time notification for a specific date/time
 */
 scheduleEventNotification: async (id: string, title: string, body: string, date: Date, color?: string) => {
 // Generate a unique numeric ID from string ID hash or similar
 const numericId = generateId(id, 9000000);

 if (Capacitor.isNativePlatform()) {
  const hasExact = await notificationService.ensureExactAlarmPermission();
  if (!hasExact) return;
  await LocalNotifications.schedule({
  notifications: [{
  title,
  body,
  id: numericId,
  schedule: { at: date, allowWhileIdle: true },
  sound: 'beep.wav',
  smallIcon: 'ic_stat_lux',
  largeIcon: 'lux_logo',
  iconColor: color || '#ec4899',
  actionTypeId: '',
  extra: { type: 'EVENT', originalId: id }
  }]
  });
 console.log(`Scheduled native notification for ${date.toISOString()}`);
 } else {
 // Web Fallback: Check if we can use Service Worker registration for later
 // If the browser is open, we can use setTimeout if it's in the current session (unlikely for birthdays)
 // Ideally we would use Push API with backend. 
 // For now, we'll just log it or simulate if it's very soon.
 console.log(`Web Notification scheduled for ${date.toISOString()} (Only works if app open or via SW Push)`);
 
 // Simulación visual si es en menos de 1 hora
 const diff = date.getTime() - Date.now();
 if (diff > 0 && diff < 3600000) {
 setTimeout(() => {
 if (Notification.permission === "granted") {
 new Notification(title, { body, icon: '/vite.svg' });
 }
 }, diff);
 }
 }
 },

 cancelEventNotification: async (id: string) => {
  const numericId = generateId(id, 9000000);
  if (numericId && Capacitor.isNativePlatform()) {
  await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
  }
  },

  syncAllNotifications: async (userId?: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const uid = userId || sessionStorage.getItem('MATRIX_ACTIVE_SESSION_UID') || localStorage.getItem('MATRIX_ACTIVE_SESSION_UID');
      if (!uid) {
        console.log("No active user found for notification sync.");
        return;
      }

      console.log("🔄 Syncing all local notifications for user:", uid);

      const pending = await LocalNotifications.getPending();
      const toCancel = pending.notifications.filter(n => n.id !== 9998 && n.id !== 9999);
      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
        console.log(`Cancelled ${toCancel.length} orphaned/stale notifications.`);
      }

      const hasExact = await notificationService.ensureExactAlarmPermission();
      if (!hasExact) {
         console.warn("Exact alarms permission not granted, skipping reschedule.");
         return;
      }

      const habits = PersistenceService.getCollection<any>(uid, 'habits') || [];
      const projects = PersistenceService.getCollection<any>(uid, 'projects') || [];
      const quests = PersistenceService.getCollection<any>(uid, 'quests') || [];
      
      let specialEvents: any[] = [];
      const eventsRaw = localStorage.getItem(`special_events_${uid}`);
      if (eventsRaw) {
        try {
          specialEvents = JSON.parse(eventsRaw);
        } catch (e) {
          console.error("Failed to parse special events for sync", e);
        }
      }

      const notificationsToSchedule: any[] = [];

      const getNextEventDate = (eventDateStr: string, recurrence: 'ANNUAL' | 'MONTHLY' | 'NONE') => {
        const [year, month, day] = eventDateStr.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day);
        baseDate.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (!recurrence || recurrence === 'NONE') return baseDate;
        if (recurrence === 'ANNUAL') {
          const nextDate = new Date(baseDate);
          nextDate.setFullYear(now.getFullYear());
          if (nextDate.getTime() < now.getTime()) nextDate.setFullYear(now.getFullYear() + 1);
          return nextDate;
        }
        if (recurrence === 'MONTHLY') {
          const nextDate = new Date(baseDate);
          nextDate.setFullYear(now.getFullYear());
          nextDate.setMonth(now.getMonth());
          if (nextDate.getTime() < now.getTime()) nextDate.setMonth(now.getMonth() + 1);
          return nextDate;
        }
        return baseDate;
      };

      habits.forEach(habit => {
        if (habit.archived || !habit.reminderTime) return;
        const baseId = generateId(habit.id, 2000000);
        const [h, m] = habit.reminderTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;

        const days = habit.frequencyDays && habit.frequencyDays.length > 0 ? habit.frequencyDays : [0, 1, 2, 3, 4, 5, 6];
        
        if (days.length === 7) {
          notificationsToSchedule.push({
            id: baseId,
            title: "Habit Protocol",
            body: habit.title,
            schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
            channelId: 'lux_daily',
            smallIcon: 'ic_stat_lux',
            largeIcon: 'lux_logo',
            iconColor: habit.color || '#6366f1',
            actionTypeId: 'OPEN_APP'
          });
        } else {
          days.forEach((dayIndex: number) => {
            notificationsToSchedule.push({
              id: baseId + dayIndex,
              title: "Habit Protocol",
              body: habit.title,
              schedule: { on: { weekday: dayIndex + 1, hour: h, minute: m }, allowWhileIdle: true },
              channelId: 'lux_daily',
              smallIcon: 'ic_stat_lux',
              largeIcon: 'lux_logo',
              iconColor: habit.color || '#6366f1',
              actionTypeId: 'OPEN_APP'
            });
          });
        }

        if (habit.type === 'CHECKLIST' && habit.checklist) {
          habit.checklist.forEach((sub: any) => {
            if (!sub.reminderTime) return;
            const subBaseId = generateId(sub.id, 2000000);
            const [sh, sm] = sub.reminderTime.split(':').map(Number);
            if (isNaN(sh) || isNaN(sm)) return;

            const subDays = sub.days && sub.days.length > 0 ? sub.days : days;
            if (subDays.length === 7) {
              notificationsToSchedule.push({
                id: subBaseId,
                title: "Habit Protocol",
                body: `Subtask: ${sub.text}`,
                schedule: { on: { hour: sh, minute: sm }, allowWhileIdle: true },
                channelId: 'lux_daily',
                smallIcon: 'ic_stat_lux',
                largeIcon: 'lux_logo',
                iconColor: habit.color || '#6366f1',
                actionTypeId: 'OPEN_APP'
              });
            } else {
              subDays.forEach((dayIndex: number) => {
                notificationsToSchedule.push({
                  id: subBaseId + dayIndex,
                  title: "Habit Protocol",
                  body: `Subtask: ${sub.text}`,
                  schedule: { on: { weekday: dayIndex + 1, hour: sh, minute: sm }, allowWhileIdle: true },
                  channelId: 'lux_daily',
                  smallIcon: 'ic_stat_lux',
                  largeIcon: 'lux_logo',
                  iconColor: habit.color || '#6366f1',
                  actionTypeId: 'OPEN_APP'
                });
              });
            }
          });
        }
      });

      projects.forEach(project => {
        if (project.completed || project.archived || !project.reminder) return;
        const baseId = generateId(project.id, 5000000);
        const [h, m] = project.reminder.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;

        const days = project.reminderDays && project.reminderDays.length > 0 ? project.reminderDays : [0, 1, 2, 3, 4, 5, 6];
        
        if (days.length === 7) {
          notificationsToSchedule.push({
            id: baseId,
            title: "Project Protocol",
            body: project.title,
            schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
            channelId: 'lux_daily',
            smallIcon: 'ic_stat_lux',
            largeIcon: 'lux_logo',
            iconColor: project.color || '#6366f1',
            actionTypeId: 'OPEN_APP'
          });
        } else {
          days.forEach((dayIndex: number) => {
            notificationsToSchedule.push({
              id: baseId + dayIndex,
              title: "Project Protocol",
              body: project.title,
              schedule: { on: { weekday: dayIndex + 1, hour: h, minute: m }, allowWhileIdle: true },
              channelId: 'lux_daily',
              smallIcon: 'ic_stat_lux',
              largeIcon: 'lux_logo',
              iconColor: project.color || '#6366f1',
              actionTypeId: 'OPEN_APP'
            });
          });
        }
      });

      quests.forEach(quest => {
        if (quest.completed || !quest.deadline) return;
        const baseId = generateId(quest.id, 8000000);
        const deadlineDate = parseLocalDate(quest.deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate.getTime() > Date.now()) {
          notificationsToSchedule.push({
            id: baseId,
            title: "Task Due",
            body: quest.title,
            schedule: { at: deadlineDate, allowWhileIdle: true },
            channelId: 'lux_daily',
            smallIcon: 'ic_stat_lux',
            largeIcon: 'lux_logo',
            iconColor: quest.color || '#6366f1',
            actionTypeId: 'OPEN_APP'
          });
        }
      });

      specialEvents.forEach(event => {
        if (!event.notifyTime) return;
        const numericId = generateId(event.id, 9000000);
        const nextDate = getNextEventDate(event.date, event.type);
        const [hours, minutes] = event.notifyTime.split(':').map(Number);
        nextDate.setHours(hours, minutes, 0, 0);

        if (nextDate.getTime() > Date.now()) {
          notificationsToSchedule.push({
            id: numericId,
            title: "🎉 Today is special!",
            body: `It's ${event.title}'s ${event.type === 'BIRTHDAY' ? 'Birthday' : event.type === 'ANNIVERSARY' ? 'Anniversary' : 'Special Day'}! Don't forget to celebrate.`,
            schedule: { at: nextDate, allowWhileIdle: true },
            sound: 'beep.wav',
            smallIcon: 'ic_stat_lux',
            largeIcon: 'lux_logo',
            iconColor: event.type === 'BIRTHDAY' ? '#ec4899' : event.type === 'ANNIVERSARY' ? '#ef4444' : '#fbbf24',
            actionTypeId: '',
            extra: { type: 'EVENT', originalId: event.id }
          });
        }
      });

      if (notificationsToSchedule.length > 0) {
        let toSchedule = notificationsToSchedule;
        if (toSchedule.length > 450) {
          console.warn(`Total notifications to schedule (${toSchedule.length}) exceeds safety limit. Truncating to 450.`);
          toSchedule = toSchedule.slice(0, 450);
        }
        await LocalNotifications.schedule({ notifications: toSchedule });
        console.log(`Successfully synced and scheduled ${toSchedule.length} local notifications.`);
      }
    } catch (error) {
      console.error("Failed to sync notifications", error);
    }
  }
};
