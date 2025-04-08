import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonSelect,
  IonSelectOption, IonModal } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
//import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-edit-group',
  templateUrl: './edit-group.page.html',
  styleUrls: ['./edit-group.page.scss'],
  standalone: true,
  imports: [IonModal, 
    IonContent,
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonList,
    IonSelect,
    IonSelectOption,
    RouterModule,
    FormsModule,
    CommonModule,
    //QRCodeComponent,
  ],
})

export class EditGroupPage{
  groupname: string = '';
  newMember: string = '';
  members: string[] = [];
  selectedTemplate: string = '';
  templates: string[] = ['Standard', 'Projekt', 'Reise'];
  groupImage: string | ArrayBuffer | null = null;
  showLabel: boolean = true; // Neue Variable zum Steuern der Label-Anzeige
  groupLink: string = '';

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor() {}

  addMember() {
    if (this.newMember.trim() !== '') {
      this.members.push(this.newMember.trim());
      this.newMember = '';
    }
  }

  removeMember(member: string) {
    this.members = this.members.filter((m) => m !== member);
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

   // Funktion, die den Gruppen-Link erstellt, z.B. durch den Gruppennamen oder eine ID
   generateGroupLink() {
    // Falls du lieber die ID nehmen willst:
    this.groupLink = `http://localhost:8100/group?id=${this.groupname}`;
  }
  
}
