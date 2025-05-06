import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar,
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
import { Balances } from '../../services/objects/Balances';

import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-detailed-balance',
  templateUrl: './detailed-balance.page.html',
  styleUrls: ['./detailed-balance.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonBadge,
    IonButton,
    IonIcon,
    RouterLink,
  ],
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
  private firestore: Firestore = inject(Firestore);

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  username: string | null = '';
  groupId: string | null = null;

  myExpenses: number = 0;
  myIncome: number = 0;

  groupMembers: Members[] = [];
  selectedMember: Members | null = null;
  allExpenses: Expenses[] = [];

  balances: Balances[] = [];
  paidByCurrentUser: Expenses[] = [];
  paidBySelectedMember: Expenses[] = [];

  productToggles: { [expenseId: string]: boolean } = {};

  balanceDetails: any = {}; // Balance Details object for storing calculated balance

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();
      if (this.authService.currentUser) {
        this.username = this.authService.currentUser.username;
        this.uid = this.authService.currentUser.uid;
        console.log('Benutzerdaten:', this.authService.currentUser);

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        const selectedMember = this.activeRoute.snapshot.paramMap.get('uid');

        const validGroupId: string = groupId || '';
        const validSelectedMember = selectedMember ?? '';

        if (validGroupId && validSelectedMember) {
          const currentGroup = await this.groupService.getGroupById(validGroupId);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members;
              this.selectedMember =
                this.groupMembers.find((m) => m.uid === validSelectedMember) ?? null;

              console.log('Selected Member:', this.selectedMember);
              console.log('Current User UID:', this.uid);

              // ✅ Neue Balance-Funktion: ergibt Saldo aus Sicht des eingeloggten Users
              const saldo = await this.expenseService.getBalanceBetweenUsers(
                validGroupId,
                this.uid!,
                validSelectedMember
              );

              console.log(
                `Saldo zwischen ${this.username} und ${this.selectedMember?.username}: ${saldo}`
              );

              // 🔁 myIncome / myExpenses befüllen
              this.myIncome = saldo > 0 ? saldo : 0;
              this.myExpenses = saldo < 0 ? saldo : 0;

              this.balanceDetails = {
                from: this.username,
                to: this.selectedMember?.username,
                balance: saldo
              };

              console.log('Balance Details:', this.balanceDetails);

              this.allExpenses = await this.expenseService.getExpensesByBalanceEntries(validGroupId, this.balanceDetails);
              console.log('All Expenses:', this.allExpenses);

              
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

  get myBalance(): number {
    return this.balanceDetails.balance || 0;
  }


  getProducts(expense: any, uid: string): any[] {
    return expense.products || [];  // Replace with real logic
  }

  toggleProducts(expenseId: string) {
    this.productToggles[expenseId] = !this.productToggles[expenseId];
  }

  isProductsVisible(expenseId: string): boolean {
    return this.productToggles[expenseId];
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['login']);
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
