import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
} from '@ionic/angular/standalone';

import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { Members } from 'src/app/services/objects/Members';
import { NavController } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
@Component({
  selector: 'app-edit-expense',
  templateUrl: './edit-expense.page.html',
  styleUrls: ['./edit-expense.page.scss'],
  standalone: true,
  imports: [
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
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);

  // Mock-Daten für die Mitglieder und Ausgaben
  groupMembers: (Members & {})[] = [
    {
      memberId: 'user123',
      uid: 'ae2qe',
      username: 'Ich',
      color: 'grün',
      role: 'member',
      joinedAt: new Date().toISOString(),
    },
    {
      memberId: 'user456',
      uid: 'ae2qe',
      username: 'Lila',
      color: 'grün',
      role: 'member',
      joinedAt: new Date().toISOString(),
    },
    {
      memberId: 'user789',
      uid: 'ae2qe',
      username: 'Grün',
      color: 'grün',
      role: 'member',
      joinedAt: new Date().toISOString(),
    },
  ];

  // Mock-Daten für eine Ausgabe
  expense: Expenses = {
    expenseId: 'mock123',
    description: 'Einkauf von Lebensmitteln',
    totalAmount: 150,
    paidBy: 'Grün',
    date: new Date().toISOString().split('T')[0],
    currency: 'EUR',
    category: 'Lebensmittel',
    invoice: '2025/001',
    repeat: 'monatlich',
    splitBy: 'alle',
    splitType: 'prozent',
    members: [
      {
        expenseMemberId: 'aw3da123',
        memberId: 'user123',
        amountToPay: 75,
        split: 1,
        products: [
          {
            productId: 'p123',
            memberId: 'user123',
            productname: 'Brot',
            quantity: 2,
            unit: 'Stück',
            price: 3,
          },
        ],
      },
      {
        expenseMemberId: 'aw3da124',
        memberId: 'user456',
        amountToPay: 75,
        split: 1,
        products: [
          {
            productId: 'p124',
            memberId: 'user456',
            productname: 'Milch',
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
    const member = this.groupMembers.find((m) => m.username === memberName);
    return {
      productId: Date.now().toString(),
      memberId: member ? member.memberId : '',
      productname: '',
      quantity: 1,
      unit: '',
      price: 0,
    };
  }

  addProduct(memberName: string) {
    const entry = this.productInputs[memberName];
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

      if (!this.expense.members) {
        this.expense.members = [];
      }

      const member = this.expense.members.find(
        (m) => m.memberId === entry.input.memberId
      );

      if (member) {
        if (!member.products) {
          member.products = [];
        }
        member.products.push(newProduct);
      } else {
        this.expense.members.push({
          expenseMemberId: 'awdawd2weq2w34e',
          memberId: entry.input.memberId,
          amountToPay: 0,
          split: 1,
          products: [newProduct],
        });
      }

      entry.input = this.createEmptyProduct(memberName);
      this.updateTotals();
    }
  }

  removeProduct(memberName: string, productToRemove: Products) {
    const entry = this.productInputs[memberName];
    if (!entry) return;

    if (entry.products) {
      entry.products = entry.products.filter((p) => p !== productToRemove);
    }

    if (this.expense.members) {
      const member = this.expense.members.find(
        (m) => m.memberId === productToRemove.memberId
      );
      if (member && member.products) {
        member.products = member.products.filter((p) => p !== productToRemove);
      }
    }

    this.updateTotals();
  }

  private calculateTotal(): number {
    if (!this.expense.members || !Array.isArray(this.expense.members)) {
      return 0;
    }

    return this.expense.members.reduce((sum, member) => {
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
    this.expense.members = this.groupMembers.map((member) => ({
      expenseMemberId: 'aw3da123',
      memberId: member.memberId,
      amountToPay:
        this.expense.members?.find((m) => m.memberId === member.memberId)
          ?.amountToPay || 0,
      split: 1,
      products: this.productInputs[member.username]?.products || [],
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
      this.expense.members?.find((m) => m.memberId === member.memberId)
        ?.amountToPay || 0;
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

  ngOnInit() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    this.loadExpense(); // Ausgabe laden
    this.loadingService.hide(); // Lade-Overlay deaktivieren
  }

  loadExpense() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      // Hier laden wir einfach die Mock-Daten direkt
      this.expense = { ...this.expense };
      console.log('Expense loaded:', this.expense);
    } catch (error) {
      console.error('Fehler beim Laden der Ausgabe:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  saveChanges() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      // Da wir hier keine echte Backend-Verbindung haben, simulieren wir nur das Speichern
      console.log('Changes saved', this.expense);
      this.router.navigate(['/expense']);
    } catch (error) {
      console.error('Fehler beim Speichern der Änderungen:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  cancel() {
    this.navCtrl.back();
  }
}
