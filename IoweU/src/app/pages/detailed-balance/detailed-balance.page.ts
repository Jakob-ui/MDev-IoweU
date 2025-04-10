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
  user: string | null = '';
  displayName: string | null = null;
  groupId: string | null = null;

  groupMembers: Members[] = [];
  selectedMember: Members | null = null;
  allExpenses: Expenses[] = [];

  paidByCurrentUser: Expenses[] = [];
  paidBySelectedUser: Expenses[] = [];

  productToggles: { [expenseId: string]: boolean } = {};

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      if (this.authService.currentUser) {
        this.user = this.authService.currentUser.username;
        this.uid = this.authService.currentUser.uid;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        const selectedUid = this.activeRoute.snapshot.paramMap.get('uid');

        if (groupId && selectedUid) {
          const currentGroup = await this.groupService.getGroupById(groupId);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members;

              this.selectedMember = this.groupMembers.find(
                (m) => m.uid === selectedUid
              ) ?? null;

              // Dummy-Daten
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
                        { productname: 'Brot', quantity: 2, unit: 'Stk', price: 5 },
                        { productname: 'Milch', quantity: 1, unit: 'L', price: 2 },
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
                        { productname: 'Ticket', quantity: 1, unit: 'Stk', price: 10 },
                        { productname: 'Popcorn', quantity: 1, unit: 'Tüte', price: 5 },
                        { productname: 'Cola', quantity: 1, unit: 'Becher', price: 5 },
                      ]
                    },
                    {
                      memberId: this.selectedMember?.uid ?? '',
                      amountToPay: 0,
                      products: []
                    }
                  ]
                }
              ];

              // Filter anwenden
              this.filterRelevantExpenses();
            } else {
              console.error('Keine Mitglieder in der Gruppe gefunden');
            }
          } else {
            console.error('Gruppe mit der ID ' + groupId + ' nicht gefunden');
            this.groupname = 'Unbekannte Gruppe';
          }
        } else {
          console.error('groupId oder selectedUid fehlt in der URL');
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

    this.paidByCurrentUser = this.allExpenses.filter(
      (expense) =>
        expense.paidBy === this.uid &&
        expense.expenseMember.some((member) => member.memberId === this.selectedMember?.uid)
    );

    this.paidBySelectedUser = this.allExpenses.filter(
      (expense) =>
        expense.paidBy === this.selectedMember?.uid &&
        expense.expenseMember.some((member) => member.memberId === this.uid)
    );
  }

  getProducts(expense: Expenses, forMemberId: string): Products[] {
    const member = expense.expenseMember.find((m) => m.memberId === forMemberId);
    return member?.products || [];
  }

  toggleProducts(expenseId: string) {
    this.productToggles[expenseId] = !this.productToggles[expenseId];
  }

  isProductsVisible(expenseId: string): boolean {
    return this.productToggles[expenseId];
  }

  getAmountOwedBy(memberId: string, expense: Expenses): number {
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
