import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';
import { PushNotificationService } from './services/push-notification.service';
import {Platform} from "@ionic/angular";

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
    private platform: Platform,
  ) {
    this.platform.ready().then(() => {
      this.pushNotificationService.initPush();
    }).catch(e => {
      console.log('error fcm: ', e);
    });
  }

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

  }


}
