import {Component, inject, OnInit} from '@angular/core';
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
    IonCardContent, IonIcon,
} from '@ionic/angular/standalone';
import {Router, RouterModule} from '@angular/router';
import {AuthService} from "../../services/auth.service";
import {NavController, Platform} from "@ionic/angular";

@Component({
  selector: 'app-expense',
  templateUrl: './expense.page.html',
  styleUrls: ['./expense.page.scss'],
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
        IonIcon,
    ],
})
export class ExpensePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);

  groupname: string = '';

  iosIcons: boolean = false;

  user: string | null ="";
  displayName: string | null = null;

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

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    const userColor = sessionStorage.getItem('usercolor');
    document.documentElement.style.setProperty('--user-color', userColor);
    this.groupname = sessionStorage.getItem('groupname') || 'Unbekannte Gruppe';
  }

  async logout() {
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back(); // Navigiert zur letzten Seite
  }
}
