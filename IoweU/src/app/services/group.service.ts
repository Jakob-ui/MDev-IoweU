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

  async createGroup(id: string, name: string, founder: string, foundationdate: Date, template:string,  members: string[]): Promise<void> 
  {
    try {
      // Add the founder to the members list:
      members.push(founder) // Add founder to members list
      const docRef = await addDoc(collection(this.firestore, 'groups'), {id, name, founder, foundationdate, template});
      // Add members to the group:
      for(let i = 0; i < members.length; i++) {
        const membersRef = await addDoc(collection(this.firestore, 'groups', docRef.id, 'members'), {id: members[i], totalbalance: 0});
        console.log('Member added with ID: ' + membersRef.id);
      }
      console.log('Group created with ID: ' + docRef.id);
    } catch (error) {
      console.error('Error creating group: ', error);
    }
  }
  
  async getGroups(): Promise<Group[]> {
    const groupsRef = collection(this.firestore, 'groups');
    const groupSnapshot = await getDocs(groupsRef);
    const groups: Group[] = groupSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[];
    return groups;
  }
  async getGroupById(id: string): Promise<Group | undefined> {
    const groupsRef = collection(this.firestore, 'groups');
    const q = query(groupsRef, where('id', '==', id));
    const groupSnapshot = await getDocs(q);
    if (groupSnapshot.empty) {
      return undefined;
    }
    const group = groupSnapshot.docs[0].data() as Group;
    return group;
  }
}
