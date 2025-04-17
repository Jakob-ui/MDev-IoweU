import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem,
  IonList,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { ActivatedRoute } from '@angular/router';
import { ExpenseService } from 'src/app/services/expense.service';
import { Expenses } from 'src/app/services/objects/Expenses';
import { Groups } from 'src/app/services/objects/Groups';
import { ExpenseMember } from '../../services/objects/ExpenseMember';

@Component({
  selector: 'app-repeating-expenses',
  templateUrl: './repeating-expenses.page.html',
  styleUrls: ['./repeating-expenses.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonItem,
    IonList,
    RouterModule,
    IonButton,
    IonIcon,
  ],
})
export class RepeatingExpensesPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private activeRoute = inject(ActivatedRoute);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;

  groupname: string = '';
  groupId: string | null = '';
  groupMembers: any[] = [];
  iosIcons: boolean = false;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  sumExpenses: number = 0;
  countExpenses: number = 0;
  currentMonth: string = '';
  currentYear: number = 0;

  expenses: Expenses[] = [];
  currentGroup: Groups | null = null;

  updateExpensesCallback: (() => void) | null = null;
  private navCtrl: any;

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        console.log('Benutzer GroupId:', groupId);

        if (groupId) {
          this.currentGroup = await this.groupService.getGroup();
          console.log('diese jetzige gruppe', this.currentGroup);
          if (this.currentGroup === null) {
            this.currentGroup = await this.groupService.getGroupById(groupId);
            console.log('leere Gruppe, hole gruppe aus der db');
          }

          if (this.currentGroup) {
            this.groupname = this.currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = this.currentGroup.groupId || '';

            // Lade die Ausgaben
            if (
              this.currentGroup.hasOwnProperty('expenses') &&
              Array.isArray(this.currentGroup.expenseId)
            ) {
              console.log('Expenses gefunden:', this.currentGroup.expenseId);
              this.expenses = this.currentGroup.expenseId.map(
                (expenseId: string) => ({
                  expenseId: expenseId,
                  description: '',
                  totalAmount: 0,
                  paidBy: '',
                  date: new Date().toISOString().split('T')[0],
                  currency: ['EUR', 'USD', 'GBP', 'JPY', 'AUD'],
                  category: '',
                  invoice: '',
                  repeat: '',
                  splitBy: 'alle',
                  splitType: 'prozent',
                  expenseMember: [],
                })
              );
            } else {
              console.warn(
                'Keine Ausgaben gefunden oder expenses ist kein Array'
              );
              this.expenses = [];
            }

            // Initialisiere Mitglieder und expenseMember
            if (
              this.currentGroup.members &&
              this.currentGroup.members.length > 0
            ) {
              this.groupMembers = this.currentGroup.members.map(
                (member: any) => ({
                  ...member,
                  amount: 0,
                })
              );

              this.expenses.forEach((expense) => {
                expense.expenseMember = this.groupMembers.map((member) => ({
                  memberId: member.uid,
                  amountToPay: 0,
                  split: 1,
                  products: [],
                }));
              });
            }

            // Berechne die Balance, nachdem die Ausgaben geladen wurden
            const { total, count } = this.expenseService.calculateBalance(
              this.expenses
            );

            this.sumExpenses = total;
            this.countExpenses = count;
          } else {
            console.error(
              'Gruppe mit der ID ' + this.groupId + ' nicht gefunden'
            );
            this.groupname = 'Unbekannte Gruppe';
          }
        }

        // Echtzeit-Listener für Ausgaben
        this.updateExpensesCallback =
          await this.expenseService.getExpenseByGroup(
            this.groupId || '',
            (expensestest) => {
              console.log('Updated expenses:', expensestest);
              this.expenses = Array.isArray(expensestest) ? expensestest : [];
              const { total, count } = this.expenseService.calculateBalance(
                this.expenses
              );
              this.sumExpenses = total;
              this.countExpenses = count;
              this.expenseService.updateSums(
                this.groupId || '',
                this.sumExpenses,
                this.countExpenses,
                'sumTotalExpenses',
                'countTotalExpenses'
              );
            }
          );
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }
  get repeatingExpenses() {
    return this.expenses.filter(
      (expense) => expense.repeat && expense.repeat.toLowerCase() !== 'nein'
    );
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

  goToCreateExpense() {
    this.loadingService.show();
    try {
      this.router.navigate(['create-expense', this.groupId]);
    } finally {
      this.loadingService.hide();
    }
  }

  goBack() {
    this.router.navigate(['/expense', this.groupId]);
  }
}
