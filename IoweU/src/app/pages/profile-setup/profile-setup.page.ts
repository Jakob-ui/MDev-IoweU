import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonToggle,
  IonLabel,
  IonButton,
  IonInput,
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';
import { Users } from 'src/app/services/objects/Users';
import { Router } from '@angular/router';
import {LoadingService} from "../../services/loading.service";

@Component({
  selector: 'app-profile-setup',
  templateUrl: './profile-setup.page.html',
  styleUrls: ['./profile-setup.page.scss'],
  standalone: true,
  imports: [
    IonInput,
    IonButton,
    FormsModule,
    IonLabel,
    IonToggle,
    IonItem,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class ProfileSetupPage implements OnInit {
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);

  name: string = '';
  color: string = '';
  colorBlindMode: any;

  constructor() {}

  ngOnInit() {
    this.authService.waitForUser();
    this.name = this.authService.currentUser?.username || 'unbekannt';
    this.color = this.authService.currentUser?.color || 'unbekannt';
  }

  onColorBlindToggle(event: any) {
    this.colorBlindMode = event.detail.checked;
    localStorage.setItem('colorBlindMode', this.colorBlindMode.toString());
    this.applyColorBlindMode(this.colorBlindMode);
  }
  applyColorBlindMode(enabled: boolean) {
    if (enabled) {
      document.body.classList.add('color-blind');
    } else {
      document.body.classList.remove('color-blind');
    }
  }
  async saveUserChanges() {
    try {
      if (this.authService.currentUser) {
        const newData: Users = {
          uid: this.authService.currentUser.uid,
          username: this.name,
          email: this.authService.currentUser.email,
          color: this.color,
          lastedited: new Date().toString(),
          groupId: [],
        };
        this.authService.saveUserData(
          this.authService.currentUser?.uid,
          newData
        );
      }
      console.log("updated user")
      this.loadingService.show();
      setTimeout(() => {
        this.router.navigateByUrl('/group-overview').then(() => {
          window.location.reload();
        });
      }, 100);
    } catch {
      console.log('ein Error ist aufgetreten');
    }
  }
}
