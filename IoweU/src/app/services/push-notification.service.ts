import {inject, Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Firestore, setDoc, doc, getDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private firestore = inject(Firestore);
  private cloudFunctionUrl = 'https://us-central1-ioweu-a74cd.cloudfunctions.net/sendPushNotification';

  // Observable für eingehende Nachrichten
  private messageSource = new BehaviorSubject<any>(null);
  currentMessage = this.messageSource.asObservable();

  constructor(private http: HttpClient,
              private messaging: Messaging,
              private authService: AuthService) {}

  // Initialisiert Push-Funktionalitäten: Token holen & Listener starten
  async init() {
    await this.requestPermissionAndGetToken();
    this.listenToMessages();
  }

  // Methode, um eine Push-Nachricht aktiv zu senden via Cloud Function
  sendPushNotification(toFcmToken: string, title: string, body: string): Promise<any> {
    const payload = { token: toFcmToken, title, body };
    return this.http.post(this.cloudFunctionUrl, payload).toPromise();
  }



  private async requestPermissionAndGetToken() {
    try {
      await this.authService.waitForUser();

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: environment.firebase.vapidKey,
        });
        console.log('FCM Token:', token);
        localStorage.setItem('fcm_token', token);

        // Token im AuthService speichern
        await this.authService.saveFcmToken(token);
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission or getting token', error);
    }
  }

  private listenToMessages() {
    onMessage(this.messaging, (payload) => {
      console.log('Message received: ', payload);
      alert(`Push Nachricht: ${payload.notification?.title ?? 'Neue Nachricht'}`);
    });
  }

  async getFcmTokenByUid(uid: string): Promise<string | null> {
    try {
      const userDocRef = doc(this.firestore, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        return !(userData) || userData['fcmToken'] || null;
        if (userData && userData['fcmToken']) {
          console.log('FCM Token für Benutzer:', uid, userData['fcmToken']);
          return userData['fcmToken'];
        } else {
          return null;
        }
      } else {
        console.error('Benutzer nicht gefunden:', uid);
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des FCM-Tokens:', error);
      return null;
    }
  }

}
