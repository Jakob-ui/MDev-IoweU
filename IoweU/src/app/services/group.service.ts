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
  documentId,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { ImageService } from './image.service';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  public router = inject(Router);
  public firestore: Firestore = inject(Firestore);
  private imageService = inject(ImageService);

  public lastCreatedGroupId: string = '';

  currentGroup: Groups | null = null;
  groupCount: number = 0;

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

      this.lastCreatedGroupId = newGroup.groupId;

      // Features basierend auf dem Template hinzufügen
      if (template === 'Basic') {
        newGroup.features.push('Finanzübersicht', 'Ausgaben');
      } else if (template === 'Wohngemeinschaft') {
        newGroup.features.push(
          'Finanzübersicht',
          'Ausgaben',
          'Einkaufsliste',
        );
      } else if (template === 'Reise') {
        newGroup.features.push('Finanzübersicht', 'Ausgaben', 'Einkaufsliste');
      } else if (template === 'Projekt') {
        newGroup.features.push('Finanzübersicht', 'Ausgaben');
      }

      // Gruppe in Firestore speichern
      await setDoc(doc(this.firestore, 'groups', newGroup.groupId), newGroup);

      // Bild hochladen
      if (groupImage) {
        try {
        const imageUrl = await this.imageService.uploadImage(
          newGroup.groupId,
          groupImage,
          `groups/${newGroup.groupId}/groupImage`
        );
        
        
        await updateDoc(doc(this.firestore, 'groups', newGroup.groupId), {
          groupimage: imageUrl,
        });
          console.log('Group image URL updated:', imageUrl);
        } catch (e){
          console.error('Error uploading picture:', e);
        }
      }

      const userRef = doc(this.firestore, 'users', founder.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as Users;
        const updatedGroupIds = userData.groupId
          ? [...userData.groupId, newGroup.groupId]
          : [newGroup.groupId];

        await setDoc(userRef, { groupId: updatedGroupIds }, { merge: true }); // <--- Änderung!
        console.log('User updated with new group ID:', newGroup.groupId);
        this.router.navigate(['/group/' + newGroup.groupId]);
      } else {
        console.error(`User with UID ${founder.uid} not found in Firestore!`);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  }

  listenToGroupChanges(
    groupId: string,
    updateGroupCallback: (group: Groups | null) => void
  ): () => void {
    const groupRef = doc(this.firestore, 'groups', groupId);

    const unsubscribe = onSnapshot(groupRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const groupData = docSnapshot.data() as Groups;
        groupData.groupId = groupId;
        updateGroupCallback(groupData);
      } else {
        console.warn(`Gruppe mit ID ${groupId} nicht gefunden.`);
        updateGroupCallback(null);
      }
    });

    return unsubscribe;
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

  async removeUserFromGroupByUid(
    groupId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // 1. Fetch the group document
      const groupRef = doc(this.firestore, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        console.error(`Group with ID ${groupId} does not exist.`);
        return false;
      }

      const groupData = groupSnap.data();
      const members = groupData['members'] || [];

      // 2. Find the user in the group's members list
      const user = members.find((member: any) => member.uid === userId);
      if (!user) {
        console.error(`User with ID ${userId} is not a member of the group.`);
        return false;
      }

      // 3. Check if the user's total group balance is 0
      const balance1 = user.sumExpenseMemberAmount - user.sumAmountPaid;
      const balance2 = user.sumExpenseAmount - user.sumAmountReceived;

      if (balance1 !== 0 || balance2 !== 0) {
        console.error(
          `User ${userId} cannot be removed because they have an outstanding balance.`
        );
        return false;
      }

      // 4. Remove the user from the group's members list
      const updatedMembers = members.filter(
        (member: any) => member.uid !== userId
      );
      await updateDoc(groupRef, { members: updatedMembers });
      console.log(`User ${userId} removed from group ${groupId}.`);

      // 5. Remove the groupId from the user's document
      const userRef = doc(this.firestore, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedGroupIds = (userData['groupId'] || []).filter(
          (id: string) => id !== groupId
        );
        await updateDoc(userRef, { groupId: updatedGroupIds });
        console.log(`Group ID ${groupId} removed from user ${userId}.`);
        return true;
      }
    } catch (error) {
      console.error('Error removing user from group:', error);
      return false;
    }
    return false; // Ensure a boolean is always returned
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
            where(documentId(), 'in', groupIds) // <--- Jetzt korrekt: documentId() als Funktion aufrufen
          );

          const groupSnapshot = await getDocs(groupsQuery);

          const groups = groupSnapshot.docs.map((doc) => ({
            groupId: doc.id,
            ...doc.data(),
          })) as Groups[];
          updateGroupsCallback(groups);
          this.groupCount = groups.length;
        } else {
          console.log('No groups found for this user.');
          updateGroupsCallback([]);
        }
      }
    );

    return unsub;
  }

  async updateGroupOrder(groupId: string, newPosition: number): Promise<void> {
    try {
      const groupRef = doc(this.firestore, 'groups', groupId);
      await updateDoc(groupRef, { position: newPosition });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Gruppenposition:', error);
    }
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

  async getGroupAboByGroupId(
    groupId: string,
    updateGroupCallback: (group: Groups[]) => void
  ): Promise<() => void> {
    try {
      const groupRef = collection(this.firestore, 'groups');
      const q = query(groupRef, where('groupId', '==', groupId));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          // Mappe die Dokumente auf ein Array von Gruppen
          const group = snapshot.docs.map((doc) => ({
            groupId: doc.id,
            ...doc.data(),
          })) as Groups[];

          // Callback mit den aktualisierten Daten
          updateGroupCallback(group);
        } else {
          console.warn('Keine Gruppe mit dieser groupId gefunden.');
          updateGroupCallback([]);
        }
      });

      // Gib die Unsubscribe-Funktion zurück, um den Listener bei Bedarf zu entfernen
      return unsubscribe;
    } catch (error) {
      console.error('Fehler beim Abrufen der Gruppe:', error);
      throw error;
    }
  }

  clearGroupData(): void {
    this.currentGroup = null;
    console.log('Gruppendaten wurden zurückgesetzt.');
  }

  async setNewFounder(
    groupId: string,
    oldFounderUid: string,
    newFounderUid: string
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      throw new Error('Gruppe nicht gefunden.');
    }

    const groupData = groupSnapshot.data() as Groups;
    const members = groupData.members || [];

    const updatedMembers = members.map((member) => {
      if (member.uid === oldFounderUid) {
        return { ...member, role: 'member' as 'member' };
      }
      if (member.uid === newFounderUid) {
        return { ...member, role: 'founder' as 'founder' };
      }
      return { ...member, role: member.role as 'member' | 'founder' }; // falls role evtl. noch string war
    });

    const updatedGroupData: Partial<Groups> = {
      founder: newFounderUid,
      members: updatedMembers,
    };

    await setDoc(groupRef, updatedGroupData, { merge: true });
  }
}
