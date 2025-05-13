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
  lastVisibleDoc: any | null = null;
  isLoadingMore: boolean = false;
  hasMoreExpenses: boolean = true;
  unsubscribeExpenses: (() => void) | null = null;

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
          if (this.currentGroup === null) {
            this.currentGroup = await this.groupService.getGroupById(groupId);
          }

          if (this.currentGroup) {
            this.groupname = this.currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = this.currentGroup.groupId || '';
            await this.loadInitialExpenses();
          } else {
            console.error(
              'Gruppe mit der ID ' + this.groupId + ' nicht gefunden'
            );
            this.groupname = 'Unbekannte Gruppe';
          }
        }
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  ngOnDestroy() {
    if (this.unsubscribeExpenses) {
      this.unsubscribeExpenses();
      console.log('Unsubscribed from expense updates');
    }
  }

  get repeatingExpenses() {
    return this.expenses.filter(
      (expense) => expense.repeat && expense.repeat.toLowerCase() !== 'nein'
    );
  }

  goToExpenseDetails(expenseId: string, isRepeating: boolean = true) {
    this.loadingService.show();
    try {
      this.router.navigate(['expense-details', this.groupId, expenseId], {
        queryParams: { repeating: isRepeating },
      });
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

  async loadInitialExpenses() {
    this.loadingService.show();
    try {
      // Beende die vorherige Subscription, falls vorhanden
      if (this.unsubscribeExpenses) {
        this.unsubscribeExpenses();
        console.log('Vorherige Subscription beendet.');
      }

      // Starte eine neue Subscription
      this.unsubscribeExpenses =
        await this.expenseService.getPaginatedAndRealtimeExpenses(
          this.groupId!,
          null,
          30,
          true,
          (expenses) => {
            this.expenses = expenses;
            this.groupExpensesByDate(this.expenses);
          }
        );
    } catch (error) {
      console.error('Fehler beim Laden der Ausgaben:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  groupExpensesByDate(expenses: Expenses[]) {
    const grouped: { [key: string]: Expenses[] } = {};

    for (const expense of expenses) {
      const date = new Date(expense.date).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(expense);
    }
  }

  goBack() {
    this.router.navigate(['/expense', this.groupId]);
  }
}
