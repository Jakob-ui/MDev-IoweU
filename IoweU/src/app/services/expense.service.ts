import { Injectable } from '@angular/core';
import { Expenses } from './objects/Expenses';
import {
  collection,
  Firestore,
  getDocs,
  onSnapshot,
  query,
  where,
} from '@angular/fire/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { inject } from '@angular/core';
import { ExpenseMember } from './objects/ExpenseMember';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  public firestore: Firestore = inject(Firestore);

  //1. Ausgabe hinzufügen

  async createExpense(
    expenseData: Expenses,
    expenseMembersData: ExpenseMember[],
    groupId: string
  ): Promise<Expenses | null> {
    try {
      // Pflichtfelder prüfen
      if (
        !expenseData.description ||
        expenseData.totalAmount === undefined ||
        !expenseData.paidBy ||
        !expenseData.currency ||
        !expenseData.repeat ||
        !expenseData.splitType ||
        !expenseData.splitBy
      ) {
        throw new Error('Ein oder mehrere Pflichtfelder fehlen bei expenseData');
      } 

      // Neue ID für die Ausgabe erzeugen
      const expenseId = doc(
        collection(this.firestore, 'groups', groupId, 'expenses')
      ).id;

      // Komplettes Expense-Objekt erstellen (Daten werden aus der UI geliefert)
      const expense: Expenses = {
        expenseId,
        description: expenseData.description,
        totalAmount: expenseData.totalAmount,
        paidBy: expenseData.paidBy,
        date: new Date().toISOString(),
        currency: expenseData.currency,
        category: expenseData.category || '',
        invoice: expenseData.invoice || '',
        repeat: expenseData.repeat,
        splitType: expenseData.splitType,
        splitBy: expenseData.splitBy,
        expenseMember: expenseMembersData, // → wird 1:1 übernommen, inkl. paidBy & products
      };

      //Die Summe einzelner Waagen beim splitType 'anteile' berechnen:

      let sum = 0;
      for (let i = 0; i < expenseMembersData.length; i++) 
      {
        sum += expenseMembersData[i].split || 0; // Wenn split nicht definiert ist, wird 0 verwendet
      }

      // Einzelnbetraege nach dem splitType berechnen:

      for(const member of expenseMembersData) 
        {
          switch (expenseData.splitType) {
            case 'anteile':
              if (member.split && member.split >= 0) {
                member.amountToPay = (member.split / sum) * expenseData.totalAmount;
              } else {
                member.amountToPay = 0; // Defaultwert, falls split nicht definiert ist
              }
              break; 
            case 'prozent':
              if (member.split && member.split >= 0 && member.split <= 100) {
                member.amountToPay = (member.split / 100) * expenseData.totalAmount;
              } else {
                member.amountToPay = 0; // Defaultwert, falls split nicht definiert ist
              }
              break;
            case 'produkte':
              if (member.products && member.products.length > 0) {
                let sumOfProducts = 0;
                for(const product of member.products) {
                  sumOfProducts += product.price || 0; // Wenn amount nicht definiert ist, wird 0 verwendet
                }
                member.amountToPay = sumOfProducts;
              } else {
                member.amountToPay = 0; // Defaultwert, falls keine Produkte vorhanden sind
              }  
              break; 
            }
      }

      // In Firestore speichern
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expense.expenseId
      );
      await setDoc(expenseRef, expense);

      return expense;
    } catch (error) {
      console.error('Fehler beim Erstellen der Ausgabe: ', error);
      return null;
    }
  }


  async getExpenseByGroup(
    groupId: string,
    updateExpensesCallback: (expenses: Expenses[]) => void
  ): Promise<() => void> {
    // Referenz auf die Subcollection "expenses" der Gruppe
    const expensesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'expenses'
    );

    // Echtzeit-Listener auf die Subcollection
    const unsubscribe = onSnapshot(expensesRef, (snapshot) => {
      // Mappe die Dokumente in der Subcollection auf ein Array von Expenses
      const expenses = snapshot.docs.map((doc) => ({
        expenseId: doc.id,
        ...doc.data(),
      })) as Expenses[];

      console.log('Realtime expenses:', expenses);

      // Callback mit den aktualisierten Daten
      updateExpensesCallback(expenses);
    });

    // Gib die Unsubscribe-Funktion zurück, um den Listener bei Bedarf zu entfernen
    return unsubscribe;
  }

  // Hilfsfunktion zur Berechnung der Summe der Anteile:

  sumOfShares(a: Array<any>): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i].numberField || 0; // Wenn split nicht definiert ist, wird 0 verwendet
    }
    return sum;
  }
}
