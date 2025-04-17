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
} from '@ionic/angular/standalone';

// Import interfaces
import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { Members } from 'src/app/services/objects/Members';
import { AlertController } from '@ionic/angular';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';

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
  private updateExpensesCallback: (() => void) | null = null;
  private alertController = inject(AlertController);

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId = this.route.snapshot.paramMap.get('groupId') || '';
  expenseId = this.activeRoute.snapshot.paramMap.get('expenseId') || '';

  groupMembers: any[] = [];

  memberUsernames: string[] = [];
  memberIds: string[] = [];
  memberColors: string[] = [];
  memberRoles: string[] = [];
  memberUids: string[] = [];

  splitValue: { [uid: string]: number } = {};
  amountToPay: { [uid: string]: number } = {};
  products: (Products & {})[] = [];

  dropdownOpen = false;
  selectedMember: any = null;
  selectedCurrency: string = 'EUR'; // Standardwährung

  isSaveButtonDisabled = false;

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
    splitType: 'prozent',
    expenseMember: [
      {
        memberId: '',
        amountToPay: 0,
        split: 1,
        products: [
          {
            productId: '',
            memberId: '',
            productname: '',
            quantity: 1,
            unit: '',
            price: 0,
          },
        ],
      } as ExpenseMember,
    ],
  };

  originalExpense: Expenses = { ...this.expense };

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
  selectedCategory: any = null;
  private unsubscribe: () => void = () => {};

  async ngOnInit() {
    this.loadingService.show();

    try {
      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');
        const expenseId = this.activeRoute.snapshot.paramMap.get('expenseId'); // Hole die Expense-ID aus der URL

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
                  (loadedExpense) => {
                    if (loadedExpense) {
                      this.expense = loadedExpense;

                      // Setze den ausgewählten Zahler
                      this.selectedMember = this.groupMembers.find(
                        (member) => member.uid === this.expense.paidBy
                      );

                      // Setze die gewählte Kategorie
                      this.selectedCategory = this.categories.find(
                        (cat) => cat.name === this.expense.category
                      );

                      // Setze die Währung
                      if (
                        this.expense.currency &&
                        this.expense.currency.length > 0
                      ) {
                        this.selectedCurrency = this.expense.currency[0];
                      }

                      // Produkte und Beträge auslesen
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
      }

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }
  onInvoiceUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.expense.invoice = reader.result as string; // Speichere das Bild als Base64-String
        console.log('Rechnung hochgeladen:', this.expense.invoice);
      };
      reader.readAsDataURL(file); // Lese die Datei als Base64
    }
  }
  selectCurrency(currency: string) {
    this.selectedCurrency = currency;
    this.expense.currency = [currency];
    this.dropdownOpen = false;
  }

  selectMember(member: any) {
    this.expense.paidBy = member.uid;
    this.selectedMember = member;
    this.dropdownOpen = false;
  }

  selectCategory(category: any) {
    this.selectedCategory = category;
    this.expense.category = category.name;
    this.dropdownOpen = false;
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

  toggleProducts(memberName: string) {
    if (!this.productInputs[memberName]) {
      this.productInputs[memberName] = {
        input: this.createEmptyProduct(memberName),
        products: [],
      };
    } else {
      delete this.productInputs[memberName];
    }
  }

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

  addProduct(memberId: string) {
    const entry = this.productInputs[memberId];
    if (!entry) return;

    const product = entry.input;
    if (product.productname.trim() && !isNaN(product.price)) {
      const newProduct: Products = {
        ...product,
        productId: Date.now().toString(),
        price: Number(product.price),
      };

      // Produkt zur Liste des Mitglieds hinzufügen
      entry.products.push(newProduct);

      // Neuen leeren Produkteeintrag erstellen
      entry.input = this.createEmptyProduct(memberId);

      // Berechne die amountToPay für jedes Mitglied basierend auf den Produkten
      this.updateAmountToPayForProducts();

      // Update die Gesamtsumme
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
        this.productInputs[memberId].products = this.productInputs[
          memberId
        ].products.filter((p) => p.productId !== productToRemove.productId);
      }
    }

    this.updateTotals();
  }

  private calculateTotal(): number {
    if (!this.groupMembers || !Array.isArray(this.groupMembers)) {
      return 0;
    }

    return this.groupMembers.reduce((sum, member) => {
      const products: Products[] =
        this.productInputs[member.uid]?.products || [];
      return (
        sum +
        products.reduce(
          (
            productSum: number,
            product: { price: number; quantity: number }
          ) => {
            return productSum + (product.price * product.quantity || 0);
          },
          0
        )
      );
    }, 0);
  }

  private updateTotals() {
    if (this.expense.splitType === 'produkte') {
      const total = this.calculateTotalFromProducts();
      this.expense.totalAmount = total;
    }

    // Wenn "alle" gewählt ist, verteile manuell eingegebenen Betrag
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }

    // Update 'expenseMember' für jedes Mitglied
    this.expense.expenseMember.forEach((expenseMember, index) => {
      expenseMember.amountToPay =
        this.amountToPay[this.groupMembers[index].uid] || 0;
      expenseMember.products =
        this.productInputs[this.groupMembers[index].uid]?.products || [];
    });
  }

  private calculateTotalFromProducts(): number {
    return this.groupMembers.reduce((sum, member) => {
      const products: Products[] =
        this.productInputs[member.uid]?.products || [];
      return (
        sum +
        products.reduce((productSum, product) => {
          return productSum + (product.price || 0);
        }, 0)
      );
    }, 0);
  }

  updateTotalAmount() {
    let newTotalAmount = 0;

    // Summiere alle amountToPay-Werte und runde sie auf 2 Dezimalstellen
    for (let memberUid in this.amountToPay) {
      if (this.amountToPay.hasOwnProperty(memberUid)) {
        newTotalAmount += this.amountToPay[memberUid];
      }
    }

    // Verhindere das Zurücksetzen auf null und setze totalAmount nur, wenn es geändert wurde
    if (newTotalAmount !== this.expense.totalAmount) {
      this.expense.totalAmount = parseFloat(newTotalAmount.toFixed(2));
    }

    // Wenn "alle" ausgewählt ist, teile den Betrag gleichmäßig auf alle Mitglieder
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
  }

  onAmountToPayChange() {
    this.updateTotalAmount();
  }

  onSplitByChange() {
    if (this.expense.splitType === 'produkte') {
      // Wenn "produkte" ausgewählt ist, setze splitBy auf "frei"
      this.expense.splitBy = 'frei';
      this.updateAmountToPayForProducts(); // Berechne die amountToPay für jedes Mitglied basierend auf den Produkten
    }
    if (this.expense.splitBy === 'alle') {
      // Berechne den totalAmount, wenn "alle" ausgewählt ist
      this.splitAmountEqually();
    } else {
      // Keine Änderung der Berechnungen, falls "frei" ausgewählt ist
      this.updateTotalAmount();
    }
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
    // Nur teilen, wenn "splitBy" auf 'alle' gesetzt ist
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
  }

  splitAmountEqually() {
    const totalAmount = this.expense.totalAmount;
    const numberOfMembers = this.groupMembers.length;

    if (numberOfMembers > 0 && totalAmount > 0) {
      const amountPerMember = parseFloat(
        (totalAmount / numberOfMembers).toFixed(2)
      );

      this.groupMembers.forEach((member) => {
        this.amountToPay[member.uid] = amountPerMember;
      });
    }
  }

  validateExpense(): boolean {
    let isValid = true;

    // Überprüfe Pflichtfelder
    if (!this.expense.description || this.expense.description.trim() === '') {
      console.error('Beschreibung darf nicht leer sein.');
      isValid = false;
    }
    /*
    if (!this.expense.totalAmount || this.expense.totalAmount <= 0) {
      console.error('Betrag muss größer als 0 sein.');
      isValid = false;
    }*/

    // Optional: Standardwerte für optionale Felder setzen
    if (!this.expense.category) {
      this.expense.category = ''; // Kategorie darf leer sein
    }

    if (!this.expense.invoice) {
      this.expense.invoice = ''; // Rechnung darf leer sein
    }

    if (!this.expense.repeat) {
      this.expense.repeat = ''; // Wiederholung darf leer sein
    }

    return isValid;
  }
  async saveExpenseChanges() {
    const hasChanges = this.hasExpenseChanges();

    if (hasChanges) {
      try {
        this.loadingService.show();

        await this.expenseService.updateExpense(
          this.expenseId,
          this.expense,
          this.expense.expenseMember,
          this.groupId
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
      await this.expenseService.deleteExpense(this.groupId, this.expenseId);
      this.router.navigate(['/expense', this.groupId]);
    } catch (e) {
      console.error('Fehler beim Löschen der Ausgabe:', e);
      alert('Beim Löschen ist ein Fehler aufgetreten.');
    }
  }

  async confirmDelete() {
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
  cancel() {
    this.navCtrl.back();
  }
}
