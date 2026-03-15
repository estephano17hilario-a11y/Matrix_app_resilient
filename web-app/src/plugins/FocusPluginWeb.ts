import { WebPlugin } from '@capacitor/core';
import { FocusPlugin } from './FocusPlugin';

export class FocusPluginWeb extends WebPlugin implements FocusPlugin {
  private activeNotification: Notification | null = null;

  async start(options: { duration: number; mode: 'POMO' | 'STOPWATCH'; projectName?: string; projectColor?: string; projectIcon?: string; }): Promise<void> {
    console.log('FocusSession.start', options);

    if (typeof Notification === 'undefined') {
        console.warn("Notifications not supported in this environment");
        return;
    }

    if (Notification.permission === 'granted') {
      const title = options.mode === 'POMO' ? 'Focus Session Started' : 'Stopwatch Started';
      const iconPrefix = options.projectIcon ? `${options.projectIcon} ` : '';
      const body = options.projectName 
        ? `Working on ${iconPrefix}${options.projectName}` 
        : 'Stay focused!';

      this.activeNotification = new Notification(title, {
        body,
        icon: '/favicon.ico', // Ensure this exists or use a valid path
        tag: 'focus-session',
        renotify: true,
        silent: true // Don't beep every time if we update it
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.start(options);
      }
    }
  }

  async stop(): Promise<void> {
    console.log('FocusSession.stop');
    if (this.activeNotification) {
      this.activeNotification.close();
      this.activeNotification = null;
    }
    
    if (Notification.permission === 'granted') {
       new Notification('Session Finished', {
         body: 'Great job! Take a break.',
         icon: '/favicon.ico',
         tag: 'focus-session'
       });
    }
  }

  async pause(): Promise<void> {
    console.log('FocusSession.pause');
    if (this.activeNotification) {
        this.activeNotification.close();
    }
    if (Notification.permission === 'granted') {
        new Notification('Session Paused', {
            body: 'Resume when you are ready.',
            tag: 'focus-session',
            renotify: true
        });
    }
  }

  async resume(): Promise<void> {
    console.log('FocusSession.resume');
    // Ideally we would know the project name here to restart the notification properly
    if (Notification.permission === 'granted') {
        new Notification('Session Resumed', {
            body: 'Focus is back on.',
            tag: 'focus-session',
            renotify: true
        });
    }
  }

  async checkPermissions(): Promise<{ notifications: boolean; battery: boolean; overlay: boolean; }> {
    console.log('FocusSession.checkPermissions');
    return { 
      notifications: Notification.permission === 'granted', 
      battery: true, 
      overlay: true 
    };
  }

  async requestBatteryPermission(): Promise<void> {
    console.log('FocusSession.requestBatteryPermission');
  }

  async requestOverlayPermission(): Promise<void> {
    console.log('FocusSession.requestOverlayPermission');
  }

  async openNotificationSettings(): Promise<void> {
    console.log('FocusSession.openNotificationSettings');
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        alert('Please enable notifications in your browser settings.');
    }
  }

  async enablePrivacy(): Promise<void> {
    console.log('FocusSession.enablePrivacy (Web Mock)');
  }

  async disablePrivacy(): Promise<void> {
    console.log('FocusSession.disablePrivacy (Web Mock)');
  }
}
