import { LoadingService } from './services/loading.service';
import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common'; // Importiere CommonModule

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, CommonModule], // Füge CommonModule hier hinzu
})
export class AppComponent {
  loading: boolean = false;

  constructor(private LoadingService: LoadingService) {
    // Abonniere den Zustand des Lade-Overlays
    this.LoadingService.loading$.subscribe((isLoading) => {
      this.loading = isLoading;
    });
  }
}