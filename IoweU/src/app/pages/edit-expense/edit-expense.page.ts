import {
  Component,
  ElementRef,
  HostListener,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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

// Import interfaces
import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { AlertController } from '@ionic/angular';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';
import { Groups } from '../../services/objects/Groups';
import { ImageService } from '../../services/image.service';
import { CATEGORIES } from 'src/app/services/objects/Categories';

@Component({
  selector: 'app-edit-expense',
  templateUrl: './edit-expense.page.html',
  styleUrls: ['./edit-expense.page.scss'],
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
  ],
})
export class EditExpensePage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private route = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);
  private alertController = inject(AlertController);
  private imageService = inject(ImageService);

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId = this.route.snapshot.paramMap.get('groupId') || '';
  expenseId = this.activeRoute.snapshot.paramMap.get('expenseId') || '';

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
  deletable: boolean = false;
  paid: boolean = false;

  canDistributeRest = false;

  dropdownOpen: boolean = false;
  selectedCategory: any = null;

  paidByDropdownOpen: boolean = false;
  selectedMember: any = null;
  selectedCurrency: string = 'EUR'; // Standardwährung

  showAddProductButton: { [key: string]: boolean } = {};
  showProductInputFields: { [key: string]: boolean } = {};

  expense: Expenses = {
    expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
    description: '',
    totalAmount: 0,
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    currency: ['EUR', 'USD', 'GBP', 'JPY', 'AUD'],
    category: '',
    invoice: '',
    repeat: 'nein',
    splitBy: 'alle',
    splitType: 'anteile',
    expenseMember: [],
  };

  originalExpense: Expenses = { ...this.expense };

  invoice: string | ArrayBuffer | null = null;
  uploadInvoice: any;
  @ViewChild('fileInput') fileInput!: ElementRef;

  categories = CATEGORIES;
  private unsubscribe: () => void = () => {};

  async ngOnInit() {
    this.loadingService.show();

    try {
      this.authService.waitForUser();

      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        const expenseId = this.activeRoute.snapshot.paramMap.get('expenseId');
        const repeatingParam =
          this.activeRoute.snapshot.queryParamMap.get('repeating');
        const isRepeating = repeatingParam === 'true';

        this.repeating = isRepeating;
        if (!this.repeating) {
          this.expense.repeat = 'nein';
        }

        const paidParam = this.activeRoute.snapshot.queryParamMap.get('paid');
        if (paidParam === 'false') {
          this.deletable = false;
        } else {
          this.deletable = true;
        }

        if (groupId) {
          const currentGroup = await this.groupService.getGroupById(groupId);

          if (currentGroup) {
            this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
            this.groupId = currentGroup.groupId || '';

            if (currentGroup.members && currentGroup.members.length > 0) {
              this.groupMembers = currentGroup.members.map((member: any) => {
                this.memberUsernames.push(member.username || '');
                this.memberIds.push(member.memberId || '');
                this.memberColors.push(member.color || '');
                this.memberRoles.push(member.role || '');
                this.memberUids.push(member.uid || '');
                return {
                  ...member,
                  amount: 0,
                };
              });
              if (expenseId) {
                this.unsubscribe = await this.expenseService.getExpenseById(
                  this.groupId,
                  expenseId,
                  isRepeating, // 🔁 Repeating-Flag übergeben
                  (loadedExpense) => {
                    if (loadedExpense) {
                      this.expense = loadedExpense;

                      this.selectedMember = this.groupMembers.find(
                        (member) => member.uid === this.expense.paidBy
                      );

                      this.selectedCategory = this.categories.find(
                        (cat) => cat.name === this.expense.category
                      );

                      if (
                        this.expense.currency &&
                        this.expense.currency.length > 0
                      ) {
                        this.selectedCurrency = this.expense.currency[0];
                      }

                      for (const member of this.groupMembers) {
                        const memberExpense = this.expense.expenseMember.find(
                          (em) => em.memberId === member.uid
                        );
                        if (memberExpense) {
                          this.amountToPay[member.uid] =
                            memberExpense.amountToPay;
                          this.productInputs[member.uid] = {
                            input: this.createEmptyProduct(member.uid),
                            products: memberExpense.products || [],
                          };
                        }
                      }
                    } else {
                      console.warn(
                        'Expense mit ID ' + expenseId + ' nicht gefunden.'
                      );
                    }
                  }
                );
              }
            }
          }
        }

        this.iosIcons = this.platform.is('ios');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

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

  selectImage() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.invoice = reader.result;
        if (typeof this.invoice === 'string') {
          this.uploadInvoice = this.imageService.dataURLtoBlob(this.invoice);
        }
      };
      reader.readAsDataURL(file);
    }
  }
  selectCurrency(currency: string) {
    this.selectedCurrency = currency;
    this.expense.currency = [currency];
    this.dropdownOpen = false;
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
    this.selectedCategory = category;
    this.expense.category = this.selectedCategory.name;
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
    console.log('updateTotals aufgerufen'); // Zum Debuggen
    // Berechnung des Gesamtbetrags
    const total = this.calculateTotalFromAmountToPay();

    this.expense.totalAmount = parseFloat(total.toFixed(2));

    // Wenn "alle" ausgewählt ist, Betrag gleichmäßig verteilen
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

  private updateTotalAmount() {
    const newTotalAmount = this.calculateTotalFromAmountToPay();

    if (newTotalAmount !== this.expense.totalAmount) {
      this.expense.totalAmount = parseFloat(newTotalAmount.toFixed(2));
    }

    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
  }

  // Überprüft, ob der Betrag nach Änderung angepasst werden muss
  onAmountToPayChange() {
    if (
      this.expense.splitType === 'anteile' &&
      this.expense.splitBy === 'frei'
    ) {
      this.updateTotals();
    }
  }

  onSplitByChange() {
    // Wenn wir von Anteilen auf Prozente wechseln, können wir `splitBy` wieder anpassen
    if (this.expense.splitBy === 'frei') {
      this.resetSplitValues();
    } else if (this.expense.splitBy === 'alle') {
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
    this.groupMembers.forEach((member) => {
      this.calculateSplitByPercentage(member.uid, 'percentage');
    });
  }

  // Fall: Split-Typ 'produkte'
  private handleProdukteChange() {
    this.expense.splitBy = 'frei';
    this.chooseSplitType = false;
    this.error = '';
    this.updateAmountToPayForProducts();
  }

  private resetSplitValues() {
    this.groupMembers.forEach((member) => {
      this.amountToPay[member.uid] = 0;
    });
    //this.expense.totalAmount = 0;
  }

  calculateSplitByPercentage(
    memberUid: string,
    changedField: 'percentage' | 'amount'
  ) {
    const totalAmount = this.expense.totalAmount;

    if (changedField === 'percentage') {
      const percentage = this.splitValue[memberUid] || 0;
      const amount = (totalAmount * percentage) / 100;
      this.amountToPay[memberUid] = parseFloat(amount.toFixed(2));
    } else if (changedField === 'amount') {
      const amount = this.amountToPay[memberUid] || 0;
      const percentage = (amount / totalAmount) * 100;
      this.splitValue[memberUid] = parseFloat(percentage.toFixed(2));
    }

    this.validatePercentageSum();
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
          : `Die Summe der Prozentwerte überschreitet 100 %. Sie sind ${Math.abs(
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

    this.groupMembers.forEach((member) => {
      let memberAmountToPay = 0;
      const products: Products[] =
        this.productInputs[member.uid]?.products || [];
      products.forEach((product) => {
        memberAmountToPay += product.price;
      });
      this.amountToPay[member.uid] = memberAmountToPay;
      totalAmount += memberAmountToPay;
    });

    this.expense.totalAmount = totalAmount;
    this.updateTotals();
  }

  onTotalAmountChange() {
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
    if (this.expense.splitType === 'prozent') {
      this.updatePercentageValues();
    }
  }

  private updatePercentageValues() {
    this.groupMembers.forEach((member) => {
      const amount = this.amountToPay[member.uid] || 0;
      const percentage = (amount / this.expense.totalAmount) * 100;
      this.splitValue[member.uid] = parseFloat(percentage.toFixed(2));
    });

    this.validatePercentageSum();
  }

  splitAmountEqually() {
    const totalAmount = this.expense.totalAmount;
    const numberOfMembers = this.groupMembers.length;

    if (numberOfMembers > 0 && totalAmount > 0) {
      const amountPerMember =
        Math.floor((totalAmount / numberOfMembers) * 100) / 100;
      let distributedTotal = amountPerMember * numberOfMembers;
      let remainingAmount = totalAmount - distributedTotal;

      this.groupMembers.forEach((member) => {
        this.amountToPay[member.uid] = amountPerMember;
      });

      if (remainingAmount > 0) {
        remainingAmount = parseFloat(remainingAmount.toFixed(2));
        this.amountToPay[this.expense.paidBy] += remainingAmount; // Paid by member gets the remaining amount
      }
    }
  }

  //----------------------------------------------------------------------------------------------------------------------

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

  async saveExpenseChanges() {
    const hasChanges = this.hasExpenseChanges();
    console.log('hasChanges', hasChanges); // Zum Debuggen
    if (hasChanges) {
      try {
        this.loadingService.show();

        if (this.uploadInvoice) {
          const invoicePath = `invoices/${this.groupId}/${this.expense.expenseId}.jpg`;
          const downloadURL = await this.imageService.uploadImage(
            this.expense.expenseId,
            this.uploadInvoice,
            invoicePath
          );
          this.expense.invoice = downloadURL;
        }
        this.expense.expenseMember.forEach((expenseMember, index) => {
          const memberUid = this.groupMembers[index].uid;
          expenseMember.amountToPay = this.amountToPay[memberUid] || 0;
          //expenseMember.products = this.productInputs[memberUid]?.products || [];
        });
        console.log(
          'Die zu bearbeitende Ausgabe:',
          this.expense,
          this.amountToPay
        );

        await this.expenseService.updateExpense(
          this.expense,
          this.expense.expenseMember,
          this.groupId,
          this.repeating
        );

        console.log('Ausgabe erfolgreich aktualisiert.');
        this.navCtrl.back();
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Ausgabe:', error);
        alert('Beim Aktualisieren der Ausgabe ist ein Fehler aufgetreten.');
      } finally {
        this.loadingService.hide();
      }
    } else {
      console.log('Keine Änderungen zum Speichern vorhanden.');
    }
  }

  hasExpenseChanges(): boolean {
    return !this.deepEqual(this.expense, this.originalExpense);
  }

  deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true; // Wenn beide Referenzen gleich sind, sind sie gleich

    // Wenn eines der Objekte null oder undefiniert ist, ist es nicht gleich
    if (obj1 == null || obj2 == null) return false;

    // Wenn beide Objekte vom selben Typ sind
    if (typeof obj1 !== typeof obj2) return false;

    // Wenn es sich um ein Objekt handelt, dann rekursiv vergleichen
    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      // Wenn die Anzahl der Schlüssel unterschiedlich ist, sind die Objekte unterschiedlich
      if (keys1.length !== keys2.length) return false;

      // Rekursiv alle Schlüssel und Werte vergleichen
      for (let key of keys1) {
        if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
          return false;
        }
      }
      return true;
    }

    // Wenn es sich nicht um ein Objekt handelt, vergleiche die Werte direkt
    return obj1 === obj2;
  }

  async deleteExpense() {
    try {
      // Stelle sicher, dass expenseId vorhanden ist
      if (!this.expense.expenseId) {
        console.error('Expense ID ist nicht definiert');
        return;
      }

      // Löschen der Ausgabe aufrufen
      await this.expenseService.deleteExpense(
        this.groupId,
        this.expense.expenseId,
        this.paid
      );

      // Weiterleitung zur Gruppenansicht
      this.router.navigate(['/expense', this.groupId]);
    } catch (e) {
      console.error('Fehler beim Löschen der Ausgabe:', e);
      alert('Beim Löschen ist ein Fehler aufgetreten.');
    }
  }

  async confirmDelete() {
    console.log('Bestätigung wird angezeigt'); // Zum Debuggen
    const alert = await this.alertController.create({
      header: 'Ausgabe endgültig löschen!',
      message: 'Möchtest du diese Ausgabe wirklich löschen?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
          handler: () => {
            console.log('Löschung abgebrochen');
          },
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: () => {
            this.deleteExpense();
          },
        },
      ],
    });

    await alert.present();
  }
}
