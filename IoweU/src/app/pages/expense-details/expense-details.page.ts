import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  fastFoodOutline,
  cartOutline,
  wineOutline,
  carOutline,
  gameControllerOutline,
  homeOutline,
  receiptOutline,
  ellipsisHorizontalOutline,
} from 'ionicons/icons';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonHeader,
  IonToolbar,
} from '@ionic/angular/standalone';

// Import interfaces
import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { Members } from 'src/app/services/objects/Members';
import {AlertController, NavController, Platform} from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { CATEGORIES } from 'src/app/services/objects/Categories';


addIcons({
  'fast-food-outline': fastFoodOutline,
  'cart-outline': cartOutline,
  'wine-outline': wineOutline,
  'car-outline': carOutline,
  'game-controller-outline': gameControllerOutline,
  'home-outline': homeOutline,
  'receipt-outline': receiptOutline,
  'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
});

@Component({
  selector: 'app-expense-details',
  templateUrl: './expense-details.page.html',
  styleUrls: ['./expense-details.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonBadge,
  ],
})
export class ExpenseDetailsPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);
  private pushNotificationService = inject(PushNotificationService);
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

  balanceMap: { [paidByUid: string]: number } = {};

  repeatingExpense: boolean = false;
  paid: boolean = false;

  splitValue: { [uid: string]: number } = {};
  amountToPay: { [uid: string]: number } = {};
  products: Products[] = [];

  visibleProducts: { [key: string]: boolean } = {};

  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  categories = CATEGORIES;

  expense: Expenses[] = [
    {
      expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
      description: '',
      totalAmount: 0,
      totalAmountInForeignCurrency: 0,
      paidBy: '',
      date: new Date().toISOString().split('T')[0],
      currency: [''],
      category: '',
      invoice: '',
      repeat: '',
      splitType: 'prozent',
      splitBy: 'alle',
      expenseMember: [
        {
          memberId: '',
          amountToPay: 0,
          foreignAmountToPay: 0,
          split: 0,
          paid: false,
          products: [
            {
              productId: (
                Date.now() + Math.floor(Math.random() * 1000)
              ).toString(),
              memberId: '',
              productname: '',
              quantity: 1,
              unit: '',
              price: 0,
              foreignPrice: 0,
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

      if (!this.groupId || !this.expenseId) {
        console.error('Kein groupId oder expenseId in der URL');
        return;
      }

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
            this.paid = this.hasUserPaid(this.expense[0]);


            this.expenseService.getBalanceBetweenUsersRealtime(
              this.groupId,
              this.uid!,
              this.expense[0].paidBy,
              (balance) => {
                this.balanceMap[this.expense[0].paidBy] = balance;
              }
            );
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

  getForeignAmountToPayForMember(
    expense: Partial<Expenses>,
    memberId: string
  ): number {
    if (!expense || !expense.expenseMember) return 0;
    const memberEntry = expense.expenseMember.find(
      (m) => m.memberId === memberId
    );
    return memberEntry?.foreignAmountToPay ?? 0;
  }

  getAmountClass(expense: Expenses, memberId: string): string {
    const member = expense.expenseMember.find((m) => m.memberId === memberId);

    // Der aktuelle User ist der, der bezahlt hat
    const currentUserPaid = expense.paidBy === this.uid;

    // Wenn ich selbst bezahlt habe
    if (currentUserPaid) {
      if (memberId === this.uid) {
        return 'neutral'; // ich selbst → neutral
      }

      if (member && member.amountToPay > 0) {
        return 'positive'; // andere, die mir etwas schulden → grün
      }

      return 'neutral'; // andere, die nichts zahlen müssen → grau
    }

    // Wenn jemand anderes bezahlt hat
    if (memberId === this.uid) {
      if (member && member.amountToPay > 0) {
        return 'negative'; // ich schulde → rot
      } else {
        return 'neutral'; // ich schulde nichts → grau
      }
    }

    // Alle anderen → grau
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

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['login']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back();
  }
  editExpense() {
    if (this.expenseId) {
      this.router.navigate(['/edit-expense', this.groupId, this.expenseId], {
        queryParams: {
          repeating: this.repeatingExpense,
          paid: this.paid,
        },
      });
    } else {
      console.error('Expense ID not found');
    }
  }

  payExpense() {
    if (this.expenseId) {
      this.router.navigate(['/pay-expenses', this.groupId, this.expenseId], {
        queryParams: {
          repeating: this.repeatingExpense, // true oder false übergeben
        },
      });
    } else {
      console.error('Expense ID not found');
    }
  }

  async requestPayment() {
    if (!this.groupId || !this.uid) {
      console.error('Fehlende groupId oder aktuelle UID.');
      return;
    }

    const expenseData = this.expense[0];
    if (!expenseData) {
      console.error('Keine Ausgabe geladen.');
      return;
    }

    try {
      const myName = this.user || 'Jemand';

      // Filtere Mitglieder:
      // - die nicht bezahlt haben
      // - die nicht selbst der Zahler sind
      // - deren Anteil > 0 ist
      const unpaidMembers = expenseData.expenseMember.filter(
        (member) =>
          !member.paid && member.memberId !== expenseData.paidBy &&
          member.amountToPay > 0
      );

      if (unpaidMembers.length === 0) {
        const alert = await this.alertController.create({
          header: 'Keine offenen Schulden',
          message: 'Alle Mitglieder haben ihre Anteile bereits bezahlt oder müssen nichts zahlen.',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }

      // Sende Push-Benachrichtigungen
      for (const member of unpaidMembers) {
        await this.pushNotificationService.sendToUser(
          member.memberId,
          `ZAHLUNGSAUFFORDERUNG von ${myName}`,
          `${myName} möchte, dass du deine Schulden für die Ausgabe "${expenseData.description}" in Höhe von ${member.amountToPay} € in der Gruppe "${this.groupname}" begleichst.`
        );
      }

      const successAlert = await this.alertController.create({
        header: 'Anfrage gesendet',
        message: 'Zahlungsanfragen wurden an alle Mitglieder gesendet, die noch nicht bezahlt haben.',
        buttons: ['OK'],
      });
      await successAlert.present();

      console.log('Push Notifications an folgende Mitglieder gesendet:', unpaidMembers.map(m => m.memberId));

    } catch (error) {
      console.error('Fehler beim Senden der Benachrichtigungen:', error);
      const errorAlert = await this.alertController.create({
        header: 'Fehler',
        message: 'Fehler beim Senden der Benachrichtigungen. Bitte versuche es erneut.',
        buttons: ['OK'],
      });
      await errorAlert.present();
    }
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

  getCategoryIcon(categoryName: string): string | undefined {
    const category = this.categories.find((c) => c.name === categoryName);
    return category?.icon;
  }

  goToTransactions() {
    this.router.navigate(['/transactions', this.groupId]);
  }

  hasUserPaid(expense: Expenses): boolean {
    if (expense.paidBy === this.uid) {
      return false; // Zahler sieht keine Anzeige "Bereits bezahlt"
    }
    const userEntry = expense.expenseMember?.find(
      (member) => member.memberId === this.uid
    );
    return !!userEntry?.paid;
  }

  showNoDebtText(expense: Expenses): boolean {
    const member = expense.expenseMember.find(m => m.memberId === this.uid);
    // keine Schulden, noch nicht bezahlt, nicht Zahler
    return !!member && member.amountToPay === 0 && !member.paid && expense.paidBy !== this.uid;
  }

  goToBalance(groupId: string, userId: string) {
    this.router.navigate([`/detailed-balance`, groupId, userId]);
  }

  confirmOrPay(expense: Expenses) {
    const balance = this.balanceMap[expense.paidBy];
    const memberEntry = expense.expenseMember.find(m => m.memberId === this.uid);
    const amountToPay = memberEntry?.amountToPay ?? 0;

    console.log('balance:', balance);
    console.log('amountToPay:', amountToPay);

    const afterPayment = balance + amountToPay;
    const epsilon = 0.01;

    console.log('afterPayment (balance + amountToPay):', afterPayment);

    const isOverpaying = afterPayment > epsilon;

    if (isOverpaying) {
      this.showOverpayAlert(expense.paidBy);
    } else {
      this.payExpense();
    }
  }


  async showOverpayAlert(userId: string) {
    const alert = await this.alertController.create({
      header: 'Deine Bilanz ist kleiner als dein Anteil an dieser Ausgabe',
      message: `Um übermäßige Zahlungen zu vermeiden, gehe zur Bilanzübersicht und begleiche deine Schulden mit ${this.getPaidByName(userId)} direkt.`,
      buttons: [
        {
          text: 'Zur Bilanzübersicht',
          handler: () => {
            this.goToBalance(this.groupId, userId);
          },
        },
      ],
    });

    await alert.present();
  }


}
