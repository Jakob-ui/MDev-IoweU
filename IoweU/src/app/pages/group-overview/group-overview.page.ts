import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonIcon,
  IonCard,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/angular/standalone';
import { NavController, Platform } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-group-overview',
  templateUrl: './group-overview.page.html',
  styleUrls: ['./group-overview.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    RouterModule,
    IonIcon,
    IonCard,
    IonCardSubtitle,
    IonCardTitle,
  ],
})
export class GroupOverviewPage implements OnInit {
  // 🔹 Services injizieren
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);

  // 🔹 Variablen für die Seite
  user: string | null = '';
  displayName: string | null = null;
  groupName: string = '';
  iosIcons: boolean = false;

  groups: { name: string; myBalance: number }[] = [
    { name: 'Unsere WG', myBalance: 200 },
    { name: 'Reise nach Rom', myBalance: -50 },
    { name: 'Freunde', myBalance: -20 },
  ];

  constructor() {}

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

  navigateToGroup(groupName: string) {
    sessionStorage.setItem('groupname', groupName);
    this.router.navigate(['/group']);
  }

  goBack() {
    this.navCtrl.back();
  }
}
