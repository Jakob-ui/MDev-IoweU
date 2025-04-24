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
  onSnapshot,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { elementAt } from 'rxjs';
import { Categories } from './objects/Categories';
import { Storage } from '@angular/fire/storage';
import { UserService } from './user.service';
import { ImageService } from './image.service';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  public router = inject(Router);
  public firestore: Firestore = inject(Firestore);
  private userService = inject(UserService);
  private imageService = inject(ImageService);

  currentGroup: Groups | null = null;

  setGroup(group: Groups): void {
    this.currentGroup = group;
  }

  getGroup(): Groups | null {
    return this.currentGroup;
  }

  //Gruppe erstellen, Founder wird automatisch der erstellende User:
  async createGroup(
    name: string,
    founder: Users,
    template: string,
    groupImage: any
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
            sumExpenseAmount: 0,
            countExpenseAmount: 0,
            sumAmountReceived: 0,
            countAmountReceived: 0,
            sumExpenseMemberAmount: 0,
            countExpenseMemberAmount: 0,
            sumAmountPaid: 0,
            countAmountPaid: 0,
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
        newGroup.features.push(
          'Finanzübersicht',
          'Ausgaben',
          'Einkaufsliste',
          'Anlagegüter'
        );
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

      //Bild hochladen
      if (groupImage) {
        const imageUrl = await this.imageService.uploadImage(
          newGroup.groupId,
          groupImage,
          `groups/${newGroup.groupId}/groupImage`
        );
        await updateDoc(doc(this.firestore, 'groups', newGroup.groupId), {
          groupimage: imageUrl,
        });
        console.log('Group image URL updated:', imageUrl);
      }

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
    features: string[],
    photo: File | null
  ): Promise<void> {
    const group = await this.getGroupById(groupId);
    if (group && uid === group.founder) {
      try {
        const groupRef = doc(this.firestore, 'groups', groupId);

        let photoUrl = group.groupimage;
        if (photo) {
          photoUrl = await this.imageService.uploadImage(
            groupId,
            photo,
            `groups/${groupId}/groupImage`
          );
        }

        // Aktualisiere die Gruppe in der Datenbank
        await updateDoc(groupRef, {
          groupname: name,
          features: features, // Aktualisiere das features-Feld
          groupimage: photoUrl,
        });

        console.log('Group updated successfully!');
      } catch (error) {
        console.error('Error updating group: ', error);
      }
    } else {
      console.log('Only the founder can update the group!');
    }
  }

  //Gruppe löschen (nur als Gründer*in möglich):
  async deleteGroup(uid: string, groupId: string): Promise<void> {
    try {
      const groupRef = doc(this.firestore, 'groups', groupId); // Holen der Gruppenreferenz
      if (uid) {
        await deleteDoc(groupRef); // Löschen der Gruppe
        await this.removeUserFromGroup(groupId);
        console.log('Gruppe erfolgreich gelöscht!');
      } else {
        throw new Error('Fehler: UID nicht gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Gruppe:', error);
    }
  }

  async removeUserFromGroup(groupId: string): Promise<void> {
    try {
      const usersRef = collection(this.firestore, 'users');

      const usersQuery = query(
        usersRef,
        where('groupId', 'array-contains', groupId)
      );
      const userSnapshot = await getDocs(usersQuery);

      if (!userSnapshot.empty) {
        // Iteriere über alle Benutzer, die die groupId haben
        for (const userDoc of userSnapshot.docs) {
          const userData = userDoc.data();
          const updatedGroupIds = (userData['groupId'] || ['']).filter(
            (id: string) => id !== groupId
          );

          const userRef = doc(this.firestore, 'users', userDoc.id);
          await updateDoc(userRef, { groupId: updatedGroupIds });
          console.log(
            `groupId "${groupId}" aus Benutzer "${userDoc.id}" entfernt.`
          );
        }
      } else {
        console.log(
          `Keine Benutzer gefunden, die die groupId "${groupId}" haben.`
        );
      }
    } catch (error) {
      console.error('Fehler beim Entfernen der groupId aus Benutzern:', error);
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
            sumExpenseAmount: 0,
            countExpenseAmount: 0,
            sumAmountReceived: 0,
            countAmountReceived: 0,
            sumExpenseMemberAmount: 0,
            countExpenseMemberAmount: 0,
            sumAmountPaid: 0,
            countAmountPaid: 0,
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

  // Features hinzufügen
  async addFeaturesToGroup(
    uid: string,
    groupId: string,
    newFeatures: string[]
  ): Promise<void> {
    try {
      // Hole die Gruppe aus der DB
      const group = await this.getGroupById(groupId);
      if (!group) {
        console.error(`Gruppe mit ID ${groupId} wurde nicht gefunden.`);
        return;
      }

      // Überprüfe, ob der Nutzer der Gründer der Gruppe ist
      if (group.founder !== uid) {
        console.warn('Nur der Gründer kann Features hinzufügen.');
        return;
      }

      // Hole die bestehenden Features der Gruppe
      const existingFeatures = group.features || [];
      const featuresToAdd = newFeatures.filter(
        (f) => !existingFeatures.includes(f)
      );

      if (featuresToAdd.length === 0) {
        console.log('Keine neuen Features zum Hinzufügen.');
        return;
      }

      // Füge neue Features hinzu
      const updatedFeatures = [...existingFeatures, ...featuresToAdd];

      // Aktualisiere die Gruppe in der DB
      const groupRef = doc(this.firestore, 'groups', groupId);
      await updateDoc(groupRef, { features: updatedFeatures });

      console.log('Features erfolgreich hinzugefügt:', featuresToAdd);
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Features:', error);
    }
  }

  //Gruppe verlassen:
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    //Ein User kann nur dann raus wenn seine globale Bilanz 0 beträgt
  }

  async getGroupsByUserId(
    uid: string,
    updateGroupsCallback: (groups: Groups[]) => void
  ): Promise<() => void> {
    const unsub = onSnapshot(
      doc(this.firestore, 'users', uid),
      async (snapshot) => {
        const userSnapshot = snapshot.data();
        const groupIds = userSnapshot?.['groupId'] || [];

        if (groupIds.length > 0) {
          const groupsRef = collection(this.firestore, 'groups');
          const groupsQuery = query(
            groupsRef,
            where('groupId', 'in', groupIds)
          );
          const groupSnapshot = await getDocs(groupsQuery);

          const groups = groupSnapshot.docs.map((doc) => ({
            groupId: doc.id,
            ...doc.data(),
          })) as Groups[];
          updateGroupsCallback(groups); // Aktualisiere die Gruppenliste
        } else {
          console.log('No groups found for this user.');
          updateGroupsCallback([]); // Leere Gruppenliste zurückgeben
        }
      }
    );

    // Gib die Unsubscribe-Funktion zurück, um den Listener bei Bedarf zu entfernen
    return unsub;
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

      // Bild-URL validieren oder abrufen
      if (group.groupimage) {
        try {
          // Optional: Überprüfen, ob die Bild-URL gültig ist
          const response = await fetch(group.groupimage);
          if (!response.ok) {
            console.warn('Ungültige Bild-URL:', group.groupimage);
            group.groupimage = ''; // Setze die Bild-URL auf null, falls ungültig
          }
        } catch (error) {
          console.error('Fehler beim Überprüfen der Bild-URL:', error);
          group.groupimage = ''; // Setze die Bild-URL auf null, falls ein Fehler auftritt
        }
      }

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
        document.documentElement.style.setProperty(
          `--member-color-${member.uid}`,
          member.color
        );
        document.documentElement.style.setProperty(
          `--member-color-background-${member.uid}`,
          memberBackground
        );
      }
    });
  }

  private lightenColor(hex: string, factor: number): string {
    let r = 0,
      g = 0,
      b = 0;
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
    return `#${(
      (1 << 24) |
      (Math.round(r) << 16) |
      (Math.round(g) << 8) |
      Math.round(b)
    )
      .toString(16)
      .slice(1)}`;
  }

  async getEveryMemberOfGroupById(groupId: string): Promise<Members[] | null> {
    try {
      const docRef = doc(this.firestore, 'groups', groupId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const groupData = docSnap.data();
        console.log('Gruppendaten:', groupData); // Debugging-Log

        if (groupData && Array.isArray(groupData['members'])) {
          console.log('Mitglieder gefunden:', groupData['members']); // Debugging-Log
          return groupData['members'] as Members[];
        } else {
          console.log('Keine Mitglieder in der Gruppe gefunden.');
          return [];
        }
      } else {
        console.log('Kein solches Dokument gefunden!');
        return null;
      }
    } catch (e) {
      console.error('Fehler beim Abrufen der Mitglieder:', e);
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
      throw new Error('Error fetching Groups by access code! ' + e);
      return null;
    }
  }

  async getGroupByGroupId(groupId: string): Promise<Groups | null> {
    if (!groupId) {
      console.error('groupId ist undefined. Abfrage abgebrochen.');
      return null;
    }

    console.log('Suche Gruppe mit groupId:', groupId);

    try {
      const groupRef = collection(this.firestore, 'groups');
      const q = query(groupRef, where('groupId', '==', groupId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const group = querySnapshot.docs[0].data() as Groups;
        console.log('Gruppe gefunden:', group);
        return group;
      } else {
        console.warn('Keine Gruppe mit dieser groupId gefunden.');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Gruppe:', error);
      throw error;
    }
  }

  clearGroupData(): void {
    this.currentGroup = null;
    console.log('Gruppendaten wurden zurückgesetzt.');
  }
}
