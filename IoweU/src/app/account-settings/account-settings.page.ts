import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, IonLabel, IonItem, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AccountSettingsPage implements OnInit {

  name: string = '';
  email: string = '';
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  showPasswordFields: boolean = false;

  constructor() { }

  ngOnInit() {
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

}
