import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonBadge,
  IonCard,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { Transactions } from '../../services/objects/Transactions';
import { Members } from '../../services/objects/Members';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonList,
    IonBadge,
    IonCard,
    IonIcon,
    RouterModule,
  ],
})
export class TransactionsPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId: string | null = null;

  myBalance: number = +200;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers: Members[] = []; // Mitglieder, die in der Gruppe sind
  transactions: Transactions[] = []; // Liste der Transaktionen

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      if (this.authService.currentUser) {
        this.user = this.authService.currentUser.username;
        this.uid = this.authService.currentUser.uid;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

        if (groupId) {
          const currentGroup = await this.groupService.getGroupById(groupId);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members;

              // Dummy Transaktionen hinzufügen
              this.transactions = [
                {
                  from: currentGroup.members[0].uid,
                  to: currentGroup.members[1].uid,
                  amount: 50,
                  reason: 'Schuldenausgleich',
                  date: new Date().toISOString(),
                },
                {
                  from: currentGroup.members[1].uid,
                  to: currentGroup.members[2].uid,
                  amount: 30,
                  reason: 'Getränke gekauft',
                  date: new Date().toISOString(),
                },
                {
                  from: currentGroup.members[1].uid,
                  to: currentGroup.members[0].uid,
                  amount: 40,
                  reason: 'Getränke gekauft',
                  date: new Date().toISOString(),
                },
              ];
            } else {
              console.error('Keine Mitglieder in der Gruppe gefunden');
            }
          } else {
            console.error('Gruppe mit der ID ' + groupId + ' nicht gefunden');
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
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  getMemberNameById(memberId: string): string {
    const member = this.groupMembers.find((m) => m.uid === memberId);
    return member ? member.username : 'Unbekannt';
  }

  getTransactionImpact(transaction: Transactions): {
    status: string;
    balanceClass: string;
    amount: number;
  } {
    if (transaction.from === this.uid) {
      // Der Benutzer hat gezahlt
      return {
        status: 'bezahlt',
        balanceClass: 'negative',
        amount: transaction.amount,
      };
    } else if (transaction.to === this.uid) {
      // Der Benutzer hat etwas erhalten
      return {
        status: 'bekommen',
        balanceClass: 'positive',
        amount: transaction.amount,
      };
    } else {
      // Der Benutzer ist nicht an der Transaktion beteiligt
      return {
        status: '',
        balanceClass: '',
        amount: transaction.amount,
      };
    }
  }

  async logout() {
    this.loadingService.show();
    try {
      this.authService.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.error('Fehler beim Logout:', e);
    } finally {
      this.loadingService.hide();
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}
