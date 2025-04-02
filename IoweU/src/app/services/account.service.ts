import { inject, Injectable } from '@angular/core';
import { Auth, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { Firestore, updateDoc } from '@angular/fire/firestore';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { User } from './objects/User';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  constructor() {}

  async userdelete(): Promise<void> {
    if (this.auth.currentUser) {
      try {
        const uid = this.auth.currentUser.uid;

        const usersCollection = collection(this.firestore, 'users');
        const q = query(usersCollection, where('id', '==', uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await deleteDoc(userDoc.ref);
          console.log('Benutzerdaten aus der Datenbank gelöscht.');
        } else {
          console.warn(
            'Benutzerdaten konnten in der Datenbank nicht gefunden werden.'
          );
        }

        await this.auth.currentUser.delete();
        console.log('Benutzer wurde erfolgreich gelöscht.');
      } catch (error) {
        console.error('Fehler beim Löschen des Benutzers:', error);
        throw error;
      }
    } else {
      console.error('Kein Benutzer ist aktuell eingeloggt.');
      throw new Error('Kein Benutzer ist aktuell eingeloggt.');
    }
  }

  async userupdate(updateData: Partial<User>): Promise<void> {
    if (this.auth.currentUser) {
      const uid = this.auth.currentUser.uid;

      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('id', '==', uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        try {
          // Aktualisiere mehrere Felder gleichzeitig
          await updateDoc(userDoc.ref, updateData);
          console.log('Benutzerdaten erfolgreich aktualisiert:', updateData);
        } catch (error) {
          console.error('Fehler beim Aktualisieren der Benutzerdaten:', error);
          throw error;
        }
      } else {
        console.warn(
          'Benutzerdaten konnten in der Datenbank nicht gefunden werden.'
        );
      }
    } else {
      console.error('Kein Benutzer ist aktuell eingeloggt.');
      throw new Error('Kein Benutzer ist aktuell eingeloggt.');
    }
  }
}