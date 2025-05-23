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
    schedule: "every day 00:20",
    timeZone: "Europe/Berlin",
    region: "europe-west1",
  },
  async () => {
    const now = new Date();
    const adjustedDate = new Date(now);
    adjustedDate.setHours(0, 0, 0, 0);
    const expensesRef = firestore.collectionGroup("repeatingExpenses");

    try {
      const snapshot = await expensesRef.get();

      for (const snapshotDoc of snapshot.docs) {
        const expense = snapshotDoc.data();
        const groupId = snapshotDoc.ref.parent.parent?.id;

        if (!groupId) {
          logger.error(
            `Group ID not found for repeating expense: ${snapshotDoc.id}`
          );
          continue;
        }

        // Parse the lastPay date
        const lastPayDate = expense["lastPay"] ?
          new Date(expense["lastPay"]) :
          new Date(expense["date"]);
        const repeatInterval = expense["repeat"];

        // Calculate the next expense date
        const nextExpenseDate = new Date(lastPayDate);
        if (repeatInterval === "täglich") {
          nextExpenseDate.setDate(nextExpenseDate.getDate() + 1);
        } else if (repeatInterval === "wöchentlich") {
          nextExpenseDate.setDate(nextExpenseDate.getDate() + 7);
        } else if (repeatInterval === "monatlich") {
          nextExpenseDate.setMonth(nextExpenseDate.getMonth() + 1);
        }

        logger.info(`Next expense date: ${nextExpenseDate.toISOString()}`);

        // Check if the next expense date is due
        if (nextExpenseDate <= adjustedDate) {
          // Generate a new expenseId
          const expenseId = firestore
            .collection(`groups/${groupId}/expenses`)
            .doc().id;

          // Create the new expense object
          const newExpense = {
            ...expense,
            lastPay: adjustedDate.toISOString(),
            expenseId: expenseId,
          };

          // Remove unnecessary fields
          const {lastPay, ...cleanedExpense} =
            newExpense as RepeatingExpenses;
          cleanedExpense.date = adjustedDate.toISOString();

          // Save the new expense in the Firestore database
          await firestore
            .collection(`groups/${groupId}/expenses`)
            .doc(expenseId)
            .set(cleanedExpense);

          // Update the `lastPay` field in the original repeatingExpense
          await snapshotDoc.ref.update({
            lastPay: adjustedDate.toISOString(),
          });

          logger.info(`Repeating expense created: ${expenseId}`);
        }
      }
    } catch (e) {
      logger.error("Error handling repeating expenses:", e);
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


export const recalculateGroupBalances = onSchedule(
  {
    schedule: "every day 00:01",
    timeZone: "Europe/Berlin",
    region: "europe-west1",
  },
  async () => {
    const groupsRef = firestore.collection("groups");

    try {
      const groupsSnapshot = await groupsRef.get();

      for (const groupDoc of groupsSnapshot.docs) {
        const groupId = groupDoc.id;
        const expensesRef = firestore.collection(`groups/${groupId}/expenses`);
        const expensesSnapshot = await expensesRef.get();

        let total = 0;
        let count = 0;

        // Summiere alle Expenses der Gruppe
        for (const expenseDoc of expensesSnapshot.docs) {
          const expense = expenseDoc.data();
          total += expense.totalAmount || 0;
          count++;
        }

        // Aktualisiere die Summen in der Gruppe
        await groupDoc.ref.update({
          sumTotalExpenses: total,
          countTotalExpenses: count,
        });

        logger.info(
          `Balances für Gruppe ${groupId} neu berechnet: 
          Total = ${total}, Count = ${count}`
        );
      }
    } catch (error) {
      logger.error("Fehler beim Neuberechnen der Gruppensummen:", error);
    }
  }
);
