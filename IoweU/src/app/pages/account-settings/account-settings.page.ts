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
import { RouterModule } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { AccountService } from 'src/app/services/account.service';
import { UserService } from 'src/app/services/user.service';

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
    RouterModule,
  ],
})
export class AccountSettingsPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private acc = inject(AccountService);
  private userService = inject(UserService);

  iosIcons: boolean = false;

  displayName: string | null = null;

  name: string = '';
  newname: string = '';
  email: string = '';
  color: string = '#ffffff';
  profileImage: string | ArrayBuffer | null = null;
  changeMessage: string = '';
  userEditing: boolean = false;

  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  showPasswordFields: boolean = false;
  showDeleteAlert: boolean = false;
  auth: any;
  lastedited: string = '';

  constructor() {}

  ngOnInit() {
    this.loadUserData();
    this.iosIcons = this.platform.is('ios');
    this.newname = this.name;
  }

  async loadUserData() {
    try {
      this.name = sessionStorage.getItem('username') || '';
      const userColor = sessionStorage.getItem('usercolor');
      this.color = userColor || '';
      this.email = sessionStorage.getItem('email') || '';
      const uid = this.authService.currentUser?.uid;

      if (uid) {
        this.lastedited = await this.userService.getUserthingsByUid(
          uid,
          'lastedited'
        );
        sessionStorage.setItem('lastedited', this.lastedited);
      }
      if (userColor) {
        document.documentElement.style.setProperty('--user-color', userColor);
      }

      console.log('Benutzerdaten erfolgreich geladen.');
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
    }
  }

  proofTime() {
    const lastedited = sessionStorage.getItem('lastedited');
    if (!lastedited) {
      return true;
    }

    const lastEditDate = new Date(lastedited);
    const currentDate = new Date();

    const differenceInMs = currentDate.getTime() - lastEditDate.getTime();

    return differenceInMs > 5 * 60 * 1000;
  }

  public alertButtons = [
    {
      text: 'Abbrechen',
      role: 'cancel',
      handler: () => {
        console.log('Löschung abgebrochen');
      },
    },
    {
      text: 'Löschen',
      role: 'destructive',
      handler: () => {
        this.deleteAccount();
      },
    },
  ];
  public alertInputs = [
    {
      placeholder: 'E-Mail',
      type: 'email',
    },
    {
      placeholder: 'Passwort',
      type: 'password',
    },
  ];

  public saveAlertButtons = [
    {
      text: 'Abbrechen',
      role: 'cancel',
      handler: () => {
        console.log('Speichern abgebrochen');
      },
    },
    {
      text: 'Speichern',
      role: 'confirm',
      handler: () => {
        this.saveChanges(); // Ruft die Methode auf, um die Änderungen zu speichern
      },
    },
  ];

  setResult(event: CustomEvent<OverlayEventDetail>) {
    console.log(`Dialog geschlossen mit Rolle: ${event.detail.role}`);
  }

  async deleteAccount() {
    console.log('Konto wird gelöscht...');
    try {
      await this.acc.userdelete();
      this.router.navigate(['home']);
    } catch (e) {
      console.log('error: ' + e);
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['login']);
    } catch (e) {
      console.log(e);
    }
  }

  edit(message: string) {
    this.userEditing = true;
    this.changeMessage = message;
    this.newname = '';
    console.log(this.userEditing);
  }
  cancel() {
    this.userEditing = false;
    this.newname = sessionStorage.getItem('username') || '';
  }
  confirm() {
    this.userEditing = false;
  }

  goBack() {
    this.navCtrl.back();
  }

  async saveChanges() {
    try {
      if (!this.proofTime()) {
        console.warn(
          'Änderungen können nur alle 5 Minuten vorgenommen werden.'
        );
        return;
      }
      await this.acc.userupdate({
        name: this.newname,
        color: this.color,
        lastedited: new Date().toISOString(),
      });

      sessionStorage.setItem('username', this.newname);
      sessionStorage.setItem('usercolor', this.color);

      console.log('Änderungen erfolgreich gespeichert.');

      this.loadUserData();
    } catch (e) {
      console.error('Fehler beim Speichern der Änderungen:', e);
    }
  }
}
