import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-group-overview',
  templateUrl: './group-overview.page.html',
  styleUrls: ['./group-overview.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonicModule, RouterModule]
})
export class GroupOverviewPage implements OnInit {
  displayName: string | null = null;

  groups: { name: string; balance: number }[] = []; // Anfangs leere Liste

  constructor(private auth: Auth) {}

  ngOnInit() {
    const user = this.auth.currentUser;
    if (user) {
      this.displayName = user.displayName;
    }
  }

  addGroup() {
    const newGroup = {
      name: 'Neue Gruppe',
      balance: 0, // Startet mit 0€
    };
    this.groups.push(newGroup);
  }
}
