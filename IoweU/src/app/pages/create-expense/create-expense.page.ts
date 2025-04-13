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
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';

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
  private updateExpensesCallback: (() => void) | null = null;

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId = this.route.snapshot.paramMap.get('groupId') || '';

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

  expense: Expenses = {
    expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
    description: '',
    totalAmount: 0,
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    currency: ['EUR', 'USD', 'GBP', 'JPY', 'AUD'], // Verfügbare Währungen
    category: '',
    invoice: '',
    repeat: '',
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

              this.expense.expenseMember = this.groupMembers.map((member) => ({
                memberId: member.uid,
                amountToPay: 0,
                split: 1,
                products: [],
              }));

              if (this.expense.paidBy) {
                this.selectedMember =
                  this.groupMembers.find(
                    (member) => member.uid === this.expense.paidBy
                  ) || null;
              }
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
    const total = this.calculateTotal();
    this.expense.totalAmount = total;

    // Wenn "splitBy" auf 'alle' gesetzt ist, teilen wir den Betrag
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
        memberAmountToPay += product.price * product.quantity; // Berechne den Gesamtpreis für dieses Produkt
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

    // Wenn es Mitglieder gibt und ein Gesamtbetrag existiert
    if (numberOfMembers > 0 && totalAmount > 0) {
      // Berechne den Betrag, den jedes Mitglied zahlen muss
      const amountPerMember = parseFloat(
        (totalAmount / numberOfMembers).toFixed(2)
      );

      // Aktualisiere den Betrag, den jedes Mitglied zahlen muss
      this.groupMembers.forEach((member) => {
        this.amountToPay[member.uid] = amountPerMember;
      });

      // Update totals nach der Berechnung
      this.updateTotals();
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
      // Speichere die Ausgabe
      this.expenseService.createExpense(
        this.expense,
        this.expense.expenseMember,
        this.groupId
      );

      // Aktualisiere die Beträge
      this.updateTotals();
      this.expense.totalAmount = Number(this.expense.totalAmount);
      this.expense.expenseMember?.forEach((expenseMember) => {
        expenseMember.amountToPay = Number(expenseMember.amountToPay);
      });

      console.log('Saving expense:', this.expense);

      // Navigiere zurück zur Gruppenseite
      this.router.navigate(['/expense', this.groupId]);
    } catch (error) {
      console.error('Fehler beim Speichern der Ausgabe:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  cancel() {
    this.navCtrl.back();
  }
}
