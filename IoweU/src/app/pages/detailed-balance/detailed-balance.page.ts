import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { Expenses } from '../../services/objects/Expenses';
import { Products } from '../../services/objects/Products';
import { ExpenseService } from '../../services/expense.service';
import { GroupService } from '../../services/group.service';
import { Members } from '../../services/objects/Members';
import { Users } from '../../services/objects/Users';

@Component({
  selector: 'app-detailed-balance',
  templateUrl: './detailed-balance.page.html',
  styleUrls: ['./detailed-balance.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonBadge,
    IonButton,
    IonIcon,
    RouterLink
  ]
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

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  username: string | null = '';
  groupId: string | null = null;

  groupMembers: Members[] = [];
  selectedMember: Members | null = null;
  allExpenses: Expenses[] = [];

  paidByCurrentUser: Expenses[] = [];
  paidBySelectedMember: Expenses[] = [];

  productToggles: { [expenseId: string]: boolean } = {};

  // New variables to fix errors
  balanceDetails: any = {}; // Add balanceDetails if needed
  totalAmountForSelectedMember: number = 0; // Add totalAmountForSelectedMember

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      if (this.authService.currentUser) {
        this.username = this.authService.currentUser.username;
        this.uid = this.authService.currentUser.uid;  // Hier setzen wir die uid korrekt
        console.log('Benutzerdaten:', this.authService.currentUser);

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        const selectedMember = this.activeRoute.snapshot.paramMap.get('uid');

        // Use fallback values for groupId and selectedMember
        const validGroupId: string = groupId || '';
        const validSelectedMember = selectedMember ?? '';

        if (validGroupId && validSelectedMember) {
          const currentGroup = await this.groupService.getGroupById(validGroupId);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members;

              this.selectedMember = this.groupMembers.find(
                (m) => m.uid === validSelectedMember
              ) ?? null;

              this.allExpenses = [
                {
                  expenseId: 'exp1',
                  description: 'Wocheneinkauf',
                  totalAmount: 100,
                  paidBy: this.uid!,
                  date: '2025-04-01',
                  currency: 'EUR',
                  repeat: 'none',
                  splitType: 'produkte',
                  splitBy: 'frei',
                  expenseMember: [
                    {
                      memberId: this.selectedMember?.uid ?? '',
                      amountToPay: 30,
                      products: [
                        { productId: 'prod1', memberId: this.selectedMember?.uid ?? '', productname: 'Brot', quantity: 2, unit: 'Stk', price: 5 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Milch', quantity: 1, unit: 'L', price: 2 },

                      ]
                    },
                    {
                      memberId: this.uid!,
                      amountToPay: 0,
                      products: []
                    }
                  ]
                },
                {
                  expenseId: 'exp2',
                  description: 'Kinotickets',
                  totalAmount: 40,
                  paidBy: this.selectedMember?.uid ?? '',
                  date: '2025-04-03',
                  currency: 'EUR',
                  repeat: 'none',
                  splitType: 'produkte',
                  splitBy: 'frei',
                  expenseMember: [
                    {
                      memberId: this.uid!,
                      amountToPay: 20,
                      products: [
                        { productId: 'prod3', memberId: this.uid!, productname: 'Ticket', quantity: 1, unit: 'Stk', price: 10 },
                        { productId: 'prod4', memberId: this.uid!, productname: 'Popcorn', quantity: 1, unit: 'Tüte', price: 5 },
                        { productId: 'prod5', memberId: this.uid!, productname: 'Cola', quantity: 1, unit: 'Becher', price: 5 },
                      ]
                    },
                    {
                      memberId: this.selectedMember?.uid ?? '',
                      amountToPay: 0,
                      products: []
                    }
                  ]
                },
                {
                  expenseId: 'exp3',
                  description: 'Einkauf bei Hofer',
                  totalAmount: 64,
                  paidBy: this.uid!,
                  date: '2025-04-01',
                  currency: 'EUR',
                  repeat: 'none',
                  splitType: 'produkte',
                  splitBy: 'frei',
                  expenseMember: [
                    {
                      memberId: this.selectedMember?.uid ?? '',
                      amountToPay: 20,
                      products: [
                        { productId: 'prod1', memberId: this.selectedMember?.uid ?? '', productname: 'Tomaten', quantity: 2, unit: 'Stk', price: 5 },
                        { productId: 'prod2', memberId: this.selectedMember?.uid ?? '', productname: 'Zwiebeln', quantity: 1, unit: 'Stk', price: 2 },
                        { productId: 'prod3', memberId: this.selectedMember?.uid ?? '', productname: 'Paprika', quantity: 1, unit: 'Stk', price: 3 },
                        { productId: 'prod4', memberId: this.selectedMember?.uid ?? '', productname: 'Salat', quantity: 1, unit: 'Stk', price: 4 },
                        { productId: 'prod5', memberId: this.selectedMember?.uid ?? '', productname: 'Karotten', quantity: 1, unit: 'Stk', price: 2 },
                        { productId: 'prod6', memberId: this.selectedMember?.uid ?? '', productname: 'Kartoffeln', quantity: 1, unit: 'Stk', price: 3 },
                        { productId: 'prod7', memberId: this.selectedMember?.uid ?? '', productname: 'Zucchini', quantity: 1, unit: 'Stk', price: 4 },
                        { productId: 'prod8', memberId: this.selectedMember?.uid ?? '', productname: 'Auberginen', quantity: 1, unit: 'Stk', price: 5 },
                      ]
                    },
                    {
                      memberId: this.uid!,
                      amountToPay: 0,
                      products: []
                    }
                  ]
                },

              ];

              this.filterRelevantExpenses();

              // Berechnung der gesamten Ausgaben des ausgewählten Mitglieds
              this.totalAmountForSelectedMember = this.paidBySelectedMember.reduce((total, expense) => {
                return total + this.getAmountOwedBy(this.selectedMember?.uid || '', expense);
              }, 0);
            } else {
              console.error('Keine Mitglieder in der Gruppe gefunden');
            }
          } else {
            console.error('Gruppe mit der ID ' + validGroupId + ' nicht gefunden');
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

  filterRelevantExpenses() {
    if (!this.uid || !this.selectedMember) return;

    // Ausgaben, die vom aktuellen Benutzer bezahlt wurden und den ausgewählten Member betreffen
    this.paidByCurrentUser = this.allExpenses.filter(
      (expense) =>
        expense.paidBy === this.uid &&
        expense.expenseMember.some((member) => member.memberId === this.selectedMember?.uid)
    );

    // Ausgaben, die vom ausgewählten Member bezahlt wurden und den aktuellen Benutzer betreffen
    this.paidBySelectedMember = this.allExpenses.filter(
      (expense) =>
        expense.paidBy === this.selectedMember?.uid &&
        expense.expenseMember.some((member) => member.memberId === this.uid)
    );
  }


  getProducts(expense: Expenses, forMemberId: string): Products[] {
    if (!forMemberId) return []; // Rückgabe eines leeren Arrays, wenn keine Member-ID vorhanden ist
    const member = expense.expenseMember.find((m) => m.memberId === forMemberId);
    return member?.products || []; // Falls keine Produkte vorhanden sind, wird ein leeres Array zurückgegeben
  }

  getExpenseOwedBy(memberId: string | undefined, expense: Expenses): number {
    if (!memberId) return 0; // Rückgabe von 0, wenn keine Member-ID vorhanden ist
    const member = expense.expenseMember.find((m) => m.memberId === memberId);
    return member?.amountToPay || 0; // Falls kein Betrag vorhanden, wird 0 zurückgegeben
  }

  getTotalPaidExpensesForMember(uid: string | null): number {
    if (!uid) return 0; // Wenn keine uid vorhanden ist, gibt es keine Ausgaben
    // Filtere alle Ausgaben, die vom Benutzer mit der gegebenen UID bezahlt wurden
    const expensesPaidByUser = this.allExpenses.filter(expense => expense.paidBy === uid);
    // Berechne die Gesamtzahl der bezahlten Ausgaben
    return expensesPaidByUser.reduce((total, expense) => total + expense.totalAmount, 0);
  }



  toggleProducts(expenseId: string) {
    this.productToggles[expenseId] = !this.productToggles[expenseId];
  }

  isProductsVisible(expenseId: string): boolean {
    return this.productToggles[expenseId];
  }

  getAmountOwedBy(memberId: string | undefined, expense: Expenses): number {
    if (!memberId) return 0; // Fallback if memberId is undefined
    const member = expense.expenseMember.find((m) => m.memberId === memberId);
    return member?.amountToPay || 0;
  }


  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  editBalance() {
    // navigiere ggf. zur Bearbeitungsseite
  }
}
