import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { ExpenseService } from '../../services/expense.service';
import { TransactionService } from '../../services/transaction.service';
import { ExpenseMember } from '../../services/objects/ExpenseMember';
import { Products } from '../../services/objects/Products';
import { Expenses } from '../../services/objects/Expenses';
import { Transactions } from '../../services/objects/Transactions';

@Component({
  selector: 'app-settle-balances',
  templateUrl: './settle-balances.page.html',
  styleUrls: ['./settle-balances.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonBadge,
    IonButton,
    IonIcon,
  ],
})
export class SettleBalancesPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);
  private transactionService = inject(TransactionService);
  private alertController = inject(AlertController);

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId = this.activeRoute.snapshot.paramMap.get('groupId') || '';
  expenseId = this.activeRoute.snapshot.paramMap.get('expenseId') || '';

  groupMembers: any[] = [];
  memberUsernames: string[] = [];
  memberIds: string[] = [];
  memberColors: string[] = [];
  memberRoles: string[] = [];
  memberUids: string[] = [];

  expenseDescription: string = '';
  expenseTotalAmount: number = 0;
  expensePaidBy: string = '';
  expensePaidByUsername: string = '';
  expenseDate: string = '';
  expenseCurrency: string = '';
  expenseCategory: string = '';
  expenseMember: ExpenseMember[] = [];
  expenseMemberIds: string[] = [];
  expenseAmountToPay: number = 0;
  expenseMemberProducts: Products[] = [];
  expenseMemberSplitType: string = '';
  expenseMemberSplitBy: string = '';
  expenseMemberPaidBy: string = '';
  expenseMemberPaidByName: string = '';
  expenseMemberPaidByUid: string = '';
  reason: string = '';

  repeatingExpense: boolean = false;

  splitValue: { [uid: string]: number } = {};
  amountToPay: { [uid: string]: number } = {};
  products: Products[] = [];

  visibleProducts: { [key: string]: boolean } = {};

  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  categories = [
    { name: 'Lebensmittel', icon: 'fast-food-outline' },
    { name: 'Einkäufe', icon: 'cart-outline' },
    { name: 'Restaurant/Bar', icon: 'wine-outline' },
    { name: 'Transport', icon: 'car-outline' },
    { name: 'Freizeit', icon: 'game-controller-outline' },
    { name: 'Wohnen', icon: 'home-outline' },
    { name: 'Rechnungen', icon: 'receipt-outline' },
    { name: 'Sonstiges', icon: 'ellipsis-horizontal-outline' },
  ];

  expense: Expenses[] = [
    {
      expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
      description: '',
      totalAmount: 0,
      paidBy: '',
      date: new Date().toISOString().split('T')[0],
      currency: ['EUR', 'USD', 'GBP', 'JPY', 'AUD'],
      category: '', // optional
      invoice: '', // optional
      repeat: '', // Wiederholung, falls benötigt
      splitType: 'prozent', // Kann 'prozent', 'anteile' oder 'produkte' sein
      splitBy: 'alle', // Kann 'alle' oder 'frei' sein
      expenseMember: [
        {
          memberId: '', // Leerer String für den Member
          amountToPay: 0, // Betrag, der zu zahlen ist
          split: 0, // Optional, je nach Bedarf
          paid: false,
          products: [
            {
              productId: (
                Date.now() + Math.floor(Math.random() * 1000)
              ).toString(),
              memberId: '', // Leerer String für den Member
              productname: '', // Leerer String für den Produktnamen
              quantity: 1, // Standardmenge 1
              unit: '', // Einheit, z.B. "kg", "Stück"
              price: 0, // Preis des Produkts
            },
          ],
        },
      ],
    },
  ];

  async ngOnInit() {
    this.loadingService.show();
    try {
      await this.authService.waitForUser();
      // Query-Parameter lesen, um festzustellen, ob es sich um eine wiederkehrende Ausgabe handelt
      this.activeRoute.queryParams.subscribe((params) => {
        this.repeatingExpense = params['repeating'] === 'true';
      });

      if (!this.authService.currentUser) {
        console.error('Kein Benutzer eingeloggt.');
        return;
      }

      this.uid = this.authService.currentUser.uid;
      this.user = this.authService.currentUser.username;
      this.displayName = this.authService.currentUser.username;

      const currentGroup = await this.groupService.getGroupById(this.groupId);
      if (!currentGroup) {
        console.error(`Gruppe mit der ID ${this.groupId} nicht gefunden`);
        return;
      }

      this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
      this.groupMembers = currentGroup.members || [];

      this.memberUsernames = this.groupMembers.map((m) => m.username || '');
      this.memberIds = this.groupMembers.map((m) => m.memberId || '');
      this.memberColors = this.groupMembers.map((m) => m.color || '');
      this.memberRoles = this.groupMembers.map((m) => m.role || '');
      this.memberUids = this.groupMembers.map((m) => m.uid || '');

      await this.expenseService.getExpenseById(
        this.groupId,
        this.expenseId,
        this.repeatingExpense,
        (fetchedExpense) => {
          if (fetchedExpense) {
            this.expense = [fetchedExpense];

            const expenseData = this.expense[0];
            this.expenseDescription = expenseData.description || '';
            this.expenseTotalAmount = expenseData.totalAmount || 0;
            this.expensePaidBy = expenseData.paidBy || '';
            this.expenseDate = expenseData.date || '';
            this.expenseCurrency = expenseData.currency[0] || '';
            this.expenseCategory = expenseData.category || '';
            this.expenseMember = expenseData.expenseMember || [];
            this.expenseMemberIds = this.expenseMember.map(
              (m) => m.memberId || ''
            );
            this.expenseMemberSplitType = expenseData.splitType || '';
            this.expenseMemberSplitBy = expenseData.splitBy || '';
            this.expenseMemberPaidBy = expenseData.paidBy || '';

            const currentMember = this.expenseMember.find(
              (m) => m.memberId === this.uid
            );
            this.expenseAmountToPay = currentMember?.amountToPay || 0;

            this.expensePaidByUsername = this.getPaidByName(this.expensePaidBy);

            console.log('Geladene Expense:', this.expense);
          } else {
            console.error('Expense nicht gefunden');
          }
        }
      );

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  getAmountToPayForMember(
    expense: Partial<Expenses>,
    memberId: string
  ): number {
    if (!expense || !expense.expenseMember) return 0;
    const memberEntry = expense.expenseMember.find(
      (m) => m.memberId === memberId
    );
    return memberEntry?.amountToPay ?? 0;
  }

  getAmountClass(expense: Expenses, memberId: string): string {
    const isPaidByMember = expense.paidBy === memberId;
    const member = expense.expenseMember.find((m) => m.memberId === memberId);

    if (isPaidByMember) {
      return 'neutral';
    }

    if (member && member.amountToPay > 0) {
      return 'negative';
    }

    return 'neutral';
  }

  hasProducts(groupMemberId: string): boolean {
    if (!this.expense || this.expense.length === 0) {
      return false;
    }

    for (let expense of this.expense) {
      const groupMember = expense.expenseMember.find(
        (member) => member.memberId === groupMemberId
      );

      if (
        groupMember &&
        Array.isArray(groupMember.products) &&
        groupMember.products.length > 0
      ) {
        return true;
      }
    }

    return false;
  }

  toggleProducts(memberName: string) {
    this.visibleProducts[memberName] = !this.visibleProducts[memberName]; // Toggle die Sichtbarkeit der Produkte
  }

  getPurchasedProductsForMember(memberId: string): Products[] {
    // Ensure that this.expense is properly defined and is not empty
    if (!this.expense || this.expense.length === 0) {
      return []; // Return an empty array if no expense is available
    }

    // Assuming you are dealing with a single expense for the member
    const expense = this.expense[0]; // Access the first expense, or adjust based on your use case

    // Ensure that expenseMember exists
    if (!expense.expenseMember) {
      return []; // Return empty array if expenseMember is not available
    }

    // Find the member in the expenseMember array
    const member = expense.expenseMember.find((m) => m.memberId === memberId);

    // If the member is found and they have products, return the products array, otherwise return an empty array
    return member?.products ?? [];
  }

  isProductsVisibleForMember(memberId: string): boolean {
    return this.visibleProducts[memberId] || false;
  }

  getUserAmount(expense: Expenses): number {
    //console.log('Aktueller Benutzer:', this.uid);
    const userEntry = expense.expenseMember?.find(
      (member) => member.memberId === this.uid
    );
    //console.log('UserEntry:', userEntry);
    return userEntry?.amountToPay ?? 0;
  }

  goBack() {
    this.navCtrl.back();
  }

  getPaidByName(uid: string): string {
    const memberIndex = this.memberUids.indexOf(uid);
    return memberIndex >= 0 ? this.memberUsernames[memberIndex] : '';
  }

  toggleInvoiceOverlay() {
    console.log('Overlay state:', this.overlayState);

    // Wenn der Zustand "start" ist, wechselt er zu "normal", um das Overlay zu zeigen
    if (this.overlayState === 'start') {
      this.overlayState = 'normal'; // Overlay wird sichtbar und Animation startet
    } else if (this.overlayState === 'normal') {
      // Wenn es im "normal" Zustand ist, wird es nach unten geschoben
      this.overlayState = 'hidden'; // Wechselt zum "hidden"-Zustand
    } else if (this.overlayState === 'hidden') {
      // Wenn es im "hidden" Zustand ist, wird es wieder nach oben geschoben
      this.overlayState = 'normal'; // Wechselt zurück zum "normal"-Zustand
    }

    console.log('Overlay state:', this.overlayState); // Debugging-Ausgabe
  }

  async pay() {
    if(this.authService.currentUser){
      const amount = this.getAmountToPayForMember(
        this.expense[0],
        this.authService.currentUser.uid
      );
      const trans: Transactions = {
        transactionId: (
          Date.now() + Math.floor(Math.random() * 1000)
        ).toString(),
        from: this.uid || '',
        to: this.expensePaidBy || '',
        amount: amount,
        reason: this.expense[0].description,
        date: new Date().toISOString(),
        relatedExpenses: [this.expenseId],
      };

      await this.transactionService.makeTransactionById(
        this.groupId,
        this.expenseId,
        this.authService.currentUser.uid,
        trans
      );
    } else {
      console.log("current user is null")
    }
    // Danach: Nur noch fragen, ob man sie sehen will
    const alert = await this.alertController.create({
      header: 'Transaktion abgeschlossen',
      message:
        'Deine Schulden wurden bezahlt. Möchtest du dir die Transaktion ansehen?',
      cssClass: 'custom-alert-pay-expenses',
      buttons: [
        {
          text: 'Nein',
          role: 'cancel',
          handler: () => {
            this.router.navigate(['expense', this.groupId]);
          },
        },
        {
          text: 'Ja',
          handler: () => {
            this.router.navigate(['transactions', this.groupId]);
          },
        },
      ],
    });

    await alert.present();
  }
}
