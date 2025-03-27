import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from '@angular/fire/firestore';
import {
  Auth,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  async signup(
    email: string,
    password: string,
    name: string
  ): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email.trim(),
      password.trim()
    );

    if (userCredential.user) {
      await this.saveUserData(userCredential.user.uid, { email, name });
    }

    return userCredential;
  }

  private async saveUserData(uid: string, data: any): Promise<void> {
    if (!this.auth.currentUser) {
      throw new Error('Benutzer ist nicht authentifiziert.');
    }

    if (this.auth.currentUser.uid !== uid) {
      throw new Error(
        'Die UID des authentifizierten Benutzers stimmt nicht mit der Dokument-ID überein.'
      );
    }
    try {
      const docRef = await addDoc(collection(this.firestore, 'users'), {
        id: uid,
        name: data.name,
        email: data.email,
      });
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  login(email: string, password: string): Promise<string> {
    return signInWithEmailAndPassword(
      this.auth,
      email.trim(),
      password.trim()
    ).then((userCredential) => {
      if (userCredential.user) {
        return userCredential.user.uid;
      }
      throw new Error('Benutzer konnte nicht authentifiziert werden.');
    });
  }

  async getUsernameByUid(uid: string): Promise<string> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('id', '==', uid));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const data = userDoc.data();
      return data['name'];
    }

    throw new Error('Benutzername konnte nicht gefunden werden.');
  }

  resetpassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email.trim(), {
      url: 'http://localhost:8100/login',
    });
  }
}
