import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {
  onDocumentWritten,
  Change,
  FirestoreEvent,
  DocumentSnapshot,
} from "firebase-functions/v2/firestore";

admin.initializeApp();
const firestore = admin.firestore();

// Funktion um alle wiederkehrende Kosten zu handeln
export const handlerepeatingExpenses = onSchedule(
  {
    schedule: "every day 00:01",
    timeZone: "Europe/Berlin",
    region: "europe-west1",
  },
  async (event) => {
    const now = new Date();
    const expensesRef = firestore.collectionGroup("repeatingExpenses");

    try {
      // Query all expenses with a repeat field
      const snapshot = await expensesRef
        .where("repeat", "in", ["täglich", "wöchentlich", "monatlich"])
        .get();

      for (const doc of snapshot.docs) {
        const expense = doc.data();
        // const expenseId = doc.id;

        // Parse the date of the last expense
        const lastExpenseDate = new Date(expense.date);
        const repeatInterval = expense.repeat;

        // Calculate the next expense date
        const nextExpenseDate = new Date(lastExpenseDate);
        if (repeatInterval === "täglich") {
          nextExpenseDate.setDate(nextExpenseDate.getDate() + 1);
        } else if (repeatInterval === "wöchentlich") {
          nextExpenseDate.setMonth(nextExpenseDate.getDate() + 7);
        } else if (repeatInterval === "monatlich") {
          nextExpenseDate.setFullYear(nextExpenseDate.getMonth() + 1);
        }

        if (nextExpenseDate <= now) {
          const newExpense = {
            ...expense,
            date: nextExpenseDate.toISOString(),
            expenseId: firestore.collection("dummy").doc().id,
          };

          // Save the new expense in Firestore
          const groupId = doc.ref.parent.parent?.id;
          if (groupId) {
            await firestore
              .collection("groups")
              .doc(groupId)
              .collection("expenses")
              .doc(newExpense.expenseId)
              .set(newExpense);

            logger.info(`repeating expense created: ${newExpense.expenseId}`);
          }
        }
        logger.info(`Function triggered: ${event}`);
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
