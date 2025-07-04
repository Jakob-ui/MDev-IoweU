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
import { AlertController, NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { Expenses } from '../../services/objects/Expenses';
import { ExpenseService } from '../../services/expense.service';
import { GroupService } from '../../services/group.service';
import { Members } from '../../services/objects/Members';
import { Balances } from '../../services/objects/Balances';
import {
  Firestore,
  collection,
  query,
  where,
} from '@angular/fire/firestore';
import { FunctionsModule } from '@angular/fire/functions';
import { TransactionService } from '../../services/transaction.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { DebtEntry } from 'src/app/services/objects/DeptEntry';

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
    FunctionsModule,
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
  private alertController = inject(AlertController);

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

  balanceDetails: any = {};

  private unsubscribeBalance: (() => void) | null = null;

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
          const currentGroup = await this.groupService.getGroupById(
            validGroupId
          );

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members;
              this.selectedMember =
                this.groupMembers.find((m) => m.uid === validSelectedMember) ??
                null;

              if (!this.selectedMember) {
                console.error(
                  `Mitglied mit UID ${selectedMember} nicht gefunden.`
                );
                this.loadingService.hide();
                return;
              }

              console.log('Selected Member:', this.selectedMember);
              console.log('Current User UID:', this.uid);

              // Stellen sicher, dass selectedMemberId korrekt gesetzt wird
              const currentUserId = this.uid!;
              const selectedMemberId = this.selectedMember?.uid!;

              this.unsubscribeBalance =
                this.expenseService.getBalanceBetweenUsersRealtime(
                  validGroupId,
                  currentUserId,
                  selectedMemberId,
                  (saldo) => {
                    this.balanceDetails = {
                      from: this.username,
                      to: this.selectedMember?.username,
                      balance: saldo,
                    };
                    console.log(
                      `Saldo zwischen ${this.username} und ${this.selectedMember?.username}: ${saldo}`
                    );
                    console.log('Balance Details:', this.balanceDetails);
                  }
                );



              console.log('Balance Details:', this.balanceDetails);

              // Ruft updateBalances mit den korrekten Parametern auf
              await this.updateBalances(
                validGroupId,
                currentUserId,
                selectedMemberId
              );

              this.allExpenses =
                await this.expenseService.getUnsettledExpensesByBalance(
                  validGroupId,
                  currentUserId,
                  selectedMemberId
                );
              console.log('All Expenses (unsettled 1:1):', this.allExpenses);

              this.paidByCurrentUser = this.allExpenses.filter(
                (expense) => expense.paidBy === this.uid
              );
              this.paidBySelectedMember = this.allExpenses.filter(
                (expense) => expense.paidBy === this.selectedMember?.uid
              );

              this.payable = this.myBalance !== 0;
            } else {
              console.error('Keine Mitglieder in der Gruppe gefunden');
            }
          } else {
            console.error(
              'Gruppe mit der ID ' + validGroupId + ' nicht gefunden'
            );
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

  ngOnDestroy() {
    if (this.unsubscribeBalance) {
      this.unsubscribeBalance();
    }
  }

  get myBalance(): number {
    return this.balanceDetails.balance || 0;
  }

  async updateBalances(
    groupId: string,
    currentUserId: string,
    selectedMemberId: string
  ) {
    try {
      const balance = await this.expenseService.getUserBalance(
        groupId,
        currentUserId,
        selectedMemberId
      );

      console.log('Balance:', balance); // Überprüfe, was zurückgegeben wird

      // Setze die Werte für myIncome und myExpenses
      this.myIncome = balance.myIncome;
      this.myExpenses = balance.myExpenses;

      console.log('myIncome:', this.myIncome); // Überprüfe den Wert von myIncome
      console.log('myExpenses:', this.myExpenses); // Überprüfe den Wert von myExpenses
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
    if (this.uid) {
      this.router.navigate(['/finance', this.groupId], {
      });
    } else {
      console.error('UID not found');
    }
  }

  payBalance() {
    if (this.uid) {
      this.router.navigate(['/pay-balance', this.groupId, this.selectedMember?.uid], {
      });
    } else {
      console.error('UID not found');
    }
  }

  getAmountToPay(expense: any, uid: string | null): number {
    if (!uid || !expense || !expense.expenseMember) return 0;

    const memberEntry = expense.expenseMember.find(
      (m: any) => m.memberId === uid
    );
    return memberEntry?.amountToPay || 0;
  }

  async requestPayment() {
    if (!this.groupId || !this.uid || !this.selectedMember?.uid) {
      console.error(
        'Fehlende groupId, aktuelle UID oder ausgewählte Mitglieder-UID.'
      );
      return;
    }

    try {
      const toUserId = this.selectedMember.uid;
      const myName = this.username;

      if (this.myBalance <= 0) {
        const alert = await this.alertController.create({
          header: 'Keine Anfrage möglich',
          message: `Sie schulden ${this.selectedMember.username} Geld, oder die Bilanz ist ausgeglichen. Sie können keine Zahlung anfordern.`,
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }

      // 📲 Push Notification an ALLE Geräte des Empfängers senden (neue Methode im Service)
      await this.pushNotificationService.sendToUser(
        toUserId,
        `ZAHLUNGSAUFFORDERUNG von ${myName}`,
        `${myName} möchte, dass du deine Schulden in Höhe von ${this.myBalance.toFixed(
          2
        )} € in der Gruppe "${this.groupname}" begleichst.`
      );

      const successAlert = await this.alertController.create({
        header: 'Anfrage gesendet',
        message: `Eine Zahlungsanfrage wurde an ${this.selectedMember.username} gesendet.`,
        buttons: ['OK'],
      });
      await successAlert.present();

      console.log('Push gesendet!');
    } catch (error) {
      console.error('Fehler beim Senden der Benachrichtigung:', error);
      const errorAlert = await this.alertController.create({
        header: 'Fehler',
        message:
          'Fehler beim Senden der Benachrichtigung. Bitte versuche es erneut.',
        buttons: ['OK'],
      });
      await errorAlert.present();
    }
  }
}
