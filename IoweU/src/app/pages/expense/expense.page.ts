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
  IonIcon,
} from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service'; // Importiere den GroupService
import { ActivatedRoute } from '@angular/router';
import { ExpenseService } from 'src/app/services/expense.service';
import { Expenses } from 'src/app/services/objects/Expenses';
import { Groups } from 'src/app/services/objects/Groups';
import { ExpenseMember } from '../../services/objects/ExpenseMember'; // Stelle sicher, dass diese importiert ist

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
  ],
})
export class ExpensePage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private activeRoute = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);

  // Diese Variablen sollten in der ngOnInit-Methode initialisiert werden, damit sie korrekt zur Initialisierung verwendet werden können.
  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;

  groupname: string = '';
  groupId: string = '';
  groupMembers: any[] = [];
  iosIcons: boolean = false;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  sumExpenses: number = 0;

  // Hier wird expenses auf Expenses[] gesetzt, damit es eine Liste von Ausgaben ist, nicht von Strings
  expenses: Expenses[] = [
    {
      expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
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
    },
  ];

  updateExpensesCallback: (() => void) | null = null;

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        const user = this.authService.currentUser;
        const uid = user.uid;
        const userName = user.username;
        const groupId = this.route.snapshot.paramMap.get('groupId');

        if (groupId) {
          const currentGroup = await this.groupService.getGroupById(groupId);

          // Debugging: Überprüfe den aktuellen Inhalt von currentGroup
          console.log('currentGroup:', currentGroup);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            // Überprüfe, ob die expenses-Eigenschaft existiert und ein Array ist
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
              this.expenses = []; // Setze eine leere Liste, falls keine Ausgaben vorhanden sind
            }

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members.map((member: any) => ({
                ...member,
                amount: 0,
              }));

              // Initialisiere expenseMember für jede Ausgabe
              this.expenses.forEach((expense) => {
                expense.expenseMember = this.groupMembers.map((member) => ({
                  memberId: member.uid,
                  amountToPay: 0,
                  split: 1,
                  products: [],
                }));
              });
            }
          } else {
            console.error('Gruppe mit der ID ' + groupId + ' nicht gefunden');
            this.groupname = 'Unbekannte Gruppe';
          }
        }

        // Echtzeit-Listener für Ausgaben
        this.updateExpensesCallback =
          await this.expenseService.getExpenseByGroup(
            this.groupId,
            (expensestest) => {
              console.log('Updated expenses:', expensestest);
              // Hier ist ein Mapping notwendig, falls mehrere Ausgaben zurückgegeben werden
              this.expenses = Array.isArray(expensestest) ? expensestest : []; // Sicherstellen, dass `expenses` ein Array ist
            }
          );
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }

      // Berechne die Balance
      this.calculateBalance();
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

  // Berechnet die Balance basierend auf den Ausgaben
  calculateBalance() {
    this.sumExpenses = this.expenses.reduce(
      (sum, expense) => sum + (expense.totalAmount || 0), // Sicherstellen, dass totalAmount immer ein Wert ist (falls null oder undefined)
      0
    );
    console.log('Summe der Ausgaben:', this.sumExpenses);
  }

  // Logout-Funktion
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
      this.router.navigate(['expense-details', expenseId]);
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

  // Zurück zur vorherigen Seite
  goBack() {
    this.router.navigate(['/group', this.groupId]);
  }
}
