import { Injectable } from '@angular/core';
import { Expenses } from './objects/Expenses';
import {
  collection,
  Firestore,
  getDocs,
  updateDoc,
  onSnapshot,
  getDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { inject } from '@angular/core';
import { ExpenseMember } from './objects/ExpenseMember';
import { Groups } from './objects/Groups';
import { Members } from './objects/Members';

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

      //Felder in der Collection "Members" aktualisieren:
 
      //1. Sich das Dokument der Gruppe holen
      const groupRef = await getDoc(doc(this.firestore, 'groups', groupId));
      //2. Den Inhalt in einem Objekt speichern
      const groupData = groupRef.data() as Groups;
      //3. Die Mitglieder-Array durchlaufen und die Felder aktualisieren, die mit der Summe der Ausgaben zu tun haben (initialisieren wenn's sie nicht gibt)
      for(const member of groupData.members) 
        {
          for(const expenseMember of expenseMembersData) 
          {
            if(expenseMember.memberId === member.uid) 
              {
                if(expenseMember.memberId === expense.paidBy)
                {
                  member.sumExpenseAmount += expense.totalAmount;
                  member.sumExpenseMemberAmount += expense.totalAmount - expenseMember.amountToPay;
                }
                else
                {
                  member.sumExpenseAmount -= expenseMember.amountToPay;
                }
                 // Wenn amount nicht definiert ist, wird 0 verwendet
                member.countExpenseAmount += 1;
                member.countExpenseMemberAmount += 1;
              }
          }
        }    
      //4. Das Gruppendokument mit diesen Feldern updaten und speichern
      const groupDocRef = doc(this.firestore, 'groups', groupId);
      await updateDoc(groupDocRef, {
        members: groupData.members, // Update the "members" array in the group document
      });

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

  async getExpenseById(
    groupId: string,
    expenseId: string,
    updateExpenseCallback: (expense: Expenses | null) => void
  ): Promise<() => void> {
    try {
      // Zugriff auf das richtige Dokument in der verschachtelten Collection
      const expenseRef = doc(this.firestore, 'groups', groupId, 'expenses', expenseId);

      const unsubscribe = onSnapshot(expenseRef, (expenseDoc) => {
        if (expenseDoc.exists()) {
          const expense = { expenseId: expenseDoc.id, ...expenseDoc.data() } as Expenses;
          updateExpenseCallback(expense);
        } else {
          console.error(`Expense with ID ${expenseId} not found in group ${groupId}`);
          updateExpenseCallback(null);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching expense:', error);
      updateExpenseCallback(null);
      return () => {};
    }
  }
}
