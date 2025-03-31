import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonInput
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.scss'],
  standalone: true,
  imports: [
    IonIcon,
    IonButton,
    IonLabel,
    IonItem,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonInput,
  ],
})
export class AccountSettingsPage {
  private auth = inject(AuthService);

  name: string = '';
  email: string = '';
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  showPasswordFields: boolean = false;

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

  async delete() {
    const confirmation = confirm('Möchten Sie Ihr Konto wirklich löschen?');
    if (!confirmation) {
      return; 
    }

    try {
      await this.auth.userdelete(); 
      alert('Ihr Konto wurde erfolgreich gelöscht.');
      window.location.href = '/login';
    } catch (error) {
      console.error('Fehler beim Löschen des Kontos:', error);
      alert(
        'Es ist ein Fehler aufgetreten. Ihr Konto konnte nicht gelöscht werden.'
      );
    }
  }
}
