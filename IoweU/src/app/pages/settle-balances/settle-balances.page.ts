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
  showExpensesMap: { [index: number]: boolean } = {};

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

  gruppenausgleich: boolean = false;

  splitValue: { [uid: string]: number } = {};
  amountToPay: { [uid: string]: number } = {};
  deptList: {
    from: string;
    to: string;
    debt: number;
    relatedExpenses: string[];
  }[] = [{ from: '', to: '', debt: 0, relatedExpenses: [] }];

  expense: Expenses[] = [];

  async ngOnInit() {
    this.loadingService.show();
    try {
      await this.authService.waitForUser();

      this.activeRoute.queryParams.subscribe((params) => {
        this.gruppenausgleich = params['settlegroup'] === 'true';
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

      if (this.gruppenausgleich) {
        console.log('führe Gruppenausgleich durch');
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
          this.uid
        );
        if (rawDeptList) {
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
      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  //Hole Daten von Membern oder Expenses
  getMemberNameById(memberId: string): string {
    const member = this.groupMembers.find((m) => m.uid === memberId);
    return member ? member.username : 'Unbekannt';
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

  getRelatedExpensesForDebt(debt: { relatedExpenses: string[]; to: string }) {
    return this.expense.filter(
      (e) =>
        debt.relatedExpenses.includes(e.expenseId) &&
        e.expenseMember.some((member) => member.memberId === debt.to)
    );
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

  //UI Controll
  toggleExpenses(index: number) {
    this.showExpensesMap[index] = !this.showExpensesMap[index];
  }

  goBack() {
    this.navCtrl.back();
  }

  goToExpenseDetails(expenseId: string) {
    this.loadingService.show();
    try {
      this.router.navigate(['expense-details', this.groupId, expenseId]);
    } finally {
      this.loadingService.hide();
    }
  }

  // Get Data using Service functions
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

  //Make Transactions depending on calculated debts
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
        console.log('uid', this.uid);
        if (this.gruppenausgleich) {
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
}
