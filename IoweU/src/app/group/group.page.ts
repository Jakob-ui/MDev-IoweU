import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Hier importieren
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
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-group',
  templateUrl: './group.page.html',
  styleUrls: ['./group.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonFooter,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
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
    RouterModule,
  ],
})
export class GroupPage implements OnInit {
  groupImage: string = ''; // Standardwert für das Gruppenbild
  balance: number = -20; // Beispielwert für das Guthaben

  constructor() {}

  ngOnInit() {}
}
