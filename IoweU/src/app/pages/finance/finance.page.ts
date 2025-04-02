import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonList,
  IonBadge,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent, IonIcon,
} from '@ionic/angular/standalone';
import {Router, RouterModule} from '@angular/router';
import {AuthService} from "../../services/auth.service";
import {NavController, Platform} from "@ionic/angular";

@Component({
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonList,
    IonBadge,
    IonCard,
    RouterModule,
    IonIcon,
  ],
})
export class FinancePage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);

  iosIcons: boolean = false;

  user: string | null ="";
  displayName: string | null = null;

  balance: number = +200;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers = [
    { name: 'Livia', amount: 460 },
    { name: 'Michaela', amount: -150 },
    { name: 'Jakob', amount: -50 },
    { name: 'Sophie', amount: -10 },
    { name: 'Mateusz', amount: 0 },
  ];

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    const userColor = sessionStorage.getItem('usercolor');
    document.documentElement.style.setProperty('--user-color', userColor);
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


  constructor() {}
}
