import { Injectable } from '@angular/core';
import { Expenses } from './objects/Expenses';
import {
  collection,
  deleteDoc,
  Firestore,
  getDocs,
  updateDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  writeBatch,
  addDoc,
} from '@angular/fire/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { inject } from '@angular/core';
import { ExpenseMember } from './objects/ExpenseMember';
import { Groups } from './objects/Groups';
import { Members } from './objects/Members';
import { Balances } from './objects/Balances';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private firestore = inject(Firestore);

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
        throw new Error(
          'Ein oder mehrere Pflichtfelder fehlen bei expenseData'
        );
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
        date: expenseData.date,
        currency: expenseData.currency,
        category: expenseData.category || '',
        invoice: expenseData.invoice || '',
        repeat: expenseData.repeat,
        splitType: expenseData.splitType,
        splitBy: expenseData.splitBy,
        expenseMember: expenseMembersData, // → wird 1:1 übernommen, inkl. paidBy & products
      };

      // In Firestore speichern
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expense.expenseId
      );
      await setDoc(expenseRef, expense);

      /*
      //Felder in der Collection "Members" aktualisieren:

      //1. Sich das Dokument der Gruppe holen
      const groupRef = await getDoc(doc(this.firestore, 'groups', groupId));
      //2. Den Inhalt in einem Objekt speichern
      const groupData = groupRef.data() as Groups;
      //3. Die Mitglieder-Array durchlaufen und die Felder aktualisieren, die mit der Summe der Ausgaben zu tun haben (initialisieren wenn's sie nicht gibt)
      for (const member of groupData.members) {
        for (const expenseMember of expenseMembersData) {
          if (expenseMember.memberId === member.uid) {
            if (expenseMember.memberId === expense.paidBy) {
              member.sumExpenseAmount += expense.totalAmount;
              member.sumExpenseMemberAmount +=
                expense.totalAmount - expenseMember.amountToPay;
              //sumAmountReceived
            } else {
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

       */

      await this.updateMemberSumsOnNewExpense(groupId, expense);

      const groupRef = await getDoc(doc(this.firestore, 'groups', groupId));
      const groupData = groupRef.data() as Groups;
      await this.initializeBalancesIfNotExist(groupId, groupData.members);
      await this.updateBalancesOnNewExpense(groupId, expense);

      return expense;
    } catch (error) {
      console.error('Fehler beim Erstellen der Ausgabe: ', error);
      return null;
    }
  }

  async updateExpense(
    expenseId: string,
    updatedExpenseData: Expenses,
    updatedExpenseMembersData: ExpenseMember[],
    groupId: string
  ): Promise<void> {
    try {
      // Pflichtfelder prüfen
      if (
        !updatedExpenseData.description ||
        updatedExpenseData.totalAmount === undefined ||
        !updatedExpenseData.paidBy ||
        !updatedExpenseData.currency ||
        !updatedExpenseData.repeat ||
        !updatedExpenseData.splitType ||
        !updatedExpenseData.splitBy
      ) {
        throw new Error(
          'Ein oder mehrere Pflichtfelder fehlen bei updatedExpenseData'
        );
      }

      // Referenz zur bestehenden Ausgabe
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expenseId
      );
      const expenseSnapshot = await getDoc(expenseRef);
      if (!expenseSnapshot.exists()) {
        throw new Error(`Expense mit ID ${expenseId} existiert nicht.`);
      }

      const oldExpense = expenseSnapshot.data() as Expenses;

      // Gruppendokument abrufen
      const groupRef = await getDoc(doc(this.firestore, 'groups', groupId));
      const groupData = groupRef.data() as Groups;

      // Mitglieder-Array aktualisieren: Alte Werte entfernen
      for (const member of groupData.members) {
        for (const expenseMember of oldExpense.expenseMember) {
          if (expenseMember.memberId === member.uid) {
            if (expenseMember.memberId === oldExpense.paidBy) {
              member.sumExpenseAmount -= oldExpense.totalAmount;
              member.sumExpenseMemberAmount -=
                oldExpense.totalAmount - expenseMember.amountToPay;
            } else {
              member.sumExpenseAmount += expenseMember.amountToPay;
            }
            member.countExpenseAmount -= 1;
            member.countExpenseMemberAmount -= 1;
          }
        }
      }

      // Mitglieder-Array aktualisieren: Neue Werte hinzufügen
      for (const member of groupData.members) {
        for (const expenseMember of updatedExpenseMembersData) {
          if (expenseMember.memberId === member.uid) {
            if (expenseMember.memberId === updatedExpenseData.paidBy) {
              member.sumExpenseAmount += updatedExpenseData.totalAmount;
              member.sumExpenseMemberAmount +=
                updatedExpenseData.totalAmount - expenseMember.amountToPay;
            } else {
              member.sumExpenseAmount -= expenseMember.amountToPay;
            }
            member.countExpenseAmount += 1;
            member.countExpenseMemberAmount += 1;
          }
        }
      }

      // Gruppendokument aktualisieren
      const groupDocRef = doc(this.firestore, 'groups', groupId);
      await updateDoc(groupDocRef, {
        members: groupData.members, // Aktualisiere das Mitglieder-Array
      });

      // Aktualisierte Ausgabe in Firestore speichern
      const updatedExpense: Expenses = {
        ...updatedExpenseData,
        expenseId,
        expenseMember: updatedExpenseMembersData, // Aktualisierte Mitglieder
      };
      await updateDoc(expenseRef, { ...updatedExpense });

      console.log(`Expense mit ID ${expenseId} erfolgreich aktualisiert.`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Ausgabe: ', error);
    }
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    const expensesRef = doc(
      this.firestore,
      'groups',
      groupId,
      'expenses',
      expenseId
    );
    await deleteDoc(expensesRef);
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
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expenseId
      );

      const unsubscribe = onSnapshot(expenseRef, (expenseDoc) => {
        if (expenseDoc.exists()) {
          const expense = {
            expenseId: expenseDoc.id,
            ...expenseDoc.data(),
          } as Expenses;
          updateExpenseCallback(expense);
        } else {
          console.error(
            `Expense with ID ${expenseId} not found in group ${groupId}`
          );
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

  //Calculation Methods
  // Berechnet die Balance basierend auf den Ausgaben
  calculateBalance(expenses: Expenses[]): { total: number; count: number } {
    let total = 0;
    let count = 0;
    for (const expense of expenses) {
      total += expense.totalAmount || 0;
      count++;
    }
    console.log('Balance wird berechnet:', { total, count });
    return { total, count };
  }

  async updateSums(
    groupId: string,
    sum: number,
    count: number,
    dbSumField: string,
    dbCountField: string
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);
    if (groupSnapshot.exists()) {
      const groupData = groupSnapshot.data();
      const currentSum = groupData?.[dbSumField] || 0;
      const currentCount = groupData?.[dbCountField] || 0;

      if (currentSum !== sum) {
        await setDoc(
          groupRef,
          { [dbSumField]: sum },
          { merge: true } // Nur das Feld sumTotalExpenses aktualisieren
        );
        console.log('sumTotalExpenses erfolgreich aktualisiert.');
      } else {
        console.log('sumTotalExpenses ist bereits aktuell.');
      }

      if (currentCount !== count) {
        await setDoc(
          groupRef,
          { [dbCountField]: count },
          { merge: true } // Nur das Feld sumTotalExpenses aktualisieren
        );
        console.log('countTotalExpenses erfolgreich aktualisiert.');
      } else {
        console.log('countTotalExpenses ist bereits aktuell.');
      }
    } else {
      console.error(`Gruppe mit der ID ${groupId} nicht gefunden.`);
    }
  }
  catch(e: any) {
    console.error('Fehler beim Synchronisieren von sumTotalExpenses:', e);
  }

  async updateMemberSumsOnNewExpense(
    groupId: string,
    expense: Expenses
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);
    if (!groupSnapshot.exists()) return;

    const groupData = groupSnapshot.data() as Groups;
    const updatedMembers = [...groupData.members];

    for (const memberData of expense.expenseMember) {
      const member = updatedMembers.find((m) => m.uid === memberData.memberId);
      if (!member) continue;

      // Wenn das Mitglied die Ausgabe bezahlt hat
      if (member.uid === expense.paidBy) {
        const amountForOthers = expense.totalAmount - memberData.amountToPay;

        member.sumExpenseAmount += amountForOthers;
        member.countExpenseAmount += 1;
      } else {
        // Das Mitglied hat nichts bezahlt, sondern war beteiligt
        member.sumExpenseMemberAmount += memberData.amountToPay;
        member.countExpenseMemberAmount += 1;
      }
    }

    // Mitglieder updaten
    await updateDoc(groupRef, {
      members: updatedMembers,
    });

    console.log('Mitgliedssummen wurden inkrementell aktualisiert.');
    console.log('Mitglieder:', updatedMembers);
  }

  async updateMemberSumsOnDeleteExpense(
    groupId: string,
    expense: Expenses
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);
    if (!groupSnapshot.exists()) return;

    const groupData = groupSnapshot.data() as Groups;
    const updatedMembers = [...groupData.members];

    for (const memberData of expense.expenseMember) {
      const member = updatedMembers.find((m) => m.uid === memberData.memberId);
      if (!member) continue;

      // Wenn das Mitglied die Ausgabe bezahlt hat
      if (member.uid === expense.paidBy) {
        const amountForOthers = expense.totalAmount - memberData.amountToPay;

        member.sumExpenseAmount = Math.max(
          0,
          member.sumExpenseAmount - amountForOthers
        );
        member.countExpenseAmount = Math.max(0, member.countExpenseAmount - 1);
      } else {
        // Das Mitglied war beteiligt, aber hat nicht bezahlt
        member.sumExpenseMemberAmount = Math.max(
          0,
          member.sumExpenseMemberAmount - memberData.amountToPay
        );
        member.countExpenseMemberAmount = Math.max(
          0,
          member.countExpenseMemberAmount - 1
        );
      }
    }

    await updateDoc(groupRef, {
      members: updatedMembers,
    });

    console.log('Mitgliedssummen nach Löschung einer Ausgabe aktualisiert.');
  }

  async updateMemberSumsOnPayment(
    groupId: string,
    payerId: string,
    receiverId: string,
    amount: number
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);
    if (!groupSnapshot.exists()) return;

    const groupData = groupSnapshot.data() as Groups;
    const updatedMembers = [...groupData.members];

    const payer = updatedMembers.find((m) => m.uid === payerId);
    const receiver = updatedMembers.find((m) => m.uid === receiverId);
    if (!payer || !receiver) return;

    payer.sumAmountPaid += amount;
    payer.countAmountPaid += 1;

    receiver.sumAmountReceived += amount;
    receiver.countAmountReceived += 1;

    await updateDoc(groupRef, {
      members: updatedMembers,
    });

    console.log('Zahlung erfolgreich verbucht.');
  }
  async updateMemberSumsOnPaymentDelete(
    groupId: string,
    payerId: string,
    receiverId: string,
    amount: number
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);
    if (!groupSnapshot.exists()) return;

    const groupData = groupSnapshot.data() as Groups;
    const updatedMembers = [...groupData.members];

    const payer = updatedMembers.find((m) => m.uid === payerId);
    const receiver = updatedMembers.find((m) => m.uid === receiverId);
    if (!payer || !receiver) return;

    payer.sumAmountPaid -= amount;
    payer.countAmountPaid -= 1;

    receiver.sumAmountReceived -= amount;
    receiver.countAmountReceived -= 1;

    await updateDoc(groupRef, {
      members: updatedMembers,
    });

    console.log('Zahlung erfolgreich gelöscht.');
  }

  async initializeBalancesIfNotExist(
    groupId: string,
    members: Members[]
  ): Promise<void> {
    const balancesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );
    const snapshot = await getDocs(balancesRef);

    if (snapshot.empty) {
      const batch = writeBatch(this.firestore);

      for (const from of members) {
        for (const to of members) {
          if (from.uid !== to.uid) {
            const balance: Balances = {
              groupId,
              fromMemberId: from.uid,
              toMemberId: to.uid,
              amount: 0,
              lastUpdated: new Date().toISOString(),
              relatedExpenseId: [],
            };
            const docRef = doc(balancesRef); // generiert neue ID
            batch.set(docRef, balance);
          }
        }
      }

      await batch.commit();
      console.log('Balances initialisiert');
    }
  }

  async updateBalancesOnNewExpense(
    groupId: string,
    expense: Expenses
  ): Promise<void> {
    try {
      const balancesRef = collection(
        this.firestore,
        'groups',
        groupId,
        'balances'
      );

      for (const member of expense.expenseMember) {
        if (member.memberId !== expense.paidBy) {
          const payer = expense.paidBy;
          const borrower = member.memberId;
          const amount = member.amountToPay;

          // A) borrower → payer (positive Betrag)
          const q1 = query(
            balancesRef,
            where('fromMemberId', '==', borrower),
            where('toMemberId', '==', payer)
          );
          const snapshot1 = await getDocs(q1);

          if (!snapshot1.empty) {
            const docRef = snapshot1.docs[0].ref;
            const data = snapshot1.docs[0].data() as Balances;

            await updateDoc(docRef, {
              amount: Number((data.amount + amount).toFixed(2)),
              lastUpdated: new Date().toISOString(),
              relatedExpenseId: Array.from(
                new Set([...data.relatedExpenseId, expense.expenseId])
              ),
            });
          } else {
            // Neue Balance anlegen
            await addDoc(balancesRef, {
              fromMemberId: borrower,
              toMemberId: payer,
              amount: Number(amount.toFixed(2)),
              lastUpdated: new Date().toISOString(),
              relatedExpenseId: [expense.expenseId],
            });
          }

          // B) payer → borrower (negativer Betrag)
          const q2 = query(
            balancesRef,
            where('fromMemberId', '==', payer),
            where('toMemberId', '==', borrower)
          );
          const snapshot2 = await getDocs(q2);

          if (!snapshot2.empty) {
            const docRef = snapshot2.docs[0].ref;
            const data = snapshot2.docs[0].data() as Balances;

            await updateDoc(docRef, {
              amount: Number((data.amount - amount).toFixed(2)),
              lastUpdated: new Date().toISOString(),
              relatedExpenseId: Array.from(
                new Set([...data.relatedExpenseId, expense.expenseId])
              ),
            });
          } else {
            await addDoc(balancesRef, {
              fromMemberId: payer,
              toMemberId: borrower,
              amount: Number((-amount).toFixed(2)),
              lastUpdated: new Date().toISOString(),
              relatedExpenseId: [expense.expenseId],
            });
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Balances: ', error);
    }
  }

  async updateBalancesOnDeleteExpense(
    groupId: string,
    expense: Expenses
  ): Promise<void> {
    try {
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Balances: ', error);
    }
  }

  async updateBalancesOnEditExpense(
    groupId: string,
    expense: Expenses
  ): Promise<void> {
    try {
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Balances: ', error);
    }
  }

  async getBalanceBetweenUsers(
    groupId: string,
    fromMemberId: string,
    toMemberId: string
  ): Promise<number> {
    const balancesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );
    const q = query(
      balancesRef,
      where('fromMemberId', '==', fromMemberId),
      where('toMemberId', '==', toMemberId)
    );

    const snapshot = await getDocs(q);
    let amount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as Balances;
      amount += data.amount;
    });

    return amount;
  }

  async getExpensesByBalanceEntries(
    groupId: string,
    balanceEntry: Balances
  ): Promise<Expenses[]> {
    const expenses: Expenses[] = [];

    if (
      !balanceEntry.relatedExpenseId ||
      balanceEntry.relatedExpenseId.length === 0
    ) {
      return expenses;
    }

    for (const expenseId of balanceEntry.relatedExpenseId) {
      try {
        const expenseRef = doc(
          this.firestore,
          'groups',
          groupId,
          'expenses',
          expenseId
        );
        const expenseSnap = await getDoc(expenseRef);

        if (expenseSnap.exists()) {
          const data = expenseSnap.data();
          expenses.push({
            expenseId: expenseSnap.id,
            ...data,
          } as Expenses);
        } else {
          console.warn(`Expense with ID ${expenseId} not found.`);
        }
      } catch (error) {
        console.error(`Error fetching expense ${expenseId}:`, error);
      }
    }

    return expenses;
  }
}
