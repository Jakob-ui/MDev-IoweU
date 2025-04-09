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
import {NavController} from "@ionic/angular";
import { LoadingService } from 'src/app/services/loading.service';

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
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
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
    members: [
      {
        expenseMemberId: 'aw3da123',
        memberId: 'user123',
        amountToPay: 0,
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
        expenseMemberId: 'aw3da123',
        memberId: 'user456',
        amountToPay: 0,
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

      // Initialize products array if undefined
      if (!entry.products) {
        entry.products = [];
      }

      entry.products.push(newProduct);

      // Ensure members array is initialized
      if (!this.expense.members) {
        this.expense.members = [];
      }

      const member = this.expense.members.find(
        (m) => m.memberId === entry.input.memberId
      );

      if (member) {
        // Ensure products array is initialized
        if (!member.products) {
          member.products = [];
        }
        member.products.push(newProduct);
      } else {
        // If member doesn't exist, add it to the expense
        this.expense.members.push({
          expenseMemberId: 'awdawd2weq2w34e',
          memberId: entry.input.memberId,
          amountToPay: 0,
          split: 1,
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
      const member = this.expense.members.find(
        (m) => m.memberId === productToRemove.memberId
      );
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

  saveExpense() {
    this.loadingService.show(); 
    try {
      this.updateTotals();
      this.expense.totalAmount = Number(this.expense.totalAmount);
      this.expense.members?.forEach((member) => {
        member.amountToPay = Number(member.amountToPay);
      });
  
      console.log('Saving expense:', this.expense);
      this.router.navigate(['/expense']);
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
