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
  getDocs,
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
  deptList: DebtEntry[] = [];
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
                balance: saldo,
              };

              console.log('Balance Details:', this.balanceDetails);

              // Ruft updateBalances mit den korrekten Parametern auf
              await this.updateBalances(
                validGroupId,
                currentUserId,
                selectedMemberId
              );
              const rawDebts = await this.transactionService.settleDebtsForID(
                validGroupId,
                currentUserId
              );
              if (rawDebts) {
                this.deptList = rawDebts.filter(
                  (debt) =>
                    (debt.from === currentUserId &&
                      debt.to === selectedMemberId) ||
                    (debt.from === selectedMemberId &&
                      debt.to === currentUserId)
                );
              } else {
                this.deptList = [];
              }
              console.log(
                'Detaillierte deptList für Anzeige (nur 1:1):',
                this.deptList
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

              this.payable = this.myBalance < 0;
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
    this.navCtrl.back();
  }

  async pay() {
    if (!this.groupId || !this.uid || !this.selectedMember?.uid) {
      console.error(
        'Fehlende groupId, aktuelle UID oder ausgewählte Mitglieder-UID.'
      );
      return;
    }

    // Wenn der aktuelle User dem selectedMember nichts schuldet, kann er nicht "bezahlen".
    // Er sollte nur anfragen, wenn der andere schuldet.
    if (this.myBalance >= 0) {
      const alert = await this.alertController.create({
        header: 'Keine Schulden zu begleichen',
        message: `${this.selectedMember.username} schuldet Ihnen Geld, oder die Bilanz ist ausgeglichen. Sie können keine Zahlung an ${this.selectedMember.username} tätigen.`,
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Der Betrag, den der aktuelle User zahlen muss (negativer Saldo)
    const amountToPay = Math.abs(this.myBalance); // Betrag ist immer positiv

    // Die `relatedExpenses` sind die IDs der Ausgaben, die zu diesem Saldo führen
    // Wir können die IDs aus der `deptList` verwenden, die wir zuvor für diese 1:1 Beziehung gefiltert haben.
    // Oder, falls die `deptList` mehrere Einträge hätte (was bei 1:1 optimiert nicht der Fall sein sollte),
    // könnten wir sie hier aggregieren. Für einen 1:1-Ausgleich ist es oft nur ein Eintrag.
    const relatedExpensesIds = this.deptList.flatMap(
      (debt) => debt.relatedExpenses
    );
    const uniqueRelatedExpensesIds = [...new Set(relatedExpensesIds)]; // Duplikate entfernen

    this.loadingService.show();
    try {
      // Aufruf der spezialisierten Funktion im TransactionService
      await this.transactionService.settleDebtWithOneMember(
        this.groupId,
        this.uid, // Der aktuelle User zahlt
        this.selectedMember.uid, // An das ausgewählte Mitglied
        amountToPay, // Der Betrag, den der aktuelle User zahlen muss
        `Schuld an ${this.selectedMember.username} beglichen`, // Grund der Transaktion
        uniqueRelatedExpensesIds // Alle relevanten Expense IDs
      );

      const alert = await this.alertController.create({
        header: 'Transaktion abgeschlossen',
        message:
          'Deine Schulden wurden erfolgreich an ' +
          this.selectedMember.username +
          ' bezahlt. Möchtest du dir die Transaktion ansehen?',
        buttons: [
          {
            text: 'Nein',
            role: 'cancel',
            handler: () => {
              this.router.navigate(['expense', this.groupId]); // Zurück zur Ausgabenübersicht
            },
          },
          {
            text: 'Ja',
            handler: () => {
              this.router.navigate(['transactions', this.groupId]); // Zu den Transaktionen
            },
          },
        ],
      });
      await alert.present();
    } catch (error) {
      console.error('Fehler beim Ausführen der Zahlung:', error);
      const errorAlert = await this.alertController.create({
        header: 'Fehler',
        message:
          'Ein Fehler ist beim Begleichen der Schulden aufgetreten. Bitte versuche es erneut.',
        buttons: ['OK'],
      });
      await errorAlert.present();
    } finally {
      this.loadingService.hide();
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
      const toUserId = this.selectedMember?.uid;
      if (!toUserId) {
        console.error('Kein Ziel-User ausgewählt!');
        return;
      }
      const myName = this.username;

      // Stelle sicher, dass du nur eine Anfrage sendest, wenn das selectedMember dir etwas schuldet (myBalance > 0)
      if (this.myBalance <= 0) {
        const alert = await this.alertController.create({
          header: 'Keine Anfrage möglich',
          message: `Sie schulden ${this.selectedMember.username} Geld, oder die Bilanz ist ausgeglichen. Sie können keine Zahlung anfordern.`,
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }

      await this.pushNotificationService.sendPushNotification(
        toUserId,
        'Schuldenanfrage',
        `${myName} möchte, dass du deine Schulden begleichst.`
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
