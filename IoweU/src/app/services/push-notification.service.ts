import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';

// Import Capacitor Push Notifications
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private firestore = inject(Firestore);
  private cloudFunctionUrl = 'https://sendpushnotification-4nzswiab5a-uc.a.run.app';

  private messageSource = new BehaviorSubject<any>(null);
  currentMessage = this.messageSource.asObservable();

  constructor(private http: HttpClient,
              private messaging: Messaging,
              private authService: AuthService) {}

  async init() {
    await this.authService.waitForUser();

    if (this.isNativeApp()) {
      await this.initNativePush();
    } else {
      await this.initWebPush();
    }
  }

  private isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Web Push initialisieren
  private async initWebPush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: environment.firebase.vapidKey,
        });
        console.log('Web FCM Token:', token);
        if (token) {
          localStorage.setItem('fcm_token', token);
          await this.authService.saveFcmToken(token);
        }
        this.listenToMessages();
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Web Push permission/token error:', error);
    }
  }

  // Native Push initialisieren (Android/iOS)
  private async initNativePush() {
    try {
      // Optional: manuelle Prüfung für Android 13+ (API 33)
      if (Capacitor.getPlatform() === 'android') {
        const permissionStatus = await PushNotifications.requestPermissions();
        if (permissionStatus.receive !== 'granted') {
          console.warn('Notification permission not granted on Android');
          return;
        }
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token) => {
        console.log('Native Push Token:', token.value);
        localStorage.setItem('fcm_token', token.value);
        await this.authService.saveFcmToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Native Push Registration Error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Native Push Notification received:', notification);
        this.messageSource.next(notification);
        alert(`Push Nachricht: ${notification.title ?? 'Neue Nachricht'}`);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push Notification Action performed:', action);
      });

    } catch (error) {
      console.error('Native Push init error:', error);
    }
  }

  listenToMessages() {
    onMessage(this.messaging, (payload) => {
      console.log('Web Message received: ', payload);
      alert(`Push Nachricht: ${payload.notification?.title ?? 'Neue Nachricht'}`);
      this.messageSource.next(payload);
    });
  }

  sendPushNotification(toFcmToken: string, title: string, body: string): Promise<any> {
    const payload = { toFcmToken, title, body };
    return this.http.post(this.cloudFunctionUrl, payload).toPromise();
  }

  async getFcmTokenByUid(uid: string): Promise<string | null> {
    try {
      const userDocRef = doc(this.firestore, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData && userData['fcmToken']) {
          console.log('FCM Token für Benutzer:', uid, userData['fcmToken']);
          return userData['fcmToken'];
        }
      } else {
        console.error('Benutzer nicht gefunden:', uid);
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Abrufen des FCM-Tokens:', error);
      return null;
    }
  }
}
