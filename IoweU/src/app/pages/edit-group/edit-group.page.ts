import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GroupService } from 'src/app/services/group.service';
import { LoadingService } from 'src/app/services/loading.service';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonItem,
  IonInput,
  IonList,
  IonIcon,
} from '@ionic/angular/standalone';
import { Members } from 'src/app/services/objects/Members';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-edit-group',
  templateUrl: './edit-group.page.html',
  styleUrls: ['./edit-group.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonItem,
    IonInput,
    IonList,
    IonIcon,
    RouterModule,
    FormsModule,
    CommonModule,
  ],
})
export class EditGroupPage implements OnInit {
  groupname: string = '';
  members: Members[] = [];
  accessCode: string = '';
  selectedTemplate: string[] = [];
  founder: string = '';
  groupImage: string | ArrayBuffer | null = null;
  groupLink: string = '';
  groupId: string = ''; // groupId sollte als String deklariert werden
  userUid: string = ''; // UID des aktuellen Benutzers

  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private authService = inject(AuthService);

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(private router: Router) {}

  ngOnInit() {
    // Verwende authService.getCurrentUser() anstelle von this.auth.currentUser
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userUid = user.uid;
    } else {
      console.error('Benutzer ist nicht authentifiziert');
    }

    this.route.params.subscribe((params) => {
      this.groupId = params['groupId'];
      console.log('groupId:', this.groupId);
      this.loadGroupData(this.groupId); // Lade die Gruppendaten basierend auf der groupId
    });
  }

  async loadGroupData(groupId: string) {
    try {
      this.loadingService.show();
      const group = await this.groupService.getGroupById(groupId);
      if (group) {
        this.groupname = group.groupname;
        this.members = group.members || [];
        this.accessCode = group.accessCode || '';
        this.selectedTemplate = group.features || [];
        this.groupImage = group.groupimage || null;
        this.founder = group.founder || ''; // Gründer der Gruppe
      } else {
        console.error('Gruppe nicht gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Gruppendaten:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  removeMember(member: Members) {
    this.members = this.members.filter((m) => m.uid !== member.uid);
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

  async deleteGroup() {
    try {
      // Überprüfen, ob der aktuelle Benutzer der Gründer ist
      if (this.userUid && this.userUid === this.founder) {
        console.log('Gruppe gelöscht:', this.groupId);
        await this.groupService.deleteGroup(this.userUid, this.groupId);

        // Weiterleiten nach dem Löschen
        this.router.navigate(['/group-overview']);
      } else {
        console.error('Fehler: Nur der Gründer kann die Gruppe löschen');
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Gruppe:', error);
    }
  }

  async confirmDelete() {
    const alert = await this.alertController.create({
      header: 'Gruppe endgültig löschen!',
      message: 'Möchtest du diese Gruppe wirklich löschen?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
          handler: () => {
            console.log('Löschung abgebrochen');
          },
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: () => {
            this.deleteGroup();
          },
        },
      ],
    });

    await alert.present();
  }

  saveeditedGroup() {
    console.log(
      'Gruppe gespeichert:',
      this.groupname,
      this.members,
      this.selectedTemplate,
      this.groupImage
    );
    this.router.navigate([`/group`, this.groupId]);
  }

  generateGroupLink() {
    this.groupLink = `http://localhost:8100/group?id=${this.groupname}`;
    console.log('Gruppenlink generiert:', this.groupLink);
  }
}
