import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonLabel,
  IonIcon,
  IonButton,
  IonBadge,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { Expenses } from '../../services/objects/Expenses'; // 👈 Import aus eigener Datei
import { Groups } from '../../services/objects/Groups';
import { Products } from '../../services/objects/Products'; // 👈 Import aus eigener Datei

@Component({
  selector: 'app-expense-details',
  templateUrl: './expense-details.page.html',
  styleUrls: ['./expense-details.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    IonCard,
    IonCardContent,
    IonCardTitle,
    IonLabel,
    IonIcon,
    IonButton,
    IonBadge,
    RouterLink,
  ],
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
  user: string | null = '';

  groupMembers = [
    { name: 'Livia', profileImage: 'assets/profiles/livia.jpg' },
    { name: 'Michaela', profileImage: 'assets/profiles/michaela.jpg' },
    { name: 'Jakob', profileImage: 'assets/profiles/jakob.jpg' },
    { name: 'Sophie', profileImage: 'assets/profiles/sophie.jpg' },
    { name: 'Mateusz', profileImage: 'assets/profiles/mateusz.jpg' },
  ];

  expenses: Expenses[] = [
    {
      expenseId: '1',
      description: 'Pizza',
      totalAmount: 50,
      paidBy: 'Livia',
      date: '2025-03-20T00:00:00.000Z',
      currency: '€',
      splitBy: 'frei',
      splitType: 'produkte',
      repeat: 'nein',
      members: [
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Livia',
          amountToPay: 10,
          products: [
            {
              productId: '1',
              memberId: 'Livia',
              productname: 'Pizza Margherita',
              quantity: 1,
              unit: 'Stk',
              price: 8.5,
            },
            {
              productId: '2',
              memberId: 'Livia',
              productname: 'Cola',
              quantity: 1,
              unit: 'Flasche',
              price: 1.5,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Jakob',
          amountToPay: 10.5,
          products: [
            {
              productId: '3',
              memberId: 'Jakob',
              productname: 'Pizza Salami',
              quantity: 1,
              unit: 'Stk',
              price: 9.0,
            },
            {
              productId: '4',
              memberId: 'Jakob',
              productname: 'Fanta',
              quantity: 1,
              unit: 'Stk',
              price: 1.5,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Michaela',
          amountToPay: 5,
          products: [
            {
              productId: '5',
              memberId: 'Michaela',
              productname: 'Cola',
              quantity: 2,
              unit: 'Flaschen',
              price: 2.5,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Sophie',
          amountToPay: 10,
          products: [
            {
              productId: '6',
              memberId: 'Sophie',
              productname: 'Pizza Salami',
              quantity: 1,
              unit: 'Stk',
              price: 8.5,
            },
            {
              productId: '7',
              memberId: 'Sophie',
              productname: 'Cola',
              quantity: 1,
              unit: 'Flasche',
              price: 1.5,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Mateusz',
          amountToPay: 10.5,
          products: [
            {
              productId: '8',
              memberId: 'Mateusz',
              productname: 'Pizza Salami',
              quantity: 1,
              unit: 'Stk',
              price: 9.0,
            },
            {
              productId: '9',
              memberId: 'Mateusz',
              productname: 'Fanta',
              quantity: 1,
              unit: 'Stk',
              price: 1.5,
            },
          ],
        },
      ],
    },
    {
      expenseId: '2',
      description: 'Kinoabend',
      totalAmount: 40,
      paidBy: 'Michaela',
      date: '2025-03-25T00:00:00.000Z',
      currency: '€',
      splitBy: 'alle',
      splitType: 'prozent',
      repeat: 'nein',
      members: [
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Livia',
          amountToPay: 8,
          products: [
            {
              productId: '10',
              memberId: 'Livia',
              productname: 'Karten',
              quantity: 1,
              unit: 'Stück',
              price: 8,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Jakob',
          amountToPay: 8,
          products: [
            {
              productId: '11',
              memberId: 'Jakob',
              productname: 'Karten',
              quantity: 1,
              unit: 'Stück',
              price: 8,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Michaela',
          amountToPay: 8,
          products: [
            {
              productId: '12',
              memberId: 'Michaela',
              productname: 'Karten',
              quantity: 1,
              unit: 'Stück',
              price: 8,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Sophie',
          amountToPay: 8,
          products: [
            {
              productId: '13',
              memberId: 'Sophie',
              productname: 'Karten',
              quantity: 1,
              unit: 'Stück',
              price: 8,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Mateusz',
          amountToPay: 8,
          products: [
            {
              productId: '14',
              memberId: 'Mateusz',
              productname: 'Karten',
              quantity: 1,
              unit: 'Stück',
              price: 8,
            },
          ],
        },
      ],
    },
    {
      expenseId: '3',
      description: 'Restaurantbesuch',
      totalAmount: 100,
      paidBy: 'Jakob',
      date: '2025-03-27T00:00:00.000Z',
      currency: '€',
      splitBy: 'frei',
      splitType: 'produkte',
      repeat: 'nein',
      members: [
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Livia',
          amountToPay: -25,
          split: 1,
          products: [
            {
              productId: '15',
              memberId: 'Livia',
              productname: 'Steak',
              quantity: 1,
              unit: 'Stk',
              price: 18,
            },
            {
              productId: '16',
              memberId: 'Livia',
              productname: 'Wein',
              quantity: 1,
              unit: 'Glas',
              price: 7,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Jakob',
          amountToPay: -30,
          split: 1,
          products: [
            {
              productId: '17',
              memberId: 'Jakob',
              productname: 'Nudeln',
              quantity: 1,
              unit: 'Stk',
              price: 15,
            },
            {
              productId: '18',
              memberId: 'Jakob',
              productname: 'Wein',
              quantity: 2,
              unit: 'Gläser',
              price: 6,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Michaela',
          amountToPay: -20,
          split: 1,
          products: [
            {
              productId: '19',
              memberId: 'Michaela',
              productname: 'Pizza',
              quantity: 1,
              unit: 'Stk',
              price: 14,
            },
            {
              productId: '20',
              memberId: 'Michaela',
              productname: 'Cola',
              quantity: 1,
              unit: 'Flasche',
              price: 3,
            },
            {
              productId: '21',
              memberId: 'Michaela',
              productname: 'Wein',
              quantity: 1,
              unit: 'Glas',
              price: 3,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Sophie',
          amountToPay: -25,
          split: 1,
          products: [
            {
              productId: '22',
              memberId: 'Sophie',
              productname: 'Pizza',
              quantity: 1,
              unit: 'Stk',
              price: 14,
            },
            {
              productId: '23',
              memberId: 'Sophie',
              productname: 'Fanta',
              quantity: 1,
              unit: 'Flasche',
              price: 3,
            },
            {
              productId: '24',
              memberId: 'Sophie',
              productname: 'Wein',
              quantity: 1,
              unit: 'Glas',
              price: 3,
            },
          ],
        },
        {
          expenseMemberId: 'aw3da123',
          memberId: 'Mateusz',
          amountToPay: -20,
          split: 1,
          products: [
            {
              productId: '25',
              memberId: 'Mateusz',
              productname: 'Schnitzel',
              quantity: 1,
              unit: 'Stk',
              price: 12,
            },
            {
              productId: '26',
              memberId: 'Mateusz',
              productname: 'Cola',
              quantity: 1,
              unit: 'Flasche',
              price: 3,
            },
            {
              productId: '27',
              memberId: 'Mateusz',
              productname: 'Mineralwasser',
              quantity: 1,
              unit: 'Glas',
              price: 3,
            },
          ],
        },
      ],
    },
  ];

  private visibleProducts: { [memberName: string]: boolean } = {};

  constructor() {}

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    const userColor = sessionStorage.getItem('usercolor');
    document.documentElement.style.setProperty('--user-color', userColor);

    this.expenseId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadExpenseDetails();
  }

  loadExpenseDetails() {
    this.expenseDetails = this.expenses.find(
      (expense) => expense.expenseId === String(this.expenseId)
    );
  }

  calculateShare(totalAmount: number): number {
    return totalAmount / this.groupMembers.length;
  }

  getMemberByName(name: string) {
    return this.groupMembers.find((member) => member.name === name);
  }

  isNegativeAmountForUser(name: string): boolean {
    console.log('isNegativeAmountForUser called');
    if (!this.expenseDetails || !this.expenseDetails.members) {
      return false;
    }

    const member = this.expenseDetails.members.find(
      (member) => member.memberId === name
    );
    console.log('Checking member:', member);

    if (member) {
      const isNegative = member.amountToPay < 0;
      console.log('isNegativeAmountForUser:', isNegative);
      return (
        isNegative &&
        this.expenseDetails.paidBy === this.user &&
        name === this.user
      );
    }
    return false;
  }

  isPositiveAmountForUser(name: string): boolean {
    console.log('isPositiveAmountForUser called');
    if (!this.expenseDetails || !this.expenseDetails.members) {
      return false;
    }

    const member = this.expenseDetails.members.find(
      (member) => member.memberId === name
    );
    console.log('Checking member:', member);
    return this.expenseDetails?.paidBy === this.user && name !== this.user;
  }

  isRelevantForUser(name: string): boolean {
    console.log('Checking relevance for:', name);
    return this.user === name || this.expenseDetails?.paidBy === name;
  }

  toggleProducts(memberName: string) {
    this.visibleProducts[memberName] = !this.visibleProducts[memberName];
  }

  isProductsVisibleForMember(memberName: string): boolean {
    return !!this.visibleProducts[memberName];
  }

  getPurchasedProductsForMember(memberName: string): Products[] {
    // Finde das Expense-Objekt anhand der ID, die in der Klasse gespeichert ist
    const expense = this.expenses.find(
      (e) => e.expenseId === String(this.expenseId)
    ); // Verwende `this.expenseId`, nicht `expenseId`

    // Prüfen, ob das Expense-Objekt gefunden wurde und dann nach dem Mitglied suchen
    if (!expense) {
      console.error(`Expense mit ID ${this.expenseId} nicht gefunden`);
      return [];
    }

    // Sicherstellen, dass 'members' nicht undefined ist
    if (!expense.members) {
      console.error(
        `Keine Mitglieder für Expense mit ID ${this.expenseId} gefunden`
      );
      return [];
    }

    // Finde das Mitglied mit der userId
    const member = expense.members.find((m) => m.memberId === memberName);

    // Wenn das Mitglied gefunden wurde, gebe die Produkte zurück, andernfalls ein leeres Array
    if (!member) {
      console.error(`Mitglied mit userId ${memberName} nicht gefunden`);
      return [];
    }

    return member.products || [];
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
