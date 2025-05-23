import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, CommonModule],
})
export class AppComponent implements OnInit {
  loading: boolean = false;
  littleloading: boolean = false;
  videoSource: string = '';

  constructor(
    private loadingService: LoadingService,
    private pushNotificationService: PushNotificationService
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
   // Push Notifications initialisieren
    await this.pushNotificationService.init();

    // Auf eingehende Push-Nachrichten reagieren
    if (this.pushNotificationService.currentMessage) {
      this.pushNotificationService.currentMessage.subscribe((payload: { notification: { title: any; }; }) => {
        if (payload) {
          alert(`Push Nachricht: ${payload.notification?.title ?? 'Neue Nachricht'}`);
        }
      });
    }
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

 
}
