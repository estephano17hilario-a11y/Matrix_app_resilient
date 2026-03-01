import { messaging, getToken, onMessage, db, doc, setDoc, auth } from './firebase';
import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

// VAPID Key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push Certificates
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; 

export interface NotificationInitResult {
  success: boolean;
  token?: string;
  error?: string;
  details?: any;
}

export const notificationService = {
  /**
   * Initialize Notifications (Hybrid Strategy)
   */
  initialize: async (): Promise<NotificationInitResult> => {
    if (Capacitor.isNativePlatform()) {
      return await notificationService.initNative();
    } else {
      return await notificationService.initWeb();
    }
  },

  // --- NATIVE (CAPACITOR) STRATEGY ---
  initNative: async (): Promise<NotificationInitResult> => {
    try {
      console.log('Initializing Native Push Notifications...');
      
      // 1. Request Permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push permissions');
        return { success: false, error: 'denied' };
      }

      // 2. Register
      try {
        await PushNotifications.register();
      } catch (regError) {
        console.error('Registration failed', regError);
        return { success: false, error: 'registration_failed', details: regError };
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
           className: '!bg-[#050505]/90 !backdrop-blur-sm !border !border-white/10 !text-white !shadow-[0_0_30px_rgba(255,255,255,0.1)] !rounded-xl',
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
      } catch (channelError) {
        console.warn('Failed to create channel', channelError);
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
      if (!messaging) {
        console.warn("Notification Service: Messaging not initialized (maybe offline or unsupported).");
        return { success: false, error: 'unavailable' };
      }

      if (!('Notification' in window)) {
        return { success: false, error: 'unsupported_browser' };
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn("Notification Service: Permission denied.");
        return { success: false, error: 'denied' };
      }

      // Check VAPID Key validity
      if (VAPID_KEY.includes('YOUR_VAPID_KEY')) {
        console.error("VAPID Key is not configured.");
        return { success: false, error: 'configuration_error', details: 'VAPID Key missing' };
      }

      try {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          console.log("Notification Service: Web Token received", token);
          await notificationService.saveTokenToDatabase(token, 'web');
          return { success: true, token };
        } else {
          console.warn("Notification Service: No registration token available.");
          return { success: false, error: 'no_token' };
        }
      } catch (tokenError: any) {
         // Specific handling for common errors
         if (tokenError.message?.includes('unregistered') || tokenError.code === 'messaging/failed-registration-token') {
             return { success: false, error: 'service_worker_issue', details: tokenError };
         }
         throw tokenError;
      }
    } catch (error: any) {
      console.error("Notification Service: Error during initialization", error);
      return { success: false, error: 'unknown', details: error.message };
    }
  },

  /**
   * Save Token to Firestore
   */
  saveTokenToDatabase: async (token: string, type: 'web' | 'mobile') => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const tokenRef = doc(db, 'users', user.uid, 'fcmTokens', token);
      await setDoc(tokenRef, {
        token: token,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        deviceType: type,
        platform: Capacitor.getPlatform(),
        userAgent: navigator.userAgent
      }, { merge: true });
      
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

    if (!messaging) return new Promise(() => {});
    return new Promise((resolve) => {
      onMessage(messaging!, (payload) => {
        console.log("Notification Service: Foreground Message received", payload);
        toast(payload.notification?.title || 'New Message', {
            icon: '🔔',
            duration: 5000,
        });
        resolve(payload);
      });
    });
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

    try {
       // 1. Cancel existing to avoid duplicates
       const pending = await LocalNotifications.getPending();
       if (pending.notifications.length > 0) {
           await LocalNotifications.cancel(pending);
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
               channelId: 'matrix_daily',
               smallIcon: 'ic_stat_matrix', // Need to add this resource later
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
  scheduleEventNotification: async (id: string, title: string, body: string, date: Date) => {
    // Generate a unique numeric ID from string ID hash or similar
    const numericId = parseInt(id.replace(/\D/g, '').slice(0, 8)) || Math.floor(Math.random() * 100000);

    if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
            notifications: [{
                title,
                body,
                id: numericId,
                schedule: { at: date },
                sound: 'beep.wav',
                smallIcon: 'ic_stat_cake', // Idealmente tener un icono de pastel
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
      const numericId = parseInt(id.replace(/\D/g, '').slice(0, 8)) || 0;
      if (numericId && Capacitor.isNativePlatform()) {
          await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
      }
  }
};
