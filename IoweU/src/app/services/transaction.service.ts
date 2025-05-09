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
import { GroupService } from './group.service';
import { AuthService } from './auth.service';
import { Groups } from './objects/Groups';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private firestore = inject(Firestore);
  private groupService = inject(GroupService);
  private authService = inject(AuthService);

  deptList = [{ from: '', to: '', debt: 0 }];

  constructor() {}

  async makeTransactionById(
    groupId: string,
    expenseId: string[],
    fromUid: string,
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
        relatedExpenses: expenseId,
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
      for (const id of expenseId) {
        await this.updateUserStateOnExpense(groupId, id, fromUid, true);
      }
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

  async markAllMembersAsPaid(
    groupId: string,
    expenseId: string
  ): Promise<void> {
    try {
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

        // Aktualisiere das Feld "paid" für alle Mitglieder
        const updatedExpenseMembers = expense.expenseMember.map((member) => ({
          ...member,
          paid: true,
        }));

        // Speichere die aktualisierte Liste zurück in die Datenbank
        await setDoc(
          expenseRef,
          { expenseMember: updatedExpenseMembers },
          { merge: true }
        );

        console.log(
          `Expense ${expenseId} updated: All members marked as paid.`
        );
      } else {
        console.warn(`Expense with ID ${expenseId} not found.`);
      }
    } catch (error) {
      console.error(
        `Fehler beim Aktualisieren des Feldes "paid" für Expense ${expenseId}:`,
        error
      );
      throw new Error(
        `Fehler beim Aktualisieren des Feldes "paid" für Expense ${expenseId}`
      );
    }
  }

  async getFilteredRelatedExpenses(
    groupId: string,
    relatedExpenseIds: string[],
    uid: string
  ): Promise<Expenses[]> {
    const filteredExpenses: Expenses[] = [];

    for (const expenseId of relatedExpenseIds) {
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

        // Filtere die Ausgaben, bei denen der Benutzer noch nicht bezahlt hat
        const hasUnpaidMember = expense.expenseMember.some(
          (member) => member.memberId === uid && !member.paid
        );

        if (hasUnpaidMember) {
          filteredExpenses.push(expense);
        }
      } else {
        console.warn(`Expense with ID ${expenseId} not found.`);
      }
    }

    return filteredExpenses;
  }

  async settleAllDepts(groupId: string) {
    try {
      // Abrufen aller Balances aus der Datenbank
      const querySnapshot = await getDocs(
        collection(this.firestore, 'groups', groupId, 'balances')
      );

      // Liste der Schulden erstellen
      const schulden: [string, string, number, string[]][] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userACredit = data['userACredit'] || 0;
        const userBCredit = data['userBCredit'] || 0;
        const userAId = data['userAId'];
        const userBId = data['userBId'];
        const relatedExpenseId = data['relatedExpenseId'] || [];

        const debt = userACredit - userBCredit;

        if (debt > 0) {
          schulden.push([userBId || '', userAId || '', debt, relatedExpenseId]);
        } else if (debt < 0) {
          schulden.push([
            userAId || '',
            userBId || '',
            -debt,
            relatedExpenseId,
          ]);
        }
      });

      // Schulden in deptList speichern
      this.deptList = schulden.map(([from, to, debt]) => ({ from, to, debt }));
      console.log('Dept List:', this.deptList);

      // Schuldenverteilung berechnen
      const ausgleichTransaktionen = this.schuldenAusgleichen(schulden);
      console.log('Ausgleichstransaktionen:', ausgleichTransaktionen);

      return ausgleichTransaktionen;
    } catch (error) {
      console.error('Fehler beim Berechnen der Schulden:', error);
      throw new Error('Fehler beim Berechnen der Schulden');
    }
  }

  schuldenAusgleichen(schulden: [string, string, number, string[]][]) {
    const nettoSchulden: Record<string, number> = {};
    const ausgleichTransaktionen: [string, string, number, string[]][] = [];

    for (const [schuldner, glaeubiger, betrag, relatedExpenses] of schulden) {
      nettoSchulden[schuldner] = (nettoSchulden[schuldner] || 0) - betrag;
      nettoSchulden[glaeubiger] = (nettoSchulden[glaeubiger] || 0) + betrag;
    }

    const glaeubiger = Object.entries(nettoSchulden)
      .filter(([, betrag]) => betrag > 0)
      .sort(([, a], [, b]) => b - a); // Nach höchster Gutschrift sortieren
    const schuldner = Object.entries(nettoSchulden)
      .filter(([, betrag]) => betrag < 0)
      .sort(([, a], [, b]) => a - b); // Nach höchster Schuld sortieren (negativ)

    let i = 0;
    let j = 0;

    while (i < schuldner.length && j < glaeubiger.length) {
      const [schuldnerName, schuld] = schuldner[i];
      const [glaeubigerName, gutschrift] = glaeubiger[j];

      const ausgleichsBetrag = Math.min(-schuld, gutschrift);

      // Finde die zugehörigen Expenses für diese Transaktion
      const relatedExpenses = schulden
        .filter(([s, g]) => s === schuldnerName && g === glaeubigerName)
        .map(([, , , expenses]: [string, string, number, string[]]) => expenses)
        .flat();

      ausgleichTransaktionen.push([
        schuldnerName,
        glaeubigerName,
        ausgleichsBetrag,
        relatedExpenses,
      ]);

      nettoSchulden[schuldnerName] += ausgleichsBetrag;
      nettoSchulden[glaeubigerName] -= ausgleichsBetrag;

      if (nettoSchulden[schuldnerName] === 0) {
        i++;
      }
      if (nettoSchulden[glaeubigerName] === 0) {
        j++;
      }
    }

    return ausgleichTransaktionen;
  }
}
