import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButtons, IonButton, IonItem, IonLabel, IonInput, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonFooter, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonItem, IonLabel, IonInput, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, RouterModule],
  standalone: true
})
export class HomePage {
  userEmail: string | null = null;

  constructor(private auth: Auth) {}

  ngOnInit() {
    const user = this.auth.currentUser;
    if (user) {
      this.userEmail = user.displayName;
    }
  }
}
