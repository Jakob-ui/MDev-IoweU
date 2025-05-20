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
  IonLabel,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-register-with-google',
  templateUrl: './register-with-google.page.html',
  styleUrls: ['./register-with-google.page.scss'],
  standalone: true,
  imports: [
    IonLabel,
    IonButton,
    IonItem,
    IonInput,
    IonContent,
    CommonModule,
    FormsModule,
    RouterLink,
  ],
})
export class RegisterWithGooglePage implements OnInit {
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

  async ngOnInit() {
    const name = localStorage.getItem('googleRegName') || '';
    const color = localStorage.getItem('googleRegColor') || '';
    if (name && color) {
      try {
        const result = await this.authService.handleGoogleRedirect({
          username: name,
          color: color,
        });
        await this.authService.waitForUser();
        if (result && result.user) {
          localStorage.removeItem('googleRegName');
          localStorage.removeItem('googleRegColor');
          this.router.navigate(['/group-overview']);
        }
      } catch (error) {
        this.error = 'Fehler beim Abschließen der Google-Registrierung.';
        this.registerFailed = true;
      } finally {
      }
    }
  }

  inputChange() {
    this.failed = false;
    this.registerFailed = false;
  }

  async registerWithGoogle() {
    if (!this.name || this.name.length > 15) {
      this.error =
        'Bitte gib einen gültigen Benutzernamen ein (max. 15 Zeichen).';
      this.registerFailed = true;
      return;
    }
    const usercolor =
      this.color === '' ? this.generateRandomHexColor() : this.color;
    localStorage.setItem('googleRegName', this.name);
    localStorage.setItem('googleRegColor', usercolor);
    try {
      await this.authService.registerWithGoogle({
        username: this.name,
        color: usercolor,
      });
    } catch (error: any) {
      console.error('Fehler bei der Google-Registrierung:', error);
      this.error =
        error?.message ||
        (typeof error === 'string'
          ? error
          : 'Unbekannter Fehler bei der Google-Registrierung.');
      this.registerFailed = true;
    }
  }

  private generateRandomHexColor(): string {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  }
}
