import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import * as functions from 'firebase-functions';
import * as cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';

import {
  onDocumentWritten,
  Change,
  FirestoreEvent,
  DocumentSnapshot,
} from "firebase-functions/v2/firestore";
import firebase from "firebase/compat";
import functions = firebase.functions;

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
const corsHandler = cors({ origin: true });

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

export const updateBalances = onDocumentWritten(
  "groups/{groupId}/expenses/{expenseId}",
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const groupId = event.params.groupId;

    try {
      // Neue oder aktualisierte Ausgabe
      const newExpense = event.data?.after?.data();
      const oldExpense = event.data?.before?.data();

      const groupRef = firestore.collection("groups").doc(groupId);
      const groupSnapshot = await groupRef.get();

      if (!groupSnapshot.exists) {
        console.error(`Gruppe mit der ID ${groupId} nicht gefunden.`);
        return;
      }

      const balancesRef = firestore.collection(`groups/${groupId}/balances`);
      if (newExpense) {
        for (const member of newExpense.expenseMember) {
          if (member.memberId !== newExpense.paidBy) {
            const creditor = newExpense.paidBy;
            const debtor = member.memberId;
            const amount = member.amountToPay;

            // Richtung 1: creditor → debtor
            const snap1 = await balancesRef
              .where("userAId", "==", creditor)
              .where("userBId", "==", debtor)
              .get();

            // Richtung 2: debtor → creditor
            const snap2 = await balancesRef
              .where("userAId", "==", debtor)
              .where("userBId", "==", creditor)
              .get();

            const docs = [...snap1.docs, ...snap2.docs];

            if (docs.length > 0) {
              const docRef = docs[0].ref;
              const data = docs[0].data() as any;

              if (data.userAId === creditor && data.userBId === debtor) {
                await docRef.update({
                  userACredit: Number((data.userACredit + amount).toFixed(2)),
                  lastUpdated: new Date().toISOString(),
                  relatedExpenseId: Array.from(
                    new Set([
                      ...(data.relatedExpenseId || []),
                      newExpense.expenseId,
                    ])
                  ),
                });
              } else if (data.userAId === debtor && data.userBId === creditor) {
                await docRef.update({
                  userBCredit: Number((data.userBCredit + amount).toFixed(2)),
                  lastUpdated: new Date().toISOString(),
                  relatedExpenseId: Array.from(
                    new Set([
                      ...(data.relatedExpenseId || []),
                      newExpense.expenseId,
                    ])
                  ),
                });
              }
            } else {
              // Balance existiert noch nicht, lege sie an
              await balancesRef.add({
                userAId: creditor,
                userBId: debtor,
                userACredit: Number(amount.toFixed(2)),
                userBCredit: 0,
                lastUpdated: new Date().toISOString(),
                relatedExpenseId: [newExpense.expenseId],
              });
            }
          }
        }
      }

      // === LÖSCHEN ===
      if (!newExpense && oldExpense) {
        for (const member of oldExpense.expenseMember) {
          if (member.memberId !== oldExpense.paidBy) {
            const creditor = oldExpense.paidBy;
            const debtor = member.memberId;
            const amount = member.amountToPay;

            const snap1 = await balancesRef
              .where("userAId", "==", creditor)
              .where("userBId", "==", debtor)
              .get();

            const snap2 = await balancesRef
              .where("userAId", "==", debtor)
              .where("userBId", "==", creditor)
              .get();

            const docs = [...snap1.docs, ...snap2.docs];

            if (docs.length > 0) {
              const docRef = docs[0].ref;
              const data = docs[0].data() as any;

              // Entferne die expenseId aus relatedExpenseId
              const updatedRelated = (data.relatedExpenseId || []).filter(
                (id: string) => id !== oldExpense.expenseId
              );

              if (data.userAId === creditor && data.userBId === debtor) {
                await docRef.update({
                  userACredit: Number((data.userACredit - amount).toFixed(2)),
                  lastUpdated: new Date().toISOString(),
                  relatedExpenseId: updatedRelated,
                });
              } else if (data.userAId === debtor && data.userBId === creditor) {
                await docRef.update({
                  userBCredit: Number((data.userBCredit - amount).toFixed(2)),
                  lastUpdated: new Date().toISOString(),
                  relatedExpenseId: updatedRelated,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating balances on new expense:", error);
    }
  }
);


export const sendPushNotification = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const { toUserId, title, body } = req.body;

      const message = {
        notification: { title, body },
        token: toUserId,
      };

      await admin.messaging().send(message);

      return res.status(200).send('Push Notification gesendet');
    } catch (error) {
      console.error('Fehler beim Senden der Benachrichtigung:', error);
      return res.status(500).send(error.toString());
    }
  });
});
