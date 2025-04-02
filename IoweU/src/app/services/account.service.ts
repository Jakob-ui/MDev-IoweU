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

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  constructor() { }

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

  async userupdate(updateParam: string, updateData: string): Promise<void> {
    if (this.auth.currentUser) {
      const uid = this.auth.currentUser.uid;

      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('id', '==', uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        try {
          await updateDoc(userDoc.ref, { [updateParam]: updateData });
          console.log(
            `Benutzerfeld "${updateParam}" erfolgreich aktualisiert.`
          );
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Benutzers:', error);
          throw error;
        }
      } else {
        console.warn('Benutzerdaten konnten in der Datenbank nicht gefunden werden.');
      }
    } else {
      console.error('Kein Benutzer ist aktuell eingeloggt.');
      throw new Error('Kein Benutzer ist aktuell eingeloggt.');
    }
  }
}