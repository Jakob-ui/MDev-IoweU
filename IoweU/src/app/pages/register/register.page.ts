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
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
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

  inputChange() {
    this.failed = false;
  }

  async register() {
    try {
      const userCredential = await this.authService.signup(
        this.email,
        this.password,
        this.name
      );
      if (userCredential.user) {
        sessionStorage.setItem('username', this.name);
        console.log('Registrierung erfolgreich:', userCredential.user);
        this.router.navigate(['/group-overview']);
      }
    } catch (error) {
      console.error('Registrierung fehlgeschlagen:', error);
      this.failed = true;
    }
  }
}
