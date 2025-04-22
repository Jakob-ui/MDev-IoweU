import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";

admin.initializeApp();
const firestore = admin.firestore();

// Scheduled function to handle recurring expenses
export const handleRecurringExpenses = onSchedule(
  {
    schedule: "every day 00:01",
    timeZone: "Europe/Berlin",
    region: "europe-west1",
  },
  async (event) => {
    const now = new Date();
    const expensesRef = firestore.collectionGroup("expenses");

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

            logger.info(`Recurring expense created: ${newExpense.expenseId}`);
          }
        }
        logger.info(`Function triggered: ${event}`);
      }
    } catch (error) {
      logger.error("Error handling recurring expenses:", error);
    }
  }
);
