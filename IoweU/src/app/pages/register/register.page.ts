import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonSpinner,
    IonLabel,
    IonButton,
    IonItem,
    IonInput,
    IonContent,
    CommonModule,
    FormsModule,
    IonInputPasswordToggle,
    RouterLink,
  ],
})
export class RegisterPage {
  private router = inject(Router);
  private authService = inject(AuthService);
  failed: boolean = false;
  registerFailed: boolean = false; // Neue Variable für den Buttonstatus

  email = '';
  password = '';
  name = '';
  img: string = '';
  color = '';
  error = '';
  loading: boolean = false;
  timeout: any;

  inputChange() {
    this.failed = false;
    this.registerFailed = false; // Button zurücksetzen
  }

  private generateRandomHexColor(): string {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  }

  async register() {
    if (!this.email || !this.password) {
      this.error = 'Bitte geben Sie eine E-Mail-Adresse und ein Passwort ein.';
      this.registerFailed = true;
      return;
    }
    if (!this.email.includes('@')) {
      this.error = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      this.registerFailed = true;
      return;
    }
    if (this.name.length > 15) {
      this.error = 'Der Benutzername darf maximal 15 Zeichen haben';
      this.registerFailed = true;
      return;
    }
    this.loading = true;
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
        sessionStorage.setItem('email', this.email);
        console.log('Registrierung erfolgreich:', userCredential.user);
        this.router.navigate(['/group-overview']);
      }
    } catch (error) {
      console.error('Registrierung fehlgeschlagen:', error);
      this.error =
        'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.';
      this.registerFailed = true;
    } finally {
      this.loading = false;
    }
  }

  async isLoading() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.loading = false;
      clearTimeout(this.timeout);
    } catch (error) {
      console.error('Fehler beim Laden der Daten', error);
      this.loading = false;
    }
  }
}
