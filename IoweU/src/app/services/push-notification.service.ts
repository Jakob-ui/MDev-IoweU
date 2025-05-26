import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})

export class PushNotificationService {
  private cloudFunctionUrl = 'https://us-central1-ioweu-a74cd.cloudfunctions.net/sendPushNotification';

  constructor(private http: HttpClient) {}

  sendPushNotification(toUserId: string, title: string, body: string): Promise<any> {
    const payload = { toUserId, title, body };
    return this.http.post(this.cloudFunctionUrl, payload).toPromise();
  }
}
