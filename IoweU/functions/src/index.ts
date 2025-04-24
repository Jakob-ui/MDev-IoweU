import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {
  onDocumentWritten,
  Change,
  FirestoreEvent,
  DocumentSnapshot,
} from "firebase-functions/v2/firestore";

interface RepeatingExpenses {
  expenseId: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  date: string;
  lastPay?: string;
  currency: string[];
  category?: string;
  invoice?: string;
  repeat?: string;
  splitType: "prozent" | "anteile" | "produkte";
  splitBy: "alle" | "frei";
  expenseMember: ExpenseMember[];
}

export interface ExpenseMember {
  memberId: string;
  amountToPay: number;
  split?: number;
  products?: Products[];
}

export interface Products {
  productId: string;
  memberId: string;
  productname: string;
  quantity: number;
  unit: string;
  price: number;
}

admin.initializeApp();
const firestore = admin.firestore();

// Funktion um alle wiederkehrende Kosten zu behandeln
export const handlerepeatingExpenses = onSchedule(
  {
    schedule: "every day 00:01",
    timeZone: "Europe/Berlin",
    region: "europe-west1",
  },
  async () => {
    const now = new Date();
    const expensesRef = firestore.collectionGroup("repeatingExpenses");

    try {
      // Query all repeating expenses with a valid repeat field
      const snapshot = await expensesRef
        .where("repeat", "in", ["täglich", "wöchentlich", "monatlich"])
        .get();

      for (const doc of snapshot.docs) {
        const expense = doc.data() as RepeatingExpenses;
        const groupId = doc.ref.parent.parent?.id;

        if (!groupId) {
          logger.error(`Group ID not found for repeating expense: ${doc.id}`);
          continue;
        }

        // Parse the lastPay date
        const lastPayDate = expense.lastPay ?
          new Date(expense.lastPay) :
          new Date(expense.date);
        const repeatInterval = expense.repeat;

        // Calculate the next expense date
        const nextExpenseDate = new Date(lastPayDate);
        if (repeatInterval === "täglich") {
          nextExpenseDate.setDate(nextExpenseDate.getDate() + 1);
        } else if (repeatInterval === "wöchentlich") {
          nextExpenseDate.setDate(nextExpenseDate.getDate() + 7);
        } else if (repeatInterval === "monatlich") {
          nextExpenseDate.setMonth(nextExpenseDate.getMonth() + 1);
        }

        logger.info(`Processing repeating expense: ${doc.id}`);
        logger.info(`Next expense date: ${nextExpenseDate.toISOString()}`);

        // Check if the next expense date is due
        if (nextExpenseDate <= now) {
          const newExpense = {
            ...expense,
            date: nextExpenseDate.toISOString(),
            lastPay: now.toISOString(),
            expenseId: firestore.collection("dummy").doc().id,
          };

          // Remove unnecessary fields for the new expense
          const {repeat, lastPay, ...cleanedExpense} = newExpense;

          // Save the new expense in the "expenses" collection
          await firestore
            .collection("groups")
            .doc(groupId)
            .collection("expenses")
            .doc(cleanedExpense.expenseId)
            .set(cleanedExpense);

          // Update the lastPay field in the repeating expense
          await doc.ref.update({
            lastPay: now.toISOString(),
          });

          logger.info(`Repeating expense created: ${cleanedExpense.expenseId}`);
        }
      }
    } catch (error) {
      logger.error("Error handling repeating expenses:", error);
    }
  }
);

// Funktion um alle UserSummen upzudaten
export const updateGroupSumsOnExpenseChange = onDocumentWritten(
  "groups/{groupId}/expenses/{expenseId}",
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const groupId = event.params.groupId;

    try {
      // Neue oder aktualisierte Ausgabe
      const newExpense = event.data?.after?.data();
      // Gelöschte Ausgabe
      const oldExpense = event.data?.before?.data();

      // Referenz zur Gruppe
      const groupRef = firestore.collection("groups").doc(groupId);
      const groupSnapshot = await groupRef.get();

      if (!groupSnapshot.exists) {
        console.error(`Gruppe mit der ID ${groupId} nicht gefunden.`);
        return;
      }

      const groupData = groupSnapshot.data();

      // Aktuelle Summen und Zähler
      let sumTotalExpenses = groupData?.sumTotalExpenses || 0;
      let countTotalExpenses = groupData?.countTotalExpenses || 0;

      // Summen und Zähler aktualisieren
      if (newExpense && !oldExpense) {
        // Neue Ausgabe hinzugefügt
        sumTotalExpenses += newExpense.totalAmount || 0;
        countTotalExpenses += 1;
      } else if (!newExpense && oldExpense) {
        // Ausgabe gelöscht
        sumTotalExpenses -= oldExpense.totalAmount || 0;
        countTotalExpenses -= 1;
      } else if (newExpense && oldExpense) {
        // Ausgabe aktualisiert
        sumTotalExpenses +=
          (newExpense.totalAmount || 0) - (oldExpense.totalAmount || 0);
      }

      // Gruppe aktualisieren
      await groupRef.update({
        sumTotalExpenses,
        countTotalExpenses,
      });

      console.log(`Summen für Gruppe ${groupId} erfolgreich aktualisiert.`);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Gruppensummen:", error);
    }
  }
);
