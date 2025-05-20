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
  writeBatch,
  WriteBatch, // Wichtig: Typ für WriteBatch importieren
} from '@angular/fire/firestore';
import { Balances } from './objects/Balances';
import { Expenses } from './objects/Expenses';
import { ExpenseService } from './expense.service';
import { DebtEntry } from './objects/DeptEntry';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private firestore = inject(Firestore);
  private expenseService = inject(ExpenseService);

  deptList: DebtEntry[] = [];
  groupMembers: any[] = [];

  constructor() {}

  // --- GET DATA FROM DATABASE ---
  async getTransactionsByName(
    username: string,
    groupId: string,
    updateTransactionsCallback: (transactions: Transactions[]) => void
  ): Promise<() => void> {
    try {
      const transactionCollection = collection(
        this.firestore,
        'groups',
        groupId,
        'transactions'
      );
      const q = query(transactionCollection, where('from', '==', username));
      // getDocs ist hier nur für den initialen Snapshot, onSnapshot ist für Echtzeit
      const snapshot = await getDocs(q); // Initialer Snapshot

      const unsubscribe = onSnapshot(q, (snap) => {
        // onSnapshot für Echtzeit-Updates
        const transactions: Transactions[] = snap.docs.map((doc) => {
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

        transactions.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA; // Neueste zuerst
        });

        updateTransactionsCallback(transactions);
        console.log(
          'Echtzeit-Transaktionen (nach Datum sortiert):',
          transactions
        );
      });
      return unsubscribe;
    } catch (error) {
      console.error('Fehler beim Abrufen der Transaktionen:', error);
      throw new Error('Fehler beim Abrufen der Transaktionen');
    }
  }

  async getFilteredRelatedExpenses(
    groupId: string,
    relatedExpenseIds: string[],
    uid: string
  ): Promise<Expenses[]> {
    const filteredExpenses: Expenses[] = [];

    // Vermeide unnötige Abfragen, wenn keine IDs vorhanden sind
    if (!relatedExpenseIds || relatedExpenseIds.length === 0) {
      return [];
    }

    // Firestore `in` Abfragen sind auf 10 IDs beschränkt. Bei mehr muss geloopt werden.
    // Hier vereinfacht: Jede ID einzeln abfragen. Für Performance: Batches von 10.
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

        // Filtere die Ausgaben, bei denen der Benutzer noch nicht bezahlt hat UND amountToPay > 0 ist
        const hasUnpaidMember = expense.expenseMember.some(
          (member) =>
            member.memberId === uid && !member.paid && member.amountToPay > 0
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

  async makeTransactionById(
    groupId: string,
    expenseIds: string[], // Angepasst von `expenseId` zu `expenseIds` (Array)
    fromUid: string,
    transaction: Transactions
  ): Promise<Transactions | null> {
    try {
      const singleTransactionBatch = writeBatch(this.firestore); // Eigener Batch
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
        relatedExpenses: expenseIds, // Nutze das übergebene Array
      };
      const transactionRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      singleTransactionBatch.set(transactionRef, transactionData);

      // Aktualisiere Mitglieder-Beträge im Batch
      await this.updateMemberAmounts(
        singleTransactionBatch,
        groupId,
        transactionData,
        1
      );

      // Aktualisiere Balances im Batch
      await this.updateMemberBalancesOnTransaction(
        'addition',
        groupId,
        transactionData,
        transactionId,
        singleTransactionBatch
      );

      // Markiere zugehörige Ausgaben als bezahlt im Batch
      for (const expenseId of expenseIds) {
        // Schleife über alle IDs
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
          const updatedExpenseMembers = expense.expenseMember.map((member) => {
            // Nur den spezifischen Absender als bezahlt markieren
            if (member.memberId === fromUid) {
              return { ...member, paid: true };
            }
            return member;
          });
          singleTransactionBatch.update(expenseRef, {
            expenseMember: updatedExpenseMembers,
          });
        }
      }

      await singleTransactionBatch.commit(); // Batch committen
      console.log('Transaction added:', transactionId);
      return transactionData;
    } catch (error) {
      console.error('Fehler in makeTransactionById:', error);
      return null;
    }
  }

  async deleteTransactionsById(
    groupId: string,
    expenseId: string, // Hier ist es eine einzelne ID
    uid: string,
    transaction: Transactions,
    transactionId: string
  ) {
    try {
      const singleDeleteBatch = writeBatch(this.firestore); // Eigener Batch
      const transactionCollectionRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      singleDeleteBatch.delete(transactionCollectionRef);

      // Aktualisiere Mitglieder-Beträge im Batch (negativ)
      await this.updateMemberAmounts(
        singleDeleteBatch,
        groupId,
        transaction,
        -1
      );

      // Aktualisiere Balances im Batch (Deletion)
      await this.updateMemberBalancesOnTransaction(
        'deletion',
        groupId,
        transaction,
        transactionId,
        singleDeleteBatch
      );

      // Setze den "paid" Status in der Expense zurück (im Batch)
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expenseId
      );
      const expenseSnapshot = await getDoc(expenseRef); // Aktuelle Daten holen
      if (expenseSnapshot.exists()) {
        const expense = expenseSnapshot.data() as Expenses;
        const updatedExpenseMembers = expense.expenseMember.map((member) => {
          if (member.memberId === uid) {
            const { paid, ...rest } = member; // `paid` Eigenschaft entfernen
            return rest;
          }
          return member;
        });
        singleDeleteBatch.update(expenseRef, {
          expenseMember: updatedExpenseMembers,
        });
      } else {
        console.warn(`Expense with ID ${expenseId} not found.`);
      }

      await singleDeleteBatch.commit(); // Batch committen
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
    batch: WriteBatch, 
    groupId: string,
    transaction: { from: string; to: string; amount: number },
    sign: number
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (groupSnap.exists()) {
      const groupData = groupSnap.data();
      const members = [...(groupData['members'] || [])]; // Kopie erstellen

      // Update AmountPaid für den "from" Member
      const memberFromIndex = members.findIndex(
        (member: any) => member.uid === transaction.from
      );
      if (memberFromIndex !== -1) {
        members[memberFromIndex].countAmountPaid =
          (members[memberFromIndex].countAmountPaid || 0) + 1 * sign;
        members[memberFromIndex].sumAmountPaid =
          (members[memberFromIndex].sumAmountPaid || 0) +
          transaction.amount * sign;
      } else {
        console.warn(`Mitglied From (${transaction.from}) nicht gefunden.`);
      }

      // Update AmountReceived für den "to" Member
      const memberToIndex = members.findIndex(
        (member: any) => member.uid === transaction.to
      );
      if (memberToIndex !== -1) {
        members[memberToIndex].countAmountReceived =
          (members[memberToIndex].countAmountReceived || 0) + 1 * sign;
        members[memberToIndex].sumAmountReceived =
          (members[memberToIndex].sumAmountReceived || 0) +
          transaction.amount * sign;
      } else {
        console.warn(`Mitglied To (${transaction.to}) nicht gefunden.`);
      }

      batch.update(groupRef, { members: members }); // Update zum Batch hinzufügen
    } else {
      console.error(
        'Gruppe nicht gefunden beim Aktualisieren der Mitgliederbeträge.'
      );
    }
  }

  async updateMemberBalancesOnTransaction(
    action: 'addition' | 'deletion',
    groupId: string,
    currentTransaction: Transactions,
    newTransactionId: string,
    batch: WriteBatch // Nimmt einen Batch entgegen
  ): Promise<void> {
    currentTransaction.transactionId = newTransactionId; // Sicherstellen, dass die ID gesetzt ist

    const balancesRefCollection = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );
    const balancesQuery = query(
      balancesRefCollection,
      where('userAId', 'in', [currentTransaction.from, currentTransaction.to]),
      where('userBId', 'in', [currentTransaction.from, currentTransaction.to])
    );
    const snapshot = await getDocs(balancesQuery);

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const data = snapshot.docs[0].data() as Balances;
      const relatedTransactions = [...(data.relatedTransactionId || [])]; // Kopie des Arrays

      let newCreditA = data.userACredit;
      let newCreditB = data.userBCredit;
      let updatedTransactions: string[] = relatedTransactions;
      let balanceUpdates: {
        userACredit?: number;
        userBCredit?: number;
        relatedTransactionId?: string[];
      } = {};

      switch (action) {
        case 'addition':
          if (
            currentTransaction.from === data.userAId &&
            currentTransaction.to === data.userBId
          ) {
            newCreditA = data.userACredit + currentTransaction.amount;
            updatedTransactions.push(currentTransaction.transactionId);
            balanceUpdates = {
              userACredit: newCreditA,
              relatedTransactionId: updatedTransactions,
            };
          } else if (
            currentTransaction.from === data.userBId &&
            currentTransaction.to === data.userAId
          ) {
            newCreditB = data.userBCredit + currentTransaction.amount;
            updatedTransactions.push(currentTransaction.transactionId);
            balanceUpdates = {
              userBCredit: newCreditB,
              relatedTransactionId: updatedTransactions,
            };
          }
          break;
        case 'deletion':
          if (
            currentTransaction.from === data.userAId &&
            currentTransaction.to === data.userBId
          ) {
            newCreditA = data.userACredit - currentTransaction.amount;
            updatedTransactions = relatedTransactions.filter(
              (id) => id !== currentTransaction.transactionId
            );
            balanceUpdates = {
              userACredit: newCreditA,
              relatedTransactionId: updatedTransactions,
            };
          } else if (
            currentTransaction.from === data.userBId &&
            currentTransaction.to === data.userAId
          ) {
            newCreditB = data.userBCredit - currentTransaction.amount;
            updatedTransactions = relatedTransactions.filter(
              (id) => id !== currentTransaction.transactionId
            );
            balanceUpdates = {
              userBCredit: newCreditB,
              relatedTransactionId: updatedTransactions,
            };
          }
          break;
      }
      batch.update(docRef, balanceUpdates); // Update zum Batch hinzufügen
      console.log(`Balance für ${docRef.id} im Batch aktualisiert.`);
    } else {
      console.error(
        `Balance between ${currentTransaction.from} and ${currentTransaction.to} doesn't exist.`
      );
      // Wenn eine Balance nicht existiert, aber eine Transaktion hinzugefügt/gelöscht werden soll,
      // könnte das auf einen Datenfehler hindeuten.
    }
  }

  async markMembersAsPaid(
    groupId: string,
    expenseId: string,
    uid?: string
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

        const updatedExpenseMembers = expense.expenseMember.map((member) => {
          if (!uid || member.memberId === uid) {
            return { ...member, paid: true };
          }
          return member;
        });

        await setDoc(
          expenseRef,
          { expenseMember: updatedExpenseMembers },
          { merge: true }
        );

        console.log(
          `Expense ${expenseId} updated: Member ${uid || 'all'} marked as paid.`
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

  async settleDebtWithOneMember(
    groupId: string,
    fromUid: string,
    toUid: string,
    amount: number,
    reason: string,
    relatedExpenseIds: string[] // Liste der Expense IDs
  ) {
    try {
      const sdomBatch = writeBatch(this.firestore); // Eigener Batch
      const transactionId = doc(
        collection(this.firestore, 'groups', groupId, 'transactions')
      ).id;
      const transactionData: Transactions = {
        transactionId,
        from: fromUid,
        to: toUid,
        amount: amount,
        reason: reason,
        date: new Date().toISOString(),
        relatedExpenses: relatedExpenseIds, // Hier die IDs direkt übergeben
      };
      const transactionRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      sdomBatch.set(transactionRef, transactionData);

      // Aktualisiere Mitglieder-Beträge im Batch
      await this.updateMemberAmounts(sdomBatch, groupId, transactionData, 1);
      // Aktualisiere Balances im Batch
      await this.updateMemberBalancesOnTransaction(
        'addition',
        groupId,
        transactionData,
        transactionId,
        sdomBatch
      );

      // Markiere zugehörige Ausgaben als bezahlt (im Batch)
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
          const updatedExpenseMembers = expense.expenseMember.map((member) => {
            if (member.memberId === fromUid) {
              return { ...member, paid: true };
            }
            return member;
          });
          sdomBatch.update(expenseRef, {
            expenseMember: updatedExpenseMembers,
          });
        }
      }

      await sdomBatch.commit(); // Batch committen
      console.log(
        'Transaction added (settleDebtWithOneMember):',
        transactionId
      );
    } catch (error) {
      console.error('Fehler in settleDebtWithOneMember:', error);
      throw error; // Fehler weiterwerfen
    }
  }

  async getCalculatedGroupSettlementDebts(
    groupId: string
  ): Promise<DebtEntry[]> {
    try {
      const querySnapshot = await getDocs(
        collection(this.firestore, 'groups', groupId, 'balances')
      );

      const initialDebts: DebtEntry[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userAId = data['userAId'];
        const userBId = data['userBId'];
        const userACredit = data['userACredit'] || 0;
        const userBCredit = data['userBCredit'] || 0;
        const relatedExpenseId = data['relatedExpenseId'] || [];

        // Nur wenn es eine tatsächliche Netto-Schuld gibt
        if (userACredit > userBCredit) {
          initialDebts.push({
            from: userBId,
            to: userAId,
            amount: userACredit - userBCredit,
            relatedExpenses: relatedExpenseId,
          });
        } else if (userBCredit > userACredit) {
          initialDebts.push({
            from: userAId,
            to: userBId,
            amount: userBCredit - userACredit,
            relatedExpenses: relatedExpenseId,
          });
        }
      });
      console.log(
        'Initial aufbereitete Schulden für Berechnung:',
        initialDebts
      );

      const calculatedTransactions = this.schuldenAusgleichen(initialDebts);
      console.log(
        'Berechnete Ausgleichstransaktionen (minimiert):',
        calculatedTransactions
      );
      return calculatedTransactions;
    } catch (error) {
      console.error('Fehler beim Berechnen der Gruppenschulden:', error);
      throw new Error('Fehler beim Berechnen der Gruppenschulden');
    }
  }

  async settleDebtsForID(
    groupId: string,
    id: string
  ): Promise<DebtEntry[] | null> {
    try {
      const balancesRef = collection(
        this.firestore,
        'groups',
        groupId,
        'balances'
      );
      const snapshot = await getDocs(balancesRef);

      const debtList: DebtEntry[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userACredit = data['userACredit'] || 0;
        const userBCredit = data['userBCredit'] || 0;
        const relatedExpenseIds = data['relatedExpenseId'] || [];

        // Fall 1: Angefragter User (id) schuldet userBId
        if (data['userAId'] === id && userBCredit > userACredit) {
          const amount = userBCredit - userACredit;
          if (amount > 0) {
            debtList.push({
              from: id, // id schuldet
              to: data['userBId'], // an userBId
              amount: amount,
              relatedExpenses: relatedExpenseIds,
            });
          }
        }
        // Fall 2: userBId schuldet dem angefragten User (id)
        else if (data['userAId'] === id && userACredit > userBCredit) {
          const amount = userACredit - userBCredit;
          if (amount > 0) {
            debtList.push({
              from: data['userBId'], // userBId schuldet
              to: id, // an id
              amount: amount,
              relatedExpenses: relatedExpenseIds,
            });
          }
        }
        // Fall 3: Angefragter User (id) schuldet userAId
        else if (data['userBId'] === id && userACredit > userBCredit) {
          const amount = userACredit - userBCredit;
          if (amount > 0) {
            debtList.push({
              from: id, // id schuldet
              to: data['userAId'], // an userAId
              amount: amount,
              relatedExpenses: relatedExpenseIds,
            });
          }
        }
        // Fall 4: userAId schuldet dem angefragten User (id)
        else if (data['userBId'] === id && userBCredit > userACredit) {
          const amount = userBCredit - userACredit;
          if (amount > 0) {
            debtList.push({
              from: data['userAId'], // userAId schuldet
              to: id, // an id
              amount: amount,
              relatedExpenses: relatedExpenseIds,
            });
          }
        }
      });
      console.log('Direkte Schulden für ID:', id, debtList);
      return debtList;
    } catch (error) {
      console.error('Fehler beim Ermitteln der Schulden für ID:', error);
      return null;
    }
  }

  async executeSettlementTransactions(
    groupId: string,
    transactionsToExecute: DebtEntry[],
    isGroupSettlement: boolean
  ): Promise<void> {
    const batch = writeBatch(this.firestore);

    // Alle Balances-Dokumente vorab laden, um die Referenzen zu haben
    const allBalanceDocsSnapshot = await getDocs(
      collection(this.firestore, 'groups', groupId, 'balances')
    );

    // Map zur schnellen Suche von Balance-Dokumenten basierend auf User-Paaren
    const relevantBalanceDocs: Map<string, any> = new Map();
    allBalanceDocsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userAId = data['userAId'];
      const userBId = data['userBId'];
      relevantBalanceDocs.set(`${userAId}_${userBId}`, docSnap);
      relevantBalanceDocs.set(`${userBId}_${userAId}`, docSnap); // Unter beiden Schlüsseln speichern
    });

    const balanceDocRefsToReset: Set<any> = new Set(); // Set für eindeutige Balance-Refs, die auf 0 gesetzt werden

    // 1. Erstelle neue Transaktionsdokumente und füge zugehörige Updates zum Batch hinzu
    for (const trans of transactionsToExecute) {
      if (trans.amount > 0) {
        const transactionId = doc(
          collection(this.firestore, 'groups', groupId, 'transactions')
        ).id;
        const transactionData: Transactions = {
          transactionId,
          from: trans.from,
          to: trans.to,
          amount: trans.amount,
          reason: isGroupSettlement ? 'Gruppenausgleich' : 'Einzelausgleich',
          date: new Date().toISOString(),
          relatedExpenses: trans.relatedExpenses,
        };
        const transactionRef = doc(
          this.firestore,
          'groups',
          groupId,
          'transactions',
          transactionId
        );
        batch.set(transactionRef, transactionData);

        // 2. Aktualisiere Member Amounts im Batch
        await this.updateMemberAmounts(batch, groupId, transactionData, 1);

        // 3. Markiere die betroffenen Ausgaben als bezahlt im Batch
        for (const expenseId of trans.relatedExpenses) {
          const expenseRef = doc(
            this.firestore,
            'groups',
            groupId,
            'expenses',
            expenseId
          );
          const expenseSnapshot = await getDoc(expenseRef); // Aktuelle Daten holen
          if (expenseSnapshot.exists()) {
            const expense = expenseSnapshot.data() as Expenses;
            const updatedExpenseMembers = expense.expenseMember.map(
              (member) => {
                // Markiere den User, der die Schuld begleicht, als bezahlt. Das ist `trans.from`.
                if (member.memberId === trans.from) {
                  return { ...member, paid: true };
                }
                return member;
              }
            );
            batch.update(expenseRef, { expenseMember: updatedExpenseMembers });
          }
        }

        // Füge die Balance-Dokument-Referenz zum Set hinzu, das zurückgesetzt werden soll
        const balanceDocKey = `${trans.from}_${trans.to}`;
        const reverseBalanceDocKey = `${trans.to}_${trans.from}`;
        const balanceDoc =
          relevantBalanceDocs.get(balanceDocKey) ||
          relevantBalanceDocs.get(reverseBalanceDocKey);
        if (balanceDoc) {
          balanceDocRefsToReset.add(balanceDoc.ref);
        }
      }
    }

    // 4. Balances auf Null setzen (abhängig vom Ausgleichstyp)
    if (isGroupSettlement) {
      // Bei Gruppenausgleich: Alle Balances auf Null setzen
      allBalanceDocsSnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          userACredit: 0,
          userBCredit: 0,
          relatedExpenseId: [],
        });
      });
    } else {
      // Bei Einzelausgleich: Nur die tatsächlich von den Transaktionen betroffenen Balances auf Null setzen
      for (const balRef of balanceDocRefsToReset) {
        batch.update(balRef, {
          userACredit: 0,
          userBCredit: 0,
          relatedExpenseId: [],
        });
      }
    }

    await batch.commit(); // Alle gesammelten Operationen atomar ausführen
    console.log(
      'Schuldenausgleichstransaktionen erfolgreich ausgeführt und Member Amounts aktualisiert.'
    );
  }

  /**
   * Private Hilfsfunktion: Berechnet die minimalen Ausgleichstransaktionen aus einer Liste von Schulden.
   * Diese Funktion ist das Herzstück des Algorithmus und führt KEINE Datenbankoperationen durch.
   * @param initialDebts Die initiale Liste der Schulden.
   * @returns Eine Liste der optimierten Transaktionen.
   */
  private schuldenAusgleichen(initialDebts: DebtEntry[]): DebtEntry[] {
    const nettoSchulden: Record<
      string,
      { amount: number; expenses: Set<string> }
    > = {};

    // Initialisiere nettoSchulden: Addiere/Subtrahiere Beträge und sammele Expense-IDs
    for (const debt of initialDebts) {
      nettoSchulden[debt.from] = nettoSchulden[debt.from] || {
        amount: 0,
        expenses: new Set(),
      };
      nettoSchulden[debt.to] = nettoSchulden[debt.to] || {
        amount: 0,
        expenses: new Set(),
      };

      nettoSchulden[debt.from].amount -= debt.amount;
      nettoSchulden[debt.to].amount += debt.amount;

      debt.relatedExpenses.forEach((expenseId) => {
        nettoSchulden[debt.from].expenses.add(expenseId);
        nettoSchulden[debt.to].expenses.add(expenseId);
      });
    }

    // Trenne in Gläubiger und Schuldner und sortiere sie
    const glaeubiger = Object.entries(nettoSchulden)
      .filter(([, data]) => data.amount > 0)
      .sort(([, a], [, b]) => b.amount - a.amount);

    const schuldner = Object.entries(nettoSchulden)
      .filter(([, data]) => data.amount < 0)
      .sort(([, a], [, b]) => a.amount - b.amount);

    const ausgleichTransaktionen: DebtEntry[] = [];

    let i = 0;
    let j = 0;

    // Führe den Ausgleichs-Algorithmus aus
    while (i < schuldner.length && j < glaeubiger.length) {
      let [schuldnerId, schuldData] = schuldner[i];
      let [glaeubigerId, glaeubigerData] = glaeubiger[j];

      const ausgleichsBetrag = Math.min(
        -schuldData.amount, // Schuld ist negativ, daher negieren
        glaeubigerData.amount
      );

      // Sammle alle relevanten Expense-IDs für diese aggregierte Transaktion
      const mergedRelatedExpenses = new Set<string>();
      schuldData.expenses.forEach((exp) => mergedRelatedExpenses.add(exp));
      glaeubigerData.expenses.forEach((exp) => mergedRelatedExpenses.add(exp));

      if (ausgleichsBetrag > 0) {
        ausgleichTransaktionen.push({
          from: schuldnerId,
          to: glaeubigerId,
          amount: ausgleichsBetrag,
          relatedExpenses: Array.from(mergedRelatedExpenses),
        });
      }

      // Aktualisiere die verbleibenden Netto-Beträge
      schuldData.amount += ausgleichsBetrag;
      glaeubigerData.amount -= ausgleichsBetrag;

      // Gehe zum nächsten Schuldner/Gläubiger, wenn sie ausgeglichen sind
      if (schuldData.amount === 0) {
        i++;
      }
      if (glaeubigerData.amount === 0) {
        j++;
      }
    }
    return ausgleichTransaktionen;
  }
}
