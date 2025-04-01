import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common'; // Hier importieren
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
  ],
})
export class GroupPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  user: string | null ="";
  displayName: string | null = null;

  groupImage: string = ''; // Standardwert für das Gruppenbild
  balance: number = -20; // Beispielwert für das Guthaben

  totalCost: number = 120.50; // Beispielhafte Gesamtkosten
  currentMonth: string = 'März 2025';

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter']; // Beispielhafte Einkaufsliste

  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher']; // Beispielhafte Liste

  async logout() {
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  constructor() {}
}
