import { Component, inject } from '@angular/core';
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
  IonNote, IonText,
} from '@ionic/angular/standalone';

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
    currency: ['EUR', 'USD', 'GBP', 'JPY', 'AUD'], // Verfügbare Währungen
    category: '',
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

  onInvoiceUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.expense.invoice = reader.result as string; // Speichere das Bild als Base64-String
      };
      reader.readAsDataURL(file); // Lese die Datei als Base64
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
    this.selectedCategory = category; // Setze die ausgewählte Kategorie
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

  //Hilfsrechnungsfunktionen
  private updateTotals() {
    if (this.expense.splitType === 'produkte') {
      // Berechne den Gesamtbetrag aus allen amountToPay-Feldern
      const total = Object.values(this.amountToPay).reduce(
        (sum, amount) => sum + (amount || 0),
        0
      );
      this.expense.totalAmount = parseFloat(total.toFixed(2));
    }

    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }

    this.expense.expenseMember.forEach((expenseMember, index) => {
      expenseMember.amountToPay =
        this.amountToPay[this.groupMembers[index].uid] || 0;
      expenseMember.products =
        this.productInputs[this.groupMembers[index].uid]?.products || [];
    });
  }

  private calculateTotalFromProducts(): number {
    // Summiere alle Werte aus den amountToPay-Feldern
    return Object.values(this.amountToPay).reduce(
      (sum, amount) => sum + (amount || 0),
      0
    );
  }

  updateTotalAmount() {
    let newTotalAmount = 0;

    // Summiere alle amountToPay und auf 2 Dezimalstellen rund
    for (let memberUid in this.amountToPay) {
      if (this.amountToPay.hasOwnProperty(memberUid)) {
        newTotalAmount += this.amountToPay[memberUid];
      }
    }

    if (newTotalAmount !== this.expense.totalAmount) {
      this.expense.totalAmount = parseFloat(newTotalAmount.toFixed(2));
    }

    // Wenn "alle" ausgewählt ist, Betragauf alle Mitglieder
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
  }

  onAmountToPayChange() {
    if (
      this.expense.splitType === 'anteile' &&
      this.expense.splitBy === 'frei'
    ) {
      // Berechne den Gesamtbetrag aus allen amountToPay-Feldern
      const total = Object.values(this.amountToPay).reduce(
        (sum, amount) => sum + (amount || 0),
        0
      );
      this.expense.totalAmount = parseFloat(total.toFixed(2));
    }
  }

  //Rechnungsfunktion für die Produkte
  onSplitTypeChange() {
    if (this.expense.splitType !== 'produkte') {
      Object.keys(this.showProductInputFields).forEach((uid) => {
        this.showProductInputFields[uid] = false;
      });

      // Lösche alle Produkte
      this.productInputs = {};
      this.products = [];
      this.updateTotals();
    }
    if (this.expense.splitType === 'anteile') {
      if (this.expense.splitBy === 'frei') {
        // Setze alle Felder auf 0
        this.groupMembers.forEach((member) => {
          this.amountToPay[member.uid] = 0;
        });

        // Setze den Gesamtbetrag auf 0
        this.expense.totalAmount = 0;

        // Verteile den Betrag gleichmäßig (falls nötig)
        this.splitAmountEqually();
      }
    }
    switch (this.expense.splitType) {
      case 'anteile':
        this.expense.splitBy = 'frei';
        this.chooseSplitType = true;
        this.error = '';
        this.splitAmountEqually();
        this.isFormValid = true;
        break;
      case 'prozent':
        this.error = '';
        this.expense.splitBy = 'frei';
        this.chooseSplitType = false;
        this.groupMembers.forEach((member) => {
          this.calculateSplitByPercentage(member.uid, 'percentage');
        });
        break;
      case 'produkte':
        this.expense.splitBy = 'frei';
        this.chooseSplitType = false;
        this.error = '';
        this.updateAmountToPayForProducts();
        this.isFormValid = true;
        break;
    }
  }

  //Neuberechnung wenn der Modus geändert wird
  onSplitByChange() {
    if (this.expense.splitType === 'anteile') {
      if (this.expense.splitBy === 'frei') {
        // Setze alle Felder auf 0
        this.groupMembers.forEach((member) => {
          this.amountToPay[member.uid] = 0;
        });

        // Setze den Gesamtbetrag auf 0
        this.expense.totalAmount = 0;

        // Verteile den Betrag gleichmäßig (falls nötig)
        this.splitAmountEqually();
      }
    }
  }

  //Rechnungsfunktion für Prozente
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

    // Berechne die Summe der Prozentwerte
    let totalPercentage = 0;
    this.groupMembers.forEach((member) => {
      totalPercentage += this.splitValue[member.uid] || 0;
    });

    const difference = parseFloat((100 - totalPercentage).toFixed(2));

    // Neue Logik:
    if (this.expense.splitType === 'prozent') {
      if (difference < 0) {
        // Mehr als 100 % → Fehler
        this.error = `Die Summe der Prozentwerte überschreitet 100 %. Sie sind ${Math.abs(difference)} % drüber.`;
        this.isFormValid = false;
        this.canDistributeRest = false;
      } else if (difference > 0) {
        // Weniger als 100 % → Hinweis + Button anzeigen
        this.error = `Es fehlen noch ${difference} % – du kannst den Rest auf die verbleibenden Mitglieder verteilen.`;
        this.isFormValid = false;
        this.canDistributeRest = true;
      } else {
        // Genau 100 % → alles okay
        this.error = '';
        this.isFormValid = true;
        this.canDistributeRest = false;
      }
    } else {
      this.error = '';
      this.isFormValid = true;
      this.canDistributeRest = false;
    }
  }

  distributeRemainingPercentage() {
    let totalPercentage = 0;
    this.groupMembers.forEach((member) => {
      totalPercentage += this.splitValue[member.uid] || 0;
    });

    const remainingPercentage = parseFloat((100 - totalPercentage).toFixed(2));

    // Finde Mitglieder mit 0 %
    const eligibleMembers = this.groupMembers.filter(member =>
      !this.splitValue[member.uid] || this.splitValue[member.uid] === 0
    );

    const count = eligibleMembers.length;
    if (count > 0) {
      const share = parseFloat((remainingPercentage / count).toFixed(2));
      eligibleMembers.forEach((member, index) => {
        // Beim letzten etwas „ausgleichen“, um Rundungsfehler zu vermeiden
        if (index === count - 1) {
          const sumBefore = this.groupMembers.reduce((sum, m) => sum + (this.splitValue[m.uid] || 0), 0);
          this.splitValue[member.uid] = parseFloat((100 - sumBefore).toFixed(2));
        } else {
          this.splitValue[member.uid] = share;
        }
        // auch gleich amountToPay aktualisieren
        this.amountToPay[member.uid] = parseFloat(((this.expense.totalAmount * this.splitValue[member.uid]) / 100).toFixed(2));
      });
    }

    this.calculateSplitByPercentage('', 'percentage'); // zur Validierung neu prüfen
  }



  updateAmountToPayForProducts() {
    let totalAmount = 0;

    // Berechne die amountToPay für jedes Mitglied basierend auf den Produkten
    this.groupMembers.forEach((member) => {
      let memberAmountToPay = 0;

      // Überprüfe die Produkte des Mitglieds
      const products: Products[] =
        this.productInputs[member.uid]?.products || [];
      products.forEach((product) => {
        memberAmountToPay += product.price; // Berechne den Gesamtpreis für dieses Produkt
      });

      // Setze den amountToPay für das Mitglied
      this.amountToPay[member.uid] = memberAmountToPay;

      // Füge den Betrag zum Gesamtbetrag hinzu
      totalAmount += memberAmountToPay;
    });

    // Aktualisiere den Gesamtbetrag der Ausgabe
    this.expense.totalAmount = totalAmount;
    this.updateTotals(); // Stelle sicher, dass alle anderen Berechnungen auch aktualisiert werden
  }

  // Diese Methode wird aufgerufen, wenn sich der Gesamtbetrag ändert
  onTotalAmountChange() {
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }

    // Prozente neu berechnen, wenn der Modus "Prozent" aktiv ist
    if (this.expense.splitType === 'prozent') {
      this.groupMembers.forEach((member) => {
        const memberUid = member.uid;
        const amount = this.amountToPay[memberUid] || 0;

        // Berechne den neuen Prozentwert basierend auf dem aktualisierten Gesamtbetrag
        const percentage = (amount / this.expense.totalAmount) * 100;
        this.splitValue[memberUid] = parseFloat(percentage.toFixed(2));
      });

      // Überprüfe, ob die Summe der Prozentwerte 100% ergibt
      let totalPercentage = 0;
      this.groupMembers.forEach((member) => {
        totalPercentage += this.splitValue[member.uid] || 0;
      });

      const difference = parseFloat((100 - totalPercentage).toFixed(2));
      if (totalPercentage !== 100) {
        if (difference > 0) {
          this.error = `Die Summe der Prozentwerte muss genau 100% betragen. Es fehlen ${difference}%`;
        } else {
          this.error = `Die Summe der Prozentwerte muss genau 100% betragen. Sie sind ${Math.abs(
            difference
          )}% drüber.`;
        }
        this.isFormValid = false;
      } else {
        this.error = '';
        this.isFormValid = true;
      }
    }
  }

  splitAmountEqually() {
    let totalAmount = this.expense.totalAmount;
    const numberOfMembers = this.groupMembers.length;

    if (numberOfMembers > 0 && totalAmount > 0) {
      const amountPerMember =
        Math.floor((totalAmount / numberOfMembers) * 100) / 100;
      let distributedTotal = parseFloat(
        (amountPerMember * numberOfMembers).toFixed(2)
      );
      let remainingAmount = parseFloat(
        (totalAmount - distributedTotal).toFixed(2)
      );

      this.groupMembers.forEach((member) => {
        this.amountToPay[member.uid] = amountPerMember;
      });

      if (remainingAmount > 0) {
        totalAmount += 1;
        remainingAmount = parseFloat((remainingAmount + 1).toFixed(2));
      }

      const payerUid = this.expense.paidBy;
      let i = 0;

      while (remainingAmount > 0) {
        const member = this.groupMembers[i];

        if (member.uid !== payerUid) {
          this.amountToPay[member.uid] = parseFloat(
            (this.amountToPay[member.uid] + 0.01).toFixed(2)
          );
          remainingAmount = parseFloat((remainingAmount - 0.01).toFixed(2));
        }

        i++;
        if (i >= this.groupMembers.length) {
          i = 0;
        }
      }
    }
  }

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

  saveExpense() {
    if (!this.validateExpense()) {
      return; // Fehler werden nun in der UI angezeigt
    }

    this.loadingService.show();

    try {
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

      this.updateTotalAmount();
      this.expense.totalAmount = Number(this.expense.totalAmount.toFixed(2));

      this.expenseService.createExpense(
        this.expense,
        this.expense.expenseMember,
        this.groupId
      );

      this.navCtrl.back();
    } catch (error) {
      console.error('Fehler beim Speichern der Ausgabe:', error);
      alert('Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
    } finally {
      this.loadingService.hide();
    }
  }

}
