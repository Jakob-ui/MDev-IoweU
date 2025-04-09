import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, CommonModule],
})
export class AppComponent implements OnInit {
  loading: boolean = false;
  videoSource: string = ''; // Dynamische Videoquelle

  constructor(private LoadingService: LoadingService) {}

  isDarkMode(): boolean {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  ngOnInit() {
    // Setze die Videoquelle basierend auf dem Modus
    this.videoSource = this.isDarkMode()
      ? 'assets/videos/loadingDarkMode.mp4'
      : 'assets/videos/loadingLightMode.mp4';

    // Abonniere den Zustand des Lade-Overlays
    this.LoadingService.loading$.subscribe((isLoading) => {
      this.loading = isLoading;
    });
  }
}