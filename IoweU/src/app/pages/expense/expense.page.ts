import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem,
  IonList,
  IonBadge,
  IonCard,
  IonButton,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonLabel,
} from '@ionic/angular/standalone';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { Expenses } from 'src/app/services/objects/Expenses';
import { Members } from 'src/app/services/objects/Members';
import { FormsModule } from '@angular/forms';
import { CATEGORIES } from 'src/app/services/objects/Categories';

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
    IonSearchbar,
    FormsModule,
    IonLabel,
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

  visibleGroupedExpenses: { date: string; expenses: Expenses[] }[] = [];
  private pageSize = 20;
  lastVisibleDoc: any | null = null;
  isLoadingMore: boolean = false;
  hasMoreExpenses: boolean = true;
  unsubscribeExpenses: (() => void) | null = null;
  unsubscribeGroupListener: (() => void) | null = null;

  searchTerm: string = '';
  selectedCategories: string[] = [];
  dropdownOpen: boolean = false;

  categories = CATEGORIES;

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
            //lade die ersten expenses
            await this.loadInitialExpenses();

            //erstelle einen listener der auf changes in der Gruppe horcht
            this.groupService.listenToGroupChanges(this.groupId!, (group) => {
              if (group) {
                this.sumExpenses = group.sumTotalExpenses || 0;
              } else {
                console.error('Gruppe nicht gefunden oder gelöscht.');
              }
            });

            // Initialisiere expenseMember
            this.expenses.forEach((expense) => {
              expense.expenseMember = this.groupMembers.map((member) => ({
                memberId: member.uid,
                amountToPay: 0,
                split: 1,
                products: [],
                paid: false,
              }));
            });

            /*
            // Berechne die Balance, nachdem die Ausgaben geladen wurden
            const { total, count } = this.expenseService.calculateBalance(
              this.expenses
            );

            this.sumExpenses = total;
            this.countExpenses = count;*/
            this.sumExpenses = currentGroup.sumTotalExpenses || 0;
          } else {
            console.error(
              'Gruppe mit der ID ' + this.groupId + ' nicht gefunden'
            );
            this.groupname = 'Unbekannte Gruppe';
          }
        }

        await this.loadInitialExpenses();
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      document.addEventListener(
        'click',
        this.closeDropdownOnClickOutside.bind(this)
      );
      this.loadingService.hide();
    }
  }

  ngOnDestroy() {
    if (this.unsubscribeExpenses) {
      this.unsubscribeExpenses();
      console.log('Unsubscribed from expense updates');
    }
    if (this.unsubscribeGroupListener) {
      this.unsubscribeGroupListener();
      console.log('Group listener unsubscribed');
    }
    document.addEventListener(
      'click',
      this.closeDropdownOnClickOutside.bind(this)
    );
  }

  closeDropdownOnClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.Kategorie')) {
      this.dropdownOpen = false;
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

  filterExpenses() {
    let filteredExpenses = this.expenses;

    // Wenn "Alle" ausgewählt wurde, sollen alle Ausgaben angezeigt werden
    if (this.selectedCategories && this.selectedCategories.length > 0) {
      if (this.selectedCategories.includes('Alle')) {
        // Wenn "Alle" ausgewählt ist, zeige alle Ausgaben ohne Filterung nach Kategorien
        filteredExpenses = this.expenses;
      } else {
        // Andernfalls filtere nach den ausgewählten Kategorien
        filteredExpenses = filteredExpenses.filter(
          (expense) =>
            expense.category &&
            this.selectedCategories.includes(expense.category)
        );
      }
    }

    // Filter nach Suchbegriff
    if (this.searchTerm) {
      filteredExpenses = filteredExpenses.filter((expense) =>
        expense.description
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase())
      );
    }

    this.groupExpensesByDate(filteredExpenses);
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

    this.groupedExpenses = Object.keys(grouped)
      .map((date) => ({
        date: date,
        expenses: grouped[date].sort((a, b) => {
          const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (timeDiff !== 0) return timeDiff;

          return a.description.localeCompare(b.description);
        }),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.visibleGroupedExpenses = this.groupedExpenses.slice(0, this.pageSize);
    console.log('Grouped expenses:', this.groupedExpenses);
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

  async loadInitialExpenses() {
    this.loadingService.show();
    try {
      if (this.unsubscribeExpenses) {
        this.unsubscribeExpenses();
        console.log('Vorherige Subscription beendet.');
      }

      // Starte eine neue Subscription
      this.unsubscribeExpenses =
        await this.expenseService.getPaginatedAndRealtimeExpenses(
          this.groupId!,
          null,
          this.pageSize,
          false,
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

  async loadMoreExpenses(event: any) {
    if (!this.hasMoreExpenses || this.isLoadingMore) {
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;

    try {
      const { expenses, lastVisible } =
        await this.expenseService.getPaginatedExpenses(
          this.groupId!,
          this.lastVisibleDoc,
          this.pageSize
        );

      // Filtere doppelte Einträge basierend auf der expenseId
      const newExpenses = expenses.filter(
        (expense) =>
          !this.expenses.some((e) => e.expenseId === expense.expenseId)
      );

      // Aktualisiere die Liste der Ausgaben
      this.expenses = [...this.expenses, ...newExpenses];
      this.groupExpensesByDate(this.expenses);

      // Aktualisiere den Cursor und die Pagination-Flags
      this.lastVisibleDoc = lastVisible;
      this.hasMoreExpenses = newExpenses.length > 0;

      event.target.complete();
    } catch (error) {
      console.error('Fehler beim Laden weiterer Ausgaben:', error);
      event.target.complete();
    } finally {
      this.isLoadingMore = false;
    }
  }

  onCategoryDropdownClick(event: Event) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  // Wählt eine Kategorie aus
  selectCategories(category: { name: string; icon: string }, event: Event) {
    event.stopPropagation();

    // Toggle-Verhalten für einfache Auswahl
    if (this.selectedCategories.includes(category.name)) {
      this.selectedCategories = this.selectedCategories.filter(
        (cat) => cat !== category.name
      );
    } else {
      this.selectedCategories = [category.name]; // Single-Select – nur eine Kategorie gleichzeitig
    }

    this.dropdownOpen = false;
    this.filterExpenses();
  }

  // Gibt Icon für ausgewählte Kategorie zurück
  getCategoryIcon(categoryName: string): string {
    const found = this.categories.find((cat) => cat.name === categoryName);
    return found?.icon || 'help-outline';
  }

  hasUserPaid(expense: Expenses): boolean {
    if (expense.paidBy === this.uid && expense) {
      return false;
    }
    const userEntry = expense.expenseMember?.find(
      (member) => member.memberId === this.uid
    );
    return !!userEntry?.paid && userEntry.amountToPay > 0;
  }


}
