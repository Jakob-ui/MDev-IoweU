import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonButton,
  IonInput,
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [
    IonInput,
    IonButton,
    IonItem,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class ResetPasswordPage {
  private authservice = inject(AuthService);
  private router = inject(Router);
  email: string = '';

  constructor() {}

  async resetPassword() {
    try {
      await this.authservice.resetpassword(this.email);
      alert(
        'Bitte schaue in dein Email Postfach um dein Passwort zurückzusetzen.'
      );
      this.router.navigate(['/login'])
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }
}
