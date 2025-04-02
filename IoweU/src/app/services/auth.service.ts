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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

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
      const success = await this.saveUserData(userCredential.user.uid, {
        email,
        name,
        color,
        img,
      });

      if (!success) {
        throw new Error('Fehler beim Speichern der Benutzerdaten.');
      }
    }

    return userCredential;
  }

  private async saveUserData(uid: string, data: any): Promise<boolean> {
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
        color: data.color,
        img: data.img,
      });
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
          const username = await this.getUserthingsByUid(uid, 'name');
          const userColor = await this.getUserthingsByUid(uid, 'color');
          sessionStorage.setItem('username', username);
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

  async getUserthingsByUid(uid: string, search: string): Promise<string> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('id', '==', uid));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const data = userDoc.data();
      return data[search];
    }

    throw new Error('Benutzername konnte nicht gefunden werden.');
  }

  resetpassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email.trim(), {
      url: 'http://localhost:8100/login',
    });
  }

  async getUserData(): Promise<{ name: string; email: string }> {
    if (!this.auth.currentUser) {
      throw new Error('Benutzer ist nicht authentifiziert.');
    }

    const uid = this.auth.currentUser.uid;
    const username = await this.getUserthingsByUid(uid, 'name');

    return {
      name: username,
      email: this.auth.currentUser.email || '',
    };
  }
}
