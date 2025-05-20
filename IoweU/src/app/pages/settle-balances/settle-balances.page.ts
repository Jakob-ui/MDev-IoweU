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
import { DebtEntry } from 'src/app/services/objects/DeptEntry';


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
  deptList: DebtEntry[] = [];

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
        console.log('Berechne Gruppenausgleich...');
        // Direkt zuweisen, da der Rückgabetyp bereits DebtEntry[] ist
        this.deptList =
          await this.transactionService.getCalculatedGroupSettlementDebts(
            this.groupId
          );
        console.log(
          'Berechnete Ausgleichstransaktionen (Gruppenausgleich):',
          this.deptList
        );
      } else {
        console.log('Berechne Einzelausgleich...');
        // Direkt zuweisen, da der Rückgabetyp bereits DebtEntry[] ist
        this.deptList =
          (await this.transactionService.settleDebtsForID(
            this.groupId,
            this.uid
          )) || []; // Sicherstellen, dass es nicht null ist
        console.log(
          'Berechnete Ausgleichstransaktionen (Einzelausgleich):',
          this.deptList
        );
      }
      await this.loadRelatedExpenses();
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

  getRelatedExpensesForDebt(debt: DebtEntry) {
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
    if (!this.deptList || this.deptList.length === 0) {
      this.expense = [];
      return;
    }

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
    try {
      await this.transactionService.executeSettlementTransactions(
        this.groupId,
        this.deptList, 
        this.gruppenausgleich
      );
    } catch (error) {
      console.error('Fehler beim Ausführen der Zahlung:', error);
      const errorAlert = await this.alertController.create({
        header: 'Fehler',
        message:
          'Ein Fehler ist beim Begleichen der Schulden aufgetreten. Bitte versuche es erneut.',
        buttons: ['OK'],
      });
    } finally {
      this.loadingService.hideLittle();
    }
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