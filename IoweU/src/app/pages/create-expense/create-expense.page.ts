import {Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonDatetime, IonList, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-create-expense',
  templateUrl: './create-expense.page.html',
  styleUrls: ['./create-expense.page.scss'],
  standalone: true,
  imports: [IonList,
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
  ]
})
export class CreateExpensePage {
  private router = inject(Router);

  expense: any = {
    description: '',
    amount: null,
    paidBy: 'mir',
    date: new Date().toISOString().split('T')[0],
    repeat: 'nein',
    splitType: 'alle',
    splitBy: 'alle'
  };

  groupMembers = [
    { name: 'ich', split: null, amountperperson: null },
    { name: 'Lila', split: null, amountperperson: null },
    { name: 'Grün', split: null, amountperperson: null }
  ];

  productInputs: { [key: string]: any } = {};  // Objekt für die Produkteingaben

  invoiceImage: string | null = null; // Variable zum Speichern des Bildes
  isDatePickerOpen = false;

  // Methode zum Öffnen des Datepickers
  openDatePicker() {
    this.isDatePickerOpen = true;
  }

  // Methode zum Schließen des Datepickers
  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  // Methode für das Ändern des Datums
  onDateChange(event: any) {
    this.expense.date = event.detail.value;
    this.closeDatePicker();
  }

  // Methode für das Hinzufügen eines Produkts zum Mitglied
  toggleProducts(memberName: string) {
    if (!this.productInputs[memberName]) {
      this.productInputs[memberName] = {
        quantity: null,
        productunit: '',
        productName: '',
        price: null
      };
    } else {
      delete this.productInputs[memberName];  // Entfernen der Eingabefelder
    }
  }

  saveExpense() {
    console.log('Expense saved:', this.expense);
    console.log('Members with their expenses:', this.groupMembers);
    this.router.navigate(['/expense']);
  }

  cancel() {
    console.log('Cancelled');
    this.router.navigate(['/expense']);
  }
}
