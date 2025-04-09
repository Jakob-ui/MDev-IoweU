import { Injectable } from '@angular/core';
import { Expenses } from './objects/Expenses';
import { Firestore } from '@angular/fire/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { inject } from '@angular/core';
import { ExpenseMember } from './objects/ExpenseMember';
import { FormGroupDirective } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService 
{
  public firestore: Firestore = inject(Firestore);

  //1. Ausgabe hinzufügen

  async createExpense(
    description: string,
    totalAmount: number,
    paidBy: string,
    currency: string,
    category: string,
    invoice: string,
    repeat: string,
    splitType: 'prozent' | 'produkte',
    splitBy: 'alle' | 'frei',
    members: ExpenseMember[],
    groupId: string,
  ): Promise<Expenses | null>
  {
    try
    {
      const expense: Expenses = 
      {
        expenseId: doc(this.firestore, "groups", groupId, "expenses").id,
        description: description,
        totalAmount: totalAmount,
        paidBy: paidBy,
        date: new Date().toISOString(),
        currency: currency,
        category: category,
        invoice: invoice,
        repeat: repeat,
        splitType: splitType,
        splitBy: splitBy,
        members: 
        [{
            memberId: paidBy,
            amountToPay: -totalAmount,
            split: 1/members.length,
            products: [], // Optional: Produkte, die diesem Mitglied zugeordnet sind
        }]
      }
      // Hinzufügen der Mitglieder zur Ausgabe
      for(const member of members) 
      {
        if (member.memberId !== paidBy) 
          {
            const memberToAdd: ExpenseMember = 
            {
              memberId: member.memberId,
              amountToPay: expense.totalAmount / expense.members.length,
              split: 1 / expense.members.length,
            }
            expense.members.push(memberToAdd);
          }
      }
      const expenseRef = doc(this.firestore, "groups", groupId, "expenses", expense.expenseId);
      await setDoc(expenseRef, expense);
      return expense;
    } catch (error) {
      console.error("Fehler beim Erstellen der Ausgabe: ", error);
      return null;
  }
}
}
