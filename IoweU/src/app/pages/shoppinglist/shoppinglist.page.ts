import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem,
  IonList,
  IonCard,
  IonButton,
  IonIcon,
  IonCheckbox, IonSelect, IonInput, IonSelectOption, IonDatetime, IonLabel
} from '@ionic/angular/standalone';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { GroupService } from '../../services/group.service';
import { Members } from 'src/app/services/objects/Members';
import { Shoppinglists } from "../../services/objects/Shoppinglists";
import { ShoppingCarts } from "../../services/objects/ShoppingCarts";
import { ShoppingProducts } from "../../services/objects/ShoppingProducts";
import { ShoppinglistService } from "../../services/shoppinglist.service";
import {FormsModule} from "@angular/forms";
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-shoppinglist',
  templateUrl: './shoppinglist.page.html',
  styleUrls: ['./shoppinglist.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonItem,
    IonList,
    IonCard,
    IonIcon,
    RouterModule,
    IonButton,
    IonCheckbox,
    IonSelect,
    IonInput,
    FormsModule,
    IonSelectOption,
    IonDatetime,
    IonLabel,
  ],
})
export class ShoppinglistPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private activeRoute = inject(ActivatedRoute);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private shoppinglistService = inject(ShoppinglistService);

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;

  groupname: string = '';
  groupId: string | null = '';
  groupMembers: Members[] = []; // Verwenden Sie das Members-Interface
  iosIcons: boolean = false;

  forMemberDropdownOpen: boolean = false;
  selectedMember: any = this.uid ? { uid: this.uid, username: 'Dein Name' } : null;

  showDetails: boolean = false;


  shoppingproducts: ShoppingProducts[] = [];
  groupedProducts: { date: string; shoppingproducts: ShoppingProducts[] }[] = [];

  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  earliestDueDate: Date = new Date(2025, 2, 20);

  addProductOpen = false;

  newProduct = {
    quantity: 1,
    unit: 'Stück',
    productname: '',
    forMemberId: this.uid || '',
    dueDate: null
  };


  isDatePickerOpen = false;

  async ngOnInit() {
    this.loadingService.show();

    try {
      // Benutzer wird gewartet und überprüft
      await this.authService.waitForUser();

      if (!this.authService.currentUser) {
        console.error('Kein Benutzer eingeloggt.');
        return;
      }

      this.uid = this.authService.currentUser.uid;
      this.user = this.authService.currentUser.username;
      this.displayName = this.authService.currentUser.username;

      // Die groupId aus der URL erhalten
      const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

      if (!groupId) {
        console.error('Keine groupId in Route gefunden.');
        return;
      }

      this.groupId = groupId;

      // Hole die Gruppe basierend auf der groupId
      const currentGroup = await this.groupService.getGroupById(groupId);

      if (currentGroup) {
        this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
        this.groupMembers = Array.isArray(currentGroup.members) ? currentGroup.members : [];
      } else {
        console.warn('Gruppe nicht gefunden');
        this.groupname = 'Unbekannte Gruppe';
        this.groupMembers = [];
      }

      this.selectedMember =
        this.groupMembers.find(
          (member) => member.uid === this.shoppingproducts[0]?.forMemberId
        ) ||
        { uid: this.uid, username: this.displayName || 'Unbekannt' };

      // Holen der Produkte für diese Gruppe
      await this.loadShoppingProducts(this.groupId);

    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

// Methode zum Laden der Produkte aus der Firebase-Datenbank
  async loadShoppingProducts(groupId: string) {
    try {
      this.shoppingproducts = await this.shoppinglistService.getShoppingProducts(groupId); // Hier wird die asynchrone Methode aufgerufen
      this.groupProductsByDate(); // Produkte nach Datum gruppieren
    } catch (error) {
      console.error('Fehler beim Laden der Produkte:', error);
    }
  }

  groupProductsByDate() {
    const grouped: { [key: string]: ShoppingProducts[] } = {
      'Nicht dringend': [] // Hier wird die "Nicht dringend"-Kategorie eingeführt
    };

    // Heute, gestern und morgen definieren
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Morgen

    for (const product of this.shoppingproducts) {
      if (!product['date']) continue; // Sicherstellen, dass ein Datum vorhanden ist
      const formattedDate = new Date(product['date']).toISOString().split('T')[0]; // YYYY-MM-DD

      // Überprüfen, ob das Datum mehr als einen Monat entfernt ist
      const dueDate = new Date(product['date']);
      const oneMonthLater = new Date(today);
      oneMonthLater.setMonth(today.getMonth() + 1);

      // Wenn das Datum mehr als einen Monat entfernt ist, in "Nicht dringend" hinzufügen
      if (dueDate > oneMonthLater) {
        grouped['Nicht dringend'].push(product);
      } else {
        // Ansonsten nach Datum gruppieren
        if (!grouped[formattedDate]) {
          grouped[formattedDate] = [];
        }
        grouped[formattedDate].push(product);
      }
    }

    // Gruppierte Daten sortieren, die Daten werden weiterhin nach Datum sortiert
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      // Sonderbehandlung für "Nicht dringend", das immer unten angezeigt wird
      if (a === 'Nicht dringend') return 1;
      if (b === 'Nicht dringend') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Um die Ausgabe von 'Heute', 'Gestern' und 'Morgen' zu ermöglichen
    this.groupedProducts = sortedDates.map((date) => ({
      date: date === 'Nicht dringend'
        ? 'Nicht dringend'  // Hier wird "Nicht dringend" direkt angezeigt
        : this.formatDateLabel(date, today, yesterday, tomorrow),
      shoppingproducts: grouped[date].sort((a, b) => {
        return new Date(b['date']).getTime() - new Date(a['date']).getTime();
      }),
    }));
  }

  formatDateLabel(date: string, today: Date, yesterday: Date, tomorrow: Date): string {
    const dateObj = new Date(date);

    if (dateObj.toDateString() === today.toDateString()) {
      return 'Heute';
    }

    if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    }

    if (dateObj.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    }

    // Wenn es kein spezielles Datum wie "Heute", "Gestern" oder "Morgen" ist,
    // formatiere es als dd.MM.yyyy
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Monate sind 0-indexiert
    const year = dateObj.getFullYear();

    return `${day}.${month}.${year}`;
  }



  getFirstLetter(paidBy: string): string {
    const member = this.groupMembers.find((m) => m.uid === paidBy);
    if (member && member.username && member.username.length > 0) {
      return member.username.charAt(0).toUpperCase();
    }
    return '';
  }

  // Methode, um den Benutzernamen anhand der forMemberId zu finden
  getUsernameById(memberId: string): string {
    const member = this.groupMembers.find(m => m.uid === memberId);
    return member ? member.username : 'Unbekanntes Mitglied';
  }


  goBack() {
    this.router.navigate(['/group', this.groupId]);
  }

  toggleInfoOverlay() {

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

  openDatePicker() {
    this.isDatePickerOpen = true;
  }

  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  onDateChange(event: any) {
    this.newProduct.dueDate = event.detail.value;
    this.closeDatePicker();
  }

  toggleForMemberDropdown(event: Event) {
    this.forMemberDropdownOpen = !this.forMemberDropdownOpen; // Öffnen/Schließen des Dropdowns
    event.stopPropagation(); // Verhindert, dass das Klick-Event weitergeleitet wird
  }
  selectMember(member: any, event: Event) {
    this.newProduct.forMemberId = member.uid; // Setze die UID des ausgewählten Mitglieds
    this.selectedMember = member; // Speichere das ausgewählte Mitglied
    this.forMemberDropdownOpen = false; // Schließe das Dropdown
    event.stopPropagation(); // Verhindert, dass das Klick-Event weitergeleitet wird
  }


  goToShoppingDetails(expenseId: string) {
    this.loadingService.show();
    try {
      // Hier wird der expenseId der aktuellen Ausgabe übergeben
      this.router.navigate(['shopping-detail', this.groupId, expenseId]);
    } finally {
      this.loadingService.hide();
    }
  }

  toggleChecked(shoppingproduct: ShoppingProducts) {
    // Hier kannst du die Logik hinzufügen, um den Status des Produktes zu ändern
    // Zum Beispiel: shoppingproduct.status = 'completed' oder 'pending'
    console.log('Produkt-Status geändert:', shoppingproduct);
  }

  toggleAddProductOverlay() {
    this.addProductOpen = !this.addProductOpen;
  }

  handleOverlayClick() {
    const trimmedName = this.newProduct.productname?.trim();

    if (trimmedName) {
      // Produktname vorhanden → speichern und Overlay schließen
      this.saveNewProduct();
    } else {
      // Kein Produktname → Overlay einfach schließen
      this.addProductOpen = false;
    }
  }

  async saveNewProduct() {
    if (!this.groupId) {
      console.error('Group ID ist null oder undefined');
      alert('Die Gruppen-ID ist ungültig. Bitte versuche es erneut.');
      return;
    }

    const trimmedName = this.newProduct.productname?.trim();

    if (!trimmedName || !this.uid) {
      alert('Bitte gib mindestens einen Produktnamen ein.');
      return;
    }

    // Setze ein extrem weit entferntes Datum, wenn kein Datum gesetzt ist
    const dueDate = this.newProduct.dueDate || '9999-12-31';

    const shoppingProductData: ShoppingProducts = {
      shoppingProductId: '',
      memberId: this.uid,
      forMemberId: this.newProduct.forMemberId?.trim() || this.uid,
      productname: trimmedName,
      quantity: this.newProduct.quantity ?? 1, // Default: 1
      unit: this.newProduct.unit?.trim() || 'Stück', // Default: 'Stück'
      status: 'open',
      date: dueDate // Speichere das weit entfernte Datum
    };

    try {
      await this.shoppinglistService.addShoppingProduct(this.groupId!, 'shoppingListId', shoppingProductData);
      console.log('Produkt erfolgreich gespeichert!');
      this.toggleAddProductOverlay();

      // Reset mit Defaults
      this.newProduct = {
        quantity: 1,
        unit: 'Stück',
        productname: '',
        forMemberId: this.uid || '',
        dueDate: null,
      };
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Speichern fehlgeschlagen. Bitte versuche es noch einmal.');
    }
  }

}
