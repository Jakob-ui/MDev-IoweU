import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonDatetime, IonList } from '@ionic/angular/standalone';

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
    CommonModule,
    FormsModule
  ]
})
export class CreateExpensePage {
  expense: any = {
    description: '',
    amount: null,
    paidBy: 'mir',
    date: new Date().toISOString().split('T')[0],
    repeat: 'nein',
    splitType: 'alle'
  };

  groupMembers = [
    { name: 'ich', split: null, amountperperson: null },
    { name: 'Lila', split: null, amountperperson: null },
    { name: 'Grün', split: null, amountperperson: null }
  ];

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

  // Methode für die Bildauswahl
  selectImage() {
    // Hier kannst du eine Methode einfügen, um ein Bild auszuwählen, z.B. über die Kamera oder das Dateisystem
    // Zum Beispiel eine einfache Simulation eines Bildes:
    this.invoiceImage = 'https://via.placeholder.com/150';  // Hier kannst du dein Bild setzen
  }

  saveExpense() {
    console.log('Expense saved:', this.expense);
    console.log('Members with their expenses:', this.groupMembers);
  }

  cancel() {
    console.log('Cancelled');
  }
}
