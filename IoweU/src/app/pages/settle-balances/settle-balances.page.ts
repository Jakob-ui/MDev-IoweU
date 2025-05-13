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
  IonItem,
  IonList,
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
import { CATEGORIES } from 'src/app/services/objects/Categories';

@Component({
  selector: 'app-settle-balances',
  templateUrl: './settle-balances.page.html',
  styleUrls: ['./settle-balances.page.scss'],
  standalone: true,
  imports: [
    IonList,
    IonItem,
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
  private transactionService = inject(TransactionService);
  private alertController = inject(AlertController);

  groupname: string = '';
  iosIcons: boolean = false;
  showExpenses: boolean = false;

  uid: string = '';
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
  gruppenausgleich: boolean = false;

  splitValue: { [uid: string]: number } = {};
  amountToPay: { [uid: string]: number } = {};
  deptList: {
    from: string;
    to: string;
    debt: number;
    relatedExpenses: string[];
  }[] = [{ from: '', to: '', debt: 0, relatedExpenses: [] }];
  products: Products[] = [];

  visibleProducts: { [key: string]: boolean } = {};

  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  categories = CATEGORIES;

  expense: Expenses[] = [
    {
      expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
      description: '',
      totalAmount: 0,
      paidBy: '',
      date: new Date().toISOString().split('T')[0],
      currency: ['EUR', 'USD', 'GBP', 'JPY', 'AUD'],
      category: '',
      invoice: '',
      repeat: '',
      splitType: 'prozent',
      splitBy: 'alle',
      expenseMember: [
        {
          memberId: '',
          amountToPay: 0,
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
      if (this.gruppenausgleich){
        const rawDeptList = await this.transactionService.settleAllDepts(
          this.groupId
        );
        this.deptList = rawDeptList.map(
          ([from, to, debt, relatedExpenses]) => ({
            from,
            to,
            debt,
            relatedExpenses,
          })
        );
        await this.loadRelatedExpenses();
        console.log('Berechnete Ausgleichstransaktionen:', this.deptList);
      } else {
        const rawDeptList = await this.transactionService.settleDebtsForID(
          this.groupId,
          this.uid,
        );
        if(rawDeptList){
        this.deptList = rawDeptList.map((dept) => ({
          from: dept.from,
          to: dept.to,
          debt: dept.debt,
          relatedExpenses: dept.relatedExpenses,
        }));
        await this.loadRelatedExpenses();
          console.log('Berechnete Ausgleichstransaktionen:', this.deptList);
        }
      }

      this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
      this.groupMembers = currentGroup.members || [];

      this.memberUsernames = this.groupMembers.map((m) => m.username || '');
      this.memberIds = this.groupMembers.map((m) => m.memberId || '');
      this.memberColors = this.groupMembers.map((m) => m.color || '');
      this.memberRoles = this.groupMembers.map((m) => m.role || '');
      this.memberUids = this.groupMembers.map((m) => m.uid || '');

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  getMemberNameById(memberId: string): string {
    const member = this.groupMembers.find((m) => m.uid === memberId);
    return member ? member.username : 'Unbekannt';
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
    if (!this.expense || this.expense.length === 0) {
      return []; 
    }

    const expense = this.expense[0]; 

    if (!expense.expenseMember) {
      return []; 
    }

    const member = expense.expenseMember.find((m) => m.memberId === memberId);

    return member?.products ?? [];
  }

  goBack() {
    this.navCtrl.back();
  }

  getFirstLetter(paidBy: string): string {
    const member = this.groupMembers.find((m) => m.uid === paidBy);
    if (member && member.username && member.username.length > 0) {
      return member.username.charAt(0).toUpperCase();
    }
    return '';
  }

  getUserAmount(expense: Expenses): number {
    if (!expense || !expense.expenseMember) {
      return 0;
    }

    const userEntry = expense.expenseMember.find(
      (member) => member.memberId === this.uid
    );
    return userEntry?.amountToPay ?? 0;
  }

  getAmountClass(expense: Expenses): string {
    if (!expense) {
      return 'neutral';
    }

    const amount = this.getUserAmount(expense);
    const isPaidByCurrentUser = expense.paidBy === this.uid;

    if (isPaidByCurrentUser) {
      return 'neutral';
    }
    if (amount > 0) {
      return 'negative';
    }
    return 'neutral';
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

  async loadRelatedExpenses() {
    const relatedExpenseIds = this.deptList.flatMap(
      (debt) => debt.relatedExpenses
    );

    try {
      const filteredExpenses =
        await this.transactionService.getFilteredRelatedExpenses(
          this.groupId,
          relatedExpenseIds,
          this.uid!
        );

      console.log('Gefilterte Ausgaben:', filteredExpenses);
      this.expense = filteredExpenses; 
    } catch (error) {
      console.error('Fehler beim Laden der gefilterten Ausgaben:', error);
    }
  }

  async pay() {
    this.loadingService.showLittle();
    for (let debtmember of this.deptList) {
      try {
        const transaction: Transactions = {
          from: debtmember.from,
          to: debtmember.to,
          amount: debtmember.debt,
          reason: 'Gruppenausgleich',
          date: new Date().toISOString(),
          relatedExpenses: debtmember.relatedExpenses,
        };
        console.log('transaction', transaction);
        if (
          Array.isArray(debtmember.relatedExpenses)
            ? debtmember.relatedExpenses
            : [debtmember.relatedExpenses]
        ) {
          await this.transactionService.makeTransactionById(
            this.groupId,
            debtmember.relatedExpenses,
            debtmember.from,
            transaction
          );
        }
        console.log("uid", this.uid);
        if (this.gruppenausgleich){
          for (const expenseId of debtmember.relatedExpenses) {
            await this.transactionService.markMembersAsPaid(
              this.groupId,
              expenseId
            );
          }
        } else {
          for (const expenseId of debtmember.relatedExpenses) {
            // Finde die Expense in der geladenen Liste
            const expense = this.expense.find((e) => e.expenseId === expenseId);
            const userEntry = expense?.expenseMember.find(
              (m) => m.memberId === this.uid
            );

            // Nur wenn noch nicht bezahlt und amountToPay > 0
            if (userEntry && !userEntry.paid && userEntry.amountToPay > 0) {
              await this.transactionService.markMembersAsPaid(
                this.groupId,
                expenseId,
                this.uid
              );
            }
          }
        }
      } catch (error) {
        console.error(
          `Fehler beim Erstellen der Transaktion für ${debtmember.from} -> ${debtmember.to}:`,
          error
        );
      } finally {
        this.loadingService.hideLittle();
      }
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

  goToExpenseDetails(expenseId: string) {
    this.loadingService.show();
    try {
      // Hier wird der expenseId der aktuellen Ausgabe übergeben
      this.router.navigate(['expense-details', this.groupId, expenseId]);
    } finally {
      this.loadingService.hide();
    }
  }
}
