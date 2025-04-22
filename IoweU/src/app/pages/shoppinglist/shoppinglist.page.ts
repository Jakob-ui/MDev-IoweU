import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
  IonButton,
  IonIcon,
  IonCheckbox, IonLabel, IonSelect, IonInput, IonSelectOption, IonDatetime
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
    IonBadge,
    IonCard,
    IonIcon,
    RouterModule,
    IonButton,
    IonCheckbox,
    IonLabel,
    IonSelect,
    IonInput,
    FormsModule,
    IonSelectOption,
    IonDatetime,
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

  shoppingproducts: ShoppingProducts[] = [];
  groupedProducts: { date: string; shoppingproducts: ShoppingProducts[] }[] = [];

  overlayState: 'start' | 'normal' | 'hidden' = 'start';

  earliestDueDate: Date = new Date(2025, 2, 20);

  addProductOpen = false;

  newProduct = {
    quantity: null,
    unit: '',
    productname: '',
    forMemberId: '',
    dueDate: null
  };


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
    const grouped: { [key: string]: ShoppingProducts[] } = {};

    for (const product of this.shoppingproducts) {
      if (!product['date']) continue; // Sicherstellen, dass ein Datum vorhanden ist
      const formattedDate = new Date(product['date']).toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped[formattedDate]) {
        grouped[formattedDate] = [];
      }
      grouped[formattedDate].push(product);
    }

    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    this.groupedProducts = sortedDates.map((date) => ({
      date,
      shoppingproducts: grouped[date].sort((a, b) => {
        return new Date(b['date']).getTime() - new Date(a['date']).getTime();
      }),
    }));
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

  async saveNewProduct() {
    // Überprüfen, ob die groupId null ist, bevor sie weiterverwendet wird
    if (!this.groupId) {
      console.error('Group ID ist null oder undefined');
      alert('Die Gruppen-ID ist ungültig. Bitte versuche es erneut.');
      return; // Verhindert das Fortfahren, wenn groupId ungültig ist
    }

    if (this.newProduct.quantity && this.newProduct.productname && this.uid) {
      // Fälligkeitsdatum prüfen, falls null, Standardwert setzen
      const dueDate: string = this.newProduct.dueDate ? this.newProduct.dueDate : 'nicht dringend';

      const shoppingProductData: ShoppingProducts = {
        shoppingProductId: '', // Wird durch den Service generiert
        memberId: this.uid, // Angemeldeter Benutzer
        forMemberId: this.newProduct.forMemberId,
        productname: this.newProduct.productname,
        quantity: this.newProduct.quantity,
        unit: this.newProduct.unit,
        status: 'open',
        date: dueDate, // Hier das validierte dueDate verwenden
      };

      try {
        // Verwende die groupId und stelle sicher, dass sie nicht null ist
        await this.shoppinglistService.addShoppingProduct(this.groupId!, 'shoppingListId', shoppingProductData);
        console.log('Produkt erfolgreich gespeichert!');
        this.toggleAddProductOverlay();

        // Zurücksetzen der Eingabewerte
        this.newProduct = {
          quantity: null,
          unit: '',
          productname: '',
          forMemberId: '',
          dueDate: null,
        };
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Speichern fehlgeschlagen. Bitte versuche es noch einmal.');
      }
    } else {
      alert('Bitte fülle alle Pflichtfelder aus und stelle sicher, dass du eingeloggt bist.');
    }
  }


}
