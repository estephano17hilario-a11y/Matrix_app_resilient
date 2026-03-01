import { WebPlugin } from '@capacitor/core';
import { FocusPlugin } from './FocusPlugin';

export class FocusPluginWeb extends WebPlugin implements FocusPlugin {
  async start(options: { duration: number; mode: 'POMO' | 'STOPWATCH'; projectName?: string; projectColor?: string; }): Promise<void> {
    console.log('FocusSession.start', options);
  }
  async stop(): Promise<void> {
    console.log('FocusSession.stop');
  }
  async pause(): Promise<void> {
    console.log('FocusSession.pause');
  }
  async resume(): Promise<void> {
    console.log('FocusSession.resume');
  }
  async checkPermissions(): Promise<{ notifications: boolean; battery: boolean; overlay: boolean; }> {
    console.log('FocusSession.checkPermissions');
    return { notifications: true, battery: true, overlay: true };
  }
  async requestBatteryPermission(): Promise<void> {
    console.log('FocusSession.requestBatteryPermission');
  }
  async requestOverlayPermission(): Promise<void> {
    console.log('FocusSession.requestOverlayPermission');
  }
  async openNotificationSettings(): Promise<void> {
    console.log('FocusSession.openNotificationSettings');
  }
  async enablePrivacy(): Promise<void> {
    console.log('FocusSession.enablePrivacy (Web Mock)');
  }
  async disablePrivacy(): Promise<void> {
    console.log('FocusSession.disablePrivacy (Web Mock)');
  }
}
