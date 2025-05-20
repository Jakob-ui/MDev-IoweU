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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { Expenses } from '../../services/objects/Expenses';
import { Products } from '../../services/objects/Products';
import { ExpenseService } from '../../services/expense.service';
import { GroupService } from '../../services/group.service';
import { Members } from '../../services/objects/Members';
import { Users } from '../../services/objects/Users';
import { Balances } from '../../services/objects/Balances';

import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { FunctionsModule } from '@angular/fire/functions';
import {TransactionService} from "../../services/transaction.service";
import {PushNotificationService} from "../../services/push-notification.service";

@Component({
  selector: 'app-detailed-balance',
  templateUrl: './detailed-balance.page.html',
  styleUrls: ['./detailed-balance.page.scss'],
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
    RouterLink,
    FunctionsModule
  ],
})
export class DetailedBalancePage implements OnInit {
  private authService = inject(AuthService);
  private expenseService = inject(ExpenseService);
  private groupService = inject(GroupService);
  private activeRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private firestore: Firestore = inject(Firestore);
  private transactionService = inject(TransactionService);
  private pushNotificationService = inject(PushNotificationService);

  groupname: string = '';
  iosIcons: boolean = false;
  showExpenses: boolean = false;
  showExpensesFromSelectedMember: boolean = false;

  uid: string | null = '';
  username: string | null = '';
  groupId: string | null = null;

  groupMembers: Members[] = [];
  selectedMember: Members | null = null;
  allExpenses: Expenses[] = [];

  balances: Balances[] = [];
  paidByCurrentUser: Expenses[] = [];
  paidBySelectedMember: Expenses[] = [];
  myExpenses: number = 0;
  myIncome: number = 0;

  payable: boolean = false;

  productToggles: { [expenseId: string]: boolean } = {};

  balanceDetails: any = {}; // Balance Details object for storing calculated balance
  deptList: {
    from: string;
    to: string;
    debt: number;
    relatedExpenses: string[];
  }[] = [{ from: '', to: '', debt: 0, relatedExpenses: [] }];
  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();
      if (this.authService.currentUser) {
        this.username = this.authService.currentUser.username;
        this.uid = this.authService.currentUser.uid;
        console.log('Benutzerdaten:', this.authService.currentUser);

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        const selectedMember = this.activeRoute.snapshot.paramMap.get('uid');

        const validGroupId: string = groupId || '';
        const validSelectedMember = selectedMember ?? '';

        if (validGroupId && validSelectedMember) {
          const currentGroup = await this.groupService.getGroupById(validGroupId);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members;
              this.selectedMember = this.groupMembers.find((m) => m.uid === validSelectedMember) ?? null;

              console.log('Selected Member:', this.selectedMember);
              console.log('Current User UID:', this.uid);

              // Stellen sicher, dass selectedMemberId korrekt gesetzt wird
              const currentUserId = this.uid!;
              const selectedMemberId = this.selectedMember?.uid!;

              const saldo = await this.expenseService.getBalanceBetweenUsers(
                validGroupId,
                currentUserId,
                selectedMemberId
              );

              console.log(
                `Saldo zwischen ${this.username} und ${this.selectedMember?.username}: ${saldo}`
              );

              this.balanceDetails = {
                from: this.username,
                to: this.selectedMember?.username,
                balance: saldo
              };

              console.log('Balance Details:', this.balanceDetails);

              // Ruft updateBalances mit den korrekten Parametern auf
              await this.updateBalances(validGroupId, currentUserId, selectedMemberId);
              this.allExpenses = await this.expenseService.getUnsettledExpensesByBalance(validGroupId, currentUserId, selectedMemberId);
              console.log('All Expenses:', this.allExpenses);

              this.paidByCurrentUser = this.allExpenses.filter(
                expense =>
                  (expense.paidBy === this.uid)
              );

              this.paidBySelectedMember = this.allExpenses.filter(
                expense =>
                  (expense.paidBy === this.selectedMember?.uid)
              );

              if (this.allExpenses.length > 0 || this.myBalance < 0) {
                this.payable = true;
              } else {
                this.payable = false;
              }

            } else {
              console.error('Keine Mitglieder in der Gruppe gefunden');
            }
          } else {
            console.error('Gruppe mit der ID ' + validGroupId + ' nicht gefunden');
            this.groupname = 'Unbekannte Gruppe';
          }
        } else {
          console.error('groupId oder selectedMember fehlt in der URL');
        }
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }


  get myBalance(): number {
    return this.balanceDetails.balance || 0;
  }

  async updateBalances(groupId: string, currentUserId: string, selectedMemberId: string) {
    try {
      const balance = await this.expenseService.getUserBalance(groupId, currentUserId, selectedMemberId);

      console.log("Balance:", balance);  // Überprüfe, was zurückgegeben wird

      // Setze die Werte für myIncome und myExpenses
      this.myIncome = balance.myIncome;
      this.myExpenses = balance.myExpenses;

      console.log("myIncome:", this.myIncome);  // Überprüfe den Wert von myIncome
      console.log("myExpenses:", this.myExpenses);  // Überprüfe den Wert von myExpenses
    } catch (error) {
      console.error('Fehler beim Laden der Bilanz:', error);
    }
  }

  toggleExpenses() {
    this.showExpenses = !this.showExpenses;
  }

  toggleExpensesFromSelectedMember() {
    this.showExpensesFromSelectedMember = !this.showExpensesFromSelectedMember;
  }


  toggleProducts(expenseId: string) {
    this.productToggles[expenseId] = !this.productToggles[expenseId];
  }

  getProducts(expense: any, uid: string): any[] {
    const member = expense.expenseMember?.find((m: any) => m.memberId === uid);
    return member?.products || [];
  }


  isProductsVisible(expenseId: string): boolean {
    return this.productToggles[expenseId];
  }


  goBack() {
    this.navCtrl.back();
  }
  pay() {
    if (!this.groupId) {
      console.error('groupId is null or undefined');
      return;
    }

    const relatedExpenses = this.allExpenses
      .filter((expense) => {
        const member = expense.expenseMember?.find(
          (m) => m.memberId === this.uid
        );
        return member && member.amountToPay > 0 && !member.paid;
      })
      .map((expense) => expense.expenseId);

    if (relatedExpenses.length === 0) {
      console.log('Keine offenen Ausgaben für diesen Nutzer.');
      return;
    }

    try {
        this.transactionService.settleDebtWithOneMember(
          this.groupId,
          this.selectedMember?.uid ?? '',
          this.authService.currentUser?.uid ?? '',
          this.myBalance,
          `SchuldenAusgleich mit ${this.username}`,
          relatedExpenses
        );
    } catch {
      console.log("Error occured, while paying")
    }
  }

  getAmountToPay(expense: any, uid: string | null): number {
    if (!uid || !expense || !expense.expenseMember) return 0;

    const memberEntry = expense.expenseMember.find((m: any) => m.memberId === uid);
    return memberEntry?.amountToPay || 0;
  }

  async requestPayment() {
    try {
      const toUserId = this.selectedMember?.uid;
      if (!toUserId) {
        console.error("Kein Ziel-User ausgewählt!");
        return;
      }
      const myName = this.username;

      await this.pushNotificationService.sendPushNotification(
        toUserId,
        'Schuldenanfrage',
        `${myName} möchte, dass du deine Schulden begleichst.`
      );

      // Optional: Toast oder Confirmation anzeigen
      console.log('Push gesendet!');
    } catch (error) {
      console.error('Fehler beim Senden der Benachrichtigung:', error);
    }
  }

}
