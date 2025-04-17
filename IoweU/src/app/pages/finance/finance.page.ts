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
  IonIcon,
} from '@ionic/angular/standalone';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { ExpenseService } from "../../services/expense.service";

@Component({
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.scss'],
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
    IonIcon,
    RouterModule,
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

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId: string | null = null;

  myExpenses: number = 0;
  myIncome: number = 0;

  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers: any[] = [];

  memberUsernames: string[] = [];
  memberIds: string[] = [];
  memberColors: string[] = [];
  memberRoles: string[] = [];
  memberUids: string[] = [];

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;
        console.log('Benutzerdaten:', this.authService.currentUser);

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        console.log('Benutzer GroupId:', groupId);

        if (groupId) {
          const currentGroup = await this.groupService.getGroupById(groupId);

          if (currentGroup) {
            console.log('Alle Gruppendaten:', currentGroup);
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members
                .filter((member: any) => member.uid !== this.uid)
                .map((member: any) => {
                  this.memberUsernames.push(member.username || '');
                  this.memberIds.push(member.memberId || '');
                  this.memberColors.push(member.color || '');
                  this.memberRoles.push(member.role || '');
                  this.memberUids.push(member.uid || '');

                  // Berechne den Betrag zwischen aktuellem Nutzer und Gruppenmitglied
                  const amount = this.calculateBalanceBetweenUsers(this.uid!, member.uid);

                  // 💰 Verteile auf Einnahmen und Ausgaben
                  if (amount > 0) {
                    this.myIncome += amount;
                  } else {
                    this.myExpenses += Math.abs(amount);
                  }

                  return {
                    ...member,
                    amount,
                  };
                });

              console.log('Mitglieder geladen:', this.groupMembers);
              console.log('Usernames:', this.memberUsernames);
              console.log('IDs:', this.memberIds);
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

  calculateBalanceBetweenUsers(userA: string, userB: string): number {
    // Beispiel: Hier müsstest du deine echte Logik auf Basis deiner Expense-Daten implementieren
    // Zum Beispiel:
    // - Finde alle Ausgaben, die userA bezahlt hat, an denen userB beteiligt war
    // - und umgekehrt
    // - Dann: Betrag berechnen, der userB userA schuldet - umgekehrt

    // Dummy-Wert für Entwicklung:
    return Math.floor(Math.random() * 200 - 100); // zufällig Schulden oder Guthaben zwischen -100 und +100
  }

  get myBalance(): number {
    return this.myIncome - this.myExpenses;
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
    this.router.navigate(['/group', this.groupId]);
  }
}
