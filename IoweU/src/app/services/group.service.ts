import { inject, Injectable } from '@angular/core';
import { Groups } from './objects/Groups';
import { Users } from './objects/Users';
import { Members } from './objects/Members';
import {
  Firestore,
  collection,
  getDocs,
  setDoc,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  public router = inject(Router);
  public firestore: Firestore = inject(Firestore);

  //Gruppe erstellen, Founder wird automatisch der erstellende User:
  async createGroup(
    name: string,
    founder: Users,
    template: string
  ): Promise<void> {
    try {
      const newGroup: Groups = {
        groupId: doc(collection(this.firestore, 'groups')).id,
        groupname: name,
        foundationdate: new Date().toISOString(),
        founder: founder.uid,
        groupimage: '',
        members: [
          {
            uid: founder.uid,
            username: founder.username,
            role: 'founder',
            color: founder.color,
            joinedAt: new Date().toISOString(),
          },
        ],
        accessCode: Math.floor(10000 + Math.random() * 90000).toString(),
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
      // Gruppe in Firestore speichern
      const groupRef = await setDoc(
        doc(this.firestore, 'groups', newGroup.groupId),
        newGroup
      );

      // Benutzer aktualisieren, um die groupId hinzuzufügen
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('uid', '==', founder.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as Users;

        const updatedGroupIds = userData.groupId
          ? [...userData.groupId, newGroup.groupId]
          : [newGroup.groupId];

        await updateDoc(userDoc.ref, { groupId: updatedGroupIds });
        console.log('User updated with new group ID:', newGroup.groupId);
        this.router.navigate(['/group/' + newGroup.groupId]);
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
      throw new Error('Error deleting group: ' + error);
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

        const alreadyMember = groupMembers.some((m) => m.uid === joinee.uid);
        if (!alreadyMember) {
          const newMember: Members = {
            uid: joinee.uid,
            username: joinee.username,
            role: 'member',
            color: joinee.color,
            joinedAt: new Date().toISOString(),
          };
          groupMembers.push(newMember);
          await setDoc(groupRef, { members: groupMembers }, { merge: true });
        } else {
          throw new Error('User is already a member of this group.');
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
        throw new Error(`User with UID ${joinee.uid} not found in Firestore!`);
      }

      // Optional: Weiterleiten zur Gruppe
      this.router.navigate(['/group', groupToJoin.groupId]);
    } catch (error) {
      throw new Error('Error joining group: ' + error);
    }
  }

  //Gruppe verlassen:
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    //Ein User kann nur dann raus wenn seine globale Bilanz 0 beträgt
  }

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

    return groupSnapshot.docs.map((doc) => ({
      groupId: doc.id,
      ...doc.data(),
    })) as Groups[];
  }

  //Bestimmte Gruppe finden:
  async getGroupById(groupId: string): Promise<Groups | null> {
    try {
      if (!groupId) return null;

      // Referenz auf das Gruppen-Dokument
      const groupRef = doc(this.firestore, 'groups', groupId);

      // Abrufen des Snapshots der Gruppe
      const groupSnapshot = await getDoc(groupRef);

      // Überprüfen, ob das Dokument existiert
      if (!groupSnapshot.exists()) {
        console.warn('Gruppe nicht gefunden');
        return null;
      }

      // Die Daten aus dem Snapshot extrahieren und sicherstellen, dass sie dem Groups-Interface entsprechen
      const group = groupSnapshot.data() as Groups;
      group.groupId = groupSnapshot.id; // Gruppennummer hinzufügen (Firestore ID)

      // Farben für Mitglieder anwenden
      this.applyMemberColors(group);

      return group;
    } catch (e) {
      throw new Error('Fehler beim Abrufen der Gruppe nach ID: ' + e);
      return null;
    }
  }

  private applyMemberColors(group: Groups): void {
    group.members.forEach((member) => {
      if (member.color) {
        const memberBackground = this.lightenColor(member.color, 0.9);
        document.documentElement.style.setProperty(`--member-color-${member.uid}`, member.color);
        document.documentElement.style.setProperty(`--member-color-background-${member.uid}`, memberBackground);
      }
    });
  }

  private lightenColor(hex: string, factor: number): string {
    let r = 0, g = 0, b = 0;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    r = Math.min(255, r + (255 - r) * factor);
    g = Math.min(255, g + (255 - g) * factor);
    b = Math.min(255, b + (255 - b) * factor);
    return `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
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
      throw new Error('Error fetching Groups by access code! ' + e);
      return null;
    }
  }
}
