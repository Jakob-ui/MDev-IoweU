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
import { getDownloadURL, ref, Storage, uploadBytes } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
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
  async uploadImage(
    Id: string,
    imageBlob: Blob,
    path: string
  ): Promise<string> {
    try {
      const storageRef = ref(this.storage, path);
      const uploadResult = await uploadBytes(storageRef, imageBlob);
      console.log('Image uploaded successfully:', uploadResult);

      // Hole die Download-URL des hochgeladenen Bildes
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading group image:', error);
      throw error;
    }
  }

  dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}