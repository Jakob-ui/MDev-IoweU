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
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { ExpenseMember } from './objects/ExpenseMember';
import { Groups } from './objects/Groups';
import { Members } from './objects/Members';
import { Balances } from './objects/Balances';
import { RepeatingExpenses } from './objects/RepeatingExpenses';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private firestore = inject(Firestore);

  //1. Ausgabe hinzufügen

  async createExpense(
    expenseData: Expenses,
    expenseMembersData: ExpenseMember[],
    groupId: string,
    repeating: boolean
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
        totalAmountInForeignCurrency:
          expenseData.totalAmountInForeignCurrency || 0,
        exchangeRate: expenseData.exchangeRate || 0,
        paidBy: expenseData.paidBy,
        paid: 'nein',
        date: expenseData.date
          ? new Date(expenseData.date).toISOString()
          : new Date().toISOString(),
        currency: expenseData.currency,
        category: expenseData.category || '',
        invoice: expenseData.invoice || '',
        repeat: expenseData.repeat,
        splitType: expenseData.splitType,
        splitBy: expenseData.splitBy,
        expenseMember: expenseMembersData,
      };

      // In Firestore speichern
      if (repeating) {
        const expenseRef = doc(
          this.firestore,
          'groups',
          groupId,
          'expenses',
          expense.expenseId
        );
        await setDoc(expenseRef, expense);

        //Felder in der Collection "Members" aktualisieren:

        //Für jedes Mitglied in der Gruppe wird abgefragt:
        //1. Wenn das Mitglied die Ausgabe bezahlt hat, wird sumExpenseAmount um totalAmount - amountToPay erhöht und countExpenseAmount um 1 erhöht.
        //2. sumAmountReceived & countAmountReceived bleiben gleich (werden erst dann aktualisiert wenn dem Mitglied ein anderes Mitglied eine Schuld begleicht) => von der for-Schleife weggelassen
        //3. Wenn das Mitglied an der Ausgabe beteiligt war aber sie nicht bezahlt hat, wird sumExpenseMemberAmount um amountToPay erhöht und countExpenseMemberAmount um 1 erhöht.
        //4. sumAmountPaid & countAmountPaid bleiben gleich (werden erst dann aktualisiert wenn das Mitglied einem anderen Mitglied eine Schuld begleicht) => von der for-Schleife weggelassen

        await this.updateMemberSumsOnNewExpense(groupId, expense);

        const groupRef = await getDoc(doc(this.firestore, 'groups', groupId));
        const groupData = groupRef.data() as Groups;
        await this.initializeLackingBalances(groupId, groupData.members);
        await this.updateBalancesOnNewExpense(groupId, expense);

        return expense;
      } else {
        const repeatingExpense: RepeatingExpenses = {
          ...expense,
          lastPay: expenseData.date
            ? new Date(expenseData.date).toISOString()
            : new Date().toISOString(),
          paid: 'nein',
        };
        const expenseRef = doc(
          this.firestore,
          'groups',
          groupId,
          'repeatingExpenses',
          repeatingExpense.expenseId
        );
        await setDoc(expenseRef, repeatingExpense);
        return repeatingExpense;
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Ausgabe: ', error);
      return null;
    }
  }

  async updateExpense(
    updatedExpenseData: Expenses,
    updatedExpenseMembersData: ExpenseMember[],
    groupId: string,
    repeating: boolean
  ): Promise<void> {
    console.log('updateExpense called with:', {updatedExpenseData, updatedExpenseMembersData, groupId, repeating});
    try {
      // Validate required fields
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
  
      const expenseId = updatedExpenseData.expenseId;
  
      // Reference to the old expense (normal or repeating)
      const expenseCollection = repeating ? 'repeatingExpenses' : 'expenses';
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        expenseCollection,
        expenseId
      );
      const expenseSnapshot = await getDoc(expenseRef);
  
      if (!expenseSnapshot.exists()) {
        throw new Error(`Expense mit ID ${expenseId} existiert nicht.`);
      }
  
      const oldExpense = expenseSnapshot.data() as Expenses;
  
      // Fetch the group data
      const groupRef = doc(this.firestore, 'groups', groupId);
      const groupSnapshot = await getDoc(groupRef);
      if (!groupSnapshot.exists()) {
        throw new Error(`Gruppe mit ID ${groupId} existiert nicht.`);
      }
      const groupData = groupSnapshot.data() as Groups;
  
      // Update member sums: Remove old values
      for (const member of groupData.members) {
        for (const oldMember of oldExpense.expenseMember) {
          if (oldMember.memberId === member.uid) {
            if (oldMember.memberId === oldExpense.paidBy) {
              const amountForOthers = oldExpense.totalAmount - oldMember.amountToPay;
              member.sumExpenseAmount -= amountForOthers;
              member.countExpenseAmount -= 1;
            } else {
              member.sumExpenseMemberAmount -= oldMember.amountToPay;
              member.countExpenseMemberAmount -= 1;
            }
          }
        }
      }
  
      // Update member sums: Add new values
      for (const member of groupData.members) {
        for (const newMember of updatedExpenseMembersData) {
          if (newMember.memberId === member.uid) {
            if (newMember.memberId === updatedExpenseData.paidBy) {
              const amountForOthers = updatedExpenseData.totalAmount - newMember.amountToPay;
              member.sumExpenseAmount += amountForOthers;
              member.countExpenseAmount += 1;
            } else {
              member.sumExpenseMemberAmount += newMember.amountToPay;
              member.countExpenseMemberAmount += 1;
            }
          }
        }
      }
  
      // Update the group document with updated member data
      await updateDoc(groupRef, {
        members: groupData.members,
      });
  
      // Prepare the updated expense object
      const updatedExpense: Expenses = {
        ...updatedExpenseData,
        expenseMember: updatedExpenseMembersData,
      };
  
      // If the expense is repeating, handle additional fields
      if (repeating) {
        const repeatingExpense: RepeatingExpenses = {
          ...updatedExpense,
          lastPay: updatedExpense.date
            ? new Date(updatedExpense.date).toISOString()
            : new Date().toISOString(),
        };
        await setDoc(expenseRef, repeatingExpense);
      } else {
        await setDoc(expenseRef, updatedExpense);
      }
  
      // Update balances
      await this.updateBalancesOnEditExpense(groupId, oldExpense, updatedExpense);
  
      console.log(`Expense mit ID ${expenseId} erfolgreich aktualisiert.`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Ausgabe: ', error);
    }
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
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
        // Wenn das Dokument in der normalen Ausgaben-Collection existiert, löschen
        await deleteDoc(expenseRef);
        console.log(`Expense mit ID ${expenseId} aus 'expenses' gelöscht.`);
        return;
      }

      // Referenz zur wiederholenden Ausgaben-Collection
      const repeatingExpenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'repeatingExpenses',
        expenseId
      );
      const repeatingExpenseSnapshot = await getDoc(repeatingExpenseRef);

      if (repeatingExpenseSnapshot.exists()) {
        await deleteDoc(repeatingExpenseRef);
        console.log(
          `Expense mit ID ${expenseId} aus 'repeatingExpenses' gelöscht.`
        );
        return;
      }

      // Wenn das Dokument in keiner der beiden Collections existiert
      console.warn(
        `Expense mit ID ${expenseId} wurde in keiner Collection gefunden.`
      );
    } catch (error) {
      console.error(
        `Fehler beim Löschen der Expense mit ID ${expenseId}:`,
        error
      );
      throw error;
    }
  }

  async getExpenseByGroup(
    groupId: string,
    repeating: boolean,
    updateExpensesCallback: (expenses: Expenses[]) => void
  ): Promise<() => void> {
    // Referenz auf die Subcollection "expenses" der Gruppe
    let expensesRef;
    if (!repeating) {
      expensesRef = collection(this.firestore, 'groups', groupId, 'expenses');
    } else {
      expensesRef = collection(
        this.firestore,
        'groups',
        groupId,
        'repeatingExpenses'
      );
    }

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
    repeating: boolean,
    updateExpenseCallback: (expense: Expenses | null) => void
  ): Promise<() => void> {
    try {
      // Zugriff auf das richtige Dokument in der verschachtelten Collection
      const collectionName = repeating ? 'repeatingExpenses' : 'expenses';
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        collectionName,
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

  async initializeLackingBalances(
    groupId: string,
    members: Members[]
  ): Promise<void> {
    const balancesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );

    try {
      const existingBalancesSnapshot = await getDocs(balancesRef);
      const existingBalances = new Set<string>();

      // Collect existing balance pairs to avoid overwriting
      existingBalancesSnapshot.forEach((doc) => {
        const data = doc.data() as Balances;
        const pairKey = this.getBalancePairKey(data.userAId, data.userBId);
        existingBalances.add(pairKey);
      });

      const batch = writeBatch(this.firestore);

      // Create missing balance documents for the new user
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const memberA = members[i];
          const memberB = members[j];

          const pairKey = this.getBalancePairKey(memberA.uid, memberB.uid);

          // Only create a new balance document if it doesn't already exist
          if (!existingBalances.has(pairKey)) {
            const balance: Balances = {
              groupId,
              userAId: memberA.uid,
              userBId: memberB.uid,
              userACredit: 0,
              userBCredit: 0,
              lastUpdated: new Date().toISOString(),
              relatedExpenseId: [],
            };

            const docRef = doc(balancesRef); // Generate a new document ID
            batch.set(docRef, balance);
          }
        }
      }

      // Commit the batch if there are new balances to create
      await batch.commit();
      console.log('Missing balances initialized for new members.');
    } catch (error) {
      console.error('Error initializing balances:', error);
    }
  }

  private getBalancePairKey(memberAId: string, memberBId: string): string {
    // Generate a consistent key for a pair of members, regardless of order
    return [memberAId, memberBId].sort().join('_');
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
          const creditor = expense.paidBy; // The user who paid
          const debtor = member.memberId; // The user who owes
          const amount = member.amountToPay;

          // Query for the balance document between the creditor and debtor
          const q = query(
            balancesRef,
            where('userAId', 'in', [creditor, debtor]),
            where('userBId', 'in', [creditor, debtor])
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data() as Balances;

            // Determine the direction of the balance and update accordingly
            if (data.userAId === creditor && data.userBId === debtor) {
              await updateDoc(docRef, {
                userACredit: Number((data.userACredit + amount).toFixed(2)),
                lastUpdated: new Date().toISOString(),
                relatedExpenseId: Array.from(
                  new Set([...data.relatedExpenseId, expense.expenseId])
                ),
              });
            } else if (data.userAId === debtor && data.userBId === creditor) {
              await updateDoc(docRef, {
                userBCredit: Number((data.userBCredit + amount).toFixed(2)),
                lastUpdated: new Date().toISOString(),
                relatedExpenseId: Array.from(
                  new Set([...data.relatedExpenseId, expense.expenseId])
                ),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating balances on new expense:', error);
    }
  }

  async updateBalancesOnDeleteExpense(
    groupId: string,
    expense: Expenses
  ): Promise<void> {
    try {
      const balancesRef = collection(this.firestore, 'groups', groupId, 'balances');
  
      for (const member of expense.expenseMember) {
        if (member.memberId !== expense.paidBy) {
          const creditor = expense.paidBy; // The user who paid
          const debtor = member.memberId; // The user who owes
          const amount = member.amountToPay;
  
          // Query for the balance document between the creditor and debtor
          const q = query(
            balancesRef,
            where('userAId', 'in', [creditor, debtor]),
            where('userBId', 'in', [creditor, debtor])
          );
          const snapshot = await getDocs(q);
  
          if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data() as Balances;
  
            // Determine the direction of the balance and update accordingly
            if (data.userAId === creditor && data.userBId === debtor) {
              await updateDoc(docRef, {
                userACredit: Number((data.userACredit - amount).toFixed(2)),
                lastUpdated: new Date().toISOString(),
                relatedExpenseId: Array.from(
                  new Set([...data.relatedExpenseId].filter(id => id !== expense.expenseId))
                ),
              });
            } else if (data.userAId === debtor && data.userBId === creditor) {
              await updateDoc(docRef, {
                userBCredit: Number((data.userBCredit - amount).toFixed(2)),
                lastUpdated: new Date().toISOString(),
                relatedExpenseId: Array.from(
                  new Set([...data.relatedExpenseId].filter(id => id !== expense.expenseId))
                ),
              });
            }
          } 
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Balances: ', error);
    }
  }

  async updateBalancesOnEditExpense(
    groupId: string,
    oldExpense: Expenses,
    updatedExpense: Expenses
  ): Promise<void> {
    try {
      const balancesRef = collection(this.firestore, 'groups', groupId, 'balances');
  
      // Iterate through the members of the updated expense
      for (const updatedMember of updatedExpense.expenseMember) {
        const oldMember = oldExpense.expenseMember.find(
          (member) => member.memberId === updatedMember.memberId
        );
  
        // If the member exists in the old expense, calculate the difference
        const oldAmountToPay = oldMember ? oldMember.amountToPay : 0;
        const newAmountToPay = updatedMember.amountToPay;
        const amountDifference = newAmountToPay - oldAmountToPay;
  
        if (updatedMember.memberId !== updatedExpense.paidBy) {
          const creditor = updatedExpense.paidBy; // The user who paid
          const debtor = updatedMember.memberId; // The user who owes
  
          // Query for the balance document between the creditor and debtor
          const q = query(
            balancesRef,
            where('userAId', 'in', [creditor, debtor]),
            where('userBId', 'in', [creditor, debtor])
          );
          const snapshot = await getDocs(q);
  
          if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data() as Balances;
  
            // Determine the direction of the balance and update accordingly
            if (data.userAId === creditor && data.userBId === debtor) {
              await updateDoc(docRef, {
                userACredit: Number((data.userACredit + amountDifference).toFixed(2)),
                lastUpdated: new Date().toISOString(),
                relatedExpenseId: Array.from(
                  new Set([...data.relatedExpenseId, updatedExpense.expenseId])
                ),
              });
            } else if (data.userAId === debtor && data.userBId === creditor) {
              await updateDoc(docRef, {
                userBCredit: Number((data.userBCredit + amountDifference).toFixed(2)),
                lastUpdated: new Date().toISOString(),
                relatedExpenseId: Array.from(
                  new Set([...data.relatedExpenseId, updatedExpense.expenseId])
                ),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating balances on edited expense:', error);
    }
  }

  async getBalanceBetweenUsers(
    groupId: string,
    userAId: string,
    userBId: string
  ): Promise<number> {
    const balancesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );
    const q1 = query(
      balancesRef,
      where('userAId', '==', userAId),
      where('userBId', '==', userBId)
    );

    let snapshot = await getDocs(q1);
    if (snapshot.empty) {
      const q2 = query(
        balancesRef,
        where('userAId', '==', userBId),
        where('userBId', '==', userAId)
      );
      snapshot = await getDocs(q2);
      if (snapshot.empty) {
        return 0; // Keine Bilanz gefunden
      }
      let amount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as Balances;
        amount += data.userBCredit - data.userACredit; // Berechnung der Differenz
      });
      return amount;
    }
    let amount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as Balances;
      amount += data.userACredit - data.userBCredit; // Berechnung der Differenz
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

  async checkMemberBalance(groupId: string, userId: string): Promise<boolean> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      console.error(`Gruppe mit ID ${groupId} nicht gefunden.`);
      return false;
    }

    const groupData = groupSnapshot.data();
    // Zugriff auf 'members' mit Indexsignatur
    const member = groupData['members'].find((m: any) => m.uid === userId);

    if (!member) {
      console.error(`Mitglied mit der UID ${userId} nicht gefunden.`);
      return false;
    }

    // Berechnung der Bilanz
    const paidByUser = member.sumExpenseAmount || 0; // Guthaben (Beträge, die der User bezahlt hat)
    const paidByMember = member.sumExpenseMemberAmount || 0; // Ausgaben (Beträge, die der User vom Mitglied bekommen hat)

    const myBalance = paidByUser - paidByMember; // Berechnung der Bilanz

    // Gibt zurück, ob die Bilanz ungleich null ist
    return myBalance !== 0;
  }
}
