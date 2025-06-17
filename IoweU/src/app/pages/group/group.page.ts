import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Platform, ToastController} from '@ionic/angular';
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
  IonSelectOption, IonBadge,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { Groups } from 'src/app/services/objects/Groups';
import { LoadingService } from '../../services/loading.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { FormsModule } from '@angular/forms';
import { Members } from 'src/app/services/objects/Members';
import {ShoppinglistService} from "../../services/shoppinglist.service";
import {ShoppingProducts} from "../../services/objects/ShoppingProducts";
import { addIcons } from 'ionicons';
import { copyOutline, logoWhatsapp, linkOutline } from 'ionicons/icons';

addIcons({
  'copy-outline': copyOutline,
  'logo-whatsapp': logoWhatsapp
});


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
    IonBadge,
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
  private shoppinglistService = inject(ShoppinglistService);
  private toastController = inject(ToastController);

  iosIcons: boolean = false;

  user: string | null = '';
  isFounder: boolean = false;
  currentGroup: Groups | null = null;
  balance: number = 0;
  totalCost: number = 120.5;
  displayName: string | null = null;

  groupname: string = '';
  groupId: string = '';
  features: string[] = [];
  groupImage: string = '';
  members: Members[] = [];
  accessCode: string = '';
  sumTotalExpenses: number | undefined = 0.0;
  countTotalExpenses: number | undefined = undefined;
  sumTotalExpensesMembers: number | undefined = undefined;
  countTotalExpensesMembers: number | undefined = undefined;

  showQRCode: boolean = false;
  qrCodeValue: string = '';
  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  currentMonth: string = 'März 2025';

  shoppingListId: string | null = '';
  shoppingProducts: ShoppingProducts[] = [];
  shoppingList: string[] = [];
  assetsList: string[] = [];
  group: Groups | null = null;

  myBalance: number = 0;

  availableFeatures: string[] = [
    'Einkaufsliste',
    'Anlagegüter',
    'Finanzübersicht',
    'Ausgaben',
  ];
  canAddFeatures: boolean = true;

  updateGroupCallback: (() => void) | null = null;

  async ngOnInit() {
    this.loadingService.show();
    await this.loadGroupData(this.groupId);

    try {
      // Warte, bis der Benutzer vollständig geladen ist
      await this.authService.waitForUser();

      //Backbutton Verhalten
      this.platform.backButton.subscribeWithPriority(10, () => {
        if (this.overlayState === 'normal') {
          this.overlayState = 'hidden'; // Nur Overlay schließen
        } else {
          this.goBack(); // Standard Verhalten
        }
      });

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
          await this.getShoppingProducts();
        } else {
          console.error('Keine Gruppen-ID in den Routenparametern gefunden.');
        }
      } else {
        console.error('Kein Benutzer eingeloggt.');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  ionViewWillLeave() {
    this.overlayState = 'start'; // Setze den Overlay-Zustand zurück
    console.log(
      'Overlay state beim Verlassen zurückgesetzt:',
      this.overlayState
    );
  }

  ngOnDestroy() {
    if (this.updateGroupCallback) {
      this.updateGroupCallback();
    }
  }

  // Funktion zum Laden der Gruppendaten
  async loadGroupData(id: string): Promise<void> {
    try {
      // Setze den Echtzeit-Listener
      this.updateGroupCallback = await this.groupService.getGroupAboByGroupId(
        id,
        (updatedGroups) => {
          if (updatedGroups.length > 0) {
            const group = updatedGroups[0]; // Es sollte nur eine Gruppe mit dieser ID geben
            this.group = group;
            this.groupService.setGroup(group);

            // Aktualisiere die lokalen Variablen
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
            this.isFounder = currentUserId === group.founder;

            // Überprüfe, ob Features in der DB vorhanden sind
            this.canAddFeatures = this.features.length === 0;
          } else {
            console.warn('Gruppe nicht gefunden!');
          }
        }
      );
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

    // Berechnung der Bilanz)
    this.myBalance =
      member.sumExpenseAmount -
      member.sumAmountReceived +
      member.sumAmountPaid -
      member.sumExpenseMemberAmount; // Speichere den berechneten Wert
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
    if (this.overlayState === 'normal') {
      this.overlayState = 'hidden'; // Optional: Overlay schließen
      this.router.navigate(['/group', this.groupId]);
    } else {
      this.router.navigate(['/group-overview']);
    }
  }

  // Funktion zur Generierung der Feature-Links mit groupId
  getFeatureLink(feature: string): string {
    switch (feature) {
      case 'Finanzübersicht':
        return `/finance/${this.groupId}`;
      case 'Ausgaben':
        return `/expense/${this.groupId}`;
      case 'Einkaufsliste':
        return `/shoppinglist/${this.groupId}`;
      case 'Anlagegüter':
        return `/group/${this.groupId}`;
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
      this.qrCodeValue = `https://app.ioweu.eu/group/${this.groupId}`;
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

  async getShoppingProducts() {
    this.shoppingListId =
      await this.shoppinglistService.getShoppingListIdByGroupId(this.groupId!);

    if (!this.shoppingListId) {
      console.error('ShoppingListId ist null!');
      return;
    }

    this.shoppingProducts = await this.shoppinglistService.getShoppingProducts(
      this.groupId!,
      this.shoppingListId
    );
  }

  getFeatureColor(feature: string): string {
    switch (feature) {
      case 'Finanzübersicht':
        return 'color-1';
      case 'Ausgaben':
        return 'color-2';
      case 'Einkaufsliste':
        return 'color-3';
      case 'Anlagegüter':
        return 'color-4';
      default:
        return '';
    }
  }

  copyAccessCode(event: Event): void {
    event.stopPropagation();
    navigator.clipboard
      .writeText(this.accessCode)
      .then(async () => {
        console.log('Access-Code wurde kopiert:', this.accessCode);
        await this.presentToast('Accesscode wurde kopiert!');
      })
      .catch((err) => {
        console.error('Fehler beim Kopieren:', err);
      });
  }

  copyLinkCode(event: Event): void {
    event.stopPropagation();
    navigator.clipboard
      .writeText(`https://app.ioweu.eu/join-group/${this.accessCode}`)
      .then(async () => {
        await this.presentToast('AccessLink wurde kopiert!');
      })
      .catch((err) => {
        console.error('Fehler beim Kopieren:', err);
      });
  }

  shareViaWhatsApp(event: Event): void {
    event.stopPropagation();
    const text = `https://app.ioweu.eu/join-group/${this.accessCode}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      cssClass: 'custom-toast',
    });
    await toast.present();
  }
}
