import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-group',
  templateUrl: './group.page.html',
  styleUrls: ['./group.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonCard,
    IonCardTitle,
    IonCardSubtitle,
    RouterModule,
    IonIcon,
    IonSpinner,
  ],
})
export class GroupPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);

  loading: boolean = true;
  timeout: any;

  iosIcons: boolean = false;

  user: string | null = '';
  displayName: string | null = null;

  groupImage: string = ''; // Standardwert für das Gruppenbild
  balance: number = -20; // Beispielwert für das Guthaben

  totalCost: number = 120.5; // Beispielhafte Gesamtkosten
  currentMonth: string = 'März 2025';

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter']; // Beispielhafte Einkaufsliste

  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher']; // Beispielhafte Liste

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    this.timeout = setTimeout(() => {
      this.loading = false;
    }, 3000);

    // Simuliertes Laden von Daten
    this.loadData();
  }

  async logout() {
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  constructor() {}

  async loadData() {
    try {
      // Simuliertes Datenladen (z. B. API-Aufruf)
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.loading = false;
      clearTimeout(this.timeout);
    } catch (error) {
      console.error('Fehler beim Laden der Daten', error);
      this.loading = false;
    }
  }
}
