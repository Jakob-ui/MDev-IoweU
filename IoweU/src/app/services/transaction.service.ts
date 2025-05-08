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
import { Balances } from './objects/Balances';
import { Expenses } from './objects/Expenses';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private firestore = inject(Firestore);

  constructor() {}

  async makeTransactionById(
    groupId: string,
    expenseId: string,
    uid: string,
    transaction: Transactions
  ): Promise<Transactions | null> {
    try {
      const transactionId = doc(
        collection(this.firestore, 'groups', groupId, 'transactions')
      ).id;
      const transactionData: Transactions = {
        transactionId,
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
      await this.updateMemberBalancesOnTransaction(
        'addition',
        groupId,
        transaction,
        transactionId
      );
      console.log('Transaction added:', transactionId);
      //Expense Status updaten
      await this.updateUserStateOnExpense(groupId, expenseId, uid, true);
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
    expenseId: string,
    uid: string,
    transaction: Transactions,
    transactionId: string
  ) {
    try {
      // Reference to the transaction document
      const transactionCollection = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );

      // Delete the transaction document
      await deleteDoc(transactionCollection);

      // Update member amounts and balances
      await this.updateMemberAmounts(groupId, transaction, -1);
      await this.updateMemberBalancesOnTransaction(
        'deletion',
        groupId,
        transaction,
        transactionId
      );

      // Update the expense to remove the `paid` property for the specific member
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expenseId
      );
      const expenseSnapshot = await getDoc(expenseRef);

      if (expenseSnapshot.exists()) {
        const expense = expenseSnapshot.data() as Expenses;

        // Remove the `paid` property for the member with the matching `uid`
        const updatedExpenseMembers = expense.expenseMember.map((member) => {
          if (member.memberId === uid) {
            const { paid, ...rest } = member; // Remove the `paid` property
            return rest;
          }
          return member;
        });

        // Update the expense document with the modified `expenseMember` array
        await setDoc(
          expenseRef,
          { expenseMember: updatedExpenseMembers },
          { merge: true }
        );

        console.log(
          `Removed 'paid' property for member ${uid} in expense ${expenseId}`
        );
      } else {
        console.warn(`Expense with ID ${expenseId} not found.`);
      }

      console.log('Transaction deleted:', transactionId);
    } catch (error) {
      console.error(
        `Error deleting transaction with ID ${transactionId}:`,
        error
      );
      throw new Error(`Could not delete transaction with ID: ${transactionId}`);
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

  async updateMemberBalancesOnTransaction(
    action: 'addition' | 'deletion',
    groupId: string,
    currentTransaction: Transactions,
    newTransactionId: string
  ): Promise<void> {
    //Update the id of the transaction
    currentTransaction.transactionId = newTransactionId;
    // Get the balances collection for the group

    const balancesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );
    const balancesQuery = query(
      balancesRef,
      where('userAId', 'in', [currentTransaction.from, currentTransaction.to]),
      where('userBId', 'in', [currentTransaction.from, currentTransaction.to])
    );
    const snapshot = await getDocs(balancesQuery);
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const data = snapshot.docs[0].data() as Balances;
      const relatedTransactions = data.relatedTransactionId || [];

      switch (action) {
        case 'addition':
          // Update the balance for the new transaction and add it into the transaction list of the balance
          if (
            currentTransaction.from === data.userAId &&
            currentTransaction.to === data.userBId
          ) {
            const newCreditA = data.userACredit + currentTransaction.amount;
            relatedTransactions.push(currentTransaction.transactionId);
            await setDoc(
              docRef,
              {
                userACredit: newCreditA,
                relatedTransactionId: relatedTransactions,
              },
              { merge: true }
            );
            console.log(
              `Credit of the user ${data.userAId} at the user ${data.userBId} updated to ${newCreditA}. Transaction with the ID ${currentTransaction.transactionId} added to the list of transactions.`
            );
          } else if (
            currentTransaction.from === data.userBId &&
            currentTransaction.to === data.userAId
          ) {
            const newCreditB = data.userBCredit + currentTransaction.amount;
            relatedTransactions.push(currentTransaction.transactionId);
            await setDoc(docRef, { userBCredit: newCreditB }, { merge: true });
            console.log(
              `Credit of the user ${data.userBId} at the user ${data.userBId} updated to ${newCreditB}. Transaction with the ID ${currentTransaction.transactionId} added to the list of transactions.`
            );
          }
          break;
        case 'deletion':
          // Update the balance for the deleted transaction and remove it from the transaction list of the balance
          if (
            currentTransaction.from === data.userAId &&
            currentTransaction.to === data.userBId
          ) {
            const deletedBalanceA =
              data.userACredit - currentTransaction.amount;
            const updatedTransactions = relatedTransactions.filter(
              (id) => id !== currentTransaction.transactionId
            );
            await setDoc(
              docRef,
              {
                userACredit: deletedBalanceA,
                relatedTransactionId: updatedTransactions,
              },
              { merge: true }
            );
            console.log(
              `Transaction with ID ${currentTransaction.transactionId} removed from ${data.relatedTransactionId}. Updated credit: ${deletedBalanceA}`
            );
          } else if (
            currentTransaction.from === data.userBId &&
            currentTransaction.to === data.userAId
          ) {
            const deletedBalanceB =
              data.userBCredit - currentTransaction.amount;
            const updatedTransactions = relatedTransactions.filter(
              (id) => id !== currentTransaction.transactionId
            );
            await setDoc(
              docRef,
              {
                userBCredit: deletedBalanceB,
                relatedTransactionId: updatedTransactions,
              },
              { merge: true }
            );
            console.log(
              `Transaction with ID ${currentTransaction.transactionId} removed from ${data.relatedTransactionId}. Updated credit: ${deletedBalanceB}`
            );
          }
          break;
      }
    } else {
      console.error(
        `Balance between ${currentTransaction.from} and ${currentTransaction.to} doesn't exist.`
      );
      return;
    }
  }

  async updateUserStateOnExpense(
    groupId: string,
    expenseId: string,
    uid: string,
    state: boolean
  ) {
    try {
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expenseId
      );

      // Hole die aktuelle Ausgabe aus der Datenbank
      const snapshot = await getDoc(expenseRef);

      if (snapshot.exists()) {
        const expense = snapshot.data() as Expenses;

        // Aktualisiere das Feld "paid" für den entsprechenden Member
        const updatedExpenseMembers = expense.expenseMember.map((member) => {
          if (member.memberId === uid) {
            return { ...member, paid: state }; // Füge das Feld "paid" hinzu oder aktualisiere es
          }
          return member;
        });

        // Speichere die aktualisierte Liste zurück in die Datenbank
        await setDoc(
          expenseRef,
          { expenseMember: updatedExpenseMembers },
          { merge: true }
        );

        console.log(
          `Expense ${expenseId} updated for member ${uid} with paid: ${state}`
        );
      } else {
        console.error(`Expense with ID ${expenseId} not found.`);
      }
    } catch (error) {
      console.error(error);
      throw new Error(
        `Fehler beim Aktualisieren des Feldes "paid" für Expense ${expenseId}`
      );
    }
  }
}
