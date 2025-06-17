import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonButton,
    IonLabel, IonNote,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';

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
        CommonModule,
        FormsModule,
        IonInputPasswordToggle,
        RouterLink,
        IonNote,
    ],
})
export class RegisterPage implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
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
  videoSource: string = '';
  passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}$/;

  ngOnInit() {
    // Setze die GIF-Quelle basierend auf dem Modus
    this.videoSource = this.isDarkMode()
      ? 'assets/gifs/loadingDarkMode.gif'
      : 'assets/gifs/loadingLightMode.gif';

    // Überwache Änderungen des Farbschemas
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        this.videoSource = event.matches
          ? 'assets/gifs/loadingDarkMode.gif'
          : 'assets/gifs/loadingLightMode.gif';
      });
  }

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
    if (this.name === '') {
      this.error = 'Der Benutzername darf nicht leer sein!';
      this.registerFailed = true;
      return;
    }
    if (!this.passwordRegex.test(this.password)) {
      this.error =
        'Das Passwort muss mindestens 8 Zeichen lang sein und einen Groß-, Kleinbuchstaben, eine Ziffer enthalten.';
      this.registerFailed = true;
      return;
    }
    this.loadingService.show(); // Ladeoverlay anzeigen
    try {
      const usercolor =
        this.color === '' ? this.generateRandomHexColor() : this.color;
      const userCredential = await this.authService.signup(
        this.email,
        this.password,
        this.name,
        usercolor,
        'groupId'
      );
      if (userCredential.user) {
        localStorage.setItem('username', this.name);
        localStorage.setItem('usercolor', usercolor);
        localStorage.setItem('email', this.email);
        console.log('Registrierung erfolgreich:', userCredential.user);
        this.router.navigate(['/group-overview']);
      }
    } catch (error: any) {
      console.error('Registrierung fehlgeschlagen:', error);
      if (error.code === 'auth/email-already-in-use') {
        this.error = 'Diese E-Mail-Adresse wird bereits verwendet.';
      } else if (error.code === 'auth/weak-password') {
        this.error =
          'Das Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.';
      } else {
        this.error =
          'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.';
      }
      this.registerFailed = true;
    } finally {
      this.loadingService.hide(); // Ladeoverlay ausblenden
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

  isDarkMode(): boolean {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  protected readonly navigator = navigator;
}
