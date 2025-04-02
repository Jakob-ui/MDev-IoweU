import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
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
} from '@angular/fire/auth';
import { User } from './objects/User';
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
    name: string,
    color: string,
    img: string
  ): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email.trim(),
      password.trim()
    );

    if (userCredential.user) {
      const userData: User = {
        id: userCredential.user.uid,
        name: name,
        email: email,
        color: color,
        img: img,
      };

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

  private async saveUserData(uid: string, data: User): Promise<boolean> {
    if (!this.auth.currentUser) {
      throw new Error('Benutzer ist nicht authentifiziert.');
    }

    if (this.auth.currentUser.uid !== uid) {
      throw new Error(
        'Die UID des authentifizierten Benutzers stimmt nicht mit der Dokument-ID überein.'
      );
    }
    try {
      const docRef = await addDoc(collection(this.firestore, 'users'), data);
      console.log('Dokument erfolgreich hinzugefügt:', docRef.id);
      return true;
    } catch (e) {
      console.error('Fehler beim Hinzufügen des Dokuments:', e);
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
          const username = await this.userService.getUserthingsByUid(uid, 'name');
          const userColor = await this.userService.getUserthingsByUid(uid, 'color');
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

  resetpassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email.trim(), {
      url: 'http://localhost:8100/login',
    });
  }
}
