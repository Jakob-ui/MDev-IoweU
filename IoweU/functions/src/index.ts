import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";

initializeApp();

/**
 * Listens for new Firebase Auth user creation events and adds new users
 * to the Firestore collection /users.
 * @param {object} user The user that was created in Firebase Auth.
 * @returns {null|object} The document that was created in Firestore.
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const {email, passwordHash, photoURL: profilepicurl, uid: userid} = user;
  const nickname = null;

  if (!email) {
    console.log("can't create user, user has no email");
    return null;
  }

  const newUser = {
    email,
    nickname,
    passwordHash,
    profilepicurl,
    userid,
    createdAt: new Date(),
    // Add any other default fields you want here
  };

  try {
    const collection = getFirestore().collection("users");
    await collection.doc(userid).set(newUser);

    console.log("collection", collection);
    return {success: true};
  } catch (error) {
    console.error("Error creating user in Firestore", error);
    return null;
  }
});


// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
