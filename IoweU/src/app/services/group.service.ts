import { inject, Injectable } from '@angular/core';
import { Group } from './objects/Group';
import { User } from './objects/User';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

private firestore: Firestore = inject(Firestore);

  async createGroup(group: Group): Promise<void> 
  {
    try {
      const docRef = await addDoc(collection(this.firestore, 'groups'), group);
      console.log('Group created with ID: ', docRef.id);
    } catch (error) {
      console.error('Error creating group: ', error);
    }
  }
  //constructor() { }
}
