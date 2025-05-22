import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import * as functions from "firebase-functions";
import cors from "cors";
import {onRequest} from "firebase-functions/v2/https";

import {
  onDocumentWritten,
  Change,
  FirestoreEvent,
  DocumentSnapshot,
} from "firebase-functions/v2/firestore";
import { group } from "console";

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
const corsHandler = cors({origin: true});

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

// Update der Mitgliedsummen und Bilanzen bei Änderungen in den Transaktionen und Ausgaben:

// 1. Updaten der Mitgliedsummen bei Änderung der Transaktionen
export const updateGroupSumsOnTransactionChange = onDocumentWritten(
  "groups/{groupId}/transactions/{transactionId}",
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const groupId = event.params.groupId;

    try {
      // Neue oder gelöschte Transaktion
      const newTransaction = event.data?.after?.data();
      const oldTransaction = event.data?.before?.data();
      // Referenz zur Gruppe
      const groupRef = firestore.collection("groups").doc(groupId);
      const groupSnapshot = await groupRef.get();
      if (!groupSnapshot.exists) {
        console.error(`Gruppe mit der ID ${groupId} nicht gefunden.`);
        return;
      }
      const groupData = groupSnapshot.data();

      let groupMembers = groupData?.members || [];

      // Aktualisierung der MemberSums
      if (newTransaction && !oldTransaction) 
      {
        // Neue Transaktion hinzugefügt
        for (const groupMember of groupMembers) {
          if (groupMember.uid === newTransaction.from) // Wenn das Gruppenmitglied überweist
          {
            groupMember.sumAmountPaid += newTransaction.amount;
            groupMember.countAmountPaid += 1;
          }
          if (groupMember.uid === newTransaction.to) // Wenn dem Gruppenmitglied überwiesen wird
          {
            groupMember.sumAmountReceived += newTransaction.amount;
            groupMember.countAmountReceived += 1;
          }
        }
      }
      else if (!newTransaction && oldTransaction) 
      {
        // Transaktion gelöscht
        for (const groupMember of groupMembers) {
          if (groupMember.uid === oldTransaction.from) // Wenn das Gruppenmitglied der überweisende war
          {
            groupMember.sumAmountPaid -= oldTransaction.amount;
            groupMember.countAmountPaid -= 1;
          }
          if (groupMember.uid === oldTransaction.to) // Wenn dem Gruppenmitglied überwiesen wurde
          {
            groupMember.sumAmountReceived -= oldTransaction.amount;
            groupMember.countAmountReceived -= 1;
          }
        }
      } 
      // Gruppe aktualisieren
      await groupRef.update({
        members: groupMembers
      });

      console.log(`Summen für Gruppe ${groupId} erfolgreich aktualisiert.`);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Gruppensummen:", error);
    }
  }
);

// 2. Updaten der Gruppensummen sowie Mitgliedsummen bei Änderung der Ausgaben
export const updateGroupSumsOnExpenseChange = onDocumentWritten(
  "groups/{groupId}/expenses/{expenseId}",
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const groupId = event.params.groupId;

    try {
      // Neue oder aktualisierte Ausgabe
      const newExpense = event.data?.after?.data();
      console.log("New Expense data: ", newExpense);
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
      let groupMembers = groupData?.members || [];
      console.log("Group Members: ", groupMembers);

      // Summen und Zähler aktualisieren
      if (newExpense && !oldExpense) {
        // Neue Ausgabe hinzugefügt
        sumTotalExpenses += newExpense.totalAmount || 0;
        countTotalExpenses += 1;
        // MemberSums bei neuer Ausgabe aktualisieren
        for(const groupMember of groupMembers) 
        {
          for(const expenseMember of newExpense.expenseMember)
          {
            if(groupMember.uid === expenseMember.memberId) // Finde den Match zwischen Gruppenmitglied und Ausgabenmitglied
            {
              if(groupMember.uid == newExpense.paidBy) // Jeweiliger User ist der, die die Ausgabe bezahlt hat
              {
                groupMember.sumExpenseAmount += newExpense.totalAmount;
                groupMember.sumExpenseMemberAmount += expenseMember.amountToPay;
                groupMember.countExpenseAmount += 1;
              }
              else // Jeweiliger User ist der, die an der Ausgabe nur beteiligt war
              {
                groupMember.sumExpenseMemberAmount += expenseMember.amountToPay;
                groupMember.countExpenseMemberAmount += 1;
              }
            }
          }
        }
      } else if (!newExpense && oldExpense) {
        // Ausgabe gelöscht
        sumTotalExpenses -= oldExpense.totalAmount || 0;
        countTotalExpenses -= 1;
        // MemberSums bei gelöschter Ausgabe aktualisieren
        for(const groupMember of groupMembers) 
        {
          for(const expenseMember of oldExpense.expenseMember)
          {
            if(groupMember.uid === expenseMember.memberId) // Finde den Match zwischen Gruppenmitglied und Ausgabenmitglied
            {
              if(groupMember.uid == oldExpense.paidBy) // Jeweiliger User ist der, die die Ausgabe bezahlt hat
              {
                groupMember.sumExpenseAmount -= oldExpense.totalAmount;
                groupMember.sumExpenseMemberAmount -= expenseMember.amountToPay;
                groupMember.countExpenseAmount -= 1;
              }
              else // Jeweiliger User ist der, die an der Ausgabe nur beteiligt war
              {
                groupMember.sumExpenseMemberAmount -= expenseMember.amountToPay;
                groupMember.countExpenseMemberAmount -= 1;
              }
            }
          }
        }
      } else if (newExpense && oldExpense) {
        // Ausgabe aktualisiert
        sumTotalExpenses += newExpense.totalAmount - oldExpense.totalAmount;
          // MemberSums bei aktualisierter Ausgabe aktualisieren:

          // A. Lösche die Daten der alten Ausgabe
        for(const groupMember of groupMembers)
        {
          for(const oldExpenseMember of oldExpense.expenseMember) 
          {
            if(groupMember.uid === oldExpenseMember.memberId) // Finde den Match zwischen Gruppenmitglied und Ausgabenmitglied
            {
              if(groupMember.uid == oldExpense.paidBy) // Jeweiliger User ist der, die die Ausgabe bezahlt hat
              {
                groupMember.sumExpenseAmount -= oldExpense.totalAmount;
                groupMember.sumExpenseMemberAmount -= oldExpenseMember.amountToPay;
                groupMember.countExpenseAmount -= 1;
              }
              else // Jeweiliger User ist der, die an der Ausgabe nur beteiligt war
              {
                groupMember.sumExpenseMemberAmount -= oldExpenseMember.amountToPay;
                groupMember.countExpenseMemberAmount -= 1;
              }
            }
          }
        }
        // B. Füge die Daten der neuen Ausgabe hinzu
        for(const groupMember of groupMembers)
        {
          for(const newExpenseMember of newExpense.expenseMember) 
          {
            if(groupMember.uid === newExpenseMember.memberId) // Finde den Match zwischen Gruppenmitglied und Ausgabenmitglied
            {
              if(groupMember.uid == newExpense.paidBy) // Jeweiliger User ist der, die die Ausgabe bezahlt hat              firebase --version
              {
                groupMember.sumExpenseAmount += newExpense.totalAmount;
                groupMember.sumExpenseMemberAmount += newExpenseMember.amountToPay;
                groupMember.countExpenseAmount += 1;
              }
              else // Jeweiliger User ist der, die an der Ausgabe nur beteiligt war
              {
                groupMember.sumExpenseMemberAmount += newExpenseMember.amountToPay;
                groupMember.countExpenseMemberAmount += 1;
              }
            }
          }
        }
      }

      // Gruppe aktualisieren
      await groupRef.update({
        sumTotalExpenses,
        countTotalExpenses,
        members: groupMembers,
      });

      console.log(`Summen für Gruppe ${groupId} erfolgreich aktualisiert.`);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Gruppensummen:", error);
    }
  }
);

// 3. Updaten der Bilanzen bei Änderung der Ausgaben
export const updateBalancesOnExpenseChange = onDocumentWritten(
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
      if (newExpense) 
      {
        // Ausgabe hinzugefügt
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

      if (!newExpense && oldExpense) 
      {
        // Ausgabe gelöscht
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
      if(oldExpense&&newExpense)
      {
        //Ausgabe aktualisiert

        // A. Lösche die Daten der alten Ausgabe
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

              if (data.userAId === creditor && data.userBId === debtor) {
                await docRef.update({
                  userACredit: Number((data.userACredit - amount).toFixed(2)),
                  lastUpdated: new Date().toISOString(),
                });
              } else if (data.userAId === debtor && data.userBId === creditor) {
                await docRef.update({
                  userBCredit: Number((data.userBCredit - amount).toFixed(2)),
                  lastUpdated: new Date().toISOString(),
                });
              }
            }
          }
        }
        // B. Füge die Daten der neuen Ausgabe hinzu
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
            }
          }
      }
    } 
  }
    catch (error) 
    {
      console.error("Error updating balances on new expense:", error);
    }
});

// 4. Updaten der Bilanzen bei Änderung der Transaktionen
export const updateBalancesOnTransactionChange = onDocumentWritten(
  "groups/{groupId}/transactions/{transactionId}",
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const groupId = event.params.groupId;

    try 
    {
      // Neue oder gelöschte Transaktion
      const newTransaction = event.data?.after?.data();
      const oldTransaction = event.data?.before?.data();

      const groupRef = firestore.collection("groups").doc(groupId);
      const groupSnapshot = await groupRef.get();

      if (!groupSnapshot.exists) {
        console.error(`Gruppe mit der ID ${groupId} nicht gefunden.`);
        return;
      }
      console.log("New transaction detected: ", newTransaction);
      const balancesRef = firestore.collection(`groups/${groupId}/balances`);
      if (newTransaction && !oldTransaction)
      {
        // Neue Transaktion hinzugefügt
        const creditor = newTransaction.to;
        const debtor = newTransaction.from;
        const amount = newTransaction.amount;
        const snap1 = await balancesRef
              .where("userAId", "==", creditor)
              .where("userBId", "==", debtor)
              .get();

        const snap2 = await balancesRef
              .where("userAId", "==", debtor)
              .where("userBId", "==", creditor)
              .get();

            const docs = [...snap1.docs, ...snap2.docs];
        console.log("Balance docs: ", docs);
        if (docs.length > 0) 
        {
          const docRef = docs[0].ref;
          const balanceData = docs[0].data() as any;
          if (balanceData.userAId === creditor && balanceData.userBId === debtor) // User B überweist dem User A
          {
            balanceData.userACredit -= amount;
            balanceData.relatedTransactionId.push(newTransaction.transactionId);
            await docRef.update({
            lastUpdated: new Date().toISOString(),
            userACredit: balanceData.userACredit,
          });
          console.log("Case 1 balance data", balanceData);
          }
          else if (balanceData.userAId === debtor && balanceData.userBId === creditor) // User A überweist dem User B
          {
            balanceData.userBCredit -= amount;
            balanceData.relatedTransactionId.push(newTransaction.transactionId);
            await docRef.update({
            lastUpdated: new Date().toISOString(),
            userBCredit: balanceData.userBCredit,
          });
          console.log("Case 2 balance data", balanceData);
          }
        }
      }
      else if (!newTransaction && oldTransaction)
      {
        // Transaktion gelöscht
        const creditor = oldTransaction.to;
        const debtor = oldTransaction.from;
        const amount = oldTransaction.amount;
        const snap1 = await balancesRef
              .where("userAId", "==", creditor)
              .where("userBId", "==", debtor)
              .get();

        const snap2 = await balancesRef
              .where("userAId", "==", debtor)
              .where("userBId", "==", creditor)
              .get();

            const docs = [...snap1.docs, ...snap2.docs];
        if (docs.length > 0) 
        {
          const docRef = docs[0].ref;
          const balanceData = docs[0].data() as any;
          if (balanceData.userAId === creditor && balanceData.userBId === debtor) // Die Überweisung vom User B zum User A wird gelöscht
          {
            balanceData.userACredit += amount;
            await docRef.update({
            lastUpdated: new Date().toISOString(),
            userACredit: balanceData.userACredit,
          });
          }
          else if (balanceData.userAId === debtor && balanceData.userBId === creditor) // Die Überweisung vom User A zum User B wird gelöscht
          {
            balanceData.userBCredit += amount;
            await docRef.update({
            lastUpdated: new Date().toISOString(),
            userBCredit: balanceData.userBCredit,
          });
          }
        }
      }
    }
    catch (error) {
      console.error("Error updating balances on new transaction:", error);
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

export const sendPushNotification = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const {toUserId, title, body} = req.body;

      const message = {
        notification: {title, body},
        token: toUserId,
      };

      await admin.messaging().send(message);

      return res.status(200).send("Push Notification gesendet");
    } catch (error : any) {
      console.error("Fehler beim Senden der Benachrichtigung:", error);
      return res.status(500).send(error.toString());
    }
  });
});
