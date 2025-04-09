import { Component, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ROUTER_CONFIGURATION, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class LoginPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);

  error: string = '';
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  loginFailed: boolean = false;
  loading: boolean = false;
  timeout: any;

  inputChange() {
    this.error = '';
    this.loginFailed = false;
  }

  async login() {
    if (!this.email || !this.password) {
      this.error = 'Bitte geben Sie eine E-Mail-Adresse und ein Passwort ein.';
      this.loginFailed = true;
      return;
    }
    if (!this.email.includes('@')) {
      this.error = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      this.loginFailed = true;
      return;
    }

    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      await this.authService.login(this.email, this.password, this.rememberMe);
      this.router.navigate(['/group-overview']);
    } catch (error) {
      console.error('Fehler beim Login:', error);
      this.error = 'Fehler beim Login, bitte versuchen Sie es erneut.';
      this.loginFailed = true;
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
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
