import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonDatetime,
  IonList,
  IonIcon,
  IonBadge,
} from '@ionic/angular/standalone';

// Import interfaces
import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { Members } from 'src/app/services/objects/Members';

@Component({
  selector: 'app-create-expense',
  templateUrl: './create-expense.page.html',
  styleUrls: ['./create-expense.page.scss'],
  standalone: true,
  imports: [
    IonList,
    IonContent,
    IonItem,
    IonLabel,
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

  groupMembers: (Members & {
    name: string;
    amountPerPerson: number;
    split: number;
  })[] = [
    {
      userId: 'user123',
      name: 'Ich',
      role: 'admin',
      joinedAt: new Date().toISOString(),
      amountPerPerson: 0,
      split: 1,
    },
    {
      userId: 'user456',
      name: 'Lila',
      role: 'member',
      joinedAt: new Date().toISOString(),
      amountPerPerson: 0,
      split: 1,
    },
    {
      userId: 'user789',
      name: 'Grün',
      role: 'member',
      joinedAt: new Date().toISOString(),
      amountPerPerson: 0,
      split: 1,
    },
  ];

  expense: Expenses = {
    id: (Date.now() + Math.floor(Math.random() * 1000)).toString(),
    description: 'Einkauf von Lebensmitteln',
    totalAmount: 150,
    paidBy: 'user123',
    date: new Date().toISOString().split('T')[0],
    currency: 'EUR',
    category: 'Lebensmittel',
    invoice: '2025/001',
    repeat: 'monatlich',
    splitBy: 'alle',
    splitType: 'prozent',
    members: [
      {
        userId: 'user123',
        amountToPay: 75,
        products: [
          {
            productId: 'p123',
            memberId: 'user123',
            name: 'Brot',
            quantity: 2,
            unit: 'Stück',
            price: 3,
          },
        ],
      },
      {
        userId: 'user456',
        amountToPay: 75,
        products: [
          {
            productId: 'p124',
            memberId: 'user456',
            name: 'Milch',
            quantity: 1,
            unit: 'Liter',
            price: 1.5,
          },
        ],
      },
    ],
  };

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
    const member = this.groupMembers.find((m) => m.name === memberName);
    return {
      productId: Date.now().toString(),
      memberId: member ? member.userId : '',
      name: '',
      quantity: 1,
      unit: '',
      price: 0,
    };
  }

  addProduct(memberName: string) {
    const entry = this.productInputs[memberName];
    if (!entry) return;

    const product = entry.input;
    if (product.name.trim() && !isNaN(product.price)) {
      const newProduct: Products = {
        ...product,
        productId: Date.now().toString(),
        price: Number(product.price),
      };

      // Initialize products array if undefined
      if (!entry.products) {
        entry.products = [];
      }

      entry.products.push(newProduct);

      // Ensure members array is initialized
      if (!this.expense.members) {
        this.expense.members = [];
      }

      const member = this.expense.members.find((m) => m.userId === entry.input.memberId);

      if (member) {
        // Ensure products array is initialized
        if (!member.products) {
          member.products = [];
        }
        member.products.push(newProduct);
      } else {
        // If member doesn't exist, add it to the expense
        this.expense.members.push({
          userId: entry.input.memberId,
          amountToPay: 0,
          products: [newProduct],
        });
      }

      // Reset input and update totals
      entry.input = this.createEmptyProduct(memberName);
      this.updateTotals();
    }
  }


  removeProduct(memberName: string, productToRemove: Products) {
    const entry = this.productInputs[memberName];
    if (!entry) return;

    // Ensure products is an array before filtering
    if (entry.products) {
      entry.products = entry.products.filter((p) => p !== productToRemove);
    }

    // Check if members array is defined
    if (this.expense.members) {
      const member = this.expense.members.find((m) => m.userId === productToRemove.memberId);
      if (member && member.products) {
        // Ensure member's products is an array before calling filter
        member.products = member.products.filter((p) => p !== productToRemove);
      }
    }

    this.updateTotals();
  }

  private calculateTotal(): number {
    // Ensure this.expense.members is an array
    if (!this.expense.members || !Array.isArray(this.expense.members)) {
      return 0;
    }

    return this.expense.members.reduce((sum, member) => {
      // Ensure member.products is an array and not undefined
      const products = member.products || [];
      return (
        sum +
        products.reduce((productSum, product) => {
          // Ensure each product has valid price and quantity
          return productSum + (product.price * product.quantity || 0);
        }, 0)
      );
    }, 0);
  }


  private updateMembers() {
    this.expense.members = this.groupMembers.map((member) => ({
      userId: member.userId,
      amountToPay: member.amountPerPerson,
      products: this.productInputs[member.name]?.products || [],
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
      member.amountPerPerson = amountPerPerson;
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
    this.updateTotals();
    this.expense.totalAmount = Number(this.expense.totalAmount);
    this.expense.members?.forEach((member) => {
      member.amountToPay = Number(member.amountToPay);
    });

    console.log('Saving expense:', this.expense);
    this.router.navigate(['/expense']);
  }

  cancel() {
    this.router.navigate(['/expense']);
  }
}
