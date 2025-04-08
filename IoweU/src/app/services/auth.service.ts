import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
  setDoc,
  doc,
} from '@angular/fire/firestore';
import {
  Auth,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  User,
} from '@angular/fire/auth';
import { Users } from './objects/Users';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  getFirestoreInstance(): import('@firebase/firestore').Firestore {
    throw new Error('Method not implemented.');
  }
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private userService = inject(UserService);
  currentUser: any;

  async signup(
    email: string,
    password: string,
    username: string,
    color: string,
    groupId: string
  ): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email.trim(),
      password.trim()
    );

    if (userCredential.user) {
      const userData: Users = {
        uid: userCredential.user.uid, // UID des Benutzers
        username: username,
        email: email,
        color: color,
        lastedited: new Date().toISOString(),
        groupId: [], // Initialisiere groupId als leeres Array
      };

      // Speichere die Benutzerdaten in Firestore
      const success = await this.saveUserData(
        userCredential.user.uid,
        userData
      );

      if (!success) {
        throw new Error('Fehler beim Speichern der Benutzerdaten.');
      }
    }

    return userCredential;
  }

  private async saveUserData(uid: string, data: Users): Promise<boolean> {
    try {
      // Verwende setDoc, um die UID als Dokument-ID zu setzen
      const userRef = doc(this.firestore, 'users', uid);
      await setDoc(userRef, data);
      console.log(
        'Benutzerdaten erfolgreich gespeichert mit UID als Dokument-ID:',
        uid
      );
      return true;
    } catch (e) {
      console.error('Fehler beim Speichern der Benutzerdaten:', e);
      return false;
    }
  }

  login(email: string, password: string, rememberMe: boolean): Promise<void> {
    const persistence = rememberMe
      ? browserLocalPersistence
      : browserSessionPersistence;

    return setPersistence(this.auth, persistence)
      .then(() => {
        return signInWithEmailAndPassword(
          this.auth,
          email.trim(),
          password.trim()
        );
      })
      .then(async (userCredential) => {
        if (userCredential.user) {
          const uid = userCredential.user.uid;
          const username = await this.userService.getUserthingsByUid(
            uid,
            'username'
          );
          const userColor = await this.userService.getUserthingsByUid(
            uid,
            'color'
          );
          sessionStorage.setItem('username', username);
          sessionStorage.setItem('email', email);
          sessionStorage.setItem('usercolor', userColor);
        } else {
          throw new Error('Benutzer konnte nicht authentifiziert werden.');
        }
      })
      .catch((error) => {
        console.error('Fehler beim Login:', error);
        throw error;
      });
  }

  logout(): void {
    this.auth.signOut().then(() => {
      console.log('Benutzer wurde abgemeldet.');
    });
  }

  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  monitorAuthState(): void {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        console.log('Benutzer eingeloggt:', user);
      } else {
        console.log('Kein Benutzer eingeloggt.');
      }
    });
  }

  getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        resolve(user);
      });
    });
  }

  resetpassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email.trim(), {
      url: 'http://localhost:8100/login',
    });
  }
}
