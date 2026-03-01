import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'react-hot-toast';

export interface PermissionStatus {
    notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
    exactAlarms: 'granted' | 'denied' | 'unknown'; // Android 12+
}

export const usePermissions = () => {
    const [permissions, setPermissions] = useState<PermissionStatus>({
        notifications: 'unknown',
        exactAlarms: 'unknown'
    });

    const checkPermissions = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) {
            // Web Logic
            if (typeof Notification !== 'undefined') {
                setPermissions(prev => ({
                    ...prev,
                    notifications: Notification.permission as 'granted' | 'denied' | 'default' === 'default' ? 'prompt' : Notification.permission as any
                }));
            }
            return;
        }

        try {
            // Check Notifications
            const pushStatus = await PushNotifications.checkPermissions();
            const localStatus = await LocalNotifications.checkPermissions();
            
            // Android 12+ Exact Alarms (Schedule Exact Alarm)
            // LocalNotifications plugin might map 'display' to exact alarms in newer versions, 
            // but often we rely on the general status.
            
            setPermissions({
                notifications: pushStatus.receive,
                exactAlarms: localStatus.display === 'granted' ? 'granted' : 'denied' 
            });

        } catch (e) {
            console.warn("Permission check failed", e);
        }
    }, []);

    const requestPermissions = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) {
            const result = await Notification.requestPermission();
            setPermissions(prev => ({ ...prev, notifications: result === 'default' ? 'prompt' : result as any }));
            return result === 'granted';
        }

        try {
            // 1. Notifications
            let pushStatus = await PushNotifications.checkPermissions();
            if (pushStatus.receive === 'prompt') {
                pushStatus = await PushNotifications.requestPermissions();
            }

            if (pushStatus.receive !== 'granted') {
                toast.error("Notifications denied. Please enable them in settings.", {
                    style: { background: '#333', color: '#fff' }
                });
                return false;
            }

            // 2. Exact Alarms (Critical for precise reminders)
            // Some devices require explicit permission for exact alarms
            const localStatus = await LocalNotifications.requestPermissions();
            if (localStatus.display !== 'granted') {
                toast.error("Alarm permissions denied.", {
                    style: { background: '#333', color: '#fff' }
                });
                return false;
            }

            setPermissions({
                notifications: 'granted',
                exactAlarms: 'granted'
            });

            return true;
        } catch (e) {
            console.error("Permission request failed", e);
            return false;
        }
    }, []);

    const openSystemSettings = useCallback(async () => {
        // Fallback for Battery Optimization / Deep Settings
        // Unfortunately standard Capacitor doesn't open "Battery Optimization" directly without a specific plugin.
        // But we can try opening App Settings.
        // We assume the user might need to go to "App Info" -> "Battery"
        
        // This is a placeholder as we don't have the specific plugin for Intent
        // But we can guide them.
        toast("Please disable Battery Optimization for Lux in System Settings to ensure alarms fire.", {
            icon: '🔋',
            duration: 5000,
            style: { background: '#333', color: '#fff' }
        });
    }, []);

    useEffect(() => {
        checkPermissions();
        
        // Re-check on app resume
        const resumeListener = (window as any).Capacitor?.Plugins?.App?.addListener('appStateChange', (state: any) => {
            if (state.isActive) {
                checkPermissions();
            }
        });

        return () => {
            if (resumeListener) {
                resumeListener.remove();
            }
        };
    }, [checkPermissions]);

    return {
        permissions,
        checkPermissions,
        requestPermissions,
        openSystemSettings
    };
};
