import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {AlertController, ToastController} from '@ionic/angular';

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
  IonToolbar} from '@ionic/angular/standalone';

// Import interfaces
import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';
import { TransactionService } from 'src/app/services/transaction.service';
import { Transactions } from 'src/app/services/objects/Transactions';
import { CATEGORIES } from 'src/app/services/objects/Categories';
import {PushNotificationService} from "../../services/push-notification.service";
import {Firestore} from "@angular/fire/firestore";
import {Members} from "../../services/objects/Members";
import {Balances} from "../../services/objects/Balances";


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
  selector: 'app-pay-balance',
  templateUrl: './pay-balance.page.html',
  styleUrls: ['./pay-balance.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, CommonModule, FormsModule, IonBadge, IonButton, IonIcon]
})
export class PayBalancePage{
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
  private toastController = inject(ToastController);

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


  async pay() {
    if (!this.groupId || !this.uid || !this.selectedMember?.uid) {
      console.error(
        'Fehlende groupId, aktuelle UID oder ausgewählte Mitglieder-UID.'
      );
      return;
    }

    if (this.myBalance >= 0) {
      const alert = await this.alertController.create({
        header: 'Keine Schulden zu begleichen',
        message: `${this.selectedMember.username} schuldet Ihnen Geld, oder die Bilanz ist ausgeglichen. Sie können keine Zahlung an ${this.selectedMember.username} tätigen.`,
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const amountToPay = Math.abs(this.myBalance);

    this.loadingService.show();
    try {
      // Aufruf der spezialisierten Funktion im TransactionService
      await this.transactionService.settleDebtWithOneMember(
        this.groupId,
        this.uid,
        this.selectedMember.uid,
        amountToPay,
        `Schulden bei ${this.selectedMember.username}`,
        this.allExpenses,
      );

      const alert = await this.alertController.create({
        header: 'Transaktion abgeschlossen',
        message:
          'Deine Schulden wurden erfolgreich an ' +
          this.selectedMember.username +
          ' beglichen. Möchtest du dir die Transaktion ansehen?',
        buttons: [
          {
            text: 'Nein',
            role: 'cancel',
            handler: () => {
              this.router.navigate(['detailed-balance', this.groupId, this.selectedMember?.uid]);
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

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      cssClass: 'custom-toast',
    });
    await toast.present();
  }

}
