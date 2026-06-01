import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { logger } from './logger';
import { config } from '../config/api';

let notificationsInitialized = false;
let listenersAttached = false;

/**
 * Initialize push notifications
 * Only initializes if running in native context and Firebase is configured
 */
export async function initializeNotifications(): Promise<void> {
  try {
    if (notificationsInitialized) {
      logger.log('Push notifications already initialized');
      return;
    }

    // Only initialize if running in native context (not web browser)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Check if PushNotifications plugin is available
    if (!PushNotifications) {
      logger.warn('PushNotifications plugin not available');
      return;
    }

    // Request permission
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      logger.warn('Push notification permission not granted');
      return;
    }

    try {
      if (!listenersAttached) {
        // Listen for registration
        PushNotifications.addListener('registration', (token) => {
          logger.log('Push registration success, token:', token.value);
        });

        // Listen for errors
        PushNotifications.addListener('registrationError', (error) => {
          logger.error('Push registration error:', error);
        });

        // Listen for push notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          logger.log('Push notification received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          logger.log('Push notification action performed:', notification);
        });

        listenersAttached = true;
      }

      await PushNotifications.register();

      notificationsInitialized = true;
    } catch (registerError: any) {
      logger.error('Push notification registration failed:', registerError);
      // Don't crash - just log and continue
    }

    if (config.onesignal.appId && typeof window !== 'undefined' && 'OneSignal' in window) {
      try {
        const OneSignal = (window as any).OneSignal;
        if (OneSignal && typeof OneSignal.init === 'function') {
          await OneSignal.init({
            appId: config.onesignal.appId,
            serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/onesignal/' },
          });
          logger.log('OneSignal initialized');
        }
      } catch (e) {
        logger.warn('OneSignal init failed (non-fatal):', e);
      }
    }
  } catch (error) {
    // Catch all errors and log them without crashing the app
    logger.error('Error initializing notifications (non-fatal):', error);
    // Don't re-throw - we want the app to continue even if notifications fail
  }
}

/**
 * Send local notification (for testing)
 */
export async function sendLocalNotification(title: string, body: string): Promise<void> {
  try {
    // Use Capacitor PushNotifications for local notifications
    // OneSignal integration can be added later via their SDK
    logger.log('Local notification:', { title, body });
    // In production, this would trigger via OneSignal API or Capacitor
  } catch (error) {
    logger.error('Error sending local notification:', error);
  }
}
