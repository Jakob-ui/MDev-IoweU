import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  setDoc,
  doc,
  getDoc,
  arrayUnion,
} from '@angular/fire/firestore';
import {
  Auth,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  UserCredential,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  reload,
  signInWithCredential,
  OAuthProvider,
} from '@angular/fire/auth';
import { Users } from './objects/Users';
import { GroupService } from './group.service';
import { Router } from '@angular/router';
import { PushNotificationService } from './push-notification.service';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private groupService = inject(GroupService);
  private router = inject(Router);
  private pushNotificationService = inject(PushNotificationService);
  currentUser: Users | null = null;
  colorBlindMode: boolean = false;

  passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}$/;

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
          this.colorBlindMode =
            localStorage.getItem('colorBlindMode') === 'true';
          this.applyColorBlindMode(this.colorBlindMode);
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
            this.pushNotificationService.init(this.currentUser as Users);
            // Farben anwenden
            this.applyUserColors(this.currentUser.color);
          } else {
            this.currentUser = null;
            console.log(
              'Benutzer eingeloggt, aber nicht in der Datenbank gefunden'
            );
          }
        });
      } else {
        this.currentUser = null;
        if (!window.location.href.includes('google')) {
          console.log('Benutzer nicht eingeloggt');
        }
      }
    });
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  private applyUserColors(color: string) {
    const background = this.lightenColor(color, 0.9);
    document.documentElement.style.setProperty('--user-color', color);
    document.documentElement.style.setProperty(
      '--user-color-background',
      background
    );
  }

  private lightenColor(hex: string, factor: number): string {
    let r = 0,
      g = 0,
      b = 0;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    r = Math.min(255, r + (255 - r) * factor);
    g = Math.min(255, g + (255 - g) * factor);
    b = Math.min(255, b + (255 - b) * factor);
    return `#${(
      (1 << 24) |
      (Math.round(r) << 16) |
      (Math.round(g) << 8) |
      Math.round(b)
    )
      .toString(16)
      .slice(1)}`;
  }

  async signup(
    email: string,
    password: string,
    username: string,
    color: string,
    groupId: string
  ): Promise<UserCredential> {
    if (!this.passwordRegex.test(password)) {
      throw new Error(
        'Das Passwort muss mindestens 8 Zeichen lang sein und einen Groß-, Kleinbuchstaben, eine Ziffer enthalten.'
      );
    }
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email.trim(),
      password.trim()
    );

    if (userCredential.user) {
      const userData: Users = {
        uid: userCredential.user.uid,
        username: username,
        email: email,
        color: color,
        lastedited: new Date().toISOString(),
        groupId: [],
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

  async googleLogin(
    username: string,
    color: string,
    groupId: string[] = []
  ): Promise<Users | null> {
    try {
      let firebaseUser: any = null;

      if (!Capacitor.isNativePlatform()) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(this.auth, provider);
        firebaseUser = result.user;
      } else {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (!result.credential?.idToken)
          throw new Error('Kein idToken erhalten!');
        const credential = GoogleAuthProvider.credential(
          result.credential.idToken,
          result.credential.accessToken
        );
        const userCredential = await signInWithCredential(
          this.auth,
          credential
        );
        firebaseUser = userCredential.user;
      }

      if (firebaseUser) {
        const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
        const userDocSnap = await getDoc(userDocRef);

        let userDataToSave: Users;

        if (!userDocSnap.exists()) {
          userDataToSave = {
            uid: firebaseUser.uid,
            username: username || firebaseUser.displayName || 'Unnamed User',
            email: firebaseUser.email || '',
            color: color || '#CCCCCC',
            lastedited: new Date().toISOString(),
            groupId: groupId,
          };
          console.log(
            'Neuer Google-Nutzer: Daten werden in Firestore gespeichert.',
            userDataToSave
          );

          const success = await this.saveUserData(
            firebaseUser.uid,
            userDataToSave
          );
          if (!success) {
            throw new Error(
              'Fehler beim Speichern der Benutzerdaten nach dem ersten Google Login.'
            );
          }
          this.currentUser = userDataToSave;
          this.applyUserColors(this.currentUser.color);
        } else {
          const existingUserData = userDocSnap.data() as Users;
          userDataToSave = {
            ...existingUserData,
            lastedited: new Date().toISOString(),
            username:
              existingUserData.username ||
              firebaseUser.displayName ||
              'Unnamed User',
            email: existingUserData.email || firebaseUser.email || '',
          };

          await setDoc(
            userDocRef,
            { lastedited: new Date().toISOString() },
            { merge: true }
          );
          console.log('Existierender Google-Nutzer: lastedited aktualisiert.');

          this.currentUser = userDataToSave;
          this.applyUserColors(this.currentUser.color);
        }
        return userDataToSave;
      }
      return null;
    } catch (error: any) {
      console.error('Fehler beim Google Login:', error);
      throw error;
    }
  }

  async appleLogin(
    username: string,
    color: string,
    groupId: string[] = []
  ): Promise<Users | null> {
    if (Capacitor.isNativePlatform()) {
      return null;
    }
    try {
      let firebaseUser: any = null;

      const result = await FirebaseAuthentication.signInWithApple();
      if (!result.credential?.idToken)
        throw new Error('Kein idToken erhalten!');
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: result.credential.idToken,
        accessToken: result.credential.accessToken,
      });
      const userCredential = await signInWithCredential(this.auth, credential);
      firebaseUser = userCredential.user;

      if (firebaseUser) {
        const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
        const userDocSnap = await getDoc(userDocRef);

        let userDataToSave: Users;

        if (!userDocSnap.exists()) {
          userDataToSave = {
            uid: firebaseUser.uid,
            username: username || firebaseUser.displayName || 'Unnamed User',
            email: firebaseUser.email || '',
            color: color || '#CCCCCC',
            lastedited: new Date().toISOString(),
            groupId: groupId,
          };
          console.log(
            'Neuer Apple-Nutzer: Daten werden in Firestore gespeichert.',
            userDataToSave
          );

          const success = await this.saveUserData(
            firebaseUser.uid,
            userDataToSave
          );
          if (!success) {
            throw new Error(
              'Fehler beim Speichern der Benutzerdaten nach dem ersten Apple Login.'
            );
          }
          this.currentUser = userDataToSave;
          this.applyUserColors(this.currentUser.color);
        } else {
          const existingUserData = userDocSnap.data() as Users;
          userDataToSave = {
            ...existingUserData,
            lastedited: new Date().toISOString(),
            username:
              existingUserData.username ||
              firebaseUser.displayName ||
              'Unnamed User',
            email: existingUserData.email || firebaseUser.email || '',
          };

          await setDoc(
            userDocRef,
            { lastedited: new Date().toISOString() },
            { merge: true }
          );
          console.log('Existierender Apple-Nutzer: lastedited aktualisiert.');

          this.currentUser = userDataToSave;
          this.applyUserColors(this.currentUser.color);
        }
        return userDataToSave;
      }
      return null;
    } catch (error: any) {
      console.error('Fehler beim Apple Login:', error);
      throw error;
    }
  }

  async saveUserData(uid: string, data: Users): Promise<boolean> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      await setDoc(userRef, data);
      this.pushNotificationService.init(this.currentUser as Users);
      console.log('Benutzerdaten erfolgreich gespeichert:', uid);
      return true;
    } catch (e) {
      console.error('Fehler beim Speichern der Benutzerdaten:', e);
      return false;
    }
  }

  async login(email: string, password: string): Promise<void> {
    console.log('starte login funktion');
    let userCredential;
    try {
      if (Capacitor.isNativePlatform()) {
        //userCredential = await FirebaseAuthentication.signInWithEmailAndPassword({ email, password });
        userCredential = await signInWithEmailAndPassword(
          this.auth,
          email.trim(),
          password.trim()
        );
      } else {
        userCredential = await signInWithEmailAndPassword(
          this.auth,
          email.trim(),
          password.trim()
        );
      }
    } catch (e) {
      console.log('login error ios', e);
    }
    const user = userCredential?.user;
    console.log('nach await login funktion');
    if (user) {
      console.log('is user there? login funktion');
      const userDocRef = doc(this.firestore, 'users', user.uid);
      const docsnap = await getDoc(userDocRef);
      if (docsnap.exists()) {
        this.currentUser = {
          uid: user.uid,
          username: docsnap.data()['username'],
          email: docsnap.data()['email'],
          color: docsnap.data()['color'],
          lastedited: docsnap.data()['lastedited'],
          groupId: docsnap.data()['groupId'],
        };
        this.applyUserColors(this.currentUser.color);
        console.log(
          'Benutzer eingeloggt und in Datenbank geladen',
          this.currentUser
        );
        console.log('ende login funktion');
      } else {
        this.currentUser = null;
        throw new Error(
          'Benutzer eingeloggt, aber nicht in der Datenbank gefunden'
        );
      }
    } else {
      this.currentUser = null;
      throw new Error('Login fehlgeschlagen');
    }
  }

  logout(): void {
    this.auth.signOut().then(() => {
      console.log('Benutzer wurde abgemeldet.');

      // Setze alle Benutzerdaten zurück
      this.currentUser = null;
      document.documentElement.style.removeProperty('--user-color');
      document.documentElement.style.removeProperty('--user-color-background');

      // Lösche Gruppendaten und lokale Daten
      this.groupService.clearGroupData();
      localStorage.removeItem('colorBlindMode');
      sessionStorage.clear(); // Lösche alle Daten aus dem Session Storage
      console.log('Lokale und globale Daten wurden gelöscht.');

      // Setze den Zustand des GroupService zurück
      this.groupService.currentGroup = null;

      // Optional: Seite neu laden, um sicherzustellen, dass alles zurückgesetzt wird
      this.router.navigate(['/login']).then(() => {
        window.location.reload();
      });
    });
  }

  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  resetpassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email.trim(), {
      url: 'https://app.ioweu.eu/login',
    });
  }

  applyColorBlindMode(enabled: boolean) {
    if (enabled) {
      document.body.classList.add('color-blind');
    } else {
      document.body.classList.remove('color-blind');
    }
  }

  //-------------Workaround---------------------
  async waitForUser(): Promise<void> {
    const maxRetries = 50; // Maximale Anzahl von Versuchen
    const delay = 100; // Wartezeit
    let retries = 0;

    while (
      (!this.currentUser || this.currentUser.username === '') &&
      retries < maxRetries
    ) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
    }

    if (!this.currentUser || this.currentUser.username === '') {
      throw new Error('Benutzer konnte nicht vollständig geladen werden.');
    }
  }
}
