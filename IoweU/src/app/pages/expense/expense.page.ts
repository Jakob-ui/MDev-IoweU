import { Component, inject, OnInit } from '@angular/core';
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
import { Groups } from '../../services/objects/Groups'; // Falls benötigt, um Gruppentyp zu definieren
import { ActivatedRoute } from '@angular/router';
import { ExpenseService } from 'src/app/services/expense.service';
import { Expenses } from 'src/app/services/objects/Expenses';

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
export class ExpensePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseServie = inject(ExpenseService);
  private updateExpensesCallback: (() => void) | null = null;

  iosIcons: boolean = false;

  user: string | null = '';
  displayName: string | null = null;
  groupname: string = '';
  groupId: string = '';

  groupMembers = [
    { name: 'Livia', profileImage: 'assets/profiles/livia.jpg' },
    { name: 'Michaela', profileImage: 'assets/profiles/michaela.jpg' },
    { name: 'Jakob', profileImage: 'assets/profiles/jakob.jpg' },
    { name: 'Sophie', profileImage: 'assets/profiles/sophie.jpg' },
    { name: 'Mateusz', profileImage: 'assets/profiles/mateusz.jpg' },
  ];

  //nur kurzer test!!!!!
  expenses: Expenses[] = [];

  balance: number = 0;
  lastTransactionDate = new Date(2025, 2, 20);

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      // Warte, bis der Benutzer vollständig geladen ist
      await this.auth.waitForUser();

      if (this.auth.currentUser) {
        // Setze Benutzerdaten
        this.user = this.auth.currentUser.username;
        this.displayName = this.auth.currentUser.username;
        const userColor = this.auth.currentUser.color || '#000000';
        document.documentElement.style.setProperty('--user-color', userColor);

        // Holen der groupId als String aus der Route
        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        if (groupId) {
          this.groupId = groupId;

          // Versuche, die Gruppe aus dem Service zu laden
          const group = this.groupService.getGroup();
          if (group && group.groupId === groupId) {
            this.groupname = group.groupname || 'Unbekannte Gruppe';
            console.log('Gruppe aus dem Service geladen:', group);
          } else {
            // Lade die Gruppe aus der Datenbank, falls nicht im Service vorhanden
            const currentGroup = await this.groupService.getGroupById(groupId);
            if (currentGroup) {
              this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            } else {
              console.error('Gruppe nicht gefunden');
            }
          }

          // Echtzeit-Listener für Ausgaben
          this.updateExpensesCallback =
            await this.expenseServie.getExpenseByGroup(
              this.groupId,
              (expensestest) => {
                console.log('Updated expenses:', expensestest);
                this.expenses = expensestest.map((expense) => ({
                  expenseId: expense.expenseId,
                  description: expense.description,
                  totalAmount: expense.totalAmount,
                  paidBy: expense.paidBy,
                  date: expense.date,
                  currency: expense.currency,
                  category: expense.category,
                  invoice: expense.invoice,
                  repeat: expense.repeat,
                  splitType: expense.splitType,
                  splitBy: expense.splitBy,
                  expenseMember: expense.expenseMember,
                }));
              }
            );
        } else {
          console.error('Kein GroupId für den Benutzer gefunden');
        }
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }

      // Berechne die Balance
      this.calculateBalance();
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  ngOnDestroy() {
    if (this.updateExpensesCallback) {
      this.updateExpensesCallback();
      console.log('Unsubscribed from expense updates');
    }
  }

  // Berechnet den Kontostand basierend auf den Ausgaben
  calculateBalance() {
    this.balance = this.expenses.reduce(
      (sum, expense) => sum + expense.totalAmount,
      0
    );
  }

  // Logout-Funktion
  async logout() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.error('Fehler beim Logout:', e);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  // Navigation zu den Details einer Ausgabe
  goToExpenseDetails(expenseId: string) {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      this.router.navigate(['expense-details', expenseId]);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  // Navigation zur Seite zum Erstellen einer neuen Ausgabe
  goToCreateExpense() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      this.router.navigate(['create-expense', this.groupId]);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  // Zurück zur vorherigen Seite
  goBack() {
    this.navCtrl.back();
  }
}
