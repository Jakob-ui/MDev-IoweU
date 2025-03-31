import { Component, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ROUTER_CONFIGURATION, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  failed: boolean = false;

  email: string = '';
  password: string = '';

  inputChange() {
    this.failed = false;
  }

  async login() {
    try {
      const uid = await this.authService.login(this.email, this.password);
      const username = await this.authService.getUsernameByUid(uid);
      sessionStorage.setItem('username', username);
      console.log('Login erfolgreich. Benutzername gespeichert:', username);
      this.router.navigate(['/group-overview']);
    } catch (error) {
      console.error('Fehler beim Login:', error);
      this.failed = true;
    }
  }
}
