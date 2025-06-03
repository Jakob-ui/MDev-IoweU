import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Firestore, doc, getDoc, setDoc, arrayUnion } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { Users } from './objects/Users';

// Capacitor Push Notifications
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private firestore = inject(Firestore);
  private cloudFunctionUrl = 'https://sendpushnotification-4nzswiab5a-ew.a.run.app';

  private messageSource = new BehaviorSubject<any>(null);
  currentMessage = this.messageSource.asObservable();

  token: string | null = null;

  constructor(
    private http: HttpClient,
    private messaging: Messaging,
  ) {}

  async init(user: Users): Promise<void> {
    if (this.isNativeApp()) {
      await this.initNativePush(user);
    } else {
      await this.initWebPush(user);
    }
  }


  isNativeApp(): boolean {
    if (Capacitor.getPlatform() === 'ios') {
      return true;
    }
    return Capacitor.isNativePlatform();
  }

  isWebPushSupported(): boolean {
  // Verhindere Web Push im iOS/Android WebView explizit
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    window.isSecureContext &&
    !Capacitor.isNativePlatform() &&
    !/iPad|iPhone|iPod|Android/.test(navigator.userAgent)
  );
}

private async initWebPush(user: Users) {
  try {
    if (!this.messaging) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey,
      });
      if (this.token) {
        localStorage.setItem('fcm_token', this.token);
        await this.saveFcmToken(user, this.token, 'web');
      }
      this.listenToMessages();
    } else {
      console.log('Notification permission denied');
    }
  } catch (error: any) {
    if (error?.code === 'messaging/unsupported-browser') {
      // Fehler unterdrücken, da Web Push im WebView nicht unterstützt wird
      return;
    }
    console.error('Web Push permission/token error:', error);
  }
}

  // Native Push initialisieren (Android/iOS)
  private async initNativePush(user: Users) {
    try {
      // Android 13+ Permission abfragen
      if (Capacitor.getPlatform() === 'android') {
        const permissionStatus = await PushNotifications.requestPermissions();
        if (permissionStatus.receive !== 'granted') {
          console.warn('Notification permission not granted on Android');
          return;
        }
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Native Push Token:', token.value);
        localStorage.setItem('fcm_token', token.value);

        // Plattform bestimmen (android / ios)
        let platform = Capacitor.getPlatform();

        // Nur erlaubte Plattformen akzeptieren, sonst fallback auf 'web'
        const allowedPlatforms = ['web', 'android', 'ios'] as const;
        if (!allowedPlatforms.includes(platform as any)) {
          platform = 'web';
        }

        await this.saveFcmToken(user, token.value, platform as 'web' | 'android' | 'ios');
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Native Push Registration Error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Native Push Notification received:', notification);
        this.messageSource.next(notification);
        alert(`Push Nachricht: ${notification.title ?? 'Neue Nachricht'}`);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push Notification Action performed:', action);
      });
    } catch (error) {
      console.error('Native Push init error:', error);
    }
  }

  async saveFcmToken(user: Users, token: string, platform: 'web' | 'android' | 'ios' = 'web') {
    const uid = user?.uid;
    if (!uid || !token) return;

    const userDocRef = doc(this.firestore, 'users', uid);

    try {
      const userDocSnap = await getDoc(userDocRef);
      let tokens: string[] = [];
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        tokens = data?.['fcmTokens'] ?? [];
      }

      if (!tokens.includes(token)) {
        await setDoc(
          userDocRef,
          {
            fcmTokens: arrayUnion(token),
          },
          { merge: true }
        );
        console.log(`FCM Token gespeichert (${platform}):`, token);
      } else {
        console.log(`Token (${platform}) bereits vorhanden:`, token);
      }
    } catch (error) {
      console.error('Fehler beim Speichern des FCM-Tokens:', error);
    }
  }


  listenToMessages() {
    if (!this.messaging) return;
    onMessage(this.messaging, (payload) => {
      console.log('Web Message received: ', payload);
      this.messageSource.next(payload);
    });
  }

  // Sendet an einen einzelnen FCM Token
  sendPushNotification(toFcmToken: string, title: string, body: string): Promise<any> {
    const payload = { toFcmToken, title, body };
    return this.http.post(this.cloudFunctionUrl, payload).toPromise();
  }

  // Holt alle FCM Tokens eines Users (Array)
  async getFcmTokensByUid(uid: string): Promise<string[]> {
    try {
      const userDocRef = doc(this.firestore, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData && Array.isArray(userData['fcmTokens'])) {
          return userData['fcmTokens'];
        }
      }
      return [];
    } catch (error) {
      console.error('Fehler beim Abrufen der FCM-Tokens:', error);
      return [];
    }
  }

  // Sendet Push an alle Geräte eines Users
  async sendToUser(uid: string, title: string, body: string) {
    if (Capacitor.getPlatform() === 'ios') {
      return;
    }
    const tokens = await this.getFcmTokensByUid(uid);
    if (!tokens.length) {
      console.warn('Keine Tokens für Benutzer:', uid);
      return;
    }

    for (const token of tokens) {
      try {
        await this.sendPushNotification(token, title, body);
        console.log(`Push gesendet an Token: ${token}`);
      } catch (error) {
        console.error(`Fehler beim Senden an Token ${token}:`, error);
      }
    }
  }
}
