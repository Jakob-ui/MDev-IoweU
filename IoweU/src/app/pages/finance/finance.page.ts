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
      if (this.authService.currentUser) {
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;
        console.log('Benutzerdaten:', this.authService.currentUser);

        const userColor = this.authService.currentUser.color || '#000000';
        const userBackgroundColor = this.lightenColor(userColor, 0.9);
        document.documentElement.style.setProperty('--user-color', userColor);
        document.documentElement.style.setProperty(
          '--user-color-background',
          userBackgroundColor
        );

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
                // Setze dynamische Farben für jedes Mitglied
                const memberColor = member.color || '#000000';
                const memberBackgroundColor = this.lightenColor(
                  memberColor,
                  0.9
                );

                // Setze die CSS-Properties für die Farben basierend auf der uid
                document.documentElement.style.setProperty(
                  `--member-color-${member.uid}`,
                  memberColor
                );
                document.documentElement.style.setProperty(
                  `--member-color-background-${member.uid}`,
                  memberBackgroundColor
                );

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

  // Helper function zum Aufhellen der Farbe (nur Helligkeit wird verändert)
  private lightenColor(hex: string, factor: number): string {
    let r: number = 0;
    let g: number = 0;
    let b: number = 0;

    // Entferne das "#" aus dem Hex-Code, falls vorhanden
    hex = hex.replace('#', '');

    // Konvertiere Hex in RGB
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    }

    // Erhöhe die RGB-Werte proportional, ohne sie über 255 hinaus steigen zu lassen
    r = Math.min(255, r + (255 - r) * factor);
    g = Math.min(255, g + (255 - g) * factor);
    b = Math.min(255, b + (255 - b) * factor);

    // Konvertiere zurück in Hex
    return `#${(
      (1 << 24) |
      (Math.round(r) << 16) |
      (Math.round(g) << 8) |
      Math.round(b)
    )
      .toString(16)
      .slice(1)}`;
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
