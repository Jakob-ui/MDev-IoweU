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
import { NavController } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';

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
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private route = inject(ActivatedRoute);
  private expenseService = inject(ExpenseService);
  private groupService = inject(GroupService);

  groupId = this.route.snapshot.paramMap.get('groupId') || '';

  groupMembers: (ExpenseMember & {})[] = [];
  groupMembers2: (Members & {})[] = [];

  expense: Expenses = {
    expenseId: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
    description: '',
    totalAmount: 0,
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'EUR',
    category: '',
    invoice: '',
    repeat: '',
    splitBy: 'alle',
    splitType: 'prozent',
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
  dropdownOpen = false;

  ngOnInit() {
    console.log('groupid:', this.groupId);
    this.groupService
      .getEveryMemberOfGroupById(this.groupId)
      .then((members) => {
        this.groupMembers2 = members || [];
      });
    console.log(this.groupMembers2);
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
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
    const member = this.groupMembers.find((m) => m.memberId === memberName);
    return {
      productId: Date.now().toString(),
      memberId: member ? member.memberId : '',
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

      if (!entry.products) {
        entry.products = [];
      }

      entry.products.push(newProduct);

      if (!this.groupMembers) {
        this.groupMembers = [];
      }

      const member = this.groupMembers.find(
        (m) => m.memberId === entry.input.memberId
      );

      if (member) {
        if (!member.products) {
          member.products = [];
        }
        member.products.push(newProduct);
      } else {
        this.groupMembers.push({
          memberId: entry.input.memberId,
          amountToPay: 0,
          split: 1,
          products: [newProduct],
        });
      }

      entry.input = this.createEmptyProduct(memberId);
      this.updateTotals();
    }
  }

  removeProduct(memberName: string, productToRemove: Products) {
    const entry = this.productInputs[memberName];
    if (!entry) return;

    if (entry.products) {
      entry.products = entry.products.filter((p) => p !== productToRemove);
    }

    if (this.groupMembers) {
      const member = this.groupMembers.find(
        (m) => m.memberId === productToRemove.memberId
      );
      if (member && member.products) {
        member.products = member.products.filter((p) => p !== productToRemove);
      }
    }

    this.updateTotals();
  }

  private calculateTotal(): number {
    if (!this.groupMembers || !Array.isArray(this.groupMembers)) {
      return 0;
    }

    return this.groupMembers.reduce((sum, member) => {
      const products = member.products || [];
      return (
        sum +
        products.reduce((productSum, product) => {
          return productSum + (product.price * product.quantity || 0);
        }, 0)
      );
    }, 0);
  }

  private updateMembers() {
    this.groupMembers = this.groupMembers.map((member) => ({
      memberId: member.memberId,
      amountToPay:
        this.expense.expenseMember?.find((m) => m.memberId === member.memberId)
          ?.amountToPay || 0,
      split: 1,
      products: this.productInputs[member.memberId]?.products || [],
    }));
  }

  private updateTotals() {
    const total = this.calculateTotal();
    this.expense.totalAmount = total;

    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }

    this.updateMembers();
  }

  private splitAmountEqually() {
    const total = this.expense.totalAmount;
    const amountPerPerson = total / this.groupMembers.length;

    this.groupMembers.forEach((member) => {
      const m = this.expense.expenseMember?.find(
        (m) => m.memberId === member.memberId
      );
      if (m) m.amountToPay = amountPerPerson;
    });
  }

  onTotalAmountChange() {
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
  }

  onSplitByChange() {
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    }
  }

  saveExpense() {
    this.loadingService.show();
    try {
      this.expenseService.createExpense(
        this.expense,
        this.groupMembers,
        this.groupId
      );
      this.updateTotals();
      this.expense.totalAmount = Number(this.expense.totalAmount);
      this.expense.expenseMember?.forEach((expenseMember) => {
        expenseMember.amountToPay = Number(expenseMember.amountToPay);
      });

      console.log('Saving expense:', this.expense);

      // Zur Gruppenseite zurücknavigieren
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
