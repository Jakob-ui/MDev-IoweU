import { Component, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
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
  loginFailed: boolean = false;
  loading: boolean = false;
  timeout: any;

  inputChange() {
    this.error = '';
    this.loginFailed = false;
  }

  async ngOnInit() {
    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser && this.authService.currentUser.username) {
        this.router.navigate(['/group-overview']);
      }
    } catch (error) {
      console.error('Benutzer konnte nicht geladen werden:', error);
    }
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
    try {
      await this.authService.login(this.email, this.password);
      while (!this.authService.currentUser) {
        this.loadingService.show();
      }
      if (this.authService.currentUser) {
        this.router.navigate(['/group-overview']);
      }
    } catch (error) {
      console.error('Fehler beim Login:', error);
      this.error = 'Fehler beim Login, bitte versuchen Sie es erneut.';
      this.loginFailed = true;
    } finally {
      this.loadingService.hide();
    }
  }

  async appleLogin() {
    try {
      this.loadingService.show();
      const userData = await this.authService.appleLogin('', '');

      if (userData && userData.uid) {
        if (!userData.username || userData.username === 'Unnamed User' || !userData.color || userData.color === '#CCCCCC') {
          console.log(
            'Apple Login: Erster Login oder Profil unvollständig. Weiterleitung zu Profil-Setup.'
          );
          this.router.navigate(['/profile-setup']);
        } else {
          console.log('Apple Login erfolgreich. Weiterleitung zu Gruppenübersicht.');
          this.router.navigate(['/group-overview']);
        }
      } else {
        this.error =
          'Apple Login fehlgeschlagen: Keine Benutzerdaten erhalten.';
        this.loginFailed = true;
      }
    } catch (error: any) {
      this.loadingService.hide();
      console.error('Fehler beim Google Login:', error);
      this.error = error.message || 'Google Login fehlgeschlagen, bitte versuchen Sie es erneut.';
      this.loginFailed = true;
    } finally {
      this.loadingService.hide();
    }
  }

  async googleLogin() {
    try {
      this.loadingService.show();
      const userData = await this.authService.googleLogin('', '');

      if (userData && userData.uid) {
        if (!userData.username || userData.username === 'Unnamed User' || !userData.color || userData.color === '#CCCCCC') {
          console.log('Google Login: Erster Login oder Profil unvollständig. Weiterleitung zu Profil-Setup.');
          this.router.navigate(['/profile-setup']);
        } else {
          console.log('Google Login erfolgreich. Weiterleitung zu Gruppenübersicht.');
          this.router.navigate(['/group-overview']);
        }
      } else {
        this.error = 'Google Login fehlgeschlagen: Keine Benutzerdaten erhalten.';
        this.loginFailed = true;
      }
    } catch (error: any) {
      this.loadingService.hide();
      console.error('Fehler beim Google Login:', error);
      this.error = error.message || 'Google Login fehlgeschlagen, bitte versuchen Sie es erneut.';
      this.loginFailed = true;
    } finally {
      this.loadingService.hide();
    }
  }
}