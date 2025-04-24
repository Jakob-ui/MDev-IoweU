import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonInput,
  IonAlert, IonToggle } from '@ionic/angular/standalone';
import { OverlayEventDetail } from '@ionic/core/components';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { AccountService } from 'src/app/services/account.service';
import { UserService } from 'src/app/services/user.service';
import { AlertController } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.scss'],
  standalone: true,
  imports: [
    IonToggle,
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
  private alertController = inject(AlertController);
  private loadingService = inject(LoadingService);
  iosIcons: boolean = false;

  displayName: string | null = null;

  name: string = '';
  newname: string = '';
  email: string = '';
  color: string = '#ffffff';
  profileImage: string | ArrayBuffer | null = null;
  changeMessage: string = '';
  userEditing: boolean = false;

  passwordInput: string = '';
  emailInput: string = '';
  isLoginVerified: boolean = false;

  originalName: string = '';
  originalColor: string = '';

  showPasswordFields: boolean = false;
  showDeleteAlert: boolean = false;
  lastedited: string = '';
  colorBlindMode: boolean = false;

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadingService.show();

    // Lade den gespeicherten Zustand des Farbmodus-Toggles
    this.colorBlindMode = localStorage.getItem('colorBlindMode') === 'true';
    this.applyColorBlindMode(this.colorBlindMode); // Wende den Modus an

    this.iosIcons = this.platform.is('ios');

    // Setze den aktuellen Namen direkt in das Eingabefeld
    this.newname = this.name = this.authService.currentUser?.username || '';

    this.authService.waitForUser;
    this.loadUserData().finally(() => {
      this.loadingService.hide();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.colorBlindMode = localStorage.getItem('colorBlindMode') === 'true';
      this.cdRef.detectChanges();
    });
  }

  async loadUserData() {
    this.loadingService.show();
    try {
      this.originalName = this.authService.currentUser?.username || '';
      this.color = this.authService.currentUser?.color || '';
      this.originalColor = this.color;

      if (this.authService.currentUser) {
        this.name = this.authService.currentUser.username;
        this.email = this.authService.currentUser.email;
        this.color = this.authService.currentUser.color;
        if (this.color) {
          document.documentElement.style.setProperty(
            '--user-color',
            this.color
          );
        }
        this.lastedited = this.authService.currentUser.username;
        console.log('Benutzerdaten erfolgreich geladen.');
      } else {
        console.log('User ist nicht eingeloggt');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  hasChanges(): boolean {
    return this.name !== this.originalName || this.color !== this.originalColor;
  }

  edit(message: string) {
    this.userEditing = true;
    this.changeMessage = message;
    this.newname = '';
    console.log(this.userEditing);
  }
  cancel() {
    this.userEditing = false;
    this.newname = localStorage.getItem('username') || '';
  }
  confirm() {
    this.userEditing = false;
  }

  goBack() {
    this.navCtrl.back();
  }

  proofTime(): boolean {
    const lastedited = localStorage.getItem('lastedited');
    if (!lastedited) {
      return true;
    }

    const lastEditDate = new Date(lastedited);
    const currentDate = new Date();

    const differenceInMs = currentDate.getTime() - lastEditDate.getTime();

    return differenceInMs > 5 * 60 * 1000;
  }
  async saveChanges() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      if (!this.proofTime()) {
        const alert = await this.alertController.create({
          header: 'Änderung nicht möglich',
          message:
            'Sie können den Benutzernamen nur alle 5 Minuten ändern. Bitte versuchen Sie es später erneut.',
          buttons: ['OK'],
        });

        await alert.present();
        return;
      }

      await this.acc.userupdate({
        username: this.newname,
        color: this.color,
        lastedited: new Date().toISOString(),
      });

      localStorage.setItem('username', this.newname);
      localStorage.setItem('usercolor', this.color);
      localStorage.setItem('lastedited', new Date().toISOString());

      console.log('Änderungen erfolgreich gespeichert.');

      this.loadUserData();
    } catch (e) {
      console.error('Fehler beim Speichern der Änderungen:', e);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  public loginAlertButtons = [
    {
      text: 'Abbrechen',
      role: 'cancel',
      handler: () => {
        console.log('Löschung abgebrochen');
      },
    },
    {
      text: 'Einloggen',
      role: 'confirm',
      handler: async (data: { email: string; password: string }) => {
        try {
          await this.authService.login(data.email, data.password);
          // Nach erfolgreichem Login das Bestätigungs-Alert anzeigen
          const confirmDelete = await this.alertController.create({
            header: 'Konto endgültig löschen',
            message:
              'Sind Sie sicher, dass Sie Ihr Konto unwiderruflich löschen möchten?',
            buttons: [
              {
                text: 'Abbrechen',
                role: 'cancel',
              },
              {
                text: 'Löschen',
                role: 'destructive',
                handler: () => this.deleteAccount(),
              },
            ],
          });
          await confirmDelete.present();
        } catch (e) {
          console.log('Login fehlgeschlagen:', e);
          // Optional: Fehlermeldung anzeigen
          const errorAlert = await this.alertController.create({
            header: 'Fehler',
            message:
              'Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.',
            buttons: ['OK'],
          });
          await errorAlert.present();
        }
      },
    },
  ];

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
      handler: (data: { email: string; password: string }) => {
        this.emailInput = data.email;
        this.passwordInput = data.password;
        this.deleteLogin(this.emailInput, this.passwordInput);
      },
    },
  ];
  public alertInputs = [
    {
      name: 'email',
      placeholder: 'E-Mail',
      type: 'email',
      value: localStorage.getItem('email') || '',
    },
    {
      name: 'password',
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
        this.saveChanges();
      },
    },
  ];

  setResult(event: CustomEvent<OverlayEventDetail>) {
    console.log(`Dialog geschlossen mit Rolle: ${event.detail.role}`);
  }

  async deleteLogin(email: string, password: string) {
    try {
      await this.authService.login(email, password);
      this.isLoginVerified = true;

      console.log('Login erfolgreich. Zweiter Alert wird geöffnet...');

      // Falls der Login erfolgreich war, erstelle das zweite Bestätigungs-Alert
      const confirmDeleteAlert = await this.alertController.create({
        header: 'Konto endgültig löschen',
        message:
          'Sind Sie sicher, dass Sie Ihr Konto unwiderruflich löschen möchten?',
        buttons: [
          { text: 'Abbrechen', role: 'cancel' },
          {
            text: 'Löschen',
            role: 'destructive',
            handler: () => this.deleteAccount(),
          },
        ],
      });

      // Öffne den Bestätigungs-Alert
      await confirmDeleteAlert.present();
    } catch (e) {
      console.log('Login fehlgeschlagen:', e);
      this.isLoginVerified = false;
    }
  }

  async deleteAccount() {
    this.loadingService.show();
    try {
      await this.acc.userdelete();
      this.router.navigate(['login']);
    } catch (e) {
      console.log('Fehler beim Löschen des Kontos:', e);
      const errorAlert = await this.alertController.create({
        header: 'Fehler',
        message: 'Beim Löschen des Kontos ist ein Fehler aufgetreten.',
        buttons: ['OK'],
      });
      await errorAlert.present();
    } finally {
      this.loadingService.hide();
    }
  }

  async verifyLogin() {
    try {
      await this.authService.login(this.emailInput, this.passwordInput);
      this.isLoginVerified = true;
      console.log('Login erfolgreich. Jetzt kann das Konto gelöscht werden.');
    } catch (e) {
      console.log('Login fehlgeschlagen: ' + e);
      this.isLoginVerified = false;
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

  onColorBlindToggle(event: any) {
    this.colorBlindMode = event.detail.checked;
    localStorage.setItem('colorBlindMode', this.colorBlindMode.toString());
    this.applyColorBlindMode(this.colorBlindMode);
  }

  applyColorBlindMode(enabled: boolean) {
    if (enabled) {
      document.body.classList.add('color-blind');
    } else {
      document.body.classList.remove('color-blind');
    }
  }
}
