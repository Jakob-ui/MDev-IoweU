import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonLabel, IonInput, IonList, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.page.html',
  styleUrls: ['./create-group.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonLabel, IonInput, IonList, IonSelect, IonSelectOption, RouterModule, FormsModule],
})
export class CreateGroupPage implements OnInit {
  groupname: string = '';
  newMember: string = '';
  members: string[] = [];
  selectedTemplate: string = '';
  templates: string[] = ['Standard', 'Projekt', 'Reise'];
  groupImage: string | ArrayBuffer | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor() {}

  ngOnInit() {}

  addMember() {
    if (this.newMember.trim() !== '') {
      this.members.push(this.newMember.trim());
      this.newMember = '';
    }
  }

  removeMember(member: string) {
    this.members = this.members.filter(m => m !== member);
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
}
