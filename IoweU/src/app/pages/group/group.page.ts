import {Component, inject, OnInit} from '@angular/core';
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
  IonCardContent, IonIcon,
} from '@ionic/angular/standalone';
import {Router, RouterModule} from '@angular/router';
import {AuthService} from "../../services/auth.service";

@Component({
  selector: 'app-group',
  templateUrl: './group.page.html',
  styleUrls: ['./group.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardTitle,
    IonCardSubtitle,
    RouterModule,
    IonIcon,
  ],
})
export class GroupPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);

  iosIcons: boolean = false;

  user: string | null ="";
  displayName: string | null = null;

  groupImage: string = ''; // Standardwert für das Gruppenbild
  balance: number = -20; // Beispielwert für das Guthaben

  totalCost: number = 120.50; // Beispielhafte Gesamtkosten
  currentMonth: string = 'März 2025';

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter']; // Beispielhafte Einkaufsliste

  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher']; // Beispielhafte Liste

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
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
    this.navCtrl.back(); // Navigiert zur letzten Seite
  }

  constructor() {

  }
}
