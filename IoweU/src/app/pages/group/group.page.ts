import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonCard,
  IonCardTitle,
  IonCardSubtitle,
  IonIcon,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { Groups } from 'src/app/services/objects/Groups';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-group',
  templateUrl: './group.page.html',
  styleUrls: ['./group.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonCard,
    IonCardTitle,
    IonCardSubtitle,
    RouterModule,
    IonIcon,
  ],
})
export class GroupPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private route = inject(ActivatedRoute);
  private groupService = inject(GroupService);
  private loadingService = inject(LoadingService);

  iosIcons: boolean = false;

  user: string | null = '';
  currentGroup: Groups | null = null;
  balance: number = -20;
  totalCost: number = 120.5;
  displayName: string | null = null;

  groupname: string = '';
  groupId: string = '';
  features: string[] = [];
  groupImage: string = '';
  members: any[] = [];
  accessCode: string = '';
  sumTotalExpenses: number | undefined = undefined;
  countTotalExpenses: number | undefined = undefined;
  sumTotalExpensesMembers: number | undefined = undefined;
  countTotalExpensesMembers: number | undefined = undefined;

  myBalance: number = +200;
  currentMonth: string = 'März 2025';

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter'];
  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher'];

  ngOnInit() {
    this.loadingService.show(); // Lade-Overlay aktivieren

    (async () => {
      try {
        // Sicherstellen, dass AuthService initialisiert ist und currentUser verfügbar ist
        if (this.authService.currentUser) {
          // Benutzername wird nur gesetzt, wenn der currentUser verfügbar ist
          this.user = this.authService.currentUser.username;
          this.displayName = this.authService.currentUser.username;
          console.log('Benutzerdaten:', this.authService.currentUser); // Logge die Benutzerdaten zur Überprüfung
        } else {
          console.error('Kein Benutzer eingeloggt.');
          return; // Wenn kein Benutzer eingeloggt, wird der Rest des Codes nicht ausgeführt.
        }

        this.iosIcons = this.platform.is('ios'); // Überprüfe, ob iOS

        // Holen der Gruppen-ID aus den Routenparametern
        this.route.params.subscribe((params) => {
          this.groupid = params['groupId'];
          this.loadGroupData(this.groupid).finally(() => {
            this.loadingService.hide(); // Lade-Overlay deaktivieren
          });
        });
      } catch (error) {
        console.error('Fehler beim Initialisieren der Seite:', error);
        this.loadingService.hide(); // Lade-Overlay deaktivieren
      }
    })();
  }

  // Logout-Funktion
  async logout() {
    try {
      this.authService.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  // Navigation zur Gruppenübersicht
  goBack() {
    this.router.navigate(['group-overview']);
  }

  // Funktion zum Laden der Gruppendaten
  async loadGroupData(id: string): Promise<void> {
    try {
      const group = await this.groupService.getGroupById(id);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (group) {
        this.groupname = group.groupname;
        this.groupid = group.groupId;
        this.features = group.features;
        this.groupImage = group.groupimage;
        this.members = group.members;
        this.accessCode = group.accessCode;
        this.sumTotalExpenses = group.sumTotalExpenses;
        this.countTotalExpenses = group.countTotalExpenses;

        if (group.sumTotalExpensesMembers) {
          this.sumTotalExpensesMembers = group.sumTotalExpensesMembers;
        }
        if (group.countTotalExpensesMembers) {
          this.countTotalExpensesMembers = group.countTotalExpensesMembers;
        }
      } else {
        console.warn('Gruppe nicht gefunden!');
      }
    } catch (e) {
      console.error('Fehler beim Abrufen der Gruppen-Daten: ', e);
    } finally {
      this.loadingService.hide();
    }
  }

  // Funktion zur Generierung der Feature-Links mit groupId
  getFeatureLink(feature: string): string {
    switch (feature) {
      case 'Finanzübersicht':
        return `/finance/${this.groupid}`;
      case 'Ausgaben':
        return `/expense/${this.groupid}`;
      case 'Einkaufsliste':
        return `/shopping-list/${this.groupid}`; // Beispiel-Link für Shopping-List
      case 'Anlagegüter':
        return `/assets/${this.groupid}`; // Beispiel-Link für Assets
      default:
        return '/'; // Rückfalloption für unbekannte Features
    }
  }

  // Funktion, um ein Loading-Overlay zu simulieren
  async isLoading() {
    try {
      this.loadingService.show();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      this.loadingService.hide();
    }
  }
}
