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
  IonCheckbox
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

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();

      if (!this.authService.currentUser) {
        console.error('Kein Benutzer eingeloggt.');
        return;
      }

      this.uid = this.authService.currentUser.uid;
      this.user = this.authService.currentUser.username;
      this.displayName = this.authService.currentUser.username;

      const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

      if (!groupId) {
        console.error('Keine groupId in Route gefunden.');
        return;
      }

      this.groupId = groupId;

      // Hier kannst du Mock-Daten für die Gruppe setzen
      const currentGroup = await this.groupService.getGroupById(groupId);

      if (currentGroup) {
        this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
        this.groupMembers = Array.isArray(currentGroup.members) ? currentGroup.members : [];
      } else {
        console.warn('Gruppe nicht gefunden');
        this.groupname = 'Unbekannte Gruppe';
        this.groupMembers = [];
      }

      // Füge Mock-Daten für die Produkte hinzu
      this.shoppingproducts = this.getMockShoppingProducts();
      this.groupProductsByDate();

    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  getMockShoppingProducts(): ShoppingProducts[] {
    return [
      {
        shoppingProductId: 'sp1',
        memberId: 'm1',
        forMemberId: 'm2',
        product: [
          {
            productId: 'p1',
            memberId: 'm1',
            productname: 'Äpfel',
            quantity: 2,
            unit: 'kg',
            price: 3.5,
          },
          {
            productId: 'p2',
            memberId: 'm1',
            productname: 'Bananen',
            quantity: 1,
            unit: 'kg',
            price: 2.0,
          },
        ],
        date: '2025-04-20',
        status: 'pending',
      },
      {
        shoppingProductId: 'sp2',
        memberId: 'm2',
        forMemberId: 'm3',
        product: [
          {
            productId: 'p3',
            memberId: 'm2',
            productname: 'Tomaten',
            quantity: 3,
            unit: 'kg',
            price: 4.0,
          },
        ],
        date: '2025-04-20',
        status: 'completed',
      },
      {
        shoppingProductId: 'sp3',
        memberId: 'm3',
        forMemberId: 'm1',
        product: [
          {
            productId: 'p4',
            memberId: 'm3',
            productname: 'Kartoffeln',
            quantity: 5,
            unit: 'kg',
            price: 2.5,
          },
        ],
        date: '2025-04-18',
        status: 'pending',
      },
    ];
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

  // Navigation zur Seite zum Erstellen einer neuen Ausgabe
  goToAddProduct() {
    this.loadingService.show();
    try {
      this.router.navigate(['add-product', this.groupId]);
    } finally {
      this.loadingService.hide();
    }
  }

  toggleChecked(shoppingproduct: ShoppingProducts) {
    // Hier kannst du die Logik hinzufügen, um den Status des Produktes zu ändern
    // Zum Beispiel: shoppingproduct.status = 'completed' oder 'pending'
    console.log('Produkt-Status geändert:', shoppingproduct);
  }
}
