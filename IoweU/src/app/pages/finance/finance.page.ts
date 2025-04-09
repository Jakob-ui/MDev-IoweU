import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service'; // GroupService importieren
import { Groups } from '../../services/objects/Groups'; // Typisierung hinzufügen
import { ActivatedRoute } from '@angular/router';

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
    RouterModule,
    IonIcon,
  ],
})
export class FinancePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService); // GroupService injizieren

  groupname: string = '';
  iosIcons: boolean = false;

  user: string | null = '';
  displayName: string | null = null;
  groupId: string | null = null; // Variable für die groupId hinzufügen

  myBalance: number = +200;
  lastTransactionDate: Date = new Date(2025, 2, 20);

  groupMembers: any[] = []; // Mitglieder als Array deklarieren

  async ngOnInit() {
    this.loadingService.show(); // Lade-Overlay aktivieren

    try {
      // Warten auf die vollständige Initialisierung des Benutzers
      if (this.auth.currentUser) {
        this.user = this.auth.currentUser.username;
        this.displayName = this.auth.currentUser.username;
        console.log('Benutzerdaten:', this.auth.currentUser); // Logge die Benutzerdaten zur Überprüfung

        const userColor = this.auth.currentUser.color || '#000000'; // Standardfarbe setzen, falls nicht verfügbar
        document.documentElement.style.setProperty('--user-color', userColor); // Benutzerfarbe setzen

        // Holen der groupId als String aus dem AuthService
        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

        console.log('Benutzer GroupId:', groupId); // Debug: Ausgabe der GroupId

        if (groupId) {
          // Holen der Gruppendaten über den GroupService
          const currentGroup = await this.groupService.getGroupById(groupId); // Verwenden der tatsächlichen groupId hier

          if (currentGroup) {
            console.log('Alle Gruppendaten:', currentGroup); // Alle Gruppendaten ausgeben

            // Einzelne Daten der Gruppe ausgeben
            console.log('Gruppenname:', currentGroup.groupname);
            console.log('Gruppen-ID:', currentGroup.groupId);
            console.log('Gruppenmitglieder:', currentGroup.members);

            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            // Holen der Mitglieder für diese Gruppe
            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members;
              console.log('Mitglieder geladen:', this.groupMembers);
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
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  goToCreateExpense() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      this.router.navigate(['create-expense']);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

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

  goBack() {
    this.navCtrl.back(); // Navigiert zur letzten Seite
  }

  constructor() {}
}
