import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
} from '@angular/fire/firestore';
import {
  Auth,
  UserCredential,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore)

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

    // Benutzerprofil aktualisieren (z. B. Name setzen)
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });

      // Benutzerdaten in Firestore speichern
      await this.saveUserData(userCredential.user.uid, { email, name });
    }

    return userCredential;
  }

  private async saveUserData(uid: string, data: any): Promise<void> {
    console.log('UID aus Parameter:', uid);
    console.log(
      'UID des authentifizierten Benutzers:',
      this.auth.currentUser?.uid
    );

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
        first: 'Ada',
        last: 'Lovelace',
        born: 1815,
      });
      console.log('Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email.trim(), password.trim());
  }
}
