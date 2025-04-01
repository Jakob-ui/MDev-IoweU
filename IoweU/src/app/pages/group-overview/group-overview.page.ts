import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
} from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-group-overview',
  templateUrl: './group-overview.page.html',
  styleUrls: ['./group-overview.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonItem,
    IonLabel,
    IonList,
    RouterModule,
    CommonModule,
  ],
})
export class GroupOverviewPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  user: string | null ="";
  displayName: string | null = null;

  groups: { name: string; balance: number }[] = [];


  ngOnInit() {
    this.user = sessionStorage.getItem('username');
  }

  async logout() {
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }
}
