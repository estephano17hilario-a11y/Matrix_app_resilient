import { registerPlugin } from '@capacitor/core';

export interface FocusPlugin {
  start(options: { 
    duration: number; 
    mode: 'POMO' | 'STOPWATCH';
    projectName?: string;
    projectColor?: string;
    projectIcon?: string;
  }): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  
  // Advanced Permissions
  checkPermissions(): Promise<{ 
      notifications: boolean; 
      battery: boolean; 
      exactAlarms?: boolean;
  }>;
  requestBatteryPermission(): Promise<void>;
  requestExactAlarmPermission(): Promise<void>;
  openNotificationSettings(): Promise<void>;

  // Privacy
  enablePrivacy(): Promise<void>;
  disablePrivacy(): Promise<void>;

  // Listeners for Native Notification Actions
  addListener(eventName: 'onPause', listenerFunc: () => void): Promise<any>;
  addListener(eventName: 'onResume', listenerFunc: () => void): Promise<any>;
  addListener(eventName: 'onStop', listenerFunc: () => void): Promise<any>;
}

const FocusSession = registerPlugin<FocusPlugin>('FocusSession', {
  web: () => import('./FocusPluginWeb').then(m => new m.FocusPluginWeb()),
});

export default FocusSession;
