import { Component, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import {ActivatedRoute, RouterModule} from '@angular/router';
import { GroupService } from 'src/app/services/group.service'; // Importiere den GroupService
import { LoadingService } from 'src/app/services/loading.service';
import { Router } from '@angular/router';
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
import { Groups } from 'src/app/services/objects/Groups';
import { Members } from 'src/app/services/objects/Members';
import {FormsModule} from "@angular/forms";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-group',
  templateUrl: './edit-group.page.html',
  styleUrls: ['./edit-group.page.scss'],
  standalone: true,
  imports: [
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
  ],
})
export class EditGroupPage implements OnInit {
  groupname: string = '';
  newMember: string = '';
  members: Members[] = [];
  selectedTemplate: string[] = [];
  templates: string[] = ['Standard', 'Projekt', 'Reise'];
  groupImage: string | ArrayBuffer | null = null;
  groupLink: string = '';
  groupId: string = '';

  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private route = inject(ActivatedRoute);

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(private router: Router) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.groupId = params['groupId'];  // Make sure the groupId is in the route
      console.log('groupId:', this.groupId);  // Log the groupId to verify it
      this.loadGroupData(this.groupId);
    });
  }


  // Funktion zum Laden der Gruppendaten
  async loadGroupData(groupId: string) {
    try {
      this.loadingService.show(); // Lade-Overlay anzeigen
      const group = await this.groupService.getGroupById(groupId);
      if (group) {
        this.groupname = group.groupname;
        this.members = group.members || [];
        this.selectedTemplate = group.features || []; // Features als Array zuweisen
        this.groupImage = group.groupimage || null;
      } else {
        console.error('Gruppe nicht gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Gruppendaten:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay ausblenden
    }
  }

  addMember() {
    if (this.newMember.trim() !== '') {
      const newMember: Members = {
        uid: `${Date.now()}`, // Generiere eine eindeutige ID für das neue Mitglied
        username: this.newMember.trim(),
        role: 'member', // Standardrolle als 'member'
        color: '', // Definiere eine Farbe oder ein anderes Attribut
        joinedAt: new Date().toISOString(), // Zeitpunkt, wann das Mitglied beigetreten ist
      };
      this.members.push(newMember);
      this.newMember = '';
    }
  }

  removeMember(member: Members) {
    this.members = this.members.filter((m) => m.uid !== member.uid); // Entfernen nach UID
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

  saveeditedGroup() {
    // Hier kannst du das Speichern der bearbeiteten Gruppendaten implementieren
    console.log('Gruppe gespeichert:', this.groupname, this.members, this.selectedTemplate, this.groupImage);

    // Nachdem du die Gruppe gespeichert hast, kannst du zur Gruppe weiterleiten
    this.router.navigate([`/group`, this.groupId]);  // Leitet zur Gruppe mit der groupId weiter
  }


  generateGroupLink() {
    this.groupLink = `http://localhost:8100/group?id=${this.groupname}`;
  }
}
