import { registerPlugin } from '@capacitor/core';

export interface FocusPluginOptions {
    duration?: number;
    mode?: string;
    projectName?: string;
    projectColor?: string;
    projectIcon?: string;
    /** Optional subtitle for the notification, e.g. the active routine step. */
    label?: string;
}

/** Authoritative JS clock (seconds) so the native notification never drifts from the on-screen timer. */
export interface FocusClockOptions {
    timeLeft?: number;
}

export interface FocusSessionPlugin {
    checkPermissions(): Promise<{ notifications: boolean; battery: boolean; exactAlarms: boolean }>;
    requestExactAlarmPermission(): Promise<void>;
    requestBatteryPermission(): Promise<void>;
    openNotificationSettings(): Promise<void>;
    start(options: FocusPluginOptions): Promise<void>;
    stop(): Promise<void>;
    pause(options?: FocusClockOptions): Promise<void>;
    resume(options?: FocusClockOptions): Promise<void>;
    enablePrivacy(): Promise<void>;
    disablePrivacy(): Promise<void>;
    addListener(eventName: string, listenerFunc: (info: any) => void): Promise<{ remove: () => void }>;
}

const FocusSession = registerPlugin<FocusSessionPlugin>('FocusSession');

export default FocusSession;
