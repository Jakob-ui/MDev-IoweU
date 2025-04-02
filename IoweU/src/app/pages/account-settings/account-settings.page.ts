import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonInput,
  IonAlert,
} from '@ionic/angular/standalone';
import { OverlayEventDetail } from '@ionic/core/components';
import { Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.scss'],
  standalone: true,
  imports: [
    IonAlert,
    IonIcon,
    IonButton,
    IonLabel,
    IonItem,
    IonContent,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonInput,
  ],
})
export class AccountSettingsPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);

  iosIcons: boolean = false;
  user: string | null = "";
  displayName: string | null = null;

  name: string = '';
  email: string = '';
  color: string = '#ffffff'; // Standardfarbe (weiß), falls keine Farbe gespeichert ist
  profileImage: string | ArrayBuffer | null = null; // Profilbild

  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  showPasswordFields: boolean = false;
  showDeleteAlert: boolean = false;

  constructor() {}

  ngOnInit() {
    this.loadUserData();
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
  }

  async loadUserData() {
    try {
      const userData = await this.authService.getUserData();
      this.name = userData.name;
      this.email = userData.email;
      this.color = userData.color; // Farbe direkt laden
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
    }
  }

  togglePasswordChange() {
    this.showPasswordFields = !this.showPasswordFields;
  }

  changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      alert('Die Passwörter stimmen nicht überein.');
      return;
    }
    alert('Passwort erfolgreich geändert!');
  }

  public alertButtons = [
    {
      text: 'Abbrechen',
      role: 'cancel',
      handler: () => console.log('Löschung abgebrochen'),
    },
    {
      text: 'Löschen',
      role: 'destructive',
      handler: () => this.deleteAccount(),
    },
  ];

  setResult(event: CustomEvent<OverlayEventDetail>) {
    console.log(`Dialog geschlossen mit Rolle: ${event.detail.role}`);
  }

  deleteAccount() {
    console.log('Konto wird gelöscht...');
    // Hier kannst du den Löschprozess starten
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back(); // Navigiert zur letzten Seite
  }

  
}
