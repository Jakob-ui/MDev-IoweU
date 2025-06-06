import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import {Firestore, doc, getDoc, setDoc, arrayUnion, collection, getDocs} from '@angular/fire/firestore';
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
messaging: Messaging | null = null;
  constructor(
    private http: HttpClient,
  ) {
  if (Capacitor.getPlatform() !== 'ios') {
    this.messaging = inject(Messaging);
  }
  }

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
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      const token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey,
      });

      if (!token) return;

      localStorage.setItem('fcm_token', token);
      await this.migrateTokenOwnership(token, user.uid, 'web');


      this.token = token;
      this.listenToMessages();
    } catch (error: any) {
      if (error?.code === 'messaging/unsupported-browser') {
        return;
      }
      console.error('Web Push permission/token error:', error);
    }
  }


  // Native Push initialisieren (Android/iOS)
  private async initNativePush(user: Users) {
    try {
      // Android 13+ Notification Permission
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

        // Plattform ermitteln und validieren
        let platform = Capacitor.getPlatform();
        const allowedPlatforms = ['web', 'android', 'ios'] as const;
        if (!allowedPlatforms.includes(platform as any)) {
          platform = 'web';
        }


        await this.migrateTokenOwnership(token.value, user.uid, platform as 'web' | 'android' | 'ios');

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
      let tokens: { token: string; platform: string }[] = [];

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        tokens = data?.['fcmTokens'] ?? [];
      }

      const tokenExists = tokens.some(t => t.token === token);

      if (!tokenExists) {
        await setDoc(
          userDocRef,
          {
            fcmTokens: arrayUnion({ token, platform }),
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

  private async checkIfTokenExists(uid: string, token: string): Promise<boolean> {
    try {
      const userDocRef = doc(this.firestore, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const tokens = data?.['fcmTokens'] ?? [];

        const exists = tokens.some((t: { token: string; platform: string }) => t.token === token);
        console.log(`[checkIfTokenExists] UID: ${uid}, Token: ${token}, Bereits vorhanden:`, exists);
        return exists;
      }

      console.log(`[checkIfTokenExists] Kein UserDoc gefunden für UID: ${uid}`);
      return false;
    } catch (error) {
      console.error('Fehler beim Prüfen des Tokens:', error);
      return false;
    }
  }


  async migrateTokenOwnership(token: string, newUid: string, platform: 'web' | 'android' | 'ios') {
    // 1. Durchsuche alle User, ob jemand den Token schon hat
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);

    for (const docSnap of snapshot.docs) {
      const uid = docSnap.id;
      const data = docSnap.data();
      const tokens = data?.['fcmTokens'] ?? [];

      const tokenIndex = tokens.findIndex((t: any) => t.token === token);

      if (tokenIndex !== -1 && uid !== newUid) {
        // 2. Token bei altem User entfernen
        const updatedTokens = tokens.filter((t: any) => t.token !== token);
        await setDoc(doc(this.firestore, 'users', uid), { fcmTokens: updatedTokens }, { merge: true });
        console.log(`Token bei altem User (${uid}) entfernt`);
      }
    }

    // 3. Token beim neuen User hinzufügen
    await this.saveFcmToken({ uid: newUid } as Users, token, platform);
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
          return userData['fcmTokens'].map((entry: any) => entry.token);
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
