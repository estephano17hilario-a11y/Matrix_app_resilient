import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'react-hot-toast';
import { RivalLevel } from '../config/rivalsConfig';

export class RivalNotificationService {
  private static CHANNEL_ID = 'rival_alerts';

  /**
   * Initialize notification channel for rival alerts
   */
  public static async initChannel() {
    try {
      await LocalNotifications.createChannel({
        id: this.CHANNEL_ID,
        name: 'Alertas de Rivales (Duelos)',
        description: 'Notificaciones sobre los avances y jornada de tu rival en tiempo real.',
        importance: 4,
        visibility: 1,
        vibration: true,
        sound: 'default'
      });
    } catch (e) {
      console.warn('[RivalNotificationService] Channel creation fallback:', e);
    }
  }

  /**
   * Trigger in-app visual notification
   */
  public static notifyInAppAction(rival: RivalLevel, actionText: string) {
    toast(`⚔️ ${rival.name}: "${actionText}"`, {
      icon: rival.avatar,
      duration: 5000,
      style: {
        background: '#18181b',
        color: '#ffffff',
        border: `1px solid ${rival.color}80`,
        borderRadius: '16px',
        fontWeight: 'bold',
        fontSize: '13px'
      }
    });
  }

  /**
   * Schedule dynamic rival notifications for today's active window
   */
  public static async scheduleRivalWorkdayEvents(rival: RivalLevel) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      await this.initChannel();

      // Clear previous rival notifications (IDs 9000 - 9010)
      const pending = await LocalNotifications.getPending();
      const rivalPending = pending.notifications.filter(n => n.id >= 9000 && n.id <= 9010);
      if (rivalPending.length > 0) {
        await LocalNotifications.cancel({ notifications: rivalPending.map(n => ({ id: n.id })) });
      }

      const now = new Date();
      const startToday = new Date(now);
      const startHour = rival.workStartHour !== undefined ? rival.workStartHour : 8;
      startToday.setHours(startHour, rival.workStartMinute || 0, 0, 0);

      const endToday = new Date(now);
      const endHour = rival.workEndHour !== undefined ? rival.workEndHour : 17;
      endToday.setHours(endHour, rival.workEndMinute || 0, 0, 0);

      const notificationsToSchedule = [];

      // 1. Workday Start Notification
      if (startToday > now) {
        notificationsToSchedule.push({
          id: 9000,
          title: `⚔️ ¡Tu rival ${rival.name} ha iniciado su jornada!`,
          body: `Trabajará hasta las ${rival.workEndHour}:00. ¡Ponte en marcha y no te quedes atrás!`,
          channelId: this.CHANNEL_ID,
          schedule: { at: startToday }
        });
      }

      // 2. Midday Rival Action Notification
      const midTime = new Date(startToday.getTime() + (endToday.getTime() - startToday.getTime()) / 2);
      if (midTime > now) {
        notificationsToSchedule.push({
          id: 9001,
          title: `🔥 ${rival.name} avanza a paso firme`,
          body: `Ha completado la mitad de sus objetivos del día. "${rival.quote}"`,
          channelId: this.CHANNEL_ID,
          schedule: { at: midTime }
        });
      }

      // 3. Workday End Notification
      if (endToday > now) {
        notificationsToSchedule.push({
          id: 9002,
          title: `🏁 ${rival.name} ha terminado su jornada de hoy`,
          body: `El oponente ha cerrado su día. ¡Tienes hasta las 11:59 PM para superarlo!`,
          channelId: this.CHANNEL_ID,
          schedule: { at: endToday }
        });
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`[RivalNotificationService] Scheduled ${notificationsToSchedule.length} notifications for ${rival.name}`);
      }
    } catch (e) {
      console.warn('[RivalNotificationService] Failed to schedule local notifications:', e);
    }
  }
}
