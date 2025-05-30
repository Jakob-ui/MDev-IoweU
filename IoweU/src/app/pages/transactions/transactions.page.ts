import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonBadge,
  IonCard,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { Transactions } from '../../services/objects/Transactions';
import { Members } from '../../services/objects/Members';
import { Groups } from 'src/app/services/objects/Groups';
import { TransactionService } from 'src/app/services/transaction.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonList,
    IonBadge,
    IonCard,
    IonIcon,
    RouterModule,
  ],
})
export class TransactionsPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private transactionService = inject(TransactionService);

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId: string | null = null;

  myBalance: number = 666;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers: Members[] = []; // Mitglieder, die in der Gruppe sind
  transactions: Transactions[] = []; // Liste der Transaktionen
  currentGroup: Groups | null = null;
  updateTransactionsCallback: (() => void) | null = null;

  animatedBalance: number = 0;

  constructor() {}

  async ngOnInit() {
    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        this.user = this.authService.currentUser.username;
        this.uid = this.authService.currentUser.uid;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

        if (groupId) {
          this.currentGroup = await this.groupService.currentGroup;
          console.log('diese jetzige gruppe', this.currentGroup);
          this.updateTransactionsCallback =
            await this.transactionService.getTransactionsByName(
              this.uid,
              groupId,
              (updatedTransactions) => {
                this.transactions = updatedTransactions;
                console.log('Aktualisierte Transaktionen:', this.transactions);
                // Rechne myBalance neu, wenn sich Transaktionen ändern
                if (
                  this.currentGroup &&
                  this.currentGroup.members &&
                  this.currentGroup.members.length > 0
                ) {
                  const member = this.currentGroup.members.find(
                    (m) => m.username === this.user
                  );
                  if (!member) {
                    this.myBalance = 0;
                  } else {
                    this.myBalance =
                      member.sumExpenseAmount -
                      member.sumAmountReceived +
                      member.sumAmountPaid -
                      member.sumExpenseMemberAmount;
                  }
                  this.animateBalance(this.myBalance);
                }
              }
            );
          if (this.currentGroup === null) {
            this.currentGroup = await this.groupService.getGroupById(groupId);
            console.log('leere Gruppe, hole gruppe aus der db');
          }

          if (this.currentGroup) {
            this.groupname = this.currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = this.currentGroup.groupId || '';

            if (
              this.currentGroup.members &&
              this.currentGroup.members.length > 0
            ) {
              this.groupMembers = this.currentGroup.members;
              const member = this.groupMembers.find((m) => m.username === this.user);
              if (!member) {
                this.myBalance = 0;
              } else {
                this.myBalance =
                  member.sumExpenseAmount -
                  member.sumAmountReceived +
                  member.sumAmountPaid -
                  member.sumExpenseMemberAmount;
              }
              this.animateBalance(this.myBalance);
            } else {
              console.error('Keine Mitglieder in der Gruppe gefunden');
            }
          } else {
            console.error('Gruppe mit der ID ' + groupId + ' nicht gefunden');
            this.groupname = 'Unbekannte Gruppe';
          }
        } else {
          console.error('Kein GroupId für den Benutzer gefunden');
          this.groupname = 'Unbekannte Gruppe';
        }
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }

      this.iosIcons = this.platform.is('ios');
      // this.animatedBalance = this.myBalance ?? 0; // Entfernt, da animateBalance immer aufgerufen wird
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  ngOnDestroy() {
    if (this.updateTransactionsCallback) {
      this.updateTransactionsCallback();
      console.log('Unsubscribed from expense updates');
    }
  }

  getMemberNameById(memberId: string): string {
    const member = this.groupMembers.find((m) => m.uid === memberId);
    return member ? member.username : 'Unbekannt';
  }

  getTransactionImpact(transaction: Transactions): {
    status: string;
    balanceClass: string;
    amount: number;
  } {
    if (transaction.from === this.uid) {
      // Der Benutzer hat gezahlt
      return {
        status: 'bezahlt',
        balanceClass: 'negative',
        amount: transaction.amount,
      };
    } else if (transaction.to === this.uid) {
      // Der Benutzer hat etwas erhalten
      return {
        status: 'bekommen',
        balanceClass: 'positive',
        amount: transaction.amount,
      };
    } else {
      // Der Benutzer ist nicht an der Transaktion beteiligt
      return {
        status: '',
        balanceClass: '',
        amount: transaction.amount,
      };
    }
  }

  goBack() {
    this.router.navigate(['/group', this.groupId]);
  }

  animateBalance(target: number) {
    const duration = 500;
    const frameRate = 30;
    const steps = Math.max(1, Math.round(duration / (1000 / frameRate)));
    const start = this.animatedBalance;
    const diff = target - start;
    if (diff === 0) return;
    let currentStep = 0;

    const stepFn = () => {
      currentStep++;
      this.animatedBalance = +(start + (diff * currentStep) / steps).toFixed(2);
      if (currentStep < steps) {
        setTimeout(stepFn, 1000 / frameRate);
      } else {
        this.animatedBalance = target;
      }
    };

    stepFn();
  }
}
