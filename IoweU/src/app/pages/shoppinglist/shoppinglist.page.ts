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
  IonInput, IonDatetime, IonLabel, IonCheckbox,
  Platform
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
import {AlertController, ToastController} from "@ionic/angular";

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
    IonInput,
    FormsModule,
    IonDatetime,
    IonLabel,
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
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private platform = inject(Platform);

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;

  groupname: string = '';
  groupId: string | null = '';
  groupMembers: { uid: string; username: string }[] = [];
  iosIcons: boolean = false;

  forMemberDropdownOpen: boolean = false;
  selectedMember: any = this.uid ? { uid: this.uid, username: 'Dein Name' } : null;
  isForAll: boolean = false;

  showDetails: boolean = false;

  shoppingListId: string | null = '';
  shoppingproducts: ShoppingProducts[] = [];
  groupedProducts: { date: string; shoppingproducts: ShoppingProducts[] }[] = [];

  overlayState: 'start' | 'normal' | 'hidden' = 'start';
  detailsOverlayState: 'start' | 'normal' | 'hidden' = 'start';

  earliestDueDate: Date = new Date(2025, 2, 20);
  earliestDueDateLabel: string = '';

  showDeleteConfirm: boolean = false;
  productToDelete: any;
  touchStartX: number = 0;
  touchStartTime: number = 0;

  inputVisible = true;

  addProductOpen = false;
  animatedItems: { [key: string]: boolean } = {};

  animatedCount: number = 0; // Animierte Produktanzahl

  newProduct = {
    quantity: 1,
    unit: 'Stück',
    productname: '',
    forMemberId: this.uid || '',
    dueDate: null
  };

  selectedProduct: ShoppingProducts = {
    shoppingProductId: '',
    memberId: '',
    forMemberId: '',
    productname: '',
    quantity: 0,
    unit: '',
    date: '',
    status: ''
  };

  isDatePickerOpen = false;
  public showCheckbox: boolean = false;

  isSaving = false;

  private unsubscribeProductsListener!: () => void;


  async ngOnInit() {
    this.loadingService.show();

    try {
      // User und Group initialisieren (wie von dir schon implementiert)
      await this.authService.waitForUser();

       //Backbutton Verhalten
      this.platform.backButton.subscribeWithPriority(10, () => {
        // 1. Details-Overlay zuerst schließen, wenn offen
        if (this.detailsOverlayState === 'normal') {
          this.detailsOverlayState = 'hidden';
          return;
        }

        // 2. Dann Haupt-Overlay schließen, wenn offen
        if (this.overlayState === 'normal') {
          this.overlayState = 'hidden';
          return;
        }

        // 3. Wenn keine Overlays offen, Standardverhalten ausführen
        this.goBack();
      });

      if (!this.authService.currentUser) return;

      this.uid = this.authService.currentUser.uid;
      this.user = this.authService.currentUser.username;
      this.displayName = this.authService.currentUser.username;

      const routeGroupId = this.activeRoute.snapshot.paramMap.get('groupId');
      if (!routeGroupId) return;
      this.groupId = routeGroupId;

      this.shoppingListId = await this.shoppinglistService.getShoppingListIdByGroupId(this.groupId);

      const currentGroup = await this.groupService.getGroupById(this.groupId);
      if (currentGroup) {
        this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
        const originalMembers = Array.isArray(currentGroup.members) ? currentGroup.members : [];
        this.groupMembers = [
          { uid: 'all', username: 'Alle' },
          ...originalMembers
        ];
      } else {
        console.warn('Gruppe nicht gefunden');
        this.groupname = 'Unbekannte Gruppe';
        this.groupMembers = [
          { uid: 'all', username: 'Alle' }
        ];
      }

      window.addEventListener('resize', this.updateCheckboxVisibility.bind(this));
      this.unsubscribeProductsListener = this.shoppinglistService.listenToShoppingProductsChanges(
        this.groupId,
        this.shoppingListId,
        (products) => {
          this.shoppingproducts = products.filter(p => p.status === 'open');
          this.groupProductsByDate();
          this.animateCount(this.shoppingproducts.length); // Animation triggern

          if (!this.selectedMember && this.shoppingproducts.length > 0) {
            this.selectedMember = this.groupMembers.find(
              (member) => member.uid === this.shoppingproducts[0]?.forMemberId
            ) || { uid: this.uid, username: this.displayName || 'Unbekannt' };
          }
        }
      );
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }


  ngOnDestroy() {
    window.removeEventListener('resize', this.updateCheckboxVisibility.bind(this));
    if (this.unsubscribeProductsListener) {
      this.unsubscribeProductsListener();
    }
  }

  private updateCheckboxVisibility() {
    this.showCheckbox = window.innerWidth > 600;
  }


  async loadShoppingProducts() {
    try {

      if(!this.groupId) {
        console.error('groupId ist null oder undefined');
        return;
      }

      if (!this.shoppingListId) {
        console.error('shoppingListId ist null oder undefined');
        return;
      }

      const allProducts = await this.shoppinglistService.getShoppingProducts(this.groupId, this.shoppingListId);
      this.shoppingproducts = allProducts.filter(p => p.status === 'open');
      this.groupProductsByDate();
      this.animateCount(this.shoppingproducts.length); // Animation triggern
    } catch (error) {
      console.error('Fehler beim Laden der Produkte:', error);
    }
  }



  async getShoppingProductById(groupId: string, shoppingProductId: string): Promise<ShoppingProducts | null> {
    try {
      if (!groupId || !shoppingProductId) {
        console.error('Ungültige groupId oder shoppingProductId');
        return null;
      }

      const product = await this.shoppinglistService.getShoppingProductById(groupId, shoppingProductId, shoppingProductId);

      if (product) {
        console.log('Produkt gefunden:', product);
        return product;
      } else {
        console.warn('Kein Produkt mit dieser ID gefunden');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Produkts:', error);
      return null;
    }
  }


  groupProductsByDate() {
    const grouped: { [key: string]: ShoppingProducts[] } = {
      'Nicht dringend': []
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

    if (validDates.length > 0) {
      this.earliestDueDate = new Date(Math.min(...validDates.map(d => d.getTime())));
    } else {
      this.earliestDueDate = new Date(); // Fallback
    }

    this.earliestDueDateLabel = this.formatDateLabel(this.earliestDueDate.toISOString().split('T')[0], today, yesterday, tomorrow);

    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === 'Nicht dringend') return 1;
      if (b === 'Nicht dringend') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

    this.groupedProducts = sortedDates.map((date) => ({
      date: date === 'Nicht dringend'
        ? 'Nicht dringend'
        : this.formatDateLabel(date, today, yesterday, tomorrow),
      shoppingproducts: grouped[date].sort((a, b) => new Date(b['date']).getTime() - new Date(a['date']).getTime()),
    }));
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

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}.${month}.${year}`;
  }

  isPast(date: string | Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

  getUsernameById(memberId: string): string {
    const member = this.groupMembers.find(m => m.uid === memberId);
    return member ? member.username : 'Unbekanntes Mitglied';
  }

  goBack() {
  // Zuerst: Falls Details-Overlay offen ist, nur dieses schließen
  if (this.detailsOverlayState === 'normal') {
    this.detailsOverlayState = 'hidden';
    return;
  }

  // Dann: Falls das Haupt-Overlay offen ist, nur dieses schließen
  if (this.overlayState === 'normal') {
    this.overlayState = 'hidden';
    this.router.navigate(['/shoppinglist', this.groupId]);
    return;
  }

  // Andernfalls: Zur Gruppenübersicht navigieren
  this.router.navigate(['/group', this.groupId]);
}

  toggleInfoOverlay() {

    console.log('Overlay state:', this.overlayState);

    if (this.overlayState === 'start') {
      this.overlayState = 'normal'; // Overlay wird sichtbar und Animation startet
    } else if (this.overlayState === 'normal') {
      // Wenn es im "normal" Zustand ist, wird es nach unten geschoben
      this.overlayState = 'hidden'; // Wechselt zum "hidden"-Zustand
    } else if (this.overlayState === 'hidden') {
      // Wenn es im "hidden" Zustand ist, wird es wieder nach oben geschoben
      this.overlayState = 'normal'; // Wechselt zurück zum "normal"-Zustand
    }

    console.log('Overlay state:', this.overlayState);
  }

  async toggleDetailsOverlay(shoppingProductId: string) {
    if (!this.groupId) {
      console.error('Group ID ist null oder undefined');
      this.presentAlert('Fehler','Die Gruppen-ID ist ungültig. Bitte versuche es erneut.');
      return;
    }

    if (!this.shoppingListId) {
      console.error('ShoppingList ID ist null oder undefined');
      this.presentAlert('Fehler', 'Die ShoppingList-ID ist ungültig. Bitte versuche es erneut.');
      return;
    }

    try {

      const selectedShoppingProduct = await this.shoppinglistService.getShoppingProductById(
        this.groupId,
        this.shoppingListId,
        shoppingProductId
      );

      if (selectedShoppingProduct) {
        this.selectedProduct = {...selectedShoppingProduct};
      } else {
        console.error('Produkt konnte nicht geladen werden');
        return;
      }

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


  async saveProductDetails() {
    if (!this.groupId || !this.shoppingListId) {
      this.presentAlert('Fehler','Die Gruppen- oder ShoppingList-ID ist ungültig. Bitte versuche es erneut.');
      return;
    }

    if (!this.selectedProduct) {
      this.presentAlert('Fehler','Kein Produkt zum Speichern ausgewählt.');
      return;
    }

    try {
      await this.shoppinglistService.editShoppingProduct(
        this.groupId,
        this.shoppingListId,
        this.selectedProduct.shoppingProductId,
        this.selectedProduct
      );
      await this.presentToast('Produktdetails gespeichert!');
      this.detailsOverlayState = 'hidden';
    } catch (error) {
      this.presentAlert('Fehler', 'Es gab einen Fehler beim Speichern der Produktdetails. Bitte versuche es erneut.');
    }
  }


  openDatePicker(product: any) {
    this.selectedProduct = product;
    this.isDatePickerOpen = true;
  }

  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  onDateChange(event: any) {
    const selectedDate = event.detail.value;

    if (this.selectedProduct) {
      this.selectedProduct.date = selectedDate;
    }

    this.isDatePickerOpen = false;
  }

  toggleForMemberDropdown(event: Event) {
    this.forMemberDropdownOpen = !this.forMemberDropdownOpen;
    event.stopPropagation();
  }
  selectMember(member: any, event: Event) {
    this.newProduct.forMemberId = member.uid;
    this.selectedMember = member;
    this.forMemberDropdownOpen = false;
    event.stopPropagation();
  }

  editSelectedMember(member: any, event: Event) {
    event.stopPropagation();
    this.selectedProduct.forMemberId = member.uid; // <--- das fehlte!
    this.selectedMember = member;
    this.forMemberDropdownOpen = false;
  }


  selectAllMembers(event: Event) {
    event.stopPropagation();
    this.isForAll = true;
    this.selectedMember = {
      uid: 'all',
      username: 'Alle'
    };
    this.forMemberDropdownOpen = false;
  }

  editSelectedAllMembers(event: Event) {
    event.stopPropagation();
    this.selectedProduct.forMemberId = 'all'; // <--- das fehlte!
    this.selectedMember = {
      uid: 'all',
      username: 'Alle'
    };
    this.forMemberDropdownOpen = false;
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
      this.saveNewProduct();
      this.presentToast('Produkt wurde erfolgreich hinzugefügt!');
    } else {
      this.addProductOpen = false;
    }
  }

  async saveNewProduct() {
    if (this.isSaving) return;
    this.isSaving = true;

    if (!this.groupId) {
      this.isSaving = false;
      console.error('Group ID ist null oder undefined');
      this.presentAlert('Fehler', 'Die Gruppen-ID ist ungültig. Bitte versuche es erneut.');
      return;
    }

    const trimmedName = this.newProduct.productname?.trim();
    if (!trimmedName || !this.uid) {
      this.isSaving = false;
      this.presentAlert('Fehler', 'Bitte gib mindestens einen Produktnamen ein.');
      return;
    }

    const dueDate = this.newProduct.dueDate || '9999-12-31';

    const shoppingProductData: ShoppingProducts = {
      shoppingProductId: '',
      memberId: this.uid,
      forMemberId: this.newProduct.forMemberId?.trim() || this.uid,
      productname: trimmedName,
      quantity: this.newProduct.quantity ?? 1,
      unit: this.newProduct.unit?.trim() || 'Stück',
      status: 'open',
      date: dueDate
    };

    try {
      await this.shoppinglistService.addShoppingProduct(this.groupId!, shoppingProductData);

      this.newProduct = {
        quantity: 1,
        unit: 'Mal',
        productname: '',
        forMemberId: this.uid || '',
        dueDate: null,
      };

      await this.presentToast('Produkt wurde hinzugefügt!');
      this.showDetails = false;
      this.inputVisible = false;
      setTimeout(() => {
        this.inputVisible = true;
      }, 0);

    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      this.presentAlert('Fehler', 'Speichern fehlgeschlagen. Bitte versuche es noch einmal.');
    }

    this.isSaving = false;
  }


  async deleteProduct(shoppingProductId: string) {
    try {
      if (!this.shoppingListId) {
        throw new Error('ShoppingListId ist nicht definiert!');
      }

      await this.shoppinglistService.deleteShoppingProduct(
        this.groupId!,
        this.shoppingListId,  // Hier wird sicher die shoppingListId übergeben
        shoppingProductId
      );
      console.log('Produkt gelöscht:', shoppingProductId);

      await this.loadShoppingProducts();
    } catch (error) {
      console.error('Fehler beim Löschen des Produkts:', error);
    }
  }

  async moveProductToCart(shoppingProductId: string) {
    const groupId = this.groupId;
    if (!groupId) {
      console.error('groupId fehlt');
      return;
    }

    try {
      const shoppingList = await this.shoppinglistService.getShoppingListByGroupId(groupId);
      if (!shoppingList) {
        console.error('Keine Einkaufsliste für diese Gruppe gefunden');
        return;
      }

      const shoppingListId = shoppingList.shoppinglistId;

      await this.shoppinglistService.moveProductToShoppingCart(groupId, shoppingListId, shoppingProductId);
      console.log('Produkt verschoben!');

      this.loadShoppingProducts();
    } catch (error) {
      console.error('Fehler beim Verschieben:', error);
    }
  }

  onCheckboxChange(event: any, shoppingProductId: string) {
    if (event.detail.checked) {
      this.moveProductToCart(shoppingProductId);
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
        this.moveProductToCart(shoppingProduct.shoppingProductId);
        this.presentToast('Produkt wurde in den Warenkorb verschoben!');
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
          }
        },
        {
          text: 'Löschen',
          handler: () => {
            if (this.productToDelete) {
              this.deleteProduct(this.productToDelete.shoppingProductId);
              this.presentToast('Produkt wurde erfolgreich gelöscht!');

              this.showDeleteConfirm = false;
              this.productToDelete = null;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });

    await alert.present();
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
