import { Injectable } from '@angular/core';
import { Expenses } from './objects/Expenses';
import {
  collection,
  deleteDoc,
  Firestore,
  getDocs,
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

      if (expenseData.repeat === 'nein') {
        new Date(expenseData.date).setHours(0, 0, 0, 0);
      }

      // Komplettes Expense-Objekt erstellen (Daten werden aus der UI geliefert)
      const expense: Expenses = {
        expenseId,
        description: expenseData.description,
        totalAmount: expenseData.totalAmount,
        totalAmountInForeignCurrency:
          expenseData.totalAmountInForeignCurrency || 0,
        exchangeRate: expenseData.exchangeRate || 0,
        paidBy: expenseData.paidBy,
        date:
          expenseData.repeat === 'nein'
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

        const groupRef = await getDoc(doc(this.firestore, 'groups', groupId));
        const groupData = groupRef.data() as Groups;
        await this.initializeLackingBalances(groupId, groupData.members);

        // Bilanzen updaten
        const balancesRef = collection(
          this.firestore,
          'groups',
          groupId,
          'balances'
        );
        const batch = writeBatch(this.firestore);

        // MemberSums updaten

        return expense;
      } else {
        const repeatingExpense: RepeatingExpenses = {
          ...expense,
          lastPay: expenseData.date
            ? this.toUTCDateString(expenseData.date)
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

  toUTCDateString(dateInput: string | Date): string {
    const d = new Date(dateInput);
    return new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    ).toISOString();
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
            ? this.toUTCDateString(updatedExpense.date)
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

  async getPaginatedExpensesRealtime(
    groupId: string,
    lastVisibleDoc: any | null,
    pageSize: number,
    repeating: boolean = false,
    updateExpensesCallback: (expenses: Expenses[], lastVisible: any, hasMore: boolean) => void
  ): Promise<() => void> { {
    try {
      const collectionName = repeating ? 'repeatingExpenses' : 'expenses';
      const expensesRef = collection(
        this.firestore,
        'groups',
        groupId,
        collectionName
      );

      let expensesQuery;

      if (lastVisibleDoc) {
        expensesQuery = query(
          expensesRef,
          orderBy('date', 'desc'),
          startAfter(lastVisibleDoc),
          limit(pageSize + 1)
        );
      } else {
        expensesQuery = query(
          expensesRef,
          orderBy('date', 'desc'),
          limit(pageSize + 1)
        );
      }

      // Echtzeit-Listener auf die paginierte Query
      const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
        const hasMore = snapshot.docs.length > pageSize;
        const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
        const expenses = docs.map((doc) => ({
          expenseId: doc.id,
          ...doc.data(),
        })) as Expenses[];
        const lastVisible = docs[docs.length - 1] ?? null;
        updateExpensesCallback(expenses, lastVisible, hasMore);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Fehler beim Abrufen der paginierten Ausgaben:', error);
      throw error;
    }
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

  getBalanceBetweenUsersRealtime(
    groupId: string,
    userAId: string,
    userBId: string,
    callback: (balance: number) => void
  ): () => void {
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
    const q2 = query(
      balancesRef,
      where('userAId', '==', userBId),
      where('userBId', '==', userAId)
    );

    let unsub2: (() => void) | null = null;
    const unsub1 = onSnapshot(q1, (snapshot) => {
      if (!snapshot.empty) {
        let amount = 0;
        snapshot.forEach((doc) => {
          const data = doc.data() as Balances;
          amount += data.userACredit - data.userBCredit;
        });
        callback(amount);
      } else {
        unsub2 = onSnapshot(q2, (snapshot2) => {
          if (!snapshot2.empty) {
            let amount = 0;
            snapshot2.forEach((doc) => {
              const data = doc.data() as Balances;
              amount += data.userBCredit - data.userACredit;
            });
            callback(amount);
          } else {
            callback(0);
          }
        });
      }
    });

    return () => {
      unsub1();
      if (unsub2) unsub2();
    };
  }

  async getUserBalance(
    groupId: string,
    currentUserId: string,
    selectedMemberId: string
  ) {
    const balancesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );

    // Erste Abfrage nach den Benutzern, wobei der eingeloggte Benutzer als `userA` und der ausgewählte Benutzer als `userB` sein könnte
    const q1 = query(
      balancesRef,
      where('userAId', '==', currentUserId),
      where('userBId', '==', selectedMemberId)
    );

    let snapshot = await getDocs(q1);
    console.log('q1 snapshot', snapshot.empty, snapshot.docs);

    // Falls keine Daten gefunden werden, auch nach den umgekehrten IDs suchen
    if (snapshot.empty) {
      const q2 = query(
        balancesRef,
        where('userAId', '==', selectedMemberId),
        where('userBId', '==', currentUserId)
      );
      snapshot = await getDocs(q2);
      console.log('q2 snapshot', snapshot.empty, snapshot.docs);

      if (snapshot.empty) {
        return { myIncome: 0, myExpenses: 0 }; // Keine Bilanz gefunden
      }

      // Berechnung der Werte, wenn die Reihenfolge der Benutzer vertauscht ist
      let myIncome = 0;
      let myExpenses = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as Balances;
        console.log('Data from q2:', data);
        myIncome += data.userBCredit; // Betrag, den der ausgewählte Benutzer erhalten muss
        myExpenses += data.userACredit; // Betrag, den der eingeloggte Benutzer zahlen muss
      });

      return { myIncome, myExpenses };
    }

    // Falls die direkte Zuordnung gefunden wurde, Berechnung für den eingeloggten Benutzer
    let myIncome = 0;
    let myExpenses = 0;
    snapshot.forEach((doc) => {
      const data = doc.data() as Balances;
      console.log('Data from q1:', data);
      myIncome += data.userACredit; // Betrag, den der eingeloggte Benutzer erhalten soll
      myExpenses += data.userBCredit; // Betrag, den der ausgewählte Benutzer zahlen muss
    });

    return { myIncome, myExpenses };
  }

  async getUnsettledExpensesByBalance(
    groupId: string,
    currentUserUid: string,
    selectedMemberUid: string
  ): Promise<Expenses[]> {
    const balancesRef = collection(
      this.firestore,
      'groups',
      groupId,
      'balances'
    );
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
    for (const expenseId of relatedBalance.relatedExpenseId) {
      const expenseRef = doc(
        this.firestore,
        'groups',
        groupId,
        'expenses',
        expenseId
      );
      const expenseSnapshot = await getDoc(expenseRef);
      if (expenseSnapshot.exists()) {
        const expenseData = expenseSnapshot.data() as Expenses;
        // Überprüfe für jeden, ob entweder der eingeloggte Benutzer oder der ausgewählte Benutzer seinen Anteil noch nicht bezahlt hat
        const unpaidByCurrentUser = expenseData.expenseMember.some(
          (member) =>
            member.memberId === currentUserUid &&
            member.amountToPay > 0 &&
            !member.paid
        );
        const unpaidBySelectedMember = expenseData.expenseMember.some(
          (member) =>
            member.memberId === selectedMemberUid &&
            member.amountToPay > 0 &&
            !member.paid
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
