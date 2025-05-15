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
  startAfter,
  orderBy,
  limit,
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

        //await this.updateMemberSumsOnNewExpense(groupId, expense);

        const groupRef = await getDoc(doc(this.firestore, 'groups', groupId));
        const groupData = groupRef.data() as Groups;
        await this.initializeLackingBalances(groupId, groupData.members);

        return expense;
      } else {
        const repeatingExpense: RepeatingExpenses = {
          ...expense,
          lastPay: expenseData.date
            ? new Date(expenseData.date).toISOString()
            : new Date().toISOString(),
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
    console.log('updateExpense called with:', {
      updatedExpenseData,
      updatedExpenseMembersData,
      groupId,
      repeating,
    });
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
              const amountForOthers =
                oldExpense.totalAmount - oldMember.amountToPay;
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
              const amountForOthers =
                updatedExpenseData.totalAmount - newMember.amountToPay;
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

      console.log(`Expense mit ID ${expenseId} erfolgreich aktualisiert.`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Ausgabe: ', error);
    }
  }

  async deleteExpense(
    groupId: string,
    expenseId: string,
    paid: boolean
  ): Promise<void> {
    try {
      if (paid) {
        console.log('Ausgbabe wurde bereits bezahlt, löschen nicht möglich');
        return;       
      }
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expenseId
      );
      const expenseSnapshot = await getDoc(expenseRef);

      if (expenseSnapshot.exists()) {
        //Bilanzen und Mitglieder aktualisieren
        const expense = expenseSnapshot.data() as Expenses;
        //this.updateMemberSumsOnDeleteExpense(groupId, expense);
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

  async getExpensesByRelatedIds(
    groupId: string,
    relatedExpenseIds: string[],
    repeating: boolean,
    updateExpensesCallback: (expenses: Expenses[]) => void
  ): Promise<void> {
    const expenses: Expenses[] = [];

    for (const expenseId of relatedExpenseIds) {
      await this.getExpenseById(groupId, expenseId, repeating, (expense) => {
        if (expense) {
          expenses.push(expense);
        }
      });
    }

    updateExpensesCallback(expenses);
  }

  async getPaginatedExpenses(
    groupId: string,
    lastVisibleDoc: any | null,
    pageSize: number
  ): Promise<{ expenses: Expenses[]; lastVisible: any }> {
    try {
      const expensesRef = collection(
        this.firestore,
        'groups',
        groupId,
        'expenses'
      );
      let expensesQuery;

      if (lastVisibleDoc) {
        // Wenn ein Cursor vorhanden ist, starte nach dem letzten Dokument
        expensesQuery = query(
          expensesRef,
          orderBy('date', 'desc'),
          startAfter(lastVisibleDoc),
          limit(pageSize)
        );
      } else {
        // Erste Seite laden
        expensesQuery = query(
          expensesRef,
          orderBy('date', 'desc'),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(expensesQuery);

      const expenses = snapshot.docs.map((doc) => ({
        expenseId: doc.id,
        ...doc.data(),
      })) as Expenses[];

      const lastVisible = snapshot.docs[snapshot.docs.length - 1]; // Letztes Dokument als Cursor speichern

      return { expenses, lastVisible };
    } catch (error) {
      console.error('Fehler beim Abrufen der paginierten Ausgaben:', error);
      throw error;
    }
  }

  async getPaginatedAndRealtimeExpenses(
    groupId: string,
    lastVisibleDoc: any | null,
    pageSize: number,
    repeating: boolean,
    updateExpensesCallback: (expenses: Expenses[]) => void
  ): Promise<() => void> {
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

    // Pagination-Query
    let expensesQuery;
    if (lastVisibleDoc) {
      expensesQuery = query(
        expensesRef,
        orderBy('date', 'desc'),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    } else {
      expensesQuery = query(
        expensesRef,
        orderBy('date', 'desc'),
        limit(pageSize)
      );
    }

    // Lade die erste Seite der Daten
    const snapshot = await getDocs(expensesQuery);
    const paginatedExpenses = snapshot.docs.map((doc) => ({
      expenseId: doc.id,
      ...doc.data(),
    })) as Expenses[];

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    // Echtzeit-Subscription
    const unsubscribe = onSnapshot(expensesRef, (realtimeSnapshot) => {
      const realtimeExpenses = realtimeSnapshot.docs.map((doc) => ({
        expenseId: doc.id,
        ...doc.data(),
      })) as Expenses[];

      // Kombiniere die paginierten Daten mit den Echtzeit-Daten und entferne Duplikate
      const combinedExpenses = [
        ...new Map(
          [...realtimeExpenses, ...paginatedExpenses].map((expense) => [
            expense.expenseId,
            expense,
          ])
        ).values(),
      ];

      updateExpensesCallback(combinedExpenses);
    });

    return unsubscribe;
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
              relatedTransactionId: [],
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

  async getUserBalance(groupId: string, currentUserId: string, selectedMemberId: string) {
    const balancesRef = collection(this.firestore, 'groups', groupId, 'balances');

    // Erste Abfrage nach den Benutzern, wobei der eingeloggte Benutzer als `userA` und der ausgewählte Benutzer als `userB` sein könnte
    const q1 = query(
      balancesRef,
      where('userAId', '==', currentUserId),
      where('userBId', '==', selectedMemberId)
    );

    let snapshot = await getDocs(q1);
    console.log("q1 snapshot", snapshot.empty, snapshot.docs);

    // Falls keine Daten gefunden werden, auch nach den umgekehrten IDs suchen
    if (snapshot.empty) {
      const q2 = query(
        balancesRef,
        where('userAId', '==', selectedMemberId),
        where('userBId', '==', currentUserId)
      );
      snapshot = await getDocs(q2);
      console.log("q2 snapshot", snapshot.empty, snapshot.docs);

      if (snapshot.empty) {
        return { myIncome: 0, myExpenses: 0 }; // Keine Bilanz gefunden
      }

      // Berechnung der Werte, wenn die Reihenfolge der Benutzer vertauscht ist
      let myIncome = 0;
      let myExpenses = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as Balances;
        console.log("Data from q2:", data);
        myIncome += data.userBCredit;  // Betrag, den der ausgewählte Benutzer erhalten muss
        myExpenses += data.userACredit; // Betrag, den der eingeloggte Benutzer zahlen muss
      });

      return { myIncome, myExpenses };
    }

    // Falls die direkte Zuordnung gefunden wurde, Berechnung für den eingeloggten Benutzer
    let myIncome = 0;
    let myExpenses = 0;
    snapshot.forEach((doc) => {
      const data = doc.data() as Balances;
      console.log("Data from q1:", data);
      myIncome += data.userACredit;  // Betrag, den der eingeloggte Benutzer erhalten soll
      myExpenses += data.userBCredit; // Betrag, den der ausgewählte Benutzer zahlen muss
    });

    return { myIncome, myExpenses };
  }

  async getUnsettledExpensesByBalance(
    groupId: string,
    currentUserUid: string,
    selectedMemberUid: string
  ): Promise<Expenses[]> {
    const balancesRef = collection(this.firestore, 'groups', groupId, 'balances');
    const balanceMembers = [currentUserUid, selectedMemberUid];
    const q1 = query(
      balancesRef,
      where('userAId', 'in', balanceMembers),
      where('userBId', 'in', balanceMembers)
    );
    const relatedBalancesSnapshot = await getDocs(q1);
    if (relatedBalancesSnapshot.empty) {
      console.log('Keine Bilanz gefunden.');
      return [];
    }
    const relatedBalance = relatedBalancesSnapshot.docs[0].data() as Balances;
    const unsettledExpenses: Expenses[] = [];

    // Hol dir die Ausgaben, die unter relatedExpensesId aufscheinen
    for(const expenseId of relatedBalance.relatedExpenseId) {
      const expenseRef = doc(this.firestore, 'groups', groupId, 'expenses', expenseId);
      const expenseSnapshot = await getDoc(expenseRef);
      if (expenseSnapshot.exists()) {
        const expenseData = expenseSnapshot.data() as Expenses;
        // Überprüfe für jeden, ob entweder der eingeloggte Benutzer oder der ausgewählte Benutzer seinen Anteil noch nicht bezahlt hat
        const unpaidByCurrentUser = expenseData.expenseMember.some(
          (member) => member.memberId === currentUserUid && member.amountToPay > 0 && !member.paid
        );
        const unpaidBySelectedMember = expenseData.expenseMember.some(
          (member) => member.memberId === selectedMemberUid && member.amountToPay > 0 && !member.paid
        );
        // Wenn keiner von beiden bezahlt hat, füge die Ausgabe der Liste hinzu
        if (unpaidByCurrentUser || unpaidBySelectedMember) {
          unsettledExpenses.push(expenseData);
        }
      }
    }

    return unsettledExpenses;
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
