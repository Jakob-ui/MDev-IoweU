import { inject, Injectable } from '@angular/core';
import { Group } from './objects/Group';
import { User } from './objects/User';
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
  providedIn: 'root'
})
export class GroupService {

public firestore: Firestore = inject(Firestore);
public router = inject(Router);

//Gruppe erstellen:
async createGroup(name: string, founder: string, template: string, groupImage: string): Promise<string> 
{
  try 
  {
    const groupCollection = collection(this.firestore, 'groups');
    const newGroupRef = doc(groupCollection);
    
    const newGroup: Group = {
      id: newGroupRef.id,
      name: name,
      foundationdate: new Date(),
      founder: founder,
      template: template,
      members: [founder], // Include founder in members array
      accessCode: Math.floor(10000 + Math.random() * 90000),
      groupImage: groupImage,
    };

    await setDoc(newGroupRef, newGroup); // Ensure data is set before proceeding
    return newGroupRef.id;
  } 
  catch (error) 
  {
    console.error('Error creating group:', error);
    throw error;
  }
}

  //Gruppe bearbeiten (nur als Gründer*in möglich):
  async updateGroup(uid: string, groupId: string, name: string, template: string, photo: string): Promise<void> 
  {
    if(uid == (await this.getGroupById(groupId)).founder)
    {
      try {
        const groupRef = doc(this.firestore, 'groups', groupId);
        // Update the group document in Firestore (template, photo, name)
        await updateDoc(groupRef, 'name', name, 'template', template, 'groupImage', photo);
        console.log('Group updated successfully!');
      } catch (error) {
        console.error('Error updating group: ', error);
      }
    }
    else
    {
      console.log('Only the founder can update the group!');
    }
  }

  //Gruppe löschen (nur als Gründer*in möglich):
  async deleteGroup(uid: string, group: Group): Promise<void> 
  {
    try 
    {
      const groupRef = doc(this.firestore, 'groups', group.id);
      // Delete the group document from Firestore
      if(uid === group.founder) 
      {
        await deleteDoc(groupRef);
        console.log('Group deleted successfully!');
      } 
      else
      {
        console.log('Only the founder can delete the group!');
      }
    }
    catch (error) 
    {
      console.error('Error deleting group: ', error);
    }
  }
  async joinGroup(groupId: string, userId: string, accessCode: number): Promise<void> 
  {
    try
    {
      const groupRef = doc(this.firestore, 'groups', groupId);
      const groupSnapshot = await getDoc(groupRef);
      if (groupSnapshot.exists()) {
        const groupData = groupSnapshot.data() as Group;
        if (groupData.accessCode === accessCode) {
          // Add the user to the group's members list
          await addDoc(collection(groupRef, 'members'), { id: userId });
          console.log('User joined the group successfully!');
        } else {
          console.error('Invalid access code!');
        }
      } else {
        console.error('Group not found!');
      }
    }
    catch (error) {
      console.error('Error joining group: ', error);
    }
  }

  //Gruppe verlassen:
  async leaveGroup(groupId: string, userId: string): Promise<void>
  {
    //Ein User kann nur dann raus wenn seine globale Bilanz 0 beträgt
  }
  
  //Eigene Gruppen finden:
  async getGroupsByUserId(uid: string): Promise<Group[]> {
    const groupsRef = collection(this.firestore, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', uid));
    const groupSnapshot = await getDocs(q);
    const groups: Group[] = groupSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[];
    return groups;
  }

  //Bestimmte Gruppe finden:
  async getGroupById(id: string): Promise<Group> {
    try{
      const groupsRef = collection(this.firestore, 'groups');
    const q = query(groupsRef, where('id', '==', id));
    const groupSnapshot = await getDocs(q);
    // if (groupSnapshot.empty) {
    //   return undefined;
    // }
    const group = groupSnapshot.docs[0].data() as Group;
    console.log("Hier erwarten wir group: " + group);
    return group;
    }
    catch(e)
    {
      console.log("Error getting group: " + e)
      return {
        id: '2137',
        name: 'Error',
        foundationdate: new Date(),
        founder: 'Error',
        template: 'Error',
        members: [],
        accessCode: 0,
        groupImage: 'Error',};
    }
    
  }
}

