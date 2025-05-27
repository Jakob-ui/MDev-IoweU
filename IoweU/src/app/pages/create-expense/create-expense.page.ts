import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import {ShoppinglistService} from "../../services/shoppinglist.service";
import {AlertController, ToastController} from "@ionic/angular";
import { addIcons } from 'ionicons';
import {
  fastFoodOutline,
  cartOutline,
  wineOutline,
  carOutline,
  gameControllerOutline,
  homeOutline,
  receiptOutline,
  ellipsisHorizontalOutline,
  addOutline,
  checkmarkOutline,
  cameraOutline,
  imageOutline,
  heartOutline,
  schoolOutline,
  briefcaseOutline,
  shirtOutline,
  cashOutline,
  airplaneOutline,
  giftOutline,
  hammerOutline,
  bulbOutline,
  musicalNotesOutline,
  rocketOutline,
 caretDownOutline } from 'ionicons/icons';
addIcons({
  // Bestehende Icons …
  'fast-food-outline': fastFoodOutline,
  'cart-outline': cartOutline,
  'wine-outline': wineOutline,
  'car-outline': carOutline,
  'game-controller-outline': gameControllerOutline,
  'home-outline': homeOutline,
  'receipt-outline': receiptOutline,
  'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
  'add-outline': addOutline,
  'checkmark-outline': checkmarkOutline,
  'camera-outline': cameraOutline,
  'image-outline': imageOutline,

  'heart-outline': heartOutline,
  'school-outline': schoolOutline,
  'briefcase-outline': briefcaseOutline,
  'shirt-outline': shirtOutline,
  'cash-outline': cashOutline,
  'airplane-outline': airplaneOutline,
  'gift-outline': giftOutline,
  'hammer-outline': hammerOutline,
  'bulb-outline': bulbOutline,
  'musical-notes-outline': musicalNotesOutline,
  'rocket-outline': rocketOutline,
  'caret-down-outline': caretDownOutline,
});
import {
  IonContent,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonDatetime,
  IonIcon,
  IonBadge,
  IonLabel,
  IonList,
  IonNote,
  IonText,
} from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Import interfaces
import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';
import { Groups } from 'src/app/services/objects/Groups';
import { HostListener } from '@angular/core';
import { ImageService } from '../../services/image.service';
import { CATEGORIES } from 'src/app/services/objects/Categories';
import { CURRENCIESWITHSYMBOLS } from 'src/app/services/objects/Currencies';
import {PushNotificationService} from "../../services/push-notification.service";

@Component({
  selector: 'app-create-expense',
  templateUrl: './create-expense.page.html',
  styleUrls: ['./create-expense.page.scss'],
  standalone: true,
  imports: [
    IonList,
    IonLabel,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonDatetime,
    IonIcon,
    CommonModule,
    FormsModule,
    IonBadge,
    IonNote,
    IonText,
    HttpClientModule,
  ],
})
export class CreateExpensePage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private route = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);
  private imageService = inject(ImageService);
  private http = inject(HttpClient);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private shoppinglistService = inject(ShoppinglistService);
  private pushNotificationService = inject(PushNotificationService);



  constructor() {
      addIcons({addOutline,checkmarkOutline,cameraOutline,imageOutline,caretDownOutline});
  }

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId = this.route.snapshot.paramMap.get('groupId') || '';

  groupMembers: any[] = [];
  currentGroup: Groups | null = null;

  memberUsernames: string[] = [];
  memberIds: string[] = [];
  memberColors: string[] = [];
  memberRoles: string[] = [];
  memberUids: string[] = [];

  splitValue: { [uid: string]: number } = {};
  amountToPay: { [uid: string]: number } = {};
  foreignAmountToPay: { [uid: string]: number } = {};
  foreignPrice: { [uid: string]: number } = {};
  products: (Products & {})[] = [];

  //Validation Bools
  chooseSplitType = true;
  isFormValid: boolean = true;
  error: string = '';
  validationErrors: string[] = [];
  showValidationError: boolean = false;
  repeating: boolean = false;

  canDistributeRest = false;

  dropdownOpen: boolean = false;
  selectedCategory: any = null;

  currencyDropdownOpen: boolean = false;

  paidByDropdownOpen: boolean = false;
  selectedMember: any = null;

  standardCurrency: string = 'EUR';
  selectedCurrency: string = this.standardCurrency;
  exchangeRate: number = 1;

  showAddProductButton: { [key: string]: boolean } = {};
  showProductInputFields: { [key: string]: boolean } = {};

  invoice: string | ArrayBuffer | null = null;
  uploadInvoice: any;

  @ViewChild('fileInput') fileInput!: ElementRef;

  invoiceDropdownOpen: boolean = false;
  repeatDropdownOpen: boolean = false;

  repeatOptions = [
    { value: 'nein', label: 'nein' },
    { value: 'täglich', label: 'täglich' },
    { value: 'wöchentlich', label: 'wöchentlich' },
    { value: 'monatlich', label: 'monatlich' },
  ];

  toggleRepeatDropdown(event: Event) {
    event.stopPropagation();
    this.repeatDropdownOpen = !this.repeatDropdownOpen;
  }

  selectRepeat(value: string, event: Event) {
    event.stopPropagation();
    this.expense.repeat = value;
    this.repeatDropdownOpen = false;
  }

  getRepeatLabel(value: string): string | undefined {
    return this.repeatOptions.find(option => option.value === value)?.label;
  }

  closeRepeatDropdowns() {
    this.repeatDropdownOpen = false;
  }

  expense: Expenses = {
    expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
    description: '',
    totalAmount: 0,
    totalAmountInForeignCurrency: 0,
    exchangeRate: 0,
    paidBy: '',
    date: new Date().toISOString(),
    currency: ['EUR'],
    category: 'Sonstiges',
    invoice: '',
    repeat: 'nein',
    splitBy: 'alle',
    splitType: 'anteile',
    expenseMember: [],
  };

  shoppingproducts: any[] = [];
  shoppingCartId: string | null = '';
  ProduktFromShoppingCart: boolean = false;

  categories = CATEGORIES;

  currenciesWithSymbols = CURRENCIESWITHSYMBOLS;

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

        this.shoppingCartId = this.activeRoute.snapshot.queryParamMap.get('fromShoppingCart');
        console.log('ShoppingCartId aus queryParams:', this.shoppingCartId);

        if (groupId) {
          this.currentGroup = await this.groupService.getGroup();
          if (!this.currentGroup) {
            this.currentGroup = await this.groupService.getGroupById(groupId);
            console.log('Leere Gruppe, hole Gruppe aus der DB');
          }

          if (this.currentGroup) {
            this.groupname = this.currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = this.currentGroup.groupId || '';
            console.log('Gruppeninfos:', this.currentGroup);

            if (this.currentGroup.members && this.currentGroup.members.length > 0) {
              this.groupMembers = this.currentGroup.members.map((member: any) => {
                this.memberUsernames.push(member.username || '');
                this.memberIds.push(member.memberId || '');
                this.memberColors.push(member.color || '');
                this.memberRoles.push(member.role || '');
                this.memberUids.push(member.uid || '');


                member.sumExpenseAmount = member.sumExpenseAmount || 0;
                member.sumExpenseMemberAmount = member.sumExpenseMemberAmount || 0;
                member.countExpenseAmount = member.countExpenseAmount || 0;
                member.countExpenseMemberAmount = member.countExpenseMemberAmount || 0;

                return {
                  ...member,
                  amount: 0,
                };
              });

              this.expense.expenseMember = this.groupMembers.map((member) => ({
                memberId: member.uid,
                amountToPay: 0,
                foreignAmountToPay: 0,
                split: 1,
                products: [],
                paid: false,
              }));

              if (!this.expense.paidBy && this.uid) {
                this.expense.paidBy = this.uid;
              }

              this.selectedMember =
                this.groupMembers.find((member) => member.uid === this.expense.paidBy) || null;
            } else {
              console.error('Keine Mitglieder in der Gruppe gefunden');
            }
          } else {
            console.error('Gruppe mit der ID ' + groupId + ' nicht gefunden');
            this.groupname = 'Unbekannte Gruppe';
          }
        } else {
          console.error('Kein groupId für den Benutzer gefunden');
          this.groupname = 'Unbekannte Gruppe';
        }

        if (this.shoppingCartId) {
          await this.fromShoppingCart();
        }

      } else {
        console.error('Kein eingeloggter Benutzer gefunden');
      }

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }

    // Setze die Standard-Kategorie auf "Sonstige" (oder "Sonstiges" je nach Schreibweise)
    this.selectedCategory = this.categories.find(cat => cat.name === 'Sonstige' || cat.name === 'Sonstiges');
    if (this.selectedCategory) {
      this.expense.category = this.selectedCategory.name;
    }
  }


  async fromShoppingCart() {
    if (!this.shoppingCartId) {
      console.error('Keine shoppingCartId übergeben');
      return;
    }

    const products = await this.shoppinglistService.getShoppingCartProducts(this.groupId, this.shoppingCartId);
    if (!products?.length) {
      console.log('Keine Produkte aus dem Warenkorb gefunden');
      return;
    }

    this.ProduktFromShoppingCart = true;
    this.expense.splitType = 'produkte';
    this.expense.splitBy = 'frei';

    // 1. Normale Member-Produktzuweisung
    this.groupMembers.forEach(member => {
      const memberProducts = products.filter(p => p.forMemberId === member.uid);

      this.productInputs[member.uid] = {
        products: memberProducts.map(shoppingProduct => ({
          productId: shoppingProduct.shoppingProductId,
          memberId: shoppingProduct.forMemberId,
          productname: shoppingProduct.productname,
          quantity: shoppingProduct.quantity,
          unit: shoppingProduct.unit,
          price: 0,
          foreignPrice: 0,
        })),
        input: {
          productId: '',
          memberId: '',
          productname: '',
          quantity: 0,
          unit: '',
          price: 0,
          foreignPrice: 0,
        },
      };
    });

    // 2. Produkte mit forMemberId === 'all'
    const allProducts = products.filter(p => p.forMemberId === 'all');
    if (allProducts.length > 0) {
      const allMemberExists = this.groupMembers.some(m => m.uid === 'all');
      if (!allMemberExists) {
        this.groupMembers.push({
          uid: 'all',
          username: 'Alle'
        });
      }

      this.productInputs['all'] = {
        products: allProducts.map(shoppingProduct => ({
          productId: shoppingProduct.shoppingProductId,
          memberId: shoppingProduct.forMemberId,
          productname: shoppingProduct.productname,
          quantity: shoppingProduct.quantity,
          unit: shoppingProduct.unit,
          price: 0,
          foreignPrice: 0,
        })),
        input: {
          productId: '',
          memberId: '',
          productname: '',
          quantity: 0,
          unit: '',
          price: 0,
          foreignPrice: 0,
        },
      };
    }

    console.log('Produktzuweisungen aus Warenkorb:', this.productInputs);
  }




  // UI Handeling ---------------------------------->

  onCategoryDropdownClick(event: Event) {
    this.dropdownOpen = !this.dropdownOpen;
    event.stopPropagation(); // Verhindert, dass das Klick-Event weitergeleitet wird
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    // Überprüfe, ob der Klick außerhalb des Dropdowns erfolgt ist
    if (!target.closest('.Kategorie')) {
      this.dropdownOpen = false;
    }
    if (!target.closest('.paid-by')) {
      this.paidByDropdownOpen = false;
    }

  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = reader.result as string;
        const imageBlob = this.imageService.dataURLtoBlob(imageDataUrl);

        // Use the updated uploadImage method with compression
        const path = `groups/${this.groupId}/invoices/${this.expense.expenseId}.jpg`;
        const downloadURL = await this.imageService.uploadImage(
          'expense-invoice',
          imageBlob,
          path
        );

        this.invoice = downloadURL;
        this.expense.invoice = downloadURL;
        console.log('Invoice uploaded and available at:', this.invoice);
      };
      reader.readAsDataURL(file);
    } else {
      this.expense.invoice = undefined;
    }
  }

  async openCamera() {
    try {
      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 50,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });

        if (image && image.dataUrl) {
          this.expense.invoice = image.dataUrl; // Save the captured image
        }
      } else {
        console.warn('Camera is only available on native platforms.');
      }
    } catch (error) {
      console.error('Error opening camera:', error);
    }
  }

  togglePaidByDropdown(event: Event) {
    this.paidByDropdownOpen = !this.paidByDropdownOpen; // Öffnen/Schließen des Dropdowns
    event.stopPropagation(); // Verhindert, dass das Klick-Event weitergeleitet wird
  }
  selectMember(member: any, event: Event) {
    this.expense.paidBy = member.uid; // Setze die UID des ausgewählten Mitglieds
    this.selectedMember = member; // Speichere das ausgewählte Mitglied
    this.paidByDropdownOpen = false; // Schließe das Dropdown
    event.stopPropagation(); // Verhindert, dass das Klick-Event weitergeleitet wird
  }

  selectCategory(category: any, event: Event) {
    this.selectedCategory = category; // Setze die ausgewählte Kategorie
    this.expense.category = this.selectedCategory.name;
    console.log(this.expense.category);
    this.dropdownOpen = false; // Schließe das Dropdown
    event.stopPropagation(); // Verhindere, dass das Klick-Event weitergeleitet wird
  }

  productInputs: {
    [key: string]: {
      input: Products;
      products: Products[];
    };
  } = {};

  isDatePickerOpen = false;

  openDatePicker() {
    this.isDatePickerOpen = true;
  }

  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  onDateChange(event: any) {
    this.expense.date = event.detail.value;
    this.closeDatePicker();
  }

  toggleProducts(memberUid: string) {
    if (!this.productInputs[memberUid]) {
      this.productInputs[memberUid] = {
        input: this.createEmptyProduct(memberUid),
        products: [],
      };
    }
    if (this.showProductInputFields[memberUid] === undefined) {
      this.showProductInputFields[memberUid] = true;
    } else {
      this.showProductInputFields[memberUid] =
        !this.showProductInputFields[memberUid];
    }
  }

  toggleAddProductButton(uid: string) {
    this.showAddProductButton[uid] = !this.showAddProductButton[uid];
    // Optional: Reset the input field visibility
    if (!this.showAddProductButton[uid]) {
      this.showProductInputFields[uid] = false;
    }
  }

  toggleProductInputFields(uid: string) {
    this.showProductInputFields[uid] = !this.showProductInputFields[uid];
  }

  cancel() {
    this.navCtrl.back();
  }
  // UI Handeling ende ---------------------------------->

  //Produkte erstellen und hinzufügen
  private createEmptyProduct(memberName: string): Products {
    const member = this.groupMembers.find((m) => m.uid === memberName);
    return {
      productId: Date.now().toString(),
      memberId: member ? member.uid : '',
      productname: '',
      quantity: 1,
      unit: '',
      price: 0,
    };
  }

  addProduct(memberUid: string) {
    const entry = this.productInputs[memberUid];
    if (!entry) return;

    const product = entry.input;
    if (product.productname.trim() && !isNaN(product.price)) {
      const newProduct: Products = {
        ...product,
        productId: Date.now().toString(),
        price: Number(product.price),
      };
      entry.products.push(newProduct);

      entry.input = this.createEmptyProduct(memberUid);

      this.updateAmountToPayForProducts();
      this.updateTotals();
    }
  }

  removeProduct(productToRemove: Products) {
    // Entferne das Produkt aus der globalen products-Liste
    this.products = this.products.filter(
      (p) => p.productId !== productToRemove.productId
    );

    for (let memberId in this.productInputs) {
      if (this.productInputs.hasOwnProperty(memberId)) {
        const memberProducts = this.productInputs[memberId].products;

        const productIndex = memberProducts.findIndex(
          (p) => p.productId === productToRemove.productId
        );

        if (productIndex !== -1) {
          memberProducts.splice(productIndex, 1);

          // Aktualisiere den Betrag für den Benutzer
          const updatedAmount = memberProducts.reduce(
            (sum, product) => sum + product.price,
            0
          );
          this.amountToPay[memberId] = parseFloat(updatedAmount.toFixed(2));
        }
      }
    }
    this.updateAmountToPayForProducts();
    this.updateTotals();
  }

  //------------------------------------------RECHENFUNKTIONEN-------------------------------------------

  private updateTotals() {
    const total = parseFloat(this.calculateTotalFromAmountToPay().toFixed(2));
    this.expense.totalAmount = total;

    if (this.selectedCurrency !== 'EUR' && this.exchangeRate) {
      this.expense.totalAmountInForeignCurrency = +(
        total / this.exchangeRate
      ).toFixed(2);
    }

    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }

    // Aktualisiere amountToPay und Produkte für jedes Mitglied
    this.expense.expenseMember.forEach((expenseMember, index) => {
      const memberUid = this.groupMembers[index].uid;
      expenseMember.amountToPay = this.amountToPay[memberUid] || 0;
      expenseMember.products = this.productInputs[memberUid]?.products || [];
    });
  }

  // Berechnet den Gesamtbetrag aus den amountToPay-Werten
  private calculateTotalFromAmountToPay(): number {
    return Object.values(this.amountToPay).reduce(
      (sum, amount) => sum + (amount || 0),
      0
    );
  }

  // Überprüft, ob der Betrag nach Änderung angepasst werden muss
  onAmountToPayChange() {
    if (
      this.expense.splitType === 'anteile' &&
      this.expense.splitBy === 'frei'
    ) {
      this.updateForeignAmountToPay();
      this.updateTotals();
    }
  }

  onSplitByChange() {
    // Wenn wir von Anteilen auf Prozente wechseln, können wir `splitBy` wieder anpassen
    if (
      this.expense.splitBy === 'frei' &&
      this.expense.splitType === 'anteile'
    ) {
      this.resetSplitValues();
    } else if (this.expense.splitBy === 'alle') {
      this.chooseSplitType = true;
      this.expense.splitBy = 'alle';
      this.splitAmountEqually();
    }
  }

  onSplitTypeChange() {
    if (this.expense.splitType !== 'produkte') {
      this.resetProductInputs();
      this.updateTotals();
    }

    switch (this.expense.splitType) {
      case 'anteile':
        this.handleAnteileChange();
        break;
      case 'prozent':
        this.handleProzentChange();
        break;
      case 'produkte':
        this.handleProdukteChange();
        break;
    }
  }

  // Rücksetzung der Produkt-Inputs und Berechnungen
  private resetProductInputs() {
    Object.keys(this.showProductInputFields).forEach((uid) => {
      this.showProductInputFields[uid] = false;
    });
    this.productInputs = {};
    this.products = [];
  }

  // Fall: Split-Typ 'anteile'
  private handleAnteileChange() {
    if (this.expense.splitBy === 'frei') {
      this.onAmountToPayChange();
      this.expense.splitBy = 'frei';
      this.chooseSplitType = true;
      /*this.groupMembers.forEach(member => {
        this.amountToPay[member.uid] = 0;

      });*/
    } else if (this.expense.splitBy === 'alle') {
      this.chooseSplitType = true;
      this.expense.splitBy = 'alle';
      this.splitAmountEqually();
    }
  }

  // Fall: Split-Typ 'prozent'
  private handleProzentChange() {
    this.error = '';
    this.expense.splitBy = 'frei';
    this.chooseSplitType = false;

    const hasAmounts = this.groupMembers.some(
      (member) => (this.amountToPay[member.uid] ?? 0) > 0
    );

    if (hasAmounts) {
      this.groupMembers.forEach((member) => {
        this.calculateSplitByPercentage(member.uid, 'amount');
      });
    }
    this.updateForeignAmountToPay();
  }

  // Fall: Split-Typ 'produkte'
  private handleProdukteChange() {
    this.expense.splitBy = 'frei';
    this.chooseSplitType = false;
    this.error = '';
    this.updateAmountToPayForProducts();
    //this.onAmountToPayChange();
  }

  private resetSplitValues() {
    this.groupMembers.forEach((member) => {
      this.amountToPay[member.uid] = 0;
      this.foreignAmountToPay[member.uid] = 0;
    });
    //this.expense.totalAmount = 0;
  }

  calculateSplitByPercentage(
    memberUid: string,
    changedField: 'percentage' | 'amount'
  ) {
    const totalAmount = this.expense.totalAmount;

    if (!totalAmount || totalAmount <= 0) {
      return;
    }

    if (changedField === 'percentage') {
      const percentage = this.splitValue[memberUid] ?? 0;
      const amount = parseFloat(((totalAmount * percentage) / 100).toFixed(2));
      this.amountToPay[memberUid] = amount;
      this.foreignAmountToPay[memberUid] =
        this.selectedCurrency !== 'EUR'
          ? parseFloat((amount / this.exchangeRate).toFixed(2))
          : 0;
    } else if (changedField === 'amount') {
      const amount = this.amountToPay[memberUid] ?? 0;
      const percentage = parseFloat(((amount / totalAmount) * 100).toFixed(2));
      this.splitValue[memberUid] = percentage;
    }

    this.validatePercentageSum();
    this.updateForeignAmountToPay();
  }

  private validatePercentageSum() {
    let totalPercentage = 0;
    this.groupMembers.forEach((member) => {
      totalPercentage += this.splitValue[member.uid] || 0;
    });

    const difference = parseFloat((100 - totalPercentage).toFixed(2));

    if (difference !== 0) {
      this.error =
        difference > 0
          ? `Es fehlen noch ${difference}% – du kannst den Rest auf die verbleibenden Mitglieder verteilen.`
          : `Die Summe der Prozentwerte überschreitet 100%. Sie sind ${Math.abs(
              difference
            )}% drüber.`;

      this.isFormValid = false;
      this.canDistributeRest = difference > 0;
    } else {
      this.error = '';
      this.isFormValid = true;
      this.canDistributeRest = false;
    }
  }

  distributeRemainingPercentage() {
    const remainingPercentage =
      100 -
      this.groupMembers.reduce(
        (sum, member) => sum + (this.splitValue[member.uid] || 0),
        0
      );

    const eligibleMembers = this.groupMembers.filter(
      (member) =>
        !this.splitValue[member.uid] || this.splitValue[member.uid] === 0
    );

    if (eligibleMembers.length > 0) {
      const share = remainingPercentage / eligibleMembers.length;
      eligibleMembers.forEach((member, index) => {
        if (index === eligibleMembers.length - 1) {
          this.splitValue[member.uid] =
            100 -
            this.groupMembers.reduce(
              (sum, m) => sum + (this.splitValue[m.uid] || 0),
              0
            );
        } else {
          this.splitValue[member.uid] = share;
        }
        this.amountToPay[member.uid] =
          (this.expense.totalAmount * this.splitValue[member.uid]) / 100;
      });
    }

    this.calculateSplitByPercentage('', 'percentage');
  }

  updateAmountToPayForProducts() {
    let totalAmount = 0;
    let totalAmountForeign = 0;

    this.groupMembers.forEach((member) => {
      let memberAmountToPay = 0;
      let memberForeignAmountToPay = 0;

      const products: Products[] =
        this.productInputs[member.uid]?.products || [];

      products.forEach((product) => {
        let priceInEuro = product.price || 0;
        let priceInForeign = product.foreignPrice || 0;

        // Wenn aktuelle Währung nicht EUR ist, rechnen wir um
        if (this.selectedCurrency !== 'EUR') {
          priceInEuro = priceInForeign * this.exchangeRate;
          product.price = priceInEuro; // Speichern des Euro-Werts
        } else {
          priceInForeign = priceInEuro / this.exchangeRate;
          product.foreignPrice = priceInForeign; // Nur zur Anzeige
        }

        memberAmountToPay += priceInEuro;
        memberForeignAmountToPay += priceInForeign;
      });

      this.amountToPay[member.uid] = memberAmountToPay;
      this.foreignAmountToPay[member.uid] = memberForeignAmountToPay;

      totalAmount += memberAmountToPay;
      totalAmountForeign += memberForeignAmountToPay;
    });

    this.expense.totalAmount = totalAmount;
    this.expense.totalAmountInForeignCurrency = totalAmountForeign;

    this.updateTotals(); // falls du damit z.B. Summary-Werte aktualisierst
  }

  onTotalAmountChange() {
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
    if (this.expense.splitType === 'prozent') {
      this.updateAmountToPayFromPercentages();
    }
  }

  private updateAmountToPayFromPercentages() {
    this.groupMembers.forEach((member) => {
      const percentage = this.splitValue[member.uid] || 0;
      const amount = parseFloat(
        ((this.expense.totalAmount * percentage) / 100).toFixed(2)
      );
      this.amountToPay[member.uid] = amount;
    });
    //this.validatePercentageSum();
  }

  private updatePercentageValues() {
    this.groupMembers.forEach((member) => {
      const amount = this.amountToPay[member.uid] || 0;
      const percentage = parseFloat(
        ((amount / this.expense.totalAmount) * 100).toFixed(2)
      );
      this.splitValue[member.uid] = percentage;
    });

    //this.validatePercentageSum();
  }

  splitAmountEqually() {
    const isEuro = this.selectedCurrency === this.standardCurrency;
    const total = isEuro
      ? this.expense.totalAmount
      : this.expense.totalAmountInForeignCurrency !== undefined &&
        this.exchangeRate !== undefined
      ? this.expense.totalAmountInForeignCurrency * this.exchangeRate
      : 0;

    const count = this.groupMembers.length;

    if (count > 0 && total > 0) {
      const base = total / count;
      let rest = total - base * count;

      // Unrund speichern
      this.groupMembers.forEach((m) => {
        this.amountToPay[m.uid] = base;
        if (!isEuro && this.exchangeRate !== undefined) {
          this.foreignAmountToPay[m.uid] = base / this.exchangeRate;
        }
      });

      // Rest korrekt verteilen (aber noch ungerundet zwischenspeichern)
      let idx = 0;
      while (rest > 0.009) {
        const uid = this.groupMembers[idx].uid;
        this.amountToPay[uid] += 0.01;
        if (!isEuro && this.exchangeRate !== undefined) {
          this.foreignAmountToPay[uid] =
            this.amountToPay[uid] / this.exchangeRate;
        }
        rest -= 0.01;
        idx = (idx + 1) % count;
      }
    }
  }

  //-----------------------------------FREMDWÄHRUNG-------------------------------------------------------
  toggleCurrencyDropdown(event: Event): void {
    event.stopPropagation();
    this.currencyDropdownOpen = !this.currencyDropdownOpen;
  }

  getCurrencySymbol(code: string): string {
    const currency = this.currenciesWithSymbols.find((c) => c.code === code);
    return currency ? currency.symbol : code;
  }

  selectCurrency(newCurrency: string) {
    this.resetProductInputs();
    const totalInEuro = this.expense.totalAmount || 0;
    this.selectedCurrency = newCurrency;

    if (newCurrency === 'EUR') {
      this.exchangeRate = 1;
      this.expense.totalAmountInForeignCurrency = totalInEuro;
      return;
    }

    const url = `https://api.frankfurter.app/latest?from=${newCurrency}&to=EUR`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.exchangeRate = data.rates['EUR'];

        // Berechnung von totalAmountInForeignCurrency und foreignAmountToPay
        if (totalInEuro > 0 && this.exchangeRate > 0) {
          this.expense.totalAmountInForeignCurrency = +(
            totalInEuro / this.exchangeRate
          ).toFixed(2);
        }

        console.log(
          `Wechselkurs geladen: 1 ${newCurrency} = ${this.exchangeRate} EUR`
        );
        this.updateForeignAmountToPay();
      },
      error: (err) => {
        console.error('Fehler beim Laden des Wechselkurses:', err);
        this.exchangeRate = 1;
        this.expense.totalAmountInForeignCurrency = totalInEuro; // fallback auf EUR
      },
    });
  }

  onForeignAmountChange() {
    if (
      this.selectedCurrency !== 'EUR' &&
      this.expense.totalAmountInForeignCurrency !== undefined &&
      this.exchangeRate !== undefined
    ) {
      this.expense.totalAmount = +(
        this.expense.totalAmountInForeignCurrency * this.exchangeRate
      ).toFixed(2);

      // Wenn 'splitBy' 'alle', dann alle Mitgliedsbeträge neu berechnen
      if (this.expense.splitBy === 'alle') {
        this.splitAmountEqually();
        this.updateForeignAmountToPay();
      }

      if (this.expense.splitType === 'prozent') {
        this.updateAmountToPayFromPercentages();
      }
    }
  }

  private updateForeignAmountToPay() {
    this.groupMembers.forEach((member) => {
      const amountInEuro = this.amountToPay[member.uid] || 0;
      // Umrechnung in die fremde Währung
      this.foreignAmountToPay[member.uid] = +(
        amountInEuro / this.exchangeRate
      ).toFixed(2);
    });
  }

  onForeignAmountInput(memberId: string) {
    const foreignAmount = this.foreignAmountToPay[memberId] || 0;

    // Umrechnen in EUR und in amountToPay speichern
    if (this.exchangeRate > 0) {
      const euroValue = +(foreignAmount * this.exchangeRate).toFixed(2);
      this.amountToPay[memberId] = euroValue;

      this.updateTotals();
    } else {
      this.amountToPay[memberId] = 0;
      this.foreignAmountToPay[memberId] = 0;
    }
    this.onForeignAmountChange();
  }

  //---------------------------------------------------------------------------------------------------------------

  validateExpense(): boolean {
    this.validationErrors = [];
    let isValid = true;

    if (!this.expense.description || this.expense.description.trim() === '') {
      this.validationErrors.push('Beschreibung darf nicht leer sein.');
      isValid = false;
    }

    if (this.expense.totalAmount == null || this.expense.totalAmount <= 0) {
      this.validationErrors.push('Der Betrag muss größer als 0 sein.');
      isValid = false;
    }

    if (!this.expense.date || this.expense.date.trim() === '') {
      this.validationErrors.push('Ein Datum muss ausgewählt werden.');
      isValid = false;
    }

    if (!this.selectedMember) {
      this.validationErrors.push('Es muss angegeben werden, wer bezahlt hat.');
      isValid = false;
    }

    if (!this.expense.splitType || this.expense.splitType.trim() === '') {
      this.validationErrors.push('Es muss eine Aufteilungsart gewählt werden.');
      isValid = false;
    }

    if (!this.expense.splitBy || this.expense.splitBy.trim() === '') {
      this.validationErrors.push('Es muss angegeben werden, wie geteilt wird.');
      isValid = false;
    }

    // Optionale Felder: setze Defaults, aber ohne Validierung
    if (!this.expense.category) this.expense.category = '';
    if (!this.expense.invoice) this.expense.invoice = '';
    if (!this.expense.repeat) this.expense.repeat = '';

    this.showValidationError = !isValid;
    return isValid;
  }

  closeValidationOverlay() {
    this.showValidationError = false;
  }

  async saveExpense() {
    if (!this.validateExpense()) {
      return;
    }

    this.repeating = this.expense.repeat === 'nein';
    this.loadingService.show();


    console.log("I am saving now", this.expense.expenseMember, this.groupMembers);

    try {
      const realMembers = this.groupMembers.filter(m => m.uid !== 'all');
      const allProducts = this.productInputs['all']?.products || [];

      this.expense.expenseMember = realMembers.map((member) => {
        const uid = member.uid;

        let amount = this.amountToPay[uid] || 0;
        let foreignAmount = this.foreignAmountToPay[uid] || 0;

        let products = this.productInputs[uid]?.products || [];

        if (allProducts.length > 0 && realMembers.length > 0) {
          allProducts.forEach((p) => {
            const sharedPrice = (p.price || 0) / realMembers.length;
            const sharedForeignPrice = (p.foreignPrice || 0) / realMembers.length;

            products.push({
              productId: p.productId + '-' + uid,
              memberId: uid,
              productname: p.productname,
              quantity: p.quantity,
              unit: p.unit,
              price: parseFloat(sharedPrice.toFixed(2)),
              foreignPrice: parseFloat(sharedForeignPrice.toFixed(2)),
            });

            amount += sharedPrice;
            foreignAmount += sharedForeignPrice;
          });

          this.amountToPay[uid] = parseFloat(amount.toFixed(2));
          this.foreignAmountToPay[uid] = parseFloat(foreignAmount.toFixed(2));
        }

        products = products.map((p) => ({
          ...p,
          price: Number(p.price || 0),
          quantity: Number(p.quantity),
        }));

        return {
          memberId: uid,
          amountToPay: parseFloat(amount.toFixed(2)),
          foreignAmountToPay: parseFloat(foreignAmount.toFixed(2)),
          split: 1,
          paid: uid === this.expense.paidBy,
          products,
        };
      });

      this.updateTotals();

      if (this.selectedCurrency !== this.standardCurrency) {
        this.expense.totalAmountInForeignCurrency = +(
          this.expense.totalAmount / this.exchangeRate
        ).toFixed(2);
        this.expense.exchangeRate = this.exchangeRate;
      } else {
        this.expense.totalAmountInForeignCurrency = 0;
        this.expense.exchangeRate = 1;
      }

      this.expense.totalAmount = Number(this.expense.totalAmount.toFixed(2));

      this.expense.currency = [this.selectedCurrency];


      if (this.uploadInvoice) {
        const invoicePath = `groups/${this.groupId}/invoices/${this.expense.expenseId}.jpg`;
        const downloadURL = await this.imageService.uploadImage(
          this.expense.expenseId,
          this.uploadInvoice,
          invoicePath
        );
        this.expense.invoice = downloadURL;
      }

      // Expense erstellen
      await this.expenseService.createExpense(
        this.expense,
        this.expense.expenseMember,
        this.groupId,
        this.repeating
      );
      if (this.shoppingCartId) {
        await this.shoppinglistService.deleteAllProductsFromShoppingCart(this.groupId, this.shoppingCartId);
      }

      // Push-Notification an alle Mitglieder, die noch nicht bezahlt haben und >0 zahlen müssen
      const unpaidMembers = this.expense.expenseMember.filter(
        (member) =>
          !member.paid && member.memberId !== this.expense.paidBy &&
          member.amountToPay > 0
      );

      const myName = this.user || 'Jemand';

      for (const member of unpaidMembers) {
        // member.memberId = UID des Mitglieds
        await this.pushNotificationService.sendToUser(
          member.memberId,
          `Neue AUSGABE in der Gruppe "${this.groupname}"`,
          `${myName} hat eine neue Ausgabe hinzugefügt. Du schuldest ${this.expense.paidBy} ${member.amountToPay.toFixed(2)} €.`
        );
      }

      if(this.shoppingCartId != null){
        this.navCtrl.back();
      } else{
        await this.navCtrl.navigateRoot(['/expense', this.groupId]);
      }

      if(this.shoppingCartId != null){
        this.navCtrl.back();
      } else{
        await this.navCtrl.navigateRoot(['/expense', this.groupId]);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Ausgabe:', error);
      await this.presentAlert('Fehler', 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
    } finally {
      this.loadingService.hide();
      await this.presentToast('Ausgabe erfolgreich gespeichert!');
    }
  }


  removeInvoice() {
    this.expense.invoice = undefined;
  }
  toggleInvoiceDropdown(event: Event): void {
    event.stopPropagation();
    this.invoiceDropdownOpen = !this.invoiceDropdownOpen;
  }

  /** Schließt das Rechnungs-Dropdown, wird auf ion-content (click) ausgelöst */
  closeDropdowns(): void {
    this.invoiceDropdownOpen = false;
    this.currencyDropdownOpen = false;
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
}
