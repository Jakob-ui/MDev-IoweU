import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonList,
  IonBadge,
  IonCard,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { NavController, Platform } from "@ionic/angular";
import { LoadingService } from "../../services/loading.service";

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
  private loadingService = inject(LoadingService);
  groupname: string = '';

  iosIcons: boolean = false;

  user: string | null = "";
  displayName: string | null = null;

  groupMembers = [
    { name: 'Livia', profileImage: 'assets/profiles/livia.jpg' },
    { name: 'Michaela', profileImage: 'assets/profiles/michaela.jpg' },
    { name: 'Jakob', profileImage: 'assets/profiles/jakob.jpg' },
    { name: 'Sophie', profileImage: 'assets/profiles/sophie.jpg' },
    { name: 'Mateusz', profileImage: 'assets/profiles/mateusz.jpg' },
  ];

  expenses = [
    {
      id: 1,
      expense: 'Pizza',
      totalAmount: 50,
      amountToPay: -10,
      paidBy: this.groupMembers[0],
      date: new Date(2025, 2, 20),
    },
    {
      id: 2,
      expense: 'Kinoabend',
      totalAmount: 40,
      amountToPay: -8,
      paidBy: this.groupMembers[1],
      date: new Date(2025, 3, 5),
    },
    {
      id: 3,
      expense: 'Restaurantbesuch',
      totalAmount: 100,
      amountToPay: -25,
      paidBy: this.groupMembers[2],
      date: new Date(2025, 3, 5),
    },
  ];

  balance: number = 0;
  lastTransactionDate = new Date(2025, 2, 20);

  constructor() {}

  ngOnInit() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      this.user = sessionStorage.getItem('username');
      this.iosIcons = this.platform.is('ios');
      const userColor = sessionStorage.getItem('usercolor');
      document.documentElement.style.setProperty('--user-color', userColor);
      this.groupname = sessionStorage.getItem('groupname') || 'Unbekannte Gruppe';
  
      // Berechne die Balance
      this.calculateBalance();
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  calculateBalance() {
    this.balance = this.expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
  }

  async logout() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.error('Fehler beim Logout:', e);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  goToExpenseDetails(expenseId: number) {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      this.router.navigate(['expense-details', expenseId]);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }
  goToCreateExpense() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      this.router.navigate(['create-expense']);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}
