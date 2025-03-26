import { inject, Injectable } from '@angular/core';
import { doc, Firestore, setDoc } from '@angular/fire/firestore';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential, createUserWithEmailAndPassword, updateProfile
} from '@angular/fire/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  async signup(email: string, password: string, name: string) : Promise<UserCredential> {
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
    if (!this.auth.currentUser) {
  throw new Error('Benutzer ist nicht authentifiziert.');
}
    const userDoc = doc(this.firestore, `User/${uid}`); // Dokument in der Sammlung "user"
    await setDoc(userDoc, data); // Daten in Firestore speichern
  }

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(
      this.auth,
      email.trim(),
      password.trim()
    );
  }

}
