import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Users } from './objects/Users';
import {
  collection,
  Firestore,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  constructor() {}

  async getUserData(): Promise<Users> {
    if (!this.auth.currentUser) {
      throw new Error('Benutzer ist nicht authentifiziert.');
    }

    const uid = this.auth.currentUser.uid;
    const username = await this.getUserthingsByUid(uid, 'username');
    const color = await this.getUserthingsByUid(uid, 'color');
    const email = this.auth.currentUser.email || '';
    const lastedited = await this.getUserthingsByUid(uid, 'lastedited');
    const groupid = await this.getUserthingsByUid(uid, 'groupId');

    return {
      uid: uid,
      username: username,
      email: email,
      color: color,
      lastedited: lastedited,
    };
  }

  async getUserthingsByUid(uid: string, search: string): Promise<string> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('uid', '==', uid));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const data = userDoc.data();
      return data[search];
    }

    throw new Error('Benutzername konnte nicht gefunden werden.');
  }
}
