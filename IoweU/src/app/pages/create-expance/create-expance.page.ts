import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonDatetime, IonToggle } from '@ionic/angular/standalone';

@Component({
  selector: 'app-create-expance',
  templateUrl: './create-expance.page.html',
  styleUrls: ['./create-expance.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonDatetime, IonToggle, CommonModule, FormsModule]
})
export class CreateExpancePage {
  expense: any = {
    description: '',
    category: '',
    amount: null,
    currency: 'EUR',
    paidBy: '',
    date: '',
    repeated: false,
    splitType: 'prozentual',
    personCount: 1,
    shares: [],
    image: null,
  };

  members: string[] = ['Person1', 'Person2', 'Person3', 'Person4'];

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor() {}

  selectImage() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.expense.image = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  calculateShare(index: number) {
    const share = this.expense.shares[index] || 0;
    if (this.expense.splitType === 'prozentual') {
      return (this.expense.amount * share) / 100;
    }
    return (this.expense.amount / this.expense.personCount) * share;
  }

  saveExpense() {
    console.log('Expense saved:', this.expense);
    // Hier könnte die Logik für das Speichern der Ausgabe hinzugefügt werden
  }

  cancel() {
    console.log('Cancelled');
    // Hier könnte die Logik für das Abbrechen der Eingabe hinzugefügt werden
  }
}
