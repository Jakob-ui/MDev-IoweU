import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem,
  IonList,
  IonBadge,
  IonCard,
  IonIcon,
  IonButton, IonSpinner } from '@ionic/angular/standalone';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { ExpenseService } from '../../services/expense.service';
import { TransactionService } from 'src/app/services/transaction.service';
import { Groups } from 'src/app/services/objects/Groups';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.scss'],
  standalone: true,
  imports: [IonSpinner, 
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonItem,
    IonList,
    IonBadge,
    IonCard,
    IonIcon,
    RouterModule,
    IonButton,
  ],
})
export class FinancePage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);
  private transactionService = inject(TransactionService);

  groupname: string = '';
  iosIcons: boolean = false;

  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId: string | null = null;

  myExpenses: number = 0;
  myIncome: number = 0;

  animatedBalance: number = 0;

  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers: any[] = [];

  memberUsernames: string[] = [];
  memberIds: string[] = [];
  memberColors: string[] = [];
  memberRoles: string[] = [];
  memberUids: string[] = [];
  currentGroup: Groups | null = null;

  isLoadingMembers: boolean = false;

  constructor() {}

  async ngOnInit() {
    try {
      await this.authService.waitForUser();

      const currentUser = this.authService.currentUser;

      if (!currentUser || !currentUser.uid || !currentUser.username) {
        console.error(
          'Kein Benutzer eingeloggt oder unvollständige Benutzerdaten.'
        );
        return;
      }

      this.uid = currentUser.uid;
      this.user = currentUser.username;
      this.displayName = currentUser.username;

      const rawGroupId = this.activeRoute.snapshot.paramMap.get('groupId');

      if (!rawGroupId) {
        console.error('Kein GroupId für den Benutzer gefunden');
        this.groupname = 'Unbekannte Gruppe';
        return;
      }

      const groupId: string = rawGroupId; // jetzt garantiert kein null

      this.currentGroup = await this.groupService.getGroupById(groupId);

      if (!this.currentGroup) {
        console.error('Gruppe mit der ID ' + groupId + ' nicht gefunden');
        this.groupname = 'Unbekannte Gruppe';
        return;
      }

      this.groupname = this.currentGroup.groupname || 'Unbekannte Gruppe';
      this.groupId = this.currentGroup.groupId || '';

      if (!this.currentGroup.members || this.currentGroup.members.length === 0) {
        console.error('Keine Mitglieder in der Gruppe gefunden');
        return;
      }

      // Gruppenmitglieder laden (außer aktueller User)
      this.isLoadingMembers = true; // <--- Setze Loading-Flag auf true
      this.groupMembers = await Promise.all(
        this.currentGroup.members
          .filter((member: any) => member.uid !== this.uid)
          .map(async (member: any) => {
            // Memberdaten sammeln
            this.memberUsernames.push(member.username || '');
            this.memberIds.push(member.memberId || '');
            this.memberColors.push(member.color || '');
            this.memberRoles.push(member.role || '');
            this.memberUids.push(member.uid || '');

            // Nur berechnen, wenn beide UIDs vorhanden sind
            let saldo = 0;

            if (member.uid && this.uid) {
              const amount = await this.expenseService.getBalanceBetweenUsers(
                groupId,
                this.uid,
                member.uid
              );
              const saldo = amount;
              if (saldo > 0) {
                this.myIncome += saldo;
              } else {
                this.myExpenses += Math.abs(saldo);
              }
              return {
                ...member,
                amount: saldo,
              };
            }
          })
      );
      this.isLoadingMembers = false; // <--- Setze Loading-Flag auf false

      // Starte die Animation, sobald die Daten geladen sind
      this.animateBalance();

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
      this.isLoadingMembers = false; // <--- Fehlerfall: Loading-Flag zurücksetzen
    } finally {
      this.loadingService.hide();
    }
  }

  get myBalance(): number {
    return this.myIncome - this.myExpenses;
  }

  animateBalance() {
    // Stoppe ggf. laufende Animationen
    if ((this as any)._balanceInterval) {
      clearInterval((this as any)._balanceInterval);
    }
    const target = this.myBalance;
    const duration = 400; // ms
    const steps = 40;
    const stepTime = duration / steps;
    const start = 0;
    let current = start;
    let step = (target - start) / steps;
    let count = 0;

    this.animatedBalance = start;

    (this as any)._balanceInterval = setInterval(() => {
      count++;
      current += step;
      // Bei letzter Iteration auf exakten Zielwert setzen
      if (count >= steps) {
        this.animatedBalance = target;
        clearInterval((this as any)._balanceInterval);
      } else {
        this.animatedBalance = Math.round(current);
      }
    }, stepTime);
  }

  async logout() {
    this.loadingService.show();
    try {
      this.authService.logout();
      this.router.navigate(['login']);
    } catch (e) {
      console.error('Fehler beim Logout:', e);
    } finally {
      this.loadingService.hide();
    }
  }

  goBack() {
    if (this.overlayState === 'normal') {
      this.overlayState = 'hidden'; // Optional: Overlay schließen
      this.router.navigate(['/finance', this.groupId]);
    } else {
      this.router.navigate(['/group', this.groupId]);
    }
  }
  toggleInfoOverlay() {

    // Wenn der Zustand "start" ist, wechselt er zu "normal", um das Overlay zu zeigen
    if (this.overlayState === 'start') {
      this.overlayState = 'normal'; // Overlay wird sichtbar and Animation startet
    } else if (this.overlayState === 'normal') {
      // Wenn es im "normal" Zustand ist, wird es nach unten geschoben
      this.overlayState = 'hidden'; // Wechselt zum "hidden"-Zustand
    } else if (this.overlayState === 'hidden') {
      // Wenn es im "hidden" Zustand ist, wird es wieder nach oben geschoben
      this.overlayState = 'normal'; // Wechselt zurück zum "normal"-Zustand
    }

  }

  async goToPayAllExpenses(settlegroup: boolean) {
    settlegroup
      ? this.router.navigate([
        '/settle-balances',
        this.groupId
      ], {
        queryParams: {
          settlegroup: settlegroup,
        },
      })
      : this.router.navigate(['/settle-balances', this.groupId]);
  }
}
