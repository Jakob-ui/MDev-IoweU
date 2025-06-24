import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonContent,
  IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList,

  IonToolbar,
  Platform, IonCheckbox } from '@ionic/angular/standalone';
import {AuthService} from "../../services/auth.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {LoadingService} from "../../services/loading.service";
import {GroupService} from "../../services/group.service";
import {ShoppinglistService} from "../../services/shoppinglist.service";
import {Members} from "../../services/objects/Members";
import {ShoppingProducts} from "../../services/objects/ShoppingProducts";
import {AlertController, NavController, ToastController} from "@ionic/angular";

@Component({
  selector: 'app-shoppingcart',
  templateUrl: './shoppingcart.page.html',
  styleUrls: ['./shoppingcart.page.scss'],
  standalone: true,
  imports: [
    IonCheckbox,
    IonContent,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButton,
    IonCard,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    RouterLink,
  ],
})
export class ShoppingcartPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private activeRoute = inject(ActivatedRoute);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private shoppinglistService = inject(ShoppinglistService);
  private navCtrl = inject(NavController);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private platform = inject(Platform);

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;

  groupname: string = '';
  groupId: string | null = '';
  groupMembers: { uid: string; username: string }[] = []; // Verwenden Sie das Members-Interface
  iosIcons: boolean = false;

  forMemberDropdownOpen: boolean = false;
  selectedMember: any = this.uid
    ? { uid: this.uid, username: 'Dein Name' }
    : null;

  showDetails: boolean = false;
  public showCheckbox: boolean = false;

  shoppingCartId: string | null = '';
  shoppingproducts: ShoppingProducts[] = [];
  groupedProducts: { date: string; shoppingproducts: ShoppingProducts[] }[] =
    [];

  overlayState: 'start' | 'normal' | 'hidden' = 'start';
  detailsOverlayState: 'start' | 'normal' | 'hidden' = 'start';

  earliestDueDate: Date = new Date(2025, 2, 20);
  earliestDueDateLabel: string = '';

  showDeleteConfirm: boolean = false;
  productToDelete: any;
  touchStartX: number = 0;
  touchStartTime: number = 0;

  addProductOpen = false;

  newProduct = {
    quantity: 1,
    unit: 'Stück',
    productname: '',
    forMemberId: this.uid || '',
    dueDate: null,
  };

  selectedProduct: ShoppingProducts = {
    shoppingProductId: '',
    memberId: '',
    forMemberId: '',
    productname: '',
    quantity: 0,
    unit: '',
    date: '',
    status: '',
  };

  isDatePickerOpen = false;

  private unsubscribeShoppingCart!: () => void;

  animatedCount: number = 0; // Animierte Produktanzahl

  async ngOnInit() {
    this.updateCheckboxVisibility();
    try {
      // Benutzer wird gewartet und überprüft
      await this.authService.waitForUser();

      //Backbutton Verhalten
      this.platform.backButton.subscribeWithPriority(10, () => {
        if (this.overlayState === 'normal') {
          this.overlayState = 'hidden'; // Nur Overlay schließen
        } else {
          this.goBack(); // Standard Verhalten
        }
      });

      if (!this.authService.currentUser) {
        console.error('Kein Benutzer eingeloggt.');
        return;
      }

      this.uid = this.authService.currentUser.uid;
      this.user = this.authService.currentUser.username;
      this.displayName = this.authService.currentUser.username;

      // Die groupId aus der URL erhalten
      this.groupId = this.activeRoute.snapshot.paramMap.get('groupId');
      this.shoppingCartId =
        await this.shoppinglistService.getShoppingCartIdByGroupId(
          this.groupId!
        );
      console.log('shoppingCartId:', this.shoppingCartId);

      if (!this.groupId) {
        console.error('Keine groupId in Route gefunden.');
        return;
      }

      const currentGroup = await this.groupService.getGroupById(this.groupId);
      if (currentGroup) {
        this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
        const originalMembers = Array.isArray(currentGroup.members)
          ? currentGroup.members
          : [];
        this.groupMembers = [
          { uid: 'all', username: 'Alle' },
          ...originalMembers,
        ];
      } else {
        this.groupname = 'Unbekannte Gruppe';
        this.groupMembers = [{ uid: 'all', username: 'Alle' }];
      }

      this.selectedMember = this.groupMembers.find(
        (member) => member.uid === this.shoppingproducts[0]?.forMemberId
      ) || { uid: this.uid, username: this.displayName || 'Unbekannt' };

      // Hole die Produkte für diese Gruppe
      await this.loadShoppingCartProducts();

      this.unsubscribeShoppingCart =
        this.shoppinglistService.listenToShoppingCartChanges(
          this.groupId,
          this.shoppingCartId,
          (products) => {
            this.shoppingproducts = products;
            this.groupProductsByDate();
            this.animateCount(this.shoppingproducts.length); // Animation triggern
          }
        );
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  ngOnDestroy() {
    // Den Listener abbestellen, wenn die Komponente zerstört wird
    if (this.unsubscribeShoppingCart) {
      this.unsubscribeShoppingCart();
    }
  }

  onCheckboxChange(event: any, shoppingProductId: string) {
    if (event.detail.checked) {
      this.moveProductToList(shoppingProductId);
    }
  }

  private updateCheckboxVisibility() {
    this.showCheckbox = window.innerWidth > 600;
  }

  async loadShoppingCartProducts() {
    try {
      if (!this.groupId) {
        console.error('groupId ist null oder undefined');
        return;
      }

      if (!this.shoppingCartId) {
        console.error('shoppingCartId ist null oder undefined');
        return;
      }

      const allProducts =
        await this.shoppinglistService.getShoppingCartProducts(
          this.groupId,
          this.shoppingCartId
        );
      this.shoppingproducts = allProducts.filter(
        (p) => p.status === 'im Warenkorb'
      );
      this.groupProductsByDate();
      this.animateCount(this.shoppingproducts.length); // Animation triggern
    } catch (error) {
      console.error('Fehler beim Laden der Produkte aus dem Warenkorb:', error);
    }
  }

  groupProductsByDate() {
    const grouped: { [key: string]: ShoppingProducts[] } = {
      'Nicht dringend': [],
    };

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const validDates: Date[] = [];

    for (const product of this.shoppingproducts) {
      if (!product['date']) continue;
      const dueDate = new Date(product['date']);
      const formattedDate = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const oneMonthLater = new Date(today);
      oneMonthLater.setMonth(today.getMonth() + 1);

      if (dueDate > oneMonthLater || formattedDate === '9999-12-31') {
        grouped['Nicht dringend'].push(product);
      } else {
        if (!grouped[formattedDate]) {
          grouped[formattedDate] = [];
        }
        grouped[formattedDate].push(product);
        validDates.push(dueDate);
      }
    }

    // Frühestes Fälligkeitsdatum berechnen (außer "Nicht dringend")
    if (validDates.length > 0) {
      this.earliestDueDate = new Date(
        Math.min(...validDates.map((d) => d.getTime()))
      );
    } else {
      this.earliestDueDate = new Date(); // Fallback
    }

    // earliestDueDate Label erzeugen
    this.earliestDueDateLabel = this.formatDateLabel(
      this.earliestDueDate.toISOString().split('T')[0],
      today,
      yesterday,
      tomorrow
    );

    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === 'Nicht dringend') return 1;
      if (b === 'Nicht dringend') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

    this.groupedProducts = sortedDates.map((date) => ({
      date:
        date === 'Nicht dringend'
          ? 'Nicht dringend'
          : this.formatDateLabel(date, today, yesterday, tomorrow),
      shoppingproducts: grouped[date].sort(
        (a, b) => new Date(b['date']).getTime() - new Date(a['date']).getTime()
      ),
    }));
  }

  formatDateLabel(
    date: string,
    today: Date,
    yesterday: Date,
    tomorrow: Date
  ): string {
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

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}.${month}.${year}`;
  }

  isPast(date: string | Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Wenn "Gestern", "Heute", "Morgen" als Label übergeben wird
    if (typeof date === 'string') {
      const lower = date.toLowerCase();
      if (lower === 'gestern') return true;
      if (lower === 'heute' || lower === 'morgen') return false;
    }

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    return d < today;
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
    const member = this.groupMembers.find((m) => m.uid === memberId);
    return member ? member.username : 'Unbekanntes Mitglied';
  }

  goBack() {
    if (this.overlayState === 'normal') {
      this.overlayState = 'hidden'; // Optional: Overlay schließen
      this.router.navigate(['/shoppingcart', this.groupId]);
    } else {
      this.router.navigate(['/group', this.groupId]);
    }
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

  async toggleDetailsOverlay(shoppingProductId: string) {
    if (!this.groupId) {
      console.error('Group ID ist null oder undefined');
      alert('Die Gruppen-ID ist ungültig. Bitte versuche es erneut.');
      return;
    }

    if (!this.shoppingCartId) {
      console.error('ShoppingList ID ist null oder undefined');
      alert('Die ShoppingList-ID ist ungültig. Bitte versuche es erneut.');
      return;
    }

    try {
      // Rufe das Produkt anhand von groupId, shoppingListId und shoppingProductId ab
      const selectedShoppingProduct =
        await this.shoppinglistService.getShoppingCartProductById(
          this.groupId,
          this.shoppingCartId,
          shoppingProductId
        );

      if (selectedShoppingProduct) {
        this.selectedProduct = { ...selectedShoppingProduct }; // Kopie setzen
      } else {
        console.error('Produkt konnte nicht geladen werden');
        return;
      }

      // Wechsel des Overlay-Zustands
      if (this.detailsOverlayState === 'start') {
        this.detailsOverlayState = 'normal'; // Overlay wird sichtbar und Animation startet
      } else if (this.detailsOverlayState === 'normal') {
        this.detailsOverlayState = 'hidden'; // Wechselt zum "hidden"-Zustand
      } else if (this.detailsOverlayState === 'hidden') {
        this.detailsOverlayState = 'normal'; // Wechselt zurück zum "normal"-Zustand
      }

      console.log('Details Overlay state:', this.detailsOverlayState); // Debugging-Ausgabe
    } catch (error) {
      console.error('Fehler beim Laden des Produkts:', error);
    }
  }

  getDateDisplay(date: string): string {
    if (!date) return '';

    const now = new Date();
    const dueDate = new Date(date);
    const inOneYear = new Date(now);
    inOneYear.setFullYear(now.getFullYear() + 1);

    if (dueDate > inOneYear || date === '9999-12-31') {
      return 'Nicht dringend';
    }

    return new Intl.DateTimeFormat('de-AT').format(dueDate);
  }

  goToCreateExpense() {
    try {
      // Navigiere mit queryParams
      this.router.navigate(['/create-expense', this.groupId], {
        queryParams: {
          fromShoppingCart: this.shoppingCartId,
        },
      });
    } finally {
      this.loadingService.hide();
    }
  }

  async deleteProductForShoppingCart(shoppingProductId: string) {
    try {
      if (!this.shoppingCartId) {
        throw new Error('ShoppingListId ist nicht definiert!');
      }

      await this.shoppinglistService.deleteShoppingProduct(
        this.groupId!,
        this.shoppingCartId, // Hier wird sicher die shoppingListId übergeben
        shoppingProductId
      );
      console.log('Produkt gelöscht:', shoppingProductId);

      await this.loadShoppingCartProducts();
    } catch (error) {
      console.error('Fehler beim Löschen des Produkts:', error);
    }
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartTime = Date.now(); // Zeit des Touch-Starts merken
  }

  onTouchEnd(event: TouchEvent, shoppingProduct: any) {
    const touchEndX = event.changedTouches[0].screenX;
    const deltaX = touchEndX - this.touchStartX;
    const swipeDuration = Date.now() - this.touchStartTime;
    const swipeThreshold = 100; // Mindestdistanz in px
    const maxSwipeTime = 500; // maximale Dauer für "echten" Swipe in ms

    // Abbrechen, wenn der Wisch zu langsam oder zu kurz war
    if (Math.abs(deltaX) < swipeThreshold || swipeDuration > maxSwipeTime) {
      return;
    }

    if (deltaX > 0) {
      // Swipe nach rechts
      (shoppingProduct as any).swiped = 'right';

      setTimeout(() => {
        this.moveProductToList(shoppingProduct.shoppingProductId);
        this.presentToast(
          'Produkt wurde zurück in die Einkaufsliste verschoben!'
        );
        this.shoppingproducts = this.shoppingproducts.filter(
          (p) => p.shoppingProductId !== shoppingProduct.shoppingProductId
        );
        this.groupProductsByDate();
      }, 300);
    } else {
      // Swipe nach links
      (shoppingProduct as any).swiped = 'left';

      setTimeout(() => {
        this.productToDelete = shoppingProduct;
        this.showDeleteAlert();
        (shoppingProduct as any).swiped = null;
      }, 300);
    }
  }

  async moveProductToList(shoppingProductId: string) {
    const groupId = this.groupId;
    if (!groupId) {
      console.error('groupId fehlt');
      return;
    }

    try {
      const shoppingCart =
        await this.shoppinglistService.getShoppingCartByGroupId(groupId);
      if (!shoppingCart) {
        console.error('Keine Einkaufsliste für diese Gruppe gefunden');
        return;
      }

      const shoppingCartId = shoppingCart.shoppingcartId;

      await this.shoppinglistService.moveProductBackToShoppingList(
        groupId,
        shoppingCartId,
        shoppingProductId
      );
      console.log('Produkt verschoben!');

      this.loadShoppingCartProducts();
    } catch (error) {
      console.error('Fehler beim Verschieben:', error);
    }
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

  async showDeleteAlert() {
    const alert = await this.alertController.create({
      header: 'Bestätigen',
      message: 'Möchten Sie dieses Produkt wirklich löschen?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
          handler: () => {
            this.showDeleteConfirm = false;
            this.productToDelete = null;

            if (this.productToDelete && (this.productToDelete as any).swiped) {
              (this.productToDelete as any).swiped = null;
            }
          },
        },
        {
          text: 'Löschen',
          handler: () => {
            if (this.productToDelete) {
              this.deleteProductForShoppingCart(
                this.productToDelete.shoppingProductId
              );
              this.presentToast('Produkt wurde erfolgreich gelöscht!');

              this.showDeleteConfirm = false;
              this.productToDelete = null;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // Animiert die Produktanzahl von aktuellem Wert zu neuem Wert
  animateCount(target: number) {
    const duration = 400; // ms
    const frameRate = 30; // fps
    const steps = Math.max(1, Math.round(duration / (1000 / frameRate)));
    const start = this.animatedCount;
    const diff = target - start;
    if (diff === 0) return;
    let currentStep = 0;

    const stepFn = () => {
      currentStep++;
      this.animatedCount = Math.round(start + (diff * currentStep) / steps);
      if (currentStep < steps) {
        setTimeout(stepFn, 1000 / frameRate);
      } else {
        this.animatedCount = target;
      }
    };

    stepFn();
  }
}
