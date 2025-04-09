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

  //Gruppe erstellen:
  async createGroup(
    name: string,
    founder: Users, // Der Benutzer, der die Gruppe erstellt
    template: string
  ): Promise<void> {
    try {
      // Neue Gruppe erstellen
      const newGroup: Groups = {
        groupId: doc(collection(this.firestore, 'groups')).id, // Generiere eine neue Dokument-ID
        groupname: name,
        foundationdate: new Date().toISOString(),
        founder: founder.uid, // UID des Gründers
        groupimage: '',
        members: [
          {
            memberId: '1', // Beispiel-ID, kann angepasst werden
            uid: founder.uid,
            username: founder.username,
            role: 'founder',
            color: founder.color,
            joinedAt: new Date().toISOString(),
          },
        ],
        accessCode: Math.floor(10000 + Math.random() * 90000).toString(), // Zufälliger Zugangscode
        features: [],
        expenseId: [],
      };

      // Features basierend auf dem Template hinzufügen
      if (template === 'Standard') {
        newGroup.features.push('Finanzübersicht');
      } else if (template === 'Projekt') {
        newGroup.features.push('Finanzübersicht', 'Ausgaben', 'Anlagegüter');
      } else if (template === 'Reise') {
        newGroup.features.push('Finanzübersicht', 'Ausgaben', 'Einkaufsliste');
      } else {
        newGroup.features.push('Finanzübersicht');
      }
      console.log('New group data:', newGroup);
      // Gruppe in Firestore speichern
      const groupRef = await setDoc(
        doc(this.firestore, 'groups', newGroup.groupId),
        newGroup
      );
      console.log('Group created with ID:', newGroup.groupId);

      // Benutzer aktualisieren, um die groupId hinzuzufügen
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('uid', '==', founder.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]; // Nimm das erste gefundene Dokument
        const userData = userDoc.data() as Users;

        const updatedGroupIds = userData.groupId
          ? [...userData.groupId, newGroup.groupId]
          : [newGroup.groupId];

        await updateDoc(userDoc.ref, { groupId: updatedGroupIds });
        console.log('User updated with new group ID:', newGroup.groupId);
        this.router.navigate(['/groups/' + newGroup.groupId]);
      } else {
        console.error(`User with UID ${founder.uid} not found in Firestore!`);
      }
    } catch (error) {
      console.error('Error creating group:', error);
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
      const groupRef = doc(this.firestore, 'groups', group.groupId);
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
  async joinGroup(joinee: Users, accessCode: string): Promise<void> {
    try {
      const groupToJoin = await this.getGroupByAccessCode(accessCode);
      if (!groupToJoin?.groupId) {
        throw new Error('Group ID is undefined');
      }

      // 1. Mitglied zur Gruppe hinzufügen
      const groupRef = doc(this.firestore, 'groups', groupToJoin.groupId);
      const groupSnapshot = await getDoc(groupRef);

      if (groupSnapshot.exists()) {
        const groupData = groupSnapshot.data() as Groups;
        const groupMembers = groupData.members || [];

        const alreadyMember = groupMembers.some(m => m.uid === joinee.uid);
        if (!alreadyMember) {
          const newMember: Members = {
            memberId: (groupMembers.length + 1).toString(),
            uid: joinee.uid,
            username: joinee.username,
            role: 'member',
            color: joinee.color,
            joinedAt: new Date().toISOString(),
          };
          groupMembers.push(newMember);
          await setDoc(groupRef, { members: groupMembers }, { merge: true });
          console.log('New member added: ' + newMember.username);
        } else {
          console.log('User is already a member of this group.');
        }
      }

      // 2. Gruppe zur User-Datenbank hinzufügen
      const userRef = doc(this.firestore, 'users', joinee.uid);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as Users;
        const userGroupIds = userData.groupId || [];

        if (!userGroupIds.includes(groupToJoin.groupId)) {
          userGroupIds.push(groupToJoin.groupId);
          await setDoc(userRef, { groupId: userGroupIds }, { merge: true });
          console.log('User updated with new group ID:', groupToJoin.groupId);
        }
      } else {
        console.error(`User with UID ${joinee.uid} not found in Firestore!`);
      }

      // Optional: Weiterleiten zur Gruppe
      this.router.navigate(['/group', groupToJoin.groupId]);
    } catch (error) {
      console.error('Error joining group: ', error);
    }
  }

  //Gruppe verlassen:
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    //Ein User kann nur dann raus wenn seine globale Bilanz 0 beträgt
  }

  // Gruppen abrufen, in denen der Benutzer Mitglied ist:
  // Gruppen abrufen, in denen der Benutzer Mitglied ist:
  async getGroupsByUserId(uid: string): Promise<Groups[]> {
    const groupsRef = collection(this.firestore, 'groups');
    const userDocRef = doc(this.firestore, 'users', uid); // Dokument des Benutzers
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) {
      console.error('User not found');
      return [];
    }

    const userData = userSnapshot.data();
    const groupIds = userData?.['groupId'] || [];


    if (groupIds.length === 0) {
      return []; // Keine Gruppen, in denen der Benutzer Mitglied ist
    }

    const groupsQuery = query(groupsRef, where('groupId', 'in', groupIds)); // Filtere Gruppen, deren ID im Array enthalten ist
    const groupSnapshot = await getDocs(groupsQuery);

    return groupSnapshot.docs.map(doc => ({
      groupId: doc.id,
      ...doc.data(),
    })) as Groups[];
  }



  //Gruppe finden nach Founder (der, der die Gruppe erstellt hat):
  async getGroupsByFounder(uid: string): Promise<Groups[]> {
    try {
      const groupsRef = collection(this.firestore, 'groups');
      const q = query(groupsRef, where('founder', '==', uid)); // Gründer-UID verwenden
      const groupSnapshot = await getDocs(q);

      if (groupSnapshot.empty) {
        console.log(`No groups found for founder with UID: ${uid}`);
        return []; // Keine Gruppen gefunden
      }

      // Wenn Gruppen gefunden wurden, geben wir sie zurück
      return groupSnapshot.docs.map(doc => ({
        groupId: doc.id,
        ...doc.data(),
      })) as Groups[];

    } catch (error) {
      console.error('Error fetching groups by founder:', error);
      return []; // Fehlerbehandlung
    }
  }


  //Bestimmte Gruppe finden:
  async getGroupById(id: string): Promise<Groups | null> {
    try {
      if (!id) return null;
      const groupRef = doc(this.firestore, 'groups', id);
      const groupSnapshot = await getDoc(groupRef);
      if (!groupSnapshot.exists()) return null;

      const group = groupSnapshot.data() as Groups;
      group.groupId = groupSnapshot.id;
      return group;
    } catch (e) {
      console.error('Error fetching group by ID: ', e);
      return null;
    }
  }


  async getGroupByAccessCode(accessCode: string): Promise<Groups | null> {
    try {
      const groupsRef = collection(this.firestore, 'groups');
      const q = query(groupsRef, where('accessCode', '==', accessCode));
      const groupSnapshot = await getDocs(q);
      if (groupSnapshot.empty) return null;

      const group = groupSnapshot.docs[0].data() as Groups;
      group.groupId = groupSnapshot.docs[0].id;
      return group;
    } catch (e) {
      console.log('Error fetching Groups by access code! ' + e);
      return null;
    }
  }
}
