import { inject, Injectable } from '@angular/core';
import { Firestore, setDoc, doc, getDoc } from '@angular/fire/firestore';
import {
  Auth,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  UserCredential,
} from '@angular/fire/auth';
import { Users } from './objects/Users';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  getFirestoreInstance(): import('@firebase/firestore').Firestore {
    throw new Error('Method not implemented.');
  }
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  currentUser: Users | null = null;

  //Holt alle Daten vom user aus der Datenbank
  constructor() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = {
          uid: user.uid,
          username: '',
          email: '',
          color: '',
          lastedited: '',
          groupId: [],
        };
        const groupRef = doc(this.firestore, 'users', user.uid);
        getDoc(groupRef).then((docsnap) => {
          this.firestore;
          if (docsnap.exists()) {
            this.currentUser = {
              uid: user.uid,
              username: docsnap.data()['username'],
              email: docsnap.data()['email'],
              color: docsnap.data()['color'],
              lastedited: docsnap.data()['lastedited'],
              groupId: docsnap.data()['groupId'],
            };
            console.log(
              'Benutzer eingeloggt und in Datenbank geladen',
              this.currentUser
            );
          } else {
            this.currentUser = null;
            console.log(
              'Benutzer eingeloggt, aber nicht in der Datenbank gefunden'
            );
          }
        });
      } else {
        this.currentUser = null;
        console.log('Benutzer nicht eingeloggt');
      }
    });
  }

  //Erstellt einen neuen User im Firebase Auth und der Datenbank
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
    /* versuch user in User Auth zu speichern
    const db = getDatabase();
    update(ref(db, 'users/' + userCredential.user.uid), {
      username: username,
      color: color,
      lastedited: new Date().toISOString(),
      groupId: [],
    });
    */

    if (userCredential.user) {
      const userData: Users = {
        uid: userCredential.user.uid, // UID des Benutzers
        username: username,
        email: email,
        color: color,
        lastedited: new Date().toISOString(),
        groupId: [], // Initialisiere groupId als leeres Array
      };

      //Speichere die Benutzerdaten in Firestore
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

  //Updated den User in Users in Firestore
  private async saveUserData(uid: string, data: Users): Promise<boolean> {
    try {
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

  //Logged den User ein mithilfe der Auth von Firebase
  login(email: string, password: string, rememberMe: boolean): Promise<void> {
    const persistence = rememberMe
      ? browserLocalPersistence
      : browserSessionPersistence;

    return this.auth
      .setPersistence(persistence)
      .then(() => {
        return signInWithEmailAndPassword(
          this.auth,
          email.trim(),
          password.trim()
        ).then(() => {
          console.log('Benutzer erfolgreich eingeloggt.');
        });
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

  resetpassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email.trim(), {
      url: 'http://localhost:8100/login',
    });
  }
}
