import { Component, OnInit } from '@angular/core';
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
  IonInput,
  IonAlert
} from '@ionic/angular/standalone';
import { OverlayEventDetail } from '@ionic/core/components';

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
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonInput
  ],
})
export class AccountSettingsPage {
  name: string = '';
  email: string = '';
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  showPasswordFields: boolean = false;
  showDeleteAlert: boolean = false; // Diese Variable steuert, ob der Löschen-Dialog angezeigt wird

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
 
  setResult(event: CustomEvent<OverlayEventDetail>) {
    console.log(`Dialog geschlossen mit Rolle: ${event.detail.role}`); 
  }

  deleteAccount() {
    console.log('Konto wird gelöscht...');
    // Hier kannst du den Löschprozess starten, z. B. einen API-Call
  }
}
