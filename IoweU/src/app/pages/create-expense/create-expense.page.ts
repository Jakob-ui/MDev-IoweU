import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
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
} from 'ionicons/icons';
addIcons({
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
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';
import { Groups } from 'src/app/services/objects/Groups';
import { HostListener } from '@angular/core';
import { ImageService } from '../../services/image.service';
import { NgxImageCompressService } from 'ngx-image-compress';

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
  constructor(private imageCompress: NgxImageCompressService) {}

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

  paidByDropdownOpen: boolean = false;
  selectedMember: any = null;

  selectedCurrency: string = 'EUR';
  exchangeRate: number = 1;
  foreignAmountToPay: { [memberId: string]: number } = {};

  showAddProductButton: { [key: string]: boolean } = {};
  showProductInputFields: { [key: string]: boolean } = {};

  invoice: string | ArrayBuffer | null = null;
  uploadInvoice: any;
  @ViewChild('fileInput') fileInput!: ElementRef;

  invoiceDropdownOpen: boolean = false;

  expense: Expenses = {
    expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
    description: '',
    totalAmount: 0,
    totalAmountInForeignCurrency: 0,
    exchangeRate: 0,
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    currency: ['EUR', 'USD', 'GBP', 'JPY', 'AUD'], // Verfügbare Währungen
    category: 'Sonstiges',
    invoice: '',
    repeat: 'nein',
    splitBy: 'alle',
    splitType: 'anteile',
    expenseMember: [],
  };

  categories = [
    { name: 'Lebensmittel', icon: 'fast-food-outline' },
    { name: 'Einkäufe', icon: 'cart-outline' },
    { name: 'Restaurant/Bar', icon: 'wine-outline' },
    { name: 'Transport', icon: 'car-outline' },
    { name: 'Freizeit', icon: 'game-controller-outline' },
    { name: 'Wohnen', icon: 'home-outline' },
    { name: 'Rechnungen', icon: 'receipt-outline' },
    { name: 'Sonstiges', icon: 'ellipsis-horizontal-outline' },
  ];

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();
      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

        if (groupId) {
          this.currentGroup = await this.groupService.getGroup();
          if (this.currentGroup === null) {
            this.currentGroup = await this.groupService.getGroupById(groupId);
            console.log('leere Gruppe, hole gruppe aus der db');
          }

          if (this.currentGroup) {
            this.groupname = this.currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = this.currentGroup.groupId || '';
            console.log('gruppeninfos:', this.currentGroup);

            if (
              this.currentGroup.members &&
              this.currentGroup.members.length > 0
            ) {
              this.groupMembers = this.currentGroup.members.map(
                (member: any) => {
                  this.memberUsernames.push(member.username || '');
                  this.memberIds.push(member.memberId || '');
                  this.memberColors.push(member.color || '');
                  this.memberRoles.push(member.role || '');
                  this.memberUids.push(member.uid || '');

                  // Initialisiere Summen- und Zählerwerte für jedes Mitglied
                  member.sumExpenseAmount = member.sumExpenseAmount || 0;
                  member.sumExpenseMemberAmount =
                    member.sumExpenseMemberAmount || 0;
                  member.countExpenseAmount = member.countExpenseAmount || 0;
                  member.countExpenseMemberAmount =
                    member.countExpenseMemberAmount || 0;

                  return {
                    ...member,
                    amount: 0,
                  };
                }
              );

              this.expense.expenseMember = this.groupMembers.map((member) => ({
                memberId: member.uid,
                amountToPay: 0,
                split: 1,
                products: [],
              }));

              if (!this.expense.paidBy && this.uid) {
                this.expense.paidBy = this.uid;
              }

              this.selectedMember =
                this.groupMembers.find(
                  (member) => member.uid === this.expense.paidBy
                ) || null;
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
      }

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
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

        // Compress the image
        const compressedImage = await this.imageCompress.compressFile(
          imageDataUrl,
          -1, // Orientation (auto-detect)
          50, // Quality (0-100)
          50  // Resize percentage
        );

        // Convert compressed image to Blob
        this.uploadInvoice = this.imageService.dataURLtoBlob(compressedImage);
        this.invoice = compressedImage;
        this.expense.invoice = file.name; // Set the file name
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

    // Entferne das Produkt auch aus der Liste des entsprechenden Mitglieds
    for (let memberId in this.productInputs) {
      if (this.productInputs.hasOwnProperty(memberId)) {
        const memberProducts = this.productInputs[memberId].products;

        // Überprüfe, ob das Produkt in der Liste des Mitglieds existiert
        const productIndex = memberProducts.findIndex(
          (p) => p.productId === productToRemove.productId
        );

        if (productIndex !== -1) {
          // Entferne das Produkt aus der Liste des Mitglieds
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

    // Aktualisiere die Gesamtsumme
    this.updateTotals();
  }


//------------------------------------------RECHENFUNKTIONEN-------------------------------------------

  private updateTotals() {
    const total = parseFloat(this.calculateTotalFromAmountToPay().toFixed(2));
    this.expense.totalAmount = total;

    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }

    this.groupMembers.forEach((member) => {
      const uid = member.uid;
      const amount = this.amountToPay[uid] || 0;
      const products = this.productInputs[uid]?.products || [];

      const expMem = this.expense.expenseMember.find(e => uid === uid);
      if (expMem) {
        expMem.amountToPay = amount;
        expMem.products = products;
      }
    });

    if (this.expense.splitType === 'prozent') {
      this.updatePercentageValues();
    }
  }

  private calculateTotalFromAmountToPay(): number {
    return Object.values(this.amountToPay).reduce((sum, a) => sum + (a || 0), 0);
  }

  onAmountToPayChange() {
    if (this.expense.splitType === 'anteile' && this.expense.splitBy === 'frei') {
      this.updateTotals();
    }
  }

  onSplitByChange() {
    if (this.expense.splitBy === 'frei') {
      //this.resetSplitValues();
    } else if (this.expense.splitBy === 'alle') {
      this.chooseSplitType = true;
      this.splitAmountEqually();
    }
  }

  onSplitTypeChange() {
    this.resetProductInputs();

    // Setze 'splitBy' nur zurück auf 'frei', wenn der neue Typ es erfordert
    if (this.expense.splitType === 'prozent' || this.expense.splitType === 'produkte') {
      this.expense.splitBy = 'frei';
      this.chooseSplitType = false;
    }else {
      this.chooseSplitType = true;
    }

    this.updateTotals();

    switch (this.expense.splitType) {
      case 'anteile': this.handleAnteileChange(); break;
      case 'prozent': this.handleProzentChange(); break;
      case 'produkte': this.handleProdukteChange(); break;
    }
  }


  private resetProductInputs() {
    Object.keys(this.showProductInputFields).forEach(uid => {
      this.showProductInputFields[uid] = false;
    });
    this.productInputs = {};
    this.products = [];
  }

  private resetSplitValues() {
    this.groupMembers.forEach(m => this.amountToPay[m.uid] = 0);
  }

  private handleAnteileChange() {
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    } else {
      this.onAmountToPayChange();
    }
  }


  private handleProzentChange() {
    this.error = '';
    this.chooseSplitType = false;
    this.groupMembers.forEach(m => this.calculateSplitByPercentage(m.uid, 'percentage'));
  }

  private handleProdukteChange() {
    this.chooseSplitType = false;
    this.error = '';
    this.updateAmountToPayForProducts();
  }

  calculateSplitByPercentage(memberUid: string, changedField: 'percentage' | 'amount') {
    const total = this.expense.totalAmount;

    if (changedField === 'percentage') {
      const pct = this.splitValue[memberUid] || 0;
      this.amountToPay[memberUid] = parseFloat(((total * pct) / 100).toFixed(2));
    } else {
      const amt = this.amountToPay[memberUid] || 0;
      this.splitValue[memberUid] = parseFloat(((amt / total) * 100).toFixed(2));
    }

    this.validatePercentageSum();
  }

  private validatePercentageSum() {
    const totalPct = this.groupMembers.reduce((sum, m) => sum + (this.splitValue[m.uid] || 0), 0);
    const diff = parseFloat((100 - totalPct).toFixed(2));

    if (diff !== 0) {
      this.error = diff > 0
        ? `Es fehlen noch ${diff}% – du kannst den Rest auf die verbleibenden Mitglieder verteilen.`
        : `Die Summe der Prozentwerte überschreitet 100 %. Sie sind ${Math.abs(diff)}% drüber.`;
      this.isFormValid = false;
      this.canDistributeRest = diff > 0;
    } else {
      this.error = '';
      this.isFormValid = true;
      this.canDistributeRest = false;
    }
  }

  distributeRemainingPercentage() {
    const currentTotal = this.groupMembers.reduce((sum, m) => sum + (this.splitValue[m.uid] || 0), 0);
    const rest = 100 - currentTotal;

    const emptyMembers = this.groupMembers.filter(m => !this.splitValue[m.uid] || this.splitValue[m.uid] === 0);
    const share = rest / emptyMembers.length;

    emptyMembers.forEach((m, idx) => {
      if (idx === emptyMembers.length - 1) {
        this.splitValue[m.uid] = 100 - this.groupMembers.reduce((s, mm) => s + (this.splitValue[mm.uid] || 0), 0);
      } else {
        this.splitValue[m.uid] = share;
      }

      this.amountToPay[m.uid] = +(this.expense.totalAmount * this.splitValue[m.uid] / 100).toFixed(2);
    });

    this.updateTotals();
  }

  updateAmountToPayForProducts() {
    let total = 0;

    this.groupMembers.forEach(member => {
      const products = this.productInputs[member.uid]?.products || [];
      const sum = products.reduce((s, p) => s + p.price, 0);
      this.amountToPay[member.uid] = sum;
      total += sum;
    });

    this.expense.totalAmount = parseFloat(total.toFixed(2));
    this.updateTotals();
  }

  onTotalAmountChange() {
    if (this.expense.splitBy === 'alle') this.splitAmountEqually();
    if (this.expense.splitType === 'prozent') this.updatePercentageValues();
  }

  private updatePercentageValues() {
    const total = this.expense.totalAmount;
    this.groupMembers.forEach(member => {
      const amt = this.amountToPay[member.uid] || 0;
      this.splitValue[member.uid] = parseFloat(((amt / total) * 100).toFixed(2));
    });
    this.validatePercentageSum();
  }

  splitAmountEqually() {
    const isEuro = this.selectedCurrency === 'EUR';
    const total = isEuro
      ? this.expense.totalAmount
      : (
        this.expense.totalAmountInForeignCurrency !== undefined &&
        this.exchangeRate !== undefined
      )
        ? +(
          this.expense.totalAmountInForeignCurrency * this.exchangeRate
        ).toFixed(2)
        : 0;

    const count = this.groupMembers.length;

    if (count > 0 && total > 0) {
      const base = +(total / count).toFixed(2);
      let rest = +(total - base * count).toFixed(2);

      this.groupMembers.forEach(m => {
        this.amountToPay[m.uid] = base;
        if (!isEuro && this.exchangeRate !== undefined) {
          this.foreignAmountToPay[m.uid] = +(base / this.exchangeRate).toFixed(2);
        }
      });

      let idx = 0;
      while (rest > 0.009) {
        const uid = this.groupMembers[idx].uid;
        this.amountToPay[uid] = +(this.amountToPay[uid] + 0.01).toFixed(2);
        if (!isEuro && this.exchangeRate !== undefined) {
          this.foreignAmountToPay[uid] = +(this.amountToPay[uid] / this.exchangeRate).toFixed(2);
        }
        rest = +(rest - 0.01).toFixed(2);
        idx = (idx + 1) % count;
      }

      this.updateTotals();
    }
  }



//-----------------------------------FREMDWÄHRUNG-------------------------------------------------------

  selectCurrency(newCurrency: string) {
    const oldCurrency = this.selectedCurrency;
    const wasEuro = oldCurrency === 'EUR';
    const willBeEuro = newCurrency === 'EUR';
    const previousRate = this.exchangeRate || 1;

    this.selectedCurrency = newCurrency;

    if (willBeEuro) {
      this.exchangeRate = 1;
      this.expense.totalAmount = +((this.expense.totalAmountInForeignCurrency ?? 0) * previousRate).toFixed(2);
      this.expense.totalAmountInForeignCurrency = 0;

      Object.keys(this.foreignAmountToPay).forEach(uid => {
        this.amountToPay[uid] = +((this.foreignAmountToPay[uid] || 0) * previousRate).toFixed(2);
      });

      this.updateTotals();
      return;
    }

    const url = `https://api.frankfurter.app/latest?from=${newCurrency}&to=EUR`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.exchangeRate = data.rates['EUR'];

        if (wasEuro) {
          this.expense.totalAmountInForeignCurrency = +(this.expense.totalAmount / this.exchangeRate).toFixed(2);
          Object.keys(this.amountToPay).forEach(uid => {
            this.foreignAmountToPay[uid] = +(this.amountToPay[uid] / this.exchangeRate).toFixed(2);
          });
        }

        this.updateTotals();
      },
      error: (err) => {
        console.error('Fehler beim Abrufen des Wechselkurses:', err);
        this.error = 'Wechselkurs konnte nicht geladen werden.';
      }
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

      if (this.expense.splitBy === 'alle') this.splitAmountEqually();
      if (this.expense.splitType === 'prozent') this.updatePercentageValues();
    }
  }


  onForeignAmountInput(memberId: string) {
    const foreignAmount = this.foreignAmountToPay[memberId] || 0;

    // Umrechnen in EUR und in amountToPay speichern
    if (this.exchangeRate > 0) {
      const euroValue = +(foreignAmount * this.exchangeRate).toFixed(2);
      this.amountToPay[memberId] = euroValue;
    } else {
      this.amountToPay[memberId] = 0;
    }
    this.onAmountToPayChange();
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

    try {
      // Members vorbereiten
      this.expense.expenseMember = this.groupMembers.map((member) => {
        const uid = member.uid;
        const amount = this.amountToPay[uid] || 0;
        const products = this.productInputs[uid]?.products || [];

        return {
          memberId: uid,
          amountToPay: parseFloat(amount.toFixed(2)),
          split: 1,
          products: products.map((p) => ({
            ...p,
            price: Number(p.price),
            quantity: Number(p.quantity),
          })),
        };
      });

      // Berechnung des Gesamtbetrags (in Fremdwährung, falls vorhanden)
      this.updateTotals();

      // Wenn eine Fremdwährung gewählt wurde, berechne totalAmountInForeignCurrency
      if (this.selectedCurrency !== 'EUR') {
        this.expense.totalAmountInForeignCurrency = +(this.expense.totalAmount / this.exchangeRate).toFixed(2); // Betrag in Fremdwährung
        this.expense.exchangeRate = this.exchangeRate; // Speichere den Wechselkurs
      } else {
        this.expense.totalAmountInForeignCurrency = 0; // Kein Fremdwährungsbetrag, wenn EUR gewählt wurde
        this.expense.exchangeRate = 1; // EUR hat keinen Wechselkurs
      }

      // totalAmount muss immer den Betrag in EUR enthalten
      this.expense.totalAmount = Number(this.expense.totalAmount.toFixed(2));

      // Wenn Rechnung ausgewählt wurde → hochladen und URL setzen
      if (this.uploadInvoice) {
        const invoicePath = `invoices/${this.groupId}/${this.expense.expenseId}.jpg`;
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

      this.navCtrl.back();
    } catch (error) {
      console.error('Fehler beim Speichern der Ausgabe:', error);
      alert('Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
    } finally {
      this.loadingService.hide();
    }
  }

  removeInvoice() {
    this.expense.invoice = undefined;
  }

  toggleInvoiceDropdown() {
    this.invoiceDropdownOpen = !this.invoiceDropdownOpen;
  }


}
