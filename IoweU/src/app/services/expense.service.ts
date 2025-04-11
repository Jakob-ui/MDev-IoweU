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
      const expense: Expenses = {
        expenseId: doc(
          collection(this.firestore, 'groups', groupId, 'expenses')
        ).id,
        description: expenseData?.description,
        totalAmount: expenseData?.totalAmount,
        paidBy: expenseData?.paidBy,
        date: new Date().toISOString(),
        currency: expenseData?.currency,
        category: expenseData?.category,
        invoice: expenseData?.invoice,
        repeat: expenseData?.repeat,
        splitType: expenseData?.splitType,
        splitBy: expenseData?.splitBy,
        expenseMember: [],
      };
      // Hinzufügen der Mitglieder zur Ausgabe
      for (const expenseMember of expenseMembersData) {
        if (expenseMember.memberId !== expenseData?.paidBy) {
          const memberToAdd: ExpenseMember = {
            memberId: expenseMember.memberId,
            amountToPay: expense.totalAmount / expense.expenseMember.length,
            split: 1 / expense.expenseMember.length,
          };
          expense.expenseMember.push(memberToAdd);
        }
      }
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
}
