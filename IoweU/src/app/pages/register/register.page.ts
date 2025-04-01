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

  inputChange() {
    this.failed = false;
  }

  private generateRandomHexColor(): string {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob); // Konvertiert das Blob in Base64
    });
  }

  async register() {
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
        console.log('Registrierung erfolgreich:', userCredential.user);
        this.router.navigate(['/group-overview']);
      }
    } catch (error) {
      console.error('Registrierung fehlgeschlagen:', error);
      this.failed = true;
    }
  }
}
