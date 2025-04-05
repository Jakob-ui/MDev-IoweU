import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonCardTitle, IonLabel, IonIcon, IonButton, IonBadge } from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { NavController, Platform } from "@ionic/angular";
import { Expenses } from "../../services/objects/Expenses";  // 👈 Import aus eigener Datei
import { Groups } from "../../services/objects/Groups";
import { Products } from "../../services/objects/Products";  // 👈 Import aus eigener Datei

@Component({
  selector: 'app-expense-details',
  templateUrl: './expense-details.page.html',
  styleUrls: ['./expense-details.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, IonCard, IonCardContent, IonCardTitle, IonLabel, IonIcon, IonButton, IonBadge, RouterLink]
})
export class ExpenseDetailsPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private route = inject(ActivatedRoute);

  expenseId: number | null = null;
  expenseDetails: Expenses | undefined;
  iosIcons: boolean = false;
  user: string | null = "";

  groupMembers = [
    { name: 'Livia', profileImage: 'assets/profiles/livia.jpg' },
    { name: 'Michaela', profileImage: 'assets/profiles/michaela.jpg' },
    { name: 'Jakob', profileImage: 'assets/profiles/jakob.jpg' },
    { name: 'Sophie', profileImage: 'assets/profiles/sophie.jpg' },
    { name: 'Mateusz', profileImage: 'assets/profiles/mateusz.jpg' },
  ];

  expenses: Expenses[] = [
    {
      id: 1,
      expense: 'Pizza',
      totalAmount: 50,
      amountToPay: -10,
      paidBy: 'Livia',
      date: "2025-03-20T00:00:00.000Z", // Datum als String im ISO 8601-Format
      products: [
        { member: 'Livia', name: 'Pizza Margherita', quantity: 1, unit: 'Stk', price: 8.50 },
        { member: 'Livia', name: 'Cola', quantity: 1, unit: 'Flasche', price: 1.50 },
        { member: 'Jakob', name: 'Pizza Salami', quantity: 1, unit: 'Stk', price: 9.00 },
        { member: 'Jakob', name: 'Fanta', quantity: 1, unit: 'Stk', price: 1.50 },
        { member: 'Michaela', name: 'Cola', quantity: 2, unit: 'Flaschen', price: 2.50 },
        { member: 'Sophie', name: 'Pizza Salami', quantity: 1, unit: 'Stk', price: 8.50 },
        { member: 'Sophie', name: 'Cola', quantity: 1, unit: 'Flasche', price: 1.50 },
        { member: 'Mateusz', name: 'Pizza Salami', quantity: 1, unit: 'Stk', price: 9.00 },
        { member: 'Mateusz', name: 'Fanta', quantity: 1, unit: 'Stk', price: 1.50 },
      ]
    },
    {
      id: 2,
      expense: 'Einkauf bei Hofer',
      totalAmount: 70,
      amountToPay: -20,
      paidBy: 'Michaela',
      date: "2025-04-05T00:00:00.000Z", // Datum als String im ISO 8601-Format
      products: [
        { member: 'Michaela', name: 'Milch', quantity: 2, unit: 'L', price: 2.00 },
        { member: 'Sophie', name: 'Brot', quantity: 1, unit: 'Stk', price: 1.50 },
        { member: 'Livia', name: 'Kaffee', quantity: 1, unit: 'Packung', price: 4.00 }
      ]
    },
    {
      id: 3,
      expense: 'Einkauf bei Lidl',
      totalAmount: 40,
      amountToPay: -4,
      paidBy: 'Michaela',
      date: "2025-04-05T00:00:00.000Z", // Datum als String im ISO 8601-Format
      products: [
        { member: 'Michaela', name: 'Fanta', quantity: 2, unit: 'Flaschen', price: 5.00 },
        { member: 'Sophie', name: 'Brot', quantity: 1, unit: 'Stk', price: 1.50 },
        { member: 'Livia', name: 'Kaffee', quantity: 1, unit: 'Packung', price: 4.00 }
      ]
    }
  ];


  private visibleProducts: { [memberName: string]: boolean } = {};

  constructor() { }

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    const userColor = sessionStorage.getItem('usercolor');
    document.documentElement.style.setProperty('--user-color', userColor);

    this.expenseId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadExpenseDetails();
  }

  loadExpenseDetails() {
    if (this.expenseId) {
      this.expenseDetails = this.expenses.find(expense => expense.id === this.expenseId);
    }
  }

  calculateShare(totalAmount: number): number {
    return totalAmount / this.groupMembers.length;
  }

  getMemberByName(name: string) {
    return this.groupMembers.find(member => member.name === name);
  }

  isNegativeAmountForUser(name: string): boolean {
    return this.expenseDetails?.amountToPay! < 0 && this.user === name;
  }

  isPositiveAmountForUser(name: string): boolean {
    if (this.expenseDetails?.paidBy === this.user) {
      return this.expenseDetails.amountToPay < 0 && name !== this.user;
    }
    return false;
  }

  isRelevantForUser(name: string): boolean {
    return this.user === name || this.expenseDetails?.paidBy === name;
  }

  toggleProducts(memberName: string) {
    this.visibleProducts[memberName] = !this.visibleProducts[memberName];
  }

  isProductsVisibleForMember(memberName: string): boolean {
    return !!this.visibleProducts[memberName];
  }

  getPurchasedProductsForMember(memberName: string): Products[] {
    if (this.expenseDetails && this.expenseDetails.products) {
      return this.expenseDetails.products.filter(product => product.member === memberName);
    }
    return [];
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
    this.navCtrl.back();
  }
}
