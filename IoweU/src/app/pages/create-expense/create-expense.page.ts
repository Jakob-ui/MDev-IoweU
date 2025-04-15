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
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';
import { Groups } from 'src/app/services/objects/Groups';

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

  dropdownOpen = false;
  selectedMember: any = null;
  selectedCurrency: string = 'EUR'; // Standardwährung
  isFormValid: boolean = true;
  error: string = '';

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
  selectedCategory: any = null;

  async ngOnInit() {
    this.loadingService.show();

    try {
      if (this.authService.currentUser) {
        this.uid = this.authService.currentUser.uid;
        this.user = this.authService.currentUser.username;
        this.displayName = this.authService.currentUser.username;

        const groupId = this.activeRoute.snapshot.paramMap.get('groupId');

        if (groupId) {
          this.currentGroup = await this.groupService.getGroup();
          if (this.currentGroup === null) {
            this.currentGroup = await this.groupService.getGroupById(groupId);
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

              // Fallback: wenn paidBy nicht gesetzt ist, setze aktuellen User
              if (!this.expense.paidBy && this.uid) {
                this.expense.paidBy = this.uid;
              }

              // selectedMember setzen (ob vom expense oder durch Fallback)
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
        console.error('Kein Benutzer eingeloggt.');
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

  onSplitTypeChange() {
    switch (this.expense.splitType) {
      case 'anteile':
        this.expense.splitBy = 'alle';
        this.splitAmountEqually();
        this.isFormValid = true;
        break;
      case 'prozent':
        this.expense.splitBy = 'frei';
        this.calculateSplitByPercentage();
        break;
      case 'produkte':
        this.expense.splitBy = 'frei';
        this.updateAmountToPayForProducts();
        this.isFormValid = true;
        break;
    }
  }

  onSplitByChange() {
    switch (this.expense.splitBy) {
      case 'alle':
        this.splitAmountEqually();
        break;
      case 'frei':
        this.calculateSplitByPercentage();
        break;
    }
  }

  calculateSplitByPercentage() {
    const totalAmount = this.expense.totalAmount;
    let totalPercentage = 0;

    // Berechne die Summe der eingegebenen Prozentwerte
    this.groupMembers.forEach((member) => {
      const percentage = this.splitValue[member.uid] || 0;
      totalPercentage += percentage;
    });

    // Überprüfe, ob die Summe der Prozentwerte 100% ergibt
    if (totalPercentage !== 100) {
      this.error = 'Die Summe der Prozentwerte muss genau 100% betragen.';
      this.isFormValid = false; // Nur im Prozentmodus ungültig
    } else {
      this.error = ''; // Fehler zurücksetzen
      this.isFormValid = true; // Prozentwerte sind korrekt
    }

    // Verteile den Betrag basierend auf den Prozentwerten
    this.groupMembers.forEach((member) => {
      const percentage = this.splitValue[member.uid] || 0;
      const amount = (totalAmount * percentage) / 100;
      this.amountToPay[member.uid] = parseFloat(amount.toFixed(2)); // Runde auf 2 Dezimalstellen
    });

    console.log('Berechnete Beträge:', this.amountToPay);
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

      console.log('Gleichmäßige Aufteilung mit Rest:', this.amountToPay);
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
  saveExpense() {
    // Rufe die Validierungsmethode auf
    if (!this.validateExpense()) {
      console.error(
        'Die Eingabe ist ungültig. Bitte füllen Sie alle Pflichtfelder aus.'
      );

      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    this.loadingService.show();

    try {
      // Aktualisiere die Beträge und Produktlisten in expenseMember
      this.expense.expenseMember = this.groupMembers.map((member) => {
        const uid = member.uid;
        const amount = this.amountToPay[uid] || 0;
        const products = this.productInputs[uid]?.products || [];

        return {
          memberId: uid,
          amountToPay: parseFloat(amount.toFixed(2)),
          split: 1, // du kannst das auch dynamisch machen, wenn nötig
          products: products.map((p) => ({
            ...p,
            price: Number(p.price),
            quantity: Number(p.quantity),
          })),
        };
      });

      // Aktualisiere die Gesamtsumme noch einmal zur Sicherheit
      this.updateTotalAmount();
      this.expense.totalAmount = Number(this.expense.totalAmount.toFixed(2));

      // Speichere die Ausgabe über den Service
      this.expenseService.createExpense(
        this.expense,
        this.expense.expenseMember,
        this.groupId
      );

      // Navigiere zurück oder zu einer Bestätigungsseite
      this.navCtrl.back();
    } catch (error) {
      console.error('Fehler beim Speichern der Ausgabe:', error);
      alert('Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
    } finally {
      this.loadingService.hide();
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
}
