import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import FocusSession from '../plugins/FocusPlugin';
import { notificationService } from '../services/notificationService';
import { toast } from 'react-hot-toast';

export const useNotificationSystem = (isEnabled: boolean) => {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!isEnabled || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    const initSystem = async () => {
      if (!Capacitor.isNativePlatform()) {
          // Web Init
          try {
            await notificationService.initialize();
          } catch (e) {
            console.warn("No se pudieron activar las notificaciones, pero la app sigue:", e);
          }
          return;
      }

      console.log("🛡️ INITIALIZING NOTIFICATION SYSTEM (NATIVE)...");

      try {
        // 1. Force Channel Creation (Android 8+)
        // We create a default channel for general notifications first
        await LocalNotifications.createChannel({
            id: 'default',
            name: 'General',
            importance: 3,
            description: 'General updates',
            sound: 'beep.wav',
            visibility: 1
        }).catch(e => console.warn("Failed to create default channel", e));

        await LocalNotifications.createChannel({
            id: 'lux_daily',
            name: 'Daily Protocol',
            importance: 5,
            description: 'Habits and Tasks',
            sound: 'lux_sound.wav',
            visibility: 1
        }).catch(e => console.warn("Failed to create lux channel", e));

        // 2. Request Permissions (Aggressive Strategy)
        // Check Push first (includes Local in some versions)
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
             console.log("🔔 Requesting Push Permissions...");
             permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
             // Fallback to Local only check
             console.log("⚠️ Push denied, trying Local...");
             const localPerm = await LocalNotifications.requestPermissions();
             if (localPerm.display !== 'granted') {
                 console.error("🚫 ALL NOTIFICATIONS DENIED");
                 toast.error("Notifications Disabled. Please enable in Settings to receive updates.");
                 return;
             }
        }

        // 3. Initialize Services
        // This registers listeners and tokens
        await notificationService.initialize();

        // 4. Focus Plugin Handshake
        // Just checking permissions is enough to trigger channel creation
        await FocusSession.checkPermissions();

      } catch (error) {
        console.error("❌ Notification System Failure:", error);
      }
    };

    initSystem();
  }, [isEnabled]);
};
