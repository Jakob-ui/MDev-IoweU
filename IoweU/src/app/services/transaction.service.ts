import { inject, Injectable } from '@angular/core';
import { Transactions } from './objects/Transactions';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  Firestore,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private firestore = inject(Firestore);

  constructor() {}

  async makeTransactionById(
    groupId: string,
    expenseId: string,
    transaction: Transactions
  ): Promise<Transactions | null> {
    try {
      const transactionId = doc(
        collection(this.firestore, 'groups', groupId, 'transactions')
      ).id;
      const trans: Transactions = {
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        reason: transaction.reason,
        date: transaction.date,
      };
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      await setDoc(expenseRef, trans);
      return trans;
    } catch {
      return null;
    }
  }

  async getTransactionsByName(
    username: string,
    groupId: string,
    updateTransactionsCallback: (expenses: Transactions[]) => void
  ): Promise<() => void> {
    try {
      const transactionCollection = collection(
        this.firestore,
        'groups',
        groupId,
        'transactions'
      );
      const q = query(transactionCollection, where('from', '==', username));
      const snapshot = await getDocs(q);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions: Transactions[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          from: data['from'],
          to: data['to'],
          amount: data['amount'],
          reason: data['reason'],
          date: data['date'],
        } as Transactions;
      });

      // Callback aufrufen, um die Transaktionen zu aktualisieren
      updateTransactionsCallback(transactions);
      console.log('Echtzeit-Transaktionen:', transactions);
    });
      
      return unsubscribe;
    } catch (error) {
      console.error('Fehler beim Abrufen der Transaktionen:', error);
      throw new Error('Fehler beim Abrufen der Transaktionen');
    }
  }

  async deleteTransactionsById(groupId: string, transactionId: string) {
    try {
      const transactionCollection = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      await deleteDoc(transactionCollection);
    } catch {
      throw new Error(`Couldnt delete Transaction with Id: ${transactionId}`);
      return null;
    }
  }
}
