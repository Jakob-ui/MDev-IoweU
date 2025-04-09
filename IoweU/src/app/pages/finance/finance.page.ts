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
import {Router, ActivatedRoute, RouterModule} from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.scss'],
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
    IonIcon,
    RouterModule,
  ],
})
export class FinancePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);

  groupname: string = '';
  iosIcons: boolean = false;

  user: string | null = '';
  displayName: string | null = null;
  groupId: string | null = null;

  myBalance: number = +200;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers: any[] = [];

  // 🆕 Member-Variablen
  memberUsernames: string[] = [];
  memberIds: string[] = [];
  memberColors: string[] = [];
  memberRoles: string[] = [];
  memberUids: string[] = [];

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      if (this.auth.currentUser) {
        this.user = this.auth.currentUser.username;
        this.displayName = this.auth.currentUser.username;
        console.log('Benutzerdaten:', this.auth.currentUser);

        const userColor = this.auth.currentUser.color || '#000000';
        document.documentElement.style.setProperty('--user-color', userColor);

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        console.log('Benutzer GroupId:', groupId);

        if (groupId) {
          const currentGroup = await this.groupService.getGroupById(groupId);

          if (currentGroup) {
            console.log('Alle Gruppendaten:', currentGroup);
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members.map((member: any) => {
                this.memberUsernames.push(member.username || '');
                this.memberIds.push(member.memberId || '');
                this.memberColors.push(member.color || '');
                this.memberRoles.push(member.role || '');
                this.memberUids.push(member.uid || '');

                return {
                  ...member,
                  amount: 0, // Dummy-Wert
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

  goToCreateExpense() {
    this.loadingService.show();
    try {
      this.router.navigate(['create-expense']);
    } finally {
      this.loadingService.hide();
    }
  }

  async logout() {
    this.loadingService.show();
    try {
      await this.auth.logout();
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
