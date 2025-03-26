import { Component, OnInit } from '@angular/core';
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
  IonList,
  IonBadge,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonList,
    IonBadge,
    IonCard,
    RouterModule,
  ],
})
export class FinancePage implements OnInit {
  balance: number = +200;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers = [
    { name: 'Livia', amount: 460 },
    { name: 'Michaela', amount: -150 },
    { name: 'Jakob', amount: -50 },
    { name: 'Sophie', amount: -10 },
    { name: 'Mateusz', amount: 0 },
  ];

  constructor() {}

  ngOnInit() {}
}
