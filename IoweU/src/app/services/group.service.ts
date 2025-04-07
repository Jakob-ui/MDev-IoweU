import { inject, Injectable } from '@angular/core';
import { Groups } from './objects/Groups';
import { Users } from './objects/Users';
import { Members } from './objects/Members';
import {
  Firestore,
  collection,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  public router = inject(Router);
  public firestore: Firestore = inject(Firestore);

  /*
private idToName(id: string)
{
  const user = this.userList.find(user => user.id === id);
  if (user) {
    return user.name;
  } else {
    console.error('User with ID ' + id + ' not found in userList.');
    return id; // Return the ID itself if the user is not found
  }
}
*/

  /*
private async loadUsers(): Promise<void> {
  try {
    const usersRef = collection(this.firestore, 'users');
    const userSnapshot = await getDocs(usersRef);

    // Map each document to a User object and save it to userList
    this.userList = userSnapshot.docs.map(doc => ({
      ...doc.data() // Spread the document data into the object
    })) as User[];

    console.log('Loaded users: ', this.userList);
  } catch (error) {
    console.error('Error loading users: ', error);
  }
}
*/

  //Gruppe erstellen:
  async createGroup(
    name: string,
    founder: string,
    template: string
  ): Promise<void> {
    try {
      const newGroup: Groups = {
        id: doc(collection(this.firestore, 'groups')).id, // Generate a new document ID
        name: name,
        foundationdate: new Date(),
        founder: founder,
        members: [], // Initialize with an empty array
        groupImage: '',
        accessCode: Math.floor(10000 + Math.random() * 90000), // Initialize with a default value
        features: [],
        expenses: [],
      };
      // Add the founder to the members list:
      newGroup.members.push({
        userId: founder,
        role: 'founder',
        joinedAt: new Date(),
      } as unknown as Members);
      if (template === 'Standard') {
        newGroup.features.push('Finanzübersicht');
      } else if (template === 'Projekt') {
        newGroup.features.push('Finanzübersicht', 'Ausgaben', 'Anlagegüter');
      } else if (template === 'Reise') {
        newGroup.features.push('Finanzübersicht', 'Ausgaben', 'Einkaufsliste');
      }
      const groupRef = await addDoc(
        collection(this.firestore, 'groups'),
        newGroup
      );
      console.log('Groups created with ID: ' + groupRef.id);
      this.router.navigate(['group/' + newGroup.id]);
    } catch (error) {
      console.error('Error creating group: ', error);
    }
  }

  //Gruppe bearbeiten (nur als Gründer*in möglich):
  async updateGroup(
    uid: string,
    groupId: string,
    name: string,
    template: string,
    photo: string
  ): Promise<void> {
    const group = await this.getGroupById(groupId);
    if (group && uid === group.founder) {
      try {
        const groupRef = doc(this.firestore, 'groups', groupId);
        await updateDoc(
          groupRef,
          'name',
          name,
          'template',
          template,
          'groupImage',
          photo
        );
        console.log('Groups updated successfully!');
      } catch (error) {
        console.error('Error updating group: ', error);
      }
    } else {
      console.log('Only the founder can update the group!');
    }
  }

  //Gruppe löschen (nur als Gründer*in möglich):
  async deleteGroup(uid: string, group: Groups): Promise<void> {
    try {
      const groupRef = doc(this.firestore, 'groups', group.id);
      // Delete the group document from Firestore
      if (uid === group.founder) {
        await deleteDoc(groupRef);
        console.log('Groups deleted successfully!');
      } else {
        console.log('Only the founder can delete the group!');
      }
    } catch (error) {
      console.error('Error deleting group: ', error);
    }
  }
  async joinGroup(
    groupId: string,
    userId: string,
    accessCode: number
  ): Promise<void> {
    try {
      const groupRef = doc(this.firestore, 'groups', groupId);
      const groupSnapshot = await getDoc(groupRef);
      if (groupSnapshot.exists()) {
        const groupData = groupSnapshot.data() as Groups;
        if (groupData.accessCode === accessCode) {
          // Add the user to the group's members list
          await addDoc(collection(groupRef, 'members'), { id: userId });
          console.log('User joined the group successfully!');
        } else {
          console.error('Invalid access code!');
        }
      } else {
        console.error('Groups not found!');
      }
    } catch (error) {
      console.error('Error joining group: ', error);
    }
  }

  //Gruppe verlassen:
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    //Ein User kann nur dann raus wenn seine globale Bilanz 0 beträgt
  }

  //Eigene Gruppen finden:
  async getGroupsByUserId(uid: string): Promise<Groups[]> {
    const groupsRef = collection(this.firestore, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', uid));
    const groupSnapshot = await getDocs(q);
    const groups: Groups[] = groupSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Groups[];
    return groups;
  }

  //Bestimmte Gruppe finden:
  async getGroupById(id: string): Promise<Groups | null> {
    try {
      const groupsRef = collection(this.firestore, 'groups');
      const q = query(groupsRef, where('id', '==', id));
      const groupSnapshot = await getDocs(q);
      if (groupSnapshot.empty) {
        console.warn(`No group found with ID: ${id}`);
        return null;
      }
      const group = groupSnapshot.docs[0].data() as Groups;
      return group;
    } catch (e) {
      console.log('Error fetching Groups by id! ' + e);
      return null;
    }
  }
}

