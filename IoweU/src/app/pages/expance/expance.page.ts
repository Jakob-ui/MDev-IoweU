import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  selector: 'app-expance',
  templateUrl: './expance.page.html',
  styleUrls: ['./expance.page.scss'],
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
    IonButton,
  ],
})
export class ExpancePage implements OnInit {
  groupMembers = [
    { name: 'Livia', profileImage: 'assets/profiles/livia.jpg' },
    { name: 'Michaela', profileImage: 'assets/profiles/michaela.jpg' },
    { name: 'Jakob', profileImage: 'assets/profiles/jakob.jpg' },
    { name: 'Sophie', profileImage: 'assets/profiles/sophie.jpg' },
    { name: 'Mateusz', profileImage: 'assets/profiles/mateusz.jpg' },
  ];

  expances = [
    {
      expace: 'Pizza',
      totalAmount: 50,
      amountToPay: -10,
      paidBy: this.groupMembers[0],
      date: new Date(2025, 2, 20),
    },
    {
      expace: 'Einkauf bei Hofer',
      totalAmount: 70,
      amountToPay: -20,
      paidBy: this.groupMembers[1],
      date: new Date(2025, 3, 5),
    },
    {
      expace: 'Kino',
      totalAmount: 40,
      amountToPay: -5,
      paidBy: this.groupMembers[2],
      date: new Date(2025, 3, 5),
    },
  ];

  balance = 50;
  lastTransactionDate = new Date(2025, 2, 20);

  constructor() {}

  ngOnInit() {}
}
