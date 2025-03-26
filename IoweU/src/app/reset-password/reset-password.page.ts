import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonButton, IonInput } from '@ionic/angular/standalone';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonInput, IonButton, IonItem, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ResetPasswordPage implements OnInit {

  email: string = '';

  constructor() { }

  ngOnInit() {
  }

  resetPassword() {
    if (!this.email) {
      alert('Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }

    alert(`Passwort-Reset-Link wurde an ${this.email} gesendet.`);
  }

}
