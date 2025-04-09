import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GroupService } from 'src/app/services/group.service';
import { Firestore } from '@angular/fire/firestore';
import { Groups } from 'src/app/services/objects/Groups';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { LoadingService } from 'src/app/services/loading.service';
import { AuthService } from 'src/app/services/auth.service';
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
  private loadingService = inject(LoadingService);
  groupService = inject(GroupService);
  private authService = inject(AuthService);
  firestore = inject(Firestore);
  router = inject(Router);
  private userService = inject(UserService);

  groupname: string = '';
  selectedTemplate: string = '';
  templates: string[] = ['Standard', 'Projekt', 'Reise'];
  groupImage: string | ArrayBuffer | null = null;
  showLabel: boolean = true; // Neue Variable zum Steuern der Label-Anzeige
  newGroup: Groups | null = null; // Initialisierung der newGroup-Variable

  @ViewChild('fileInput') fileInput!: ElementRef;

  async saveGroup() {
    if (!this.groupname || !this.selectedTemplate) {
      console.error('Group name and template are required!');
      alert('Wähle ein Template aus!');
      return;
    }

    const user = this.authService.currentUser;
    if (!user) {
      console.error('User is not logged in!');
      return;
    }

    const founder = user.uid;

    this.loadingService.show(); // Lade-Overlay aktivieren

    try {
      // Hole das vollständige Benutzerobjekt mit getUserData()
      const founder = await this.userService.getUserData();

      // Erstelle die Gruppe mit dem Benutzerobjekt
      await this.groupService.createGroup(
        this.groupname,
        founder,
        this.selectedTemplate
      );
      console.log('Groups successfully created!');
      console.log('Group successfully created!');
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
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
