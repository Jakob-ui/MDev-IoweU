//Import function triggers from their respective submodules:

 //import {onCall} from "firebase-functions/v2/https";
 //import {onDocumentWritten} from "firebase-functions/v2/firestore";
 
 //See a full list of supported triggers at https://firebase.google.com/docs/functions


//import {onRequest} from "firebase-functions/v2/https";
//import * as logger from "firebase-functions/logger";
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(); // VERY IMPORTANT!

export const createUserDocument = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName } = user;

  try {
    await admin.firestore().collection('users').doc(uid).set({
      uid: uid,
      email: email || null,
      displayName: displayName || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`User document created for user: ${uid}`);
  } catch (error) {
    console.error('Error creating user document:', error);
  }
});

export const deleteUserDocument = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  try {
    await admin.firestore().collection('users').doc(uid).delete();
    console.log(`User document deleted for user: ${uid}`);
  } catch (error) {
    console.error('Error deleting user document:', error);
  }
});



// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
