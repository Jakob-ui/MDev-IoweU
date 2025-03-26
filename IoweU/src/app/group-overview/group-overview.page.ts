import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-group-overview',
  templateUrl: './group-overview.page.html',
  styleUrls: ['./group-overview.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonicModule, RouterModule]
})
export class GroupOverviewPage implements OnInit {

  groups: { name: string; balance: number }[] = []; // Anfangs leere Liste

  constructor() {}

  ngOnInit() {}

  addGroup() {
    const newGroup = {
      name: 'Neue Gruppe',
      balance: 0, // Startet mit 0€
    };
    this.groups.push(newGroup);
  }
}
