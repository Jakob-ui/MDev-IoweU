import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, CommonModule],
  standalone: true
})
export class AppComponent implements OnInit {
  loading: boolean = false;
  littleloading: boolean = false;
  videoSource: string = '';

  constructor(
    private loadingService: LoadingService,
    private messaging: Messaging,
    private authService: AuthService
  ) {}

  isDarkMode(): boolean {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  async ngOnInit() {
    this.videoSource = this.isDarkMode()
      ? 'assets/videos/loadingDarkMode.gif'
      : 'assets/videos/loadingLightMode.gif';

    this.loadingService.loading$.subscribe((isLoading) => {
      this.loading = isLoading;
    });

    this.loadingService.littleLoading$.subscribe((isLittleLoading) => {
      this.littleloading = isLittleLoading;
    });

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        this.videoSource = event.matches
          ? 'assets/gifs/loadingDarkMode.gif'
          : 'assets/gifs/loadingLightMode.gif';
      });

    await this.registerServiceWorker();
    await this.requestPermissionAndGetToken();
    this.listenToMessages();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
        console.log('Service Worker registriert:', registration);
      } catch (err) {
        console.error('Fehler bei der Registrierung des Service Workers:', err);
      }
    } else {
      console.warn('Service Worker werden von diesem Browser nicht unterstützt.');
    }
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
