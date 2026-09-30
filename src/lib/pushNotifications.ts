import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useStore } from '../store/useStore';

export class PushNotificationService {
  static async initialize() {
    try {
      // Request permission
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();

        // Get token
        PushNotifications.addListener('registration', (token: Token) => {
          console.log('Push registration success, token: ' + token.value);
          this.sendTokenToServer(token.value);
        });

        // Handle registration error
        PushNotifications.addListener('registrationError', (err: any) => {
          console.error('Registration error: ', err.error);
        });

        // Handle received push notifications
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('Push notification received: ', notification);
          this.handleNotificationReceived(notification);
        });

        // Handle push notification actions
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
          console.log('Push notification action performed: ', notification);
          this.handleNotificationActionPerformed(notification);
        });
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  static async sendTokenToServer(token: string) {
    try {
      const { token: authToken } = useStore.getState();
      if (!authToken) return;

      await fetch('http://localhost:5000/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken: token, platform: this.getPlatform() }),
      });
    } catch (error) {
      console.error('Error sending push token to server:', error);
    }
  }

  static async handleNotificationReceived(notification: PushNotificationSchema) {
    // Show local notification when app is in foreground
    const data = notification.data;
    await LocalNotifications.schedule({
      notifications: [
        {
          title: notification.title || 'Solo Quest',
          body: notification.body || '',
          id: Date.now(),
          schedule: { at: new Date() },
          sound: 'default',
          attachments: notification.data?.attachments,
          actionTypeId: '',
          extra: data,
        },
      ],
    });
  }

  static async handleNotificationActionPerformed(notification: ActionPerformed) {
    const data = notification.notification.data;
    
    // Handle different notification types
    switch (data?.type) {
      case 'QUEST_COMPLETED':
        // Navigate to quest log
        window.location.href = '/quests';
        break;
      case 'LEVEL_UP':
        // Navigate to profile
        window.location.href = '/profile';
        break;
      case 'RAID_UPDATE':
        // Navigate to social page
        window.location.href = '/social';
        break;
      default:
        // Default behavior
        break;
    }
  }

  static async scheduleLocalNotification(options: {
    title: string;
    body: string;
    schedule?: { at: Date };
    id?: number;
  }) {
    try {
      await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [
          {
            title: options.title,
            body: options.body,
            id: options.id || Date.now(),
            schedule: options.schedule || { at: new Date(Date.now() + 1000) },
            sound: 'default',
          },
        ],
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  static async cancelAllLocalNotifications() {
    try {
      const delivered = await LocalNotifications.getDeliveredNotifications();
      await LocalNotifications.cancel({
        notifications: delivered.notifications.map((n) => ({ id: n.id })),
      });
    } catch (error) {
      console.error('Error canceling local notifications:', error);
    }
  }

  static getPlatform(): string {
    const userAgent = navigator.userAgent;
    if (/android/i.test(userAgent)) return 'android';
    if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
    return 'web';
  }

  static async scheduleQuestReminder(questTitle: string, deadline: Date) {
    const reminderTime = new Date(deadline.getTime() - 60 * 60 * 1000); // 1 hour before
    if (reminderTime > new Date()) {
      await this.scheduleLocalNotification({
        title: 'Quest Reminder',
        body: `Your quest "${questTitle}" is due in 1 hour!`,
        schedule: { at: reminderTime },
      });
    }
  }

  static async scheduleDailyDungeonReminder() {
    const now = new Date();
    const reminderTime = new Date(now);
    reminderTime.setHours(9, 0, 0, 0); // 9 AM
    
    if (reminderTime > now) {
      await this.scheduleLocalNotification({
        title: 'Daily Dungeon',
        body: 'Complete your daily dungeon to maintain your streak!',
        schedule: { at: reminderTime },
      });
    }
  }
}