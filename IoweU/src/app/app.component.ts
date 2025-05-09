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
  littleloading: boolean = false;
  videoSource: string = ''; // Dynamische Videoquelle

  constructor(private LoadingService: LoadingService) {}

  isDarkMode(): boolean {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  ngOnInit() {
    // Setze die GIF-Quelle basierend auf dem Modus
    this.videoSource = this.isDarkMode()
      ? 'assets/videos/loadingDarkMode.gif'
      : 'assets/videos/loadingLightMode.gif';

    // Abonniere den Zustand des Lade-Overlays
    this.LoadingService.loading$.subscribe((isLoading) => {
      this.loading = isLoading;
    });

    // Abonniere den Zustand des kleinen Lade-Overlays
    this.LoadingService.littleLoading$.subscribe((isLittleLoading) => {
      this.littleloading = isLittleLoading;
    });

    // Überwache Änderungen des Farbschemas
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        this.videoSource = event.matches
          ? 'assets/gifs/loadingDarkMode.gif'
          : 'assets/gifs/loadingLightMode.gif';
      });
  }
}