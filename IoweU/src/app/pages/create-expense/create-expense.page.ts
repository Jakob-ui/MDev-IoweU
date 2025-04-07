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
    id: Date.now().toString(),
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
        price: Number(product.price),
      };

      // Produkt zu den Mitgliedsdaten hinzufügen
      entry.products.push(newProduct);
      const member = this.expense.members.find(
        (m) => m.userId === entry.input.memberId
      );
      if (member) {
        member.products.push(newProduct);
      }

      // Gesamtbetrag und Mitgliederaktualisierung durchführen
      entry.input = this.createEmptyProduct(memberName);
      this.updateTotals();
    }
  }

  removeProduct(memberName: string, productToRemove: Products) {
    const entry = this.productInputs[memberName];
    if (!entry) return;

    entry.products = entry.products.filter((p) => p !== productToRemove);

    const member = this.expense.members.find(
      (m) => m.userId === productToRemove.memberId
    );
    if (member) {
      member.products = member.products.filter((p) => p !== productToRemove);
    }

    this.updateTotals();
  }

  private calculateTotal(): number {
    return this.expense.members.reduce((sum, member) => {
      return (
        sum +
        member.products.reduce((productSum, product) => {
          return productSum + product.price * product.quantity;
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

    // Falls der Split-Typ "alle" ist, wird der Betrag gleichmäßig auf alle Mitglieder aufgeteilt
    if (this.expense.splitBy === 'alle') {
      this.splitAmountEqually();
    } else {
      // Hier können wir eine zusätzliche Logik für andere Split-Typen hinzufügen, falls nötig
    }

    // Sicherstellen, dass die Mitglieder aktualisiert werden
    this.updateMembers();
  }

  private splitAmountEqually() {
    const total = this.expense.totalAmount;
    const amountPerPerson = total / this.groupMembers.length;

    // Aufteilen des Gesamtbetrags gleichmäßig auf alle Mitglieder
    this.groupMembers.forEach((member) => {
      member.amountPerPerson = amountPerPerson;
    });
  }

  onTotalAmountChange() {
    const total = this.expense.totalAmount;
    const amountPerPerson = total / this.groupMembers.length;
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
    this.expense.members.forEach((member) => {
      member.amountToPay = Number(member.amountToPay);
    });

    console.log('Saving expense:', this.expense);
    this.router.navigate(['/expense']);
  }

  cancel() {
    this.router.navigate(['/expense']);
  }
}
