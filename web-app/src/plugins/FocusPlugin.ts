import { registerPlugin } from '@capacitor/core';

export interface FocusPluginOptions {
    duration?: number;
    mode?: string;
    projectName?: string;
    projectColor?: string;
    projectIcon?: string;
}

export interface FocusSessionPlugin {
    checkPermissions(): Promise<{ notifications: boolean; battery: boolean; exactAlarms: boolean }>;
    requestExactAlarmPermission(): Promise<void>;
    requestBatteryPermission(): Promise<void>;
    openNotificationSettings(): Promise<void>;
    start(options: FocusPluginOptions): Promise<void>;
    stop(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    enablePrivacy(): Promise<void>;
    disablePrivacy(): Promise<void>;
    addListener(eventName: string, listenerFunc: (info: any) => void): Promise<{ remove: () => void }>;
}

const FocusSession = registerPlugin<FocusSessionPlugin>('FocusSession');

export default FocusSession;
