import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonInput,
  IonInputPasswordToggle,
  IonList,
  IonItem,
  IonListHeader,
  IonButton,
  IonLabel,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonLabel,
    IonButton,
    IonItem,
    IonInput,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonInputPasswordToggle,
  ],
})
export class RegisterPage {
  private router = inject(Router);
  private authService = inject(AuthService);
  failed: boolean = false;

  email = '';
  password = '';
  name = '';
  img: string = '';
  color = '';
  error = '';

  inputChange() {
    this.failed = false;
  }

  private generateRandomHexColor(): string {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  }

  async register() {
    if (!this.email || !this.password) {
      this.error = 'Bitte geben Sie eine E-Mail-Adresse und ein Passwort ein.';
      return;
    }
    if (!this.email.includes('@')) {
      this.error = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      return;
    }
    if (this.name.length > 15) {
      this.error = 'Der Benutzername darf maximal 15 Zeichen haben';
      return;
    }
    try {
      const usercolor =
        this.color === '' ? this.generateRandomHexColor() : this.color;
      const userCredential = await this.authService.signup(
        this.email,
        this.password,
        this.name,
        usercolor,
        this.img
      );
      if (userCredential.user) {
        sessionStorage.setItem('username', this.name);
        sessionStorage.setItem('usercolor', usercolor);
        console.log('Registrierung erfolgreich:', userCredential.user);
        this.router.navigate(['/group-overview']);
      }
    } catch (error) {
      console.error('Registrierung fehlgeschlagen:', error);
      this.failed = true;
    }
  }
}
