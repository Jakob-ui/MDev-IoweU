import { inject, Injectable } from '@angular/core';
import { Transactions } from './objects/Transactions';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  Firestore,
  getDoc,
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
      const transactionData: Transactions = {
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        reason: transaction.reason,
        date: transaction.date,
        relatedExpenses: [expenseId],
      };
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      await setDoc(expenseRef, transactionData);

      //Mitglieder Felder aktualisieren
      await this.updateMemberAmounts(groupId, transaction, 1);

      //Expense Status updaten
      await this.updateExpenseState(expenseId, groupId, true);
      return transactionData;
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
            relatedExpenses: data['relatedExpenses'],
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

  async deleteTransactionsById(
    groupId: string,
    expenseId : string,
    transaction: Transactions,
    transactionId: string
  ) {
    try {
      const transactionCollection = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      await deleteDoc(transactionCollection);
      await this.updateMemberAmounts(groupId, transaction, -1);
      //Expense Status updaten
      await this.updateExpenseState(expenseId, groupId, false);
    } catch {
      throw new Error(`Couldnt delete Transaction with Id: ${transactionId}`);
      return null;
    }
  }

  async updateMemberAmounts(
    groupId: string,
    transaction: Transactions,
    sign: number
  ) {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (groupSnap.exists()) {
      const groupData = groupSnap.data();

      // Update AmountPaid für die Mitglieder die das Geld bezahlen
      const membersFrom = groupData['members'] || [];
      const memberFromIndex = membersFrom.findIndex(
        (member: any) => member.uid === transaction.from
      );

      if (memberFromIndex !== -1) {
        membersFrom[memberFromIndex].countAmountPaid =
          (membersFrom[memberFromIndex].countAmountPaid || 0) + 1 * sign;
        membersFrom[memberFromIndex].sumAmountPaid =
          (membersFrom[memberFromIndex].sumAmountPaid || 0) +
          transaction.amount * sign;

        await setDoc(groupRef, { members: membersFrom }, { merge: true });
      } else {
        console.error('Mitglied From nicht gefunden.');
      }

      // Update AmountReceived für die Mitglieder die das Geld bekommen
      const membersTo = groupData['members'] || [];
      const memberToIndex = membersTo.findIndex(
        (member: any) => member.uid === transaction.to
      );

      if (memberToIndex !== -1) {
        membersTo[memberToIndex].countAmountReceived =
          (membersTo[memberToIndex].countAmountReceived || 0) + 1 * sign;
        membersTo[memberToIndex].sumAmountReceived =
          (membersTo[memberToIndex].sumAmountReceived || 0) +
          transaction.amount * sign;

        await setDoc(groupRef, { members: membersTo }, { merge: true });
      } else {
        console.error('Mitglied To nicht gefunden.');
      }
    } else {
      console.error('Gruppe nicht gefunden.');
    }
  }

  async updateExpenseState(expenseId: string, groupId: string, state: boolean) {
    try {
      const expenseRef = doc(this.firestore, 'groups', groupId, 'expenses', expenseId);

      await setDoc(expenseRef, { paid: state }, { merge: true });

      console.log(`Expense ${expenseId} updated with paid: ${state}`);
    } catch (error) {
      throw new Error(
        `Fehler beim Aktualisieren des Feldes "paid": ${expenseId}`
      );
    }
  }
}
