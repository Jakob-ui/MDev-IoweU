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
import { AuthService } from "../../services/auth.service";
import { NavController, Platform } from "@ionic/angular";
import { LoadingService } from "../../services/loading.service";
import { GroupService } from "../../services/group.service"; // Importiere den GroupService
import { Groups } from '../../services/objects/Groups'; // Falls benötigt, um Gruppentyp zu definieren

@Component({
  selector: 'app-expense',
  templateUrl: './expense.page.html',
  styleUrls: ['./expense.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
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
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService); // Inject GroupService

  iosIcons: boolean = false;

  user: string | null = "";
  displayName: string | null = null;
  groupname: string = '';
  groupId: string = ''; // ID der Gruppe, um Daten zu laden

  groupMembers = [
    { name: 'Livia', profileImage: 'assets/profiles/livia.jpg' },
    { name: 'Michaela', profileImage: 'assets/profiles/michaela.jpg' },
    { name: 'Jakob', profileImage: 'assets/profiles/jakob.jpg' },
    { name: 'Sophie', profileImage: 'assets/profiles/sophie.jpg' },
    { name: 'Mateusz', profileImage: 'assets/profiles/mateusz.jpg' },
  ];

  expenses = [
    {
      id: 1,
      expense: 'Pizza',
      totalAmount: 50,
      amountToPay: -10,
      paidBy: this.groupMembers[0],
      date: new Date(2025, 2, 20),
    },
    {
      id: 2,
      expense: 'Kinoabend',
      totalAmount: 40,
      amountToPay: -8,
      paidBy: this.groupMembers[1],
      date: new Date(2025, 3, 5),
    },
    {
      id: 3,
      expense: 'Restaurantbesuch',
      totalAmount: 100,
      amountToPay: -25,
      paidBy: this.groupMembers[2],
      date: new Date(2025, 3, 5),
    },
  ];

  balance: number = 0;
  lastTransactionDate = new Date(2025, 2, 20);

  constructor() {}

  ngOnInit() {
    this.loadingService.show(); // Lade-Overlay aktivieren

    (async () => {
      try {
        // Sicherstellen, dass AuthService initialisiert ist und currentUser verfügbar ist
        if (this.auth.currentUser) {
          this.user = this.auth.currentUser.username;
          this.displayName = this.auth.currentUser.username;
          console.log('Benutzerdaten:', this.auth.currentUser); // Logge die Benutzerdaten zur Überprüfung

          const userColor = this.auth.currentUser.color || '#000000'; // Standardfarbe setzen, falls nicht verfügbar
          document.documentElement.style.setProperty('--user-color', userColor); // Benutzerfarbe setzen

          // Holen der groupId als String aus dem AuthService
          const groupId = String(this.auth.currentUser.groupId || ''); // Sicherstellen, dass groupId ein String ist

          if (groupId) {
            // Holen der Gruppendaten über den GroupService
            const currentGroup = await this.groupService.getGroupById(groupId); // Verwenden der tatsächlichen groupId hier

            if (currentGroup) {
              this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
              this.groupId = currentGroup.groupId || '';
            } else {
              console.error('Gruppe nicht gefunden');
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
        // Berechne die Balance
        this.calculateBalance();
      } catch (error) {
        console.error('Fehler beim Initialisieren der Seite:', error);
      } finally {
        this.loadingService.hide(); // Lade-Overlay deaktivieren
      }
    })();
  }




  // Berechnet den Kontostand basierend auf den Ausgaben
  calculateBalance() {
    this.balance = this.expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
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
  goToExpenseDetails(expenseId: number) {
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
      this.router.navigate(['create-expense']);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  // Zurück zur vorherigen Seite
  goBack() {
    this.navCtrl.back();
  }
}
