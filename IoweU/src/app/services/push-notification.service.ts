import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
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

  sendPushNotification(toFcmToken: string, title: string, body: string): Promise<any> {
    const payload = { toFcmToken, title, body };
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


}
