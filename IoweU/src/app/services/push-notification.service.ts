import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private functions = inject(Functions);

  async sendPushNotification(toUserId: string | undefined, title: string, body: string) {
    const sendNotification = httpsCallable(this.functions, 'sendPushNotification');
    return await sendNotification({ toUserId, title, body });
  }
}
