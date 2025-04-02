import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { User } from './objects/User';
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

  async getUserData(): Promise<User> {
    if (!this.auth.currentUser) {
      throw new Error('Benutzer ist nicht authentifiziert.');
    }

    const uid = this.auth.currentUser.uid;
    const username = await this.getUserthingsByUid(uid, 'name');
    const color = await this.getUserthingsByUid(uid, 'color');
    const email = this.auth.currentUser.email || '';
    const img = await this.getUserthingsByUid(uid, 'img');
    const lastedited = await this.getUserthingsByUid(uid, 'lastedited');
    
    return {
      id: uid,
      name: username,
      email: email,
      color: color,
      img: img,
      lastedited: lastedited,
    };
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
}
