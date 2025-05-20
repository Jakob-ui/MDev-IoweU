import { inject, Injectable } from '@angular/core';
import {
  Auth,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from '@angular/fire/auth';
import {
  Firestore,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from '@angular/fire/firestore';
import { Users } from './objects/Users';
import { doc, onSnapshot } from 'firebase/firestore';

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
        const q = query(usersCollection, where('uid', '==', uid));
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

  async userupdate(updateData: Partial<Users>): Promise<void> {
    if (this.auth.currentUser) {
      const uid = this.auth.currentUser.uid;

      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('uid', '==', uid));
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

  async updateGroupsWithNewUserData(uid: string, newUsername: string, newColor: string): Promise<void> {
    const groupsCollection = collection(this.firestore, 'groups');
    const snapshot = await getDocs(groupsCollection);

    for (const groupDoc of snapshot.docs) {
      const groupData = groupDoc.data();
      let members = groupData['members'] || [];
      let updated = false;

      members = members.map((member: any) => {
        if (member.uid === uid) {
          updated = true;
          return {
            ...member,
            username: newUsername,
            color: newColor,
          };
        }
        return member;
      });

      if (updated) {
        await updateDoc(groupDoc.ref, { members });
        console.log(`Mitgliedsdaten in Gruppe ${groupDoc.id} aktualisiert.`);
      }
    }
  }

  listenToGroupsWithMembersChanges(
    updateGroupsCallback: (groups: { id: string; members: any[] }[]) => void
  ): () => void {
    const groupsCollection = collection(this.firestore, 'groups');

    const unsubscribe = onSnapshot(groupsCollection, (snapshot) => {
      const groups = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          members: data['members'] || [],
        };
      });
      updateGroupsCallback(groups);
    });

    return unsubscribe;
  }
}
