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
  updateDoc,
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

    if (!relatedExpenseIds || relatedExpenseIds.length === 0) {
      return [];
    }

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
    expenseIds: string[],
    fromUid: string,
    transaction: Transactions
  ): Promise<Transactions | null> {
    try {
      const singleTransactionBatch = writeBatch(this.firestore);
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
        relatedExpenses: expenseIds,
        isSettlement: transaction.isSettlement,
      };
      const transactionRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      singleTransactionBatch.set(transactionRef, transactionData);

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

  //Lösche die Transaktion bei einer bestimmten ID
  async deleteTransactionsById(
    groupId: string,
    expenseId: string,
    uid: string,
    transaction: Transactions,
    transactionId: string
  ) {
    try {
      const singleDeleteBatch = writeBatch(this.firestore);
      const transactionCollectionRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      singleDeleteBatch.delete(transactionCollectionRef);

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

  //Markiert bestimmte Member als paid
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

  //Hier wird nur die Schuld mit einem Bestimmten Mitglied beglichen
  async settleDebtWithOneMember(
    groupId: string,
    fromUid: string,
    toUid: string,
    amount: number,
    reason: string,
    relatedExpenseIds: string[]
  ) {
    try {
      const batch = writeBatch(this.firestore);
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
        relatedExpenses: relatedExpenseIds,
        isSettlement: true,
      };
      const transactionRef = doc(
        this.firestore,
        'groups',
        groupId,
        'transactions',
        transactionId
      );
      batch.set(transactionRef, transactionData);

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
            if (member.memberId === fromUid || member.memberId === toUid) {
              return { ...member, paid: true };
            }
            return member;
          });
          batch.update(expenseRef, {
            expenseMember: updatedExpenseMembers,
            merge: true,
          });
        }
      }

      const balancesRef = collection(
        this.firestore,
        'groups',
        groupId,
        'balances'
      );
      const q1 = query(
        balancesRef,
        where('userAId', '==', fromUid),
        where('userBId', '==', toUid)
      );
      const q2 = query(
        balancesRef,
        where('userAId', '==', toUid),
        where('userBId', '==', fromUid)
      );
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      for (const snap of [snap1, snap2]) {
        snap.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            userACredit: 0,
            userBCredit: 0,
            relatedExpenseId: [],
          });
        });
      }

      await batch.commit();
      console.log('Schulden zwischen', fromUid, 'und', toUid, 'ausgeglichen.');
    } catch (error) {
      console.error('Fehler in settleDebtWithOneMember:', error);
      throw error;
    }
  }

  //Hole die Schulden für den großen Gruppenausgleich
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

        // Hier sammeln wir alle direkten Schulden in beide Richtungen
        // Diese werden später vom schuldenAusgleichen-Algorithmus verrechnet
        if (userACredit > 0) {
          initialDebts.push({
            from: userBId,
            to: userAId,
            amount: userACredit,
            relatedExpenses: relatedExpenseId,
          });
        }
        if (userBCredit > 0) {
          initialDebts.push({
            from: userAId,
            to: userBId,
            amount: userBCredit,
            relatedExpenses: relatedExpenseId,
          });
        }
      });
      console.log(
        'Initial aufbereitete Schulden für Gruppen-Berechnung:',
        initialDebts
      );

      // Den generischen Schuldenausgleich-Algorithmus auf alle Schulden anwenden
      const calculatedTransactions = this.schuldenAusgleichen(initialDebts);
      console.log(
        'Berechnete Ausgleichstransaktionen (minimiert, Gruppe):',
        calculatedTransactions
      );
      return calculatedTransactions;
    } catch (error) {
      console.error('Fehler beim Berechnen der Gruppenschulden:', error);
      throw new Error('Fehler beim Berechnen der Gruppenschulden');
    }
  }

  //Hole die Schulden bei einem Persönlichen Ausgleich mit allen anderen Mitgliedern
  async getCalculatedPersonalSettlementDebts(
    groupId: string,
    userId: string
  ): Promise<DebtEntry[]> {
    try {
      // 1. Sammle alle relevanten Balances, die den userId betreffen
      const balancesRef = collection(
        this.firestore,
        'groups',
        groupId,
        'balances'
      );
      // Hole Balances, wo userId als userAId beteiligt ist
      const querySnapshotA = await getDocs(
        query(balancesRef, where('userAId', '==', userId))
      );
      // Hole Balances, wo userId als userBId beteiligt ist
      const querySnapshotB = await getDocs(
        query(balancesRef, where('userBId', '==', userId))
      );

      // Kombiniere und dedupliziere die Ergebnisse
      const relevantBalances = new Map<string, Balances>();
      querySnapshotA.forEach((doc) =>
        relevantBalances.set(doc.id, doc.data() as Balances)
      );
      querySnapshotB.forEach((doc) =>
        relevantBalances.set(doc.id, doc.data() as Balances)
      );

      const nettoPositionen: Record<
        string,
        { amount: number; expenses: Set<string> }
      > = {};

      relevantBalances.forEach((balance) => {
        const u1 = balance.userAId;
        const u2 = balance.userBId;
        const credit1 = balance.userACredit || 0;
        const credit2 = balance.userBCredit || 0;
        const relatedExpenses = balance.relatedExpenseId || [];

        // Initialisiere Einträge, falls nicht vorhanden
        nettoPositionen[u1] = nettoPositionen[u1] || {
          amount: 0,
          expenses: new Set(),
        };
        nettoPositionen[u2] = nettoPositionen[u2] || {
          amount: 0,
          expenses: new Set(),
        };

        // Verrechne die bilateralen Schulden in eine Netto-Position
        nettoPositionen[u1].amount += credit1 - credit2; // u1 bekommt von u2 (credit1) und schuldet u2 (credit2)
        nettoPositionen[u2].amount += credit2 - credit1; // u2 bekommt von u1 (credit2) und schuldet u1 (credit1)

        // Füge Expenses hinzu
        relatedExpenses.forEach((expId) => {
          nettoPositionen[u1].expenses.add(expId);
          nettoPositionen[u2].expenses.add(expId);
        });
      });

      console.log(
        'Netto-Positionen aller Beteiligten für persönlichen Ausgleich:',
        nettoPositionen
      );

      const userNettoSaldo = nettoPositionen[userId]?.amount || 0;

      // Wenn der User insgesamt Geld bekommen würde oder ausgeglichen ist, braucht er nichts zu zahlen.
      if (userNettoSaldo >= 0) {
        console.log(
          `Benutzer ${userId} hat positive oder ausgeglichene Netto-Position (${userNettoSaldo}). Keine Zahlungen erforderlich.`
        );
        return [];
      }

      const glaeubigerDesUsers = Object.entries(nettoPositionen).filter(
        ([id, data]) => id !== userId && data.amount > 0
      );

      // Künstlicher Schuldner-Eintrag für den `userId`
      let userAsSchuldner: { amount: number; expenses: Set<string> } = {
        amount: userNettoSaldo, // Negativer Betrag
        expenses: nettoPositionen[userId]?.expenses || new Set(),
      };

      const personalOptimizedDebts: DebtEntry[] = [];

      for (const [glaeubigerId, glaeubigerData] of glaeubigerDesUsers) {
        if (userAsSchuldner.amount >= 0) break; // User hat seine Schulden beglichen

        const betragFuerTransaktion = Math.min(
          -userAsSchuldner.amount,
          glaeubigerData.amount
        );

        if (betragFuerTransaktion > 0) {
          // Merge Expenses vom User und dem aktuellen Gläubiger
          const mergedExpenses = new Set<string>();
          userAsSchuldner.expenses.forEach((exp) => mergedExpenses.add(exp));
          glaeubigerData.expenses.forEach((exp) => mergedExpenses.add(exp));

          personalOptimizedDebts.push({
            from: userId,
            to: glaeubigerId,
            amount: betragFuerTransaktion,
            relatedExpenses: Array.from(mergedExpenses),
          });

          userAsSchuldner.amount += betragFuerTransaktion; // Schuld des Users reduzieren
          glaeubigerData.amount -= betragFuerTransaktion; // Gutschrift des Gläubigers reduzieren
        }
      }

      console.log(
        'Optimierte persönliche Schulden für ' + userId + ':',
        personalOptimizedDebts
      );
      return personalOptimizedDebts;
    } catch (error) {
      console.error(
        'Fehler beim Berechnen des persönlichen Ausgleichs:',
        error
      );
      throw new Error('Fehler beim Berechnen des persönlichen Ausgleichs');
    }
  }

  //Gruppen/Persönlicher Ausgleich
  async executeSettlementTransactions(
    groupId: string,
    transactionsToExecute: DebtEntry[],
    settlementType: 'group' | 'personal'
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
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
      relevantBalanceDocs.set(`${userBId}_${userAId}`, docSnap);
    });

    const balanceDocRefsToReset: Set<any> = new Set();

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
          reason: `Ausgleich (${
            settlementType === 'group' ? 'Gruppe' : 'Persönlich'
          })`,
          date: new Date().toISOString(),
          relatedExpenses: trans.relatedExpenses,
          isSettlement: true,
        };
        const transactionRef = doc(
          this.firestore,
          'groups',
          groupId,
          'transactions',
          transactionId
        );
        batch.set(transactionRef, transactionData);

        if (settlementType === 'group') {
          for (const expenseId of trans.relatedExpenses) {
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
              // ALLE Mitglieder als bezahlt markieren
              const updatedExpenseMembers = expense.expenseMember.map(
                (member) => ({ ...member, paid: true })
              );
              batch.update(expenseRef, {
                expenseMember: updatedExpenseMembers,
              });
            }
          }
        } else {
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
              batch.update(expenseRef, {
                expenseMember: updatedExpenseMembers,
              });
            }
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
    if (settlementType === 'group') {
      // Bei Gruppenausgleich: Alle Balances auf Null setzen
      allBalanceDocsSnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          userACredit: 0,
          userBCredit: 0,
          relatedExpenseId: [],
        });
      });
    } else {
      // Bei persönlichem Ausgleich: Nur die tatsächlich von den Transaktionen betroffenen Balances auf Null setzen
      for (const balRef of balanceDocRefsToReset) {
        batch.update(balRef, {
          userACredit: 0,
          userBCredit: 0,
          relatedExpenseId: [],
        });
      }
    }

    await batch.commit();

    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      let members = groupData['members'];

      for (const trans of transactionsToExecute) {
        const settlerMember = members.find((m: any) => m.uid === trans.from);
        const payerMember = members.find((m: any) => m.uid === trans.to);
        if (settlementType === 'group') {
          if (settlerMember && payerMember) {
            settlerMember.sumAmountPaid = 0;
            settlerMember.sumExpenseMemberAmount = 0;
            settlerMember.sumExpenseAmount = 0;
            settlerMember.sumAmountReceived = 0;
            settlerMember.countAmountPaid += 1;
            payerMember.sumAmountReceived = 0;
            payerMember.sumAmountPaid = 0;
            payerMember.sumExpenseMemberAmount = 0;
            payerMember.sumExpenseAmount = 0;
            payerMember.countAmountReceived += 1;

            // Update members array
            members = members.map((member: any) => {
              if (member.uid === trans.from) return settlerMember;
              if (member.uid === trans.to) return payerMember;
              return member;
            });
          }
        } else {
          if (settlerMember && payerMember) {
            settlerMember.sumAmountPaid += trans.amount;
            settlerMember.countAmountPaid += 1;
            payerMember.sumAmountReceived += trans.amount;
            payerMember.countAmountReceived += 1;

            // Update members array
            members = members.map((member: any) => {
              if (member.uid === trans.from) return settlerMember;
              if (member.uid === trans.to) return payerMember;
              return member;
            });
          }
        }
          
      }

      await updateDoc(groupRef, { members });
      console.log('Updated member sums for all executed settlements.');
    }
    console.log(
      'Schuldenausgleichstransaktionen erfolgreich ausgeführt und Member Amounts aktualisiert.'
    );
  }

  //Smarte SchuldenausgleichsBERECHNUNG
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

  // Die Schuld pro einzelne AUsgabe begleichen
  async settleDebtByExpense(
    settlerId: string,
    groupId: string,
    expenseId: string
  ): Promise<void> {
    try {
      // 1. Hol dir die Expense-Daten als Expenses Objekt
      const groupRef = doc(this.firestore, 'groups', groupId);
      const expenseRef = doc(groupRef, 'expenses', expenseId);
      const expenseSnapshot = await getDoc(expenseRef);
      if (!expenseSnapshot.exists()) {
        throw new Error(`Expense with ID ${expenseId} does not exist.`);
      }
      const expenseData = expenseSnapshot.data() as Expenses;
      // 2.1. Überprüfe, ob der Betrag der überwiesen wird nicht höher ist als die Bilanz zwischen dem Settler und dem Ausgaben-Payer
      const settlerExpenseMember = expenseData.expenseMember.find(
        (member) => member.memberId === settlerId
      );
      if (!settlerExpenseMember) {
        throw new Error(
          `Settler with ID ${settlerId} is not part of the expense.`
        );
      }
      const balancesRef = collection(
        this.firestore,
        `groups/${groupId}/balances`
      );
      const payerId = expenseData.paidBy;
      const q1 = query(
        balancesRef,
        where('userAId', '==', settlerId),
        where('userBId', '==', payerId)
      );
      const q2 = query(
        balancesRef,
        where('userAId', '==', payerId),
        where('userBId', '==', settlerId)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      let balanceDoc = null;
      let balanceData = null;

      if (!snap1.empty) {
        balanceDoc = snap1.docs[0];
        balanceData = balanceDoc.data() as Balances;
      } else if (!snap2.empty) {
        balanceDoc = snap2.docs[0];
        balanceData = balanceDoc.data() as Balances;
      } else {
        throw new Error(
          `No balance found between ${settlerId} and ${payerId}.`
        );
      }

      console.log(`Balance between ${settlerId} and ${payerId}:`, balanceData);
      const balance = Math.abs(
        balanceData.userACredit - balanceData.userBCredit
      );
      if (balance < settlerExpenseMember.amountToPay) {
        throw new Error(
          `Amount ${settlerExpenseMember.amountToPay} exceeds ${balance}, the balance between ${settlerId} and ${payerId}. Settle your balance with this user instead.`
        );
      } else {
        // 2.2. Wenn der Betrag in Ordnung ist, dann erstelle die Transaktion
        const transactionId = doc(collection(groupRef, 'transactions')).id;
        const transactionData: Transactions = {
          transactionId,
          from: settlerId,
          to: expenseData.paidBy,
          amount: settlerExpenseMember.amountToPay,
          reason: `Schuldenbegleichung für Expense ${expenseId}`,
          date: new Date().toISOString(),
          relatedExpenses: [expenseId],
          isSettlement: true,
        };
        const transactionRef = doc(groupRef, 'transactions', transactionId);
        await setDoc(transactionRef, transactionData);
        // 3. Markiere die Expense als bezahlt für den Settler
        const updatedExpenseMembers = expenseData.expenseMember.map(
          (member) => {
            if (member.memberId === settlerId) {
              return { ...member, paid: true };
            }
            return member;
          }
        );
        await setDoc(
          expenseRef,
          { expenseMember: updatedExpenseMembers },
          { merge: true }
        );
        console.log(
          `Debt settled for ${settlerId} on expense ${expenseId} with amount ${settlerExpenseMember.amountToPay}. Doc path: ${expenseRef.path}`
        );
        // 4. Update die Member Sums bei den betroffenen Benutzern
        const groupDoc = await getDoc(groupRef);
        if (!groupDoc.exists()) {
          throw new Error(`Group with ID ${groupId} does not exist.`);
        }
        const groupData = groupDoc.data();
        const settlerMember = groupData['members'].find(
          (member: any) => member.uid === settlerId
        );
        const payerMember = groupData['members'].find(
          (member: any) => member.uid === payerId
        );
        if (settlerMember && payerMember) {
          settlerMember.sumAmountPaid += settlerExpenseMember.amountToPay;
          settlerMember.countAmountPaid += 1;
          payerMember.sumAmountReceived += settlerExpenseMember.amountToPay;
          payerMember.countAmountReceived += 1;
          groupData['members'] = groupData['members'].map((member: any) => {
            if (member.uid === settlerId) {
              return settlerMember;
            } else if (member.uid === payerId) {
              return payerMember;
            }
            return member;
          });
          await updateDoc(groupRef, {
            members: groupData['members'],
          });
          console.log(`Updated member sums for ${settlerId} and ${payerId}.`);
        }
        // 5. Dekrementiere den UserCredit des Payers in dem zugehörigen Balance-Dokument UND entferne die Expense ID aus dem Balance-Dokument
        if (
          balanceData.userAId == payerId &&
          balanceData.userBId == settlerId
        ) {
          balanceData.userACredit -= settlerExpenseMember.amountToPay;
          balanceData.relatedExpenseId = balanceData.relatedExpenseId.filter(
            (id: string) => id !== expenseId
          );
          console.log('Updating balanceDoc:', {
            path: balanceDoc.ref.path,
            userACredit: balanceData.userACredit,
            userBCredit: balanceData.userBCredit,
            relatedExpenseId: balanceData.relatedExpenseId,
          });
          await setDoc(balanceDoc.ref, balanceData, { merge: true });
          console.log(
            `UserB pays ${
              settlerExpenseMember.amountToPay
            }, UserA receives. Balance is now ${Math.abs(
              balanceData.userACredit - balanceData.userBCredit
            )}`
          );
        } else if (
          balanceData.userAId == settlerId &&
          balanceData.userBId == payerId
        ) {
          balanceData.userBCredit -= settlerExpenseMember.amountToPay;
          balanceData.relatedExpenseId = balanceData.relatedExpenseId.filter(
            (id: string) => id !== expenseId
          );
          console.log('Updating balanceDoc:', {
            path: balanceDoc.ref.path,
            userACredit: balanceData.userACredit,
            userBCredit: balanceData.userBCredit,
            relatedExpenseId: balanceData.relatedExpenseId,
          });
          await updateDoc(balanceDoc.ref, {
            userBCredit: balanceData.userBCredit,
            relatedExpenseId: balanceData.relatedExpenseId,
          });
          console.log(
            `UserA pays ${
              settlerExpenseMember.amountToPay
            }, UserB receives. Balance is now ${Math.abs(
              balanceData.userACredit - balanceData.userBCredit
            )}`
          );
        }
      }
    } catch (error) {
      console.error('Fehler in settleDebtByExpense:', error);
      throw error;
    }
  }
}
