import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonList,
  IonBadge,
  IonCard,
  IonButton,
  IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
} from '@ionic/angular/standalone';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { Expenses } from 'src/app/services/objects/Expenses';
import { Members } from 'src/app/services/objects/Members';

@Component({
  selector: 'app-expense',
  templateUrl: './expense.page.html',
  styleUrls: ['./expense.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonItem,
    IonList,
    IonBadge,
    IonCard,
    RouterModule,
    IonButton,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
  ],
})
export class ExpensePage implements OnInit, OnDestroy {
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
  groupMembers: Members[] = []; // Verwenden Sie das Members-Interface
  iosIcons: boolean = false;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  sumExpenses: number = 0;
  countExpenses: number = 0;
  currentMonth: string = '';
  currentYear: number = 0;

  expenses: Expenses[] = [];
  groupedExpenses: { date: string; expenses: Expenses[] }[] = [];

  updateExpensesCallback: (() => void) | null = null;

  visibleGroupedExpenses: { date: string; expenses: Expenses[] }[] = [];
  private pageSize = 10;
  private currentIndex = 0;


  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

        if (groupId) {
          const currentGroup = await this.groupService.getGroupById(groupId);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            // Lade die Mitglieder der Gruppe
            if (currentGroup.members && Array.isArray(currentGroup.members)) {
              this.groupMembers = currentGroup.members;
            } else {
              console.warn(
                'Keine Mitglieder in der Gruppe gefunden oder members ist kein Array'
              );
              this.groupMembers = [];
            }

            // Lade die Ausgaben
            if (
              currentGroup.hasOwnProperty('expenses') &&
              Array.isArray(currentGroup.expenseId)
            ) {
              console.log('Expenses gefunden:', currentGroup.expenseId);
              this.expenses = currentGroup.expenseId.map(
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

            // Initialisiere expenseMember
            this.expenses.forEach((expense) => {
              expense.expenseMember = this.groupMembers.map((member) => ({
                memberId: member.uid,
                amountToPay: 0,
                split: 1,
                products: [],
              }));
            });

            /*
            // Berechne die Balance, nachdem die Ausgaben geladen wurden
            const { total, count } = this.expenseService.calculateBalance(
              this.expenses
            );

            this.sumExpenses = total;
            this.countExpenses = count;*/
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
            false,
            (expensestest) => {
              this.expenses = Array.isArray(expensestest) ? expensestest : [];

              // Neue Zeile für Gruppierung
              this.groupExpensesByDate();

              const { total, count } = this.expenseService.calculateBalance(
                this.expenses
              );
              this.sumExpenses = total;
              this.countExpenses = count;
              /*this.expenseService.updateSums(
                this.groupId || '',
                this.sumExpenses,
                this.countExpenses,
                'sumTotalExpenses',
                'countTotalExpenses'
              );*/
            }
          );
          setTimeout(() => {
            const infiniteScrollEl = document.querySelector('ion-infinite-scroll') as HTMLIonInfiniteScrollElement;
            if (infiniteScrollEl) {
              infiniteScrollEl.disabled = false;
            }
          }, 0);
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
    if (this.updateExpensesCallback) {
      this.updateExpensesCallback();
      console.log('Unsubscribed from expense updates');
    }
  }

  async logout() {
    this.loadingService.show();
    try {
      await this.authService.logout();
      this.router.navigate(['login']);
    } catch (e) {
      console.error('Fehler beim Logout:', e);
    } finally {
      this.loadingService.hide();
    }
  }

  // Navigation zu den Details einer Ausgabe
  goToExpenseDetails(expenseId: string) {
    this.loadingService.show();
    try {
      // Hier wird der expenseId der aktuellen Ausgabe übergeben
      this.router.navigate(['expense-details', this.groupId, expenseId]);
    } finally {
      this.loadingService.hide();
    }
  }

  // Navigation zur Seite zum Erstellen einer neuen Ausgabe
  goToCreateExpense() {
    this.loadingService.show();
    try {
      this.router.navigate(['create-expense', this.groupId]);
    } finally {
      this.loadingService.hide();
    }
  }

  getUserAmount(expense: Expenses): number {
    const userEntry = expense.expenseMember?.find(
      (member) => member.memberId === this.uid
    );
    return userEntry?.amountToPay ?? 0;
  }

  getAmountClass(expense: Expenses): string {
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

  groupExpensesByDate() {
    const grouped: { [key: string]: Expenses[] } = {};

    for (const expense of this.expenses) {
      const date = new Date(expense.date).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(expense);
    }

    // In korrektes Format umwandeln und nach Datum sortieren (neueste zuerst)
    this.groupedExpenses = Object.keys(grouped)
      .map((date) => ({
        date: date,
        expenses: grouped[date],
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Nur den Anfang anzeigen
    this.currentIndex = 0;
    this.visibleGroupedExpenses = this.groupedExpenses.slice(0, this.pageSize);
  }


  getFirstLetter(paidBy: string): string {
    const member = this.groupMembers.find((m) => m.uid === paidBy);
    if (member && member.username && member.username.length > 0) {
      return member.username.charAt(0).toUpperCase();
    }
    return '';
  }

  goBack() {
    this.router.navigate(['/group', this.groupId]);
  }

  loadMoreExpenses(event: any) {
    setTimeout(() => {
      this.currentIndex += this.pageSize;
      const nextItems = this.groupedExpenses.slice(0, this.currentIndex + this.pageSize);
      this.visibleGroupedExpenses = nextItems;

      event.target.complete();

      // Wenn alles geladen ist, disable infinite scroll
      if (this.visibleGroupedExpenses.length >= this.groupedExpenses.length) {
        event.target.disabled = true;
      }
    }, 500);
  }


}
