import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';
import { PushNotificationService } from './services/push-notification.service';
import { NetworkService } from './services/network.service';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Capacitor } from '@capacitor/core';
// @ts-ignore
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

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
    private pushNotificationService: PushNotificationService,
    private networkService: NetworkService,
    private router: Router,
    private authService: AuthService
  ) {
    console.log('App startet!');
    this.networkService.isOnline$.subscribe((online) => {
      if (!online) {
        this.router.navigate(['/no-connection']);
      }
    });

    // Lade-Overlay ausblenden, wenn auf Login-Seite navigiert wird
    this.router.events.subscribe((event: any) => {
      if (event?.url === '/login' || event?.urlAfterRedirects === '/login') {
        this.loadingService.hide();
      }
    });
  }

  isDarkMode(): boolean {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  async ngOnInit() {
    this.loadingService.show(); // Lade-Overlay anzeigen

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

    if (!this.pushNotificationService.isNativeApp()) {
  await this.registerServiceWorker();
}

    // Push Notifications initialisieren

    await this.authService.waitForUser();
    if (!this.authService.currentUser) {
      console.warn('User not authenticated, skipping push notification initialization');
      // Splashscreen ausblenden, falls verwendet
      if (Capacitor.isNativePlatform()) {
        Keyboard.setResizeMode({ mode: KeyboardResize.Body });
        SplashScreen.hide();
      }
      this.loading = false;
      this.loadingService.hide(); // <-- Stelle sicher, dass das Overlay ausgeblendet wird
      return;
    } else {
      //await this.pushNotificationService.init(this.authService.currentUser);
    }

    if(Capacitor.getPlatform() === 'ios') {
    // Auf eingehende Push-Nachrichten reagieren
    if (this.pushNotificationService.currentMessage) {
      this.pushNotificationService.currentMessage.subscribe((payload: { notification: { title: any; }; }) => {
        if (payload) {
          alert(`Push Nachricht: ${payload.notification?.title ?? 'Neue Nachricht'}`);
        }
      });
    }
    }

    // Splashscreen ausblenden, falls verwendet
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide();
    }
    this.loading = false;
    this.loadingService.hide(); // Lade-Overlay ausblenden nach Abschluss der Initialisierung
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

  // Beispiel: Logout-Methode ergänzen oder anpassen
  async logout() {
    this.loadingService.show();
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
      this.loadingService.hide(); // <-- Overlay nach Navigation ausblenden
    } finally {
      this.loadingService.hide();
    }
  }

}
