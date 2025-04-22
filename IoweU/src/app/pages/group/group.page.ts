import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonCard,
  IonCardTitle,
  IonCardSubtitle,
  IonIcon,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { Groups } from 'src/app/services/objects/Groups';
import { LoadingService } from '../../services/loading.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { FormsModule } from '@angular/forms';
import { Members } from 'src/app/services/objects/Members';

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
    IonCard,
    IonCardTitle,
    IonCardSubtitle,
    RouterModule,
    IonIcon,
    QRCodeComponent,
    FormsModule,
    IonItem,
    IonSelect,
    IonSelectOption,
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
  isFounder: boolean = false;
  currentGroup: Groups | null = null;
  balance: number = -20;
  totalCost: number = 120.5;
  displayName: string | null = null;

  groupname: string = '';
  groupId: string = '';
  features: string[] = [];
  groupImage: string = '';
  members: Members[] = [];
  accessCode: string = '';
  sumTotalExpenses: number | undefined = undefined;
  countTotalExpenses: number | undefined = undefined;
  sumTotalExpensesMembers: number | undefined = undefined;
  countTotalExpensesMembers: number | undefined = undefined;

  showQRCode: boolean = false;
  qrCodeValue: string = '';
  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  currentMonth: string = 'März 2025';

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter'];
  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher'];
  group: Groups | null = null;

  myBalance: number = 0;

  availableFeatures: string[] = [
    'Einkaufsliste',
    'Anlagegüter',
    'Finanzübersicht',
    'Ausgaben',
  ];
  canAddFeatures: boolean = true;

  async ngOnInit() {
    this.loadingService.show();
    await this.loadGroupData(this.groupId);

    try {
      // Warte, bis der Benutzer vollständig geladen ist
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        // Setze Benutzerdaten
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;
        const userColor = this.authService.currentUser.color || '#000000';
        document.documentElement.style.setProperty('--user-color', userColor);

        // Überprüfe, ob die Plattform iOS ist
        this.iosIcons = this.platform.is('ios');

        // Holen der Gruppen-ID aus den Routenparametern
        const groupId = this.route.snapshot.paramMap.get('groupId');
        if (groupId) {
          this.groupId = groupId;
          console.log('Bilanz:', this.myBalance);

          // Lade die Gruppendaten
          await this.loadGroupData(this.groupId);
        } else {
          console.error('Keine Gruppen-ID in den Routenparametern gefunden.');
        }
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  // Funktion zum Laden der Gruppendaten
  async loadGroupData(id: string): Promise<void> {
    try {
      const group = await this.groupService.getGroupById(id);
      if (group) {
        this.group = group;
        this.groupService.setGroup(group);
      } else {
        console.warn('Gruppe nicht gefunden!');
      }

      if (group) {
        this.groupname = group.groupname;
        this.groupId = group.groupId;
        this.features = group.features || [];
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
        this.calculateBalance();

        // Überprüfen, ob der eingeloggte Benutzer der Gründer der Gruppe ist
        const currentUserId = this.authService.currentUser?.uid;
        if (currentUserId && group.founder === currentUserId) {
          this.isFounder = true; // Nur wenn der Benutzer der Gründer ist
        }

        // Überprüfe, ob Features in der DB vorhanden sind
        if (this.features.length > 0) {
          // Wenn Features vorhanden sind, sollen keine weiteren hinzugefügt werden
          this.canAddFeatures = false;
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

  private calculateBalance() {
    if (!this.members || this.members.length === 0) {
      this.myBalance = 0;
      return;
    }

    // Finde das eingeloggte Mitglied
    const member = this.members.find((m) => m.username === this.user);

    if (!member) {
      this.myBalance = 0;
      return;
    }

    // Berechnung der Bilanz (Guthaben - Ausgaben)
    const paidByUser = member.sumExpenseAmount; // Guthaben (Beträge, die ich bezahlt habe)
    const paidByMember = member.sumExpenseMemberAmount; // Ausgaben (Schulden, die ich bezahlt bekommen habe)

    this.myBalance = paidByUser - paidByMember; // Speichere den berechneten Wert
    console.log('Berechnete Bilanz:', this.myBalance);
  }

  // Logout-Funktion
  async logout() {
    try {
      this.authService.logout();
      this.router.navigate(['login']);
    } catch (e) {
      console.log(e);
    }
  }

  // Navigation zur Gruppenübersicht
  goBack() {
    this.router.navigate(['group-overview']);
  }

  // Funktion zur Generierung der Feature-Links mit groupId
  getFeatureLink(feature: string): string {
    switch (feature) {
      case 'Finanzübersicht':
        return `/finance/${this.groupId}`;
      case 'Ausgaben':
        return `/expense/${this.groupId}`;
      case 'Einkaufsliste':
        return `/shopping-list/${this.groupId}`; // Beispiel-Link für Shopping-List
      case 'Anlagegüter':
        return `/assets/${this.groupId}`; // Beispiel-Link für Assets
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

  // Funktion zur QR-Code-Generierung und Toggle
  generateQRCode() {
    if (this.accessCode) {
      this.qrCodeValue = `http://localhost:8100/group/${this.groupId}`;
      console.log('Generated QR Code URL:', this.qrCodeValue);
    }
  }

  toggleQRCodeOverlay() {
    this.generateQRCode(); // QR-Code generieren
    console.log('Overlay state:', this.overlayState);

    // Wenn der Zustand "start" ist, wechselt er zu "normal", um das Overlay zu zeigen
    if (this.overlayState === 'start') {
      this.overlayState = 'normal'; // Overlay wird sichtbar und Animation startet
    } else if (this.overlayState === 'normal') {
      // Wenn es im "normal" Zustand ist, wird es nach unten geschoben
      this.overlayState = 'hidden'; // Wechselt zum "hidden"-Zustand
    } else if (this.overlayState === 'hidden') {
      // Wenn es im "hidden" Zustand ist, wird es wieder nach oben geschoben
      this.overlayState = 'normal'; // Wechselt zurück zum "normal"-Zustand
    }

    console.log('Overlay state:', this.overlayState); // Debugging-Ausgabe
  }

  // Funktion zum Hinzufügen von Features, nur für den Gründer sichtbar
  async onFeaturesSelected(selectedFeatures: string[]) {
    if (
      !selectedFeatures?.length ||
      !this.groupId ||
      !this.authService.currentUser
    ) {
      console.warn('Keine gültigen Features ausgewählt.');
      return;
    }

    // Neue Features herausfiltern (nur die, die noch nicht enthalten sind)
    const newFeatures = selectedFeatures.filter(
      (f) => !this.features.includes(f)
    );

    if (newFeatures.length === 0) {
      console.warn('Alle ausgewählten Features sind bereits vorhanden.');
      return;
    }

    try {
      await this.groupService.addFeaturesToGroup(
        this.authService.currentUser.uid,
        this.groupId,
        newFeatures
      );

      // Features lokal zur Anzeige hinzufügen
      this.features.push(...newFeatures);
      console.log('Features erfolgreich hinzugefügt:', newFeatures);
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Features:', error);
    }
  }
}
