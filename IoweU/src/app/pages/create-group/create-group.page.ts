import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GroupService } from 'src/app/services/group.service';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Groups } from 'src/app/services/objects/Groups';
import { Router } from '@angular/router';
@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.page.html',
  styleUrls: ['./create-group.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    RouterModule,
    FormsModule,
    CommonModule,
  ],
})
export class CreateGroupPage {
  groupService = inject(GroupService);
  auth = inject(Auth);
  firestore = inject(Firestore);
  router = inject(Router);
  groupname: string = '';
  //newMember: string = '';
  //members: string[] = [];
  selectedTemplate: string = '';
  templates: string[] = ['Standard', 'Projekt', 'Reise'];
  groupImage: string | ArrayBuffer | null = null;
  showLabel: boolean = true; // Neue Variable zum Steuern der Label-Anzeige
  newGroup: Groups | null = null; // Initialisierung der newGroup-Variable

  @ViewChild('fileInput') fileInput!: ElementRef;

  // addMember() {
  //   if (this.newMember.trim() !== '') {
  //     this.members.push(this.newMember.trim());
  //     this.newMember = '';
  //   }
  // }

  // removeMember(member: string) {
  //   this.members = this.members.filter((m) => m !== member);
  // }

  async saveGroup()
  {
    if (!this.groupname || !this.selectedTemplate) {
      console.error('Groups name and template are required!');
      return;
    }
  
    const user = this.auth.currentUser;
    if (!user) {
      console.error('User is not logged in!');
      return;
    }
  
    const founder = user.uid;
  
    try {
      await this.groupService.createGroup(this.groupname, founder, this.selectedTemplate);
      console.log('Groups successfully created!');
    } catch (error) {
      console.error('Error creating group:', error);
    }
  }
  

  selectImage() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.groupImage = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // **Korrekt platzierte Methode**
  onSelectChange() {
    this.showLabel = !this.selectedTemplate;
  }
}
