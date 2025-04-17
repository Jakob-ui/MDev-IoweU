import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';

initializeApp();

exports.onExpenseUpdated = functions.firestore
  .document('groups/{groupId}/expenses/{expenseId}')
  .onUpdate(async (change: any, context: any) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const { groupId } = context.params;

    console.log(`Expense wurde aktualisiert in Gruppe ${groupId}.`);

    // Hat sich der Betarag geändert?
    if (beforeData.totalAmount !== afterData.totalAmount) {
      const amountDifference = afterData.totalAmount - beforeData.totalAmount;

      const groupRef = getFirestore().doc(`groups/${groupId}`);
      await groupRef.update({
        sumTotalExpenses: FieldValue.increment(amountDifference),
      });

      console.log(
        `Gesamtsumme der Gruppe ${groupId} um ${amountDifference} aktualisiert.`
      );
    }

    return null;
  });

exports.onExpenseCreated = functions.firestore
  .document('groups/{groupId}/expenses/{expenseId}')
  .onCreate(async (snapshot: any, context: any) => {
    const newExpense = snapshot.data();
    const { groupId } = context.params;

    console.log(`Neue Expense wurde erstellt in Gruppe ${groupId}.`);

    const groupRef = getFirestore().doc(`groups/${groupId}`);
    await groupRef.update({
      sumTotalExpenses: FieldValue.increment(newExpense.totalAmount),
    });

    console.log(
      `Gesamtsumme der Gruppe ${groupId} um ${newExpense.totalAmount} erhöht.`
    );

    return null;
  });
