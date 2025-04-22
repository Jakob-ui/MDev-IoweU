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
import { QRCodeComponent } from 'angularx-qrcode';


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
    QRCodeComponent,
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
  showQRCode: boolean = false; // Variable zum Steuern der QR-Code-Anzeige
  qrCodeValue: string = ''; // Wert für den QR-Code

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
    if (this.userUid !== this.founder) {
      // Benutzer ist nicht der Gründer, zeige eine Warnung an
      const alert = await this.alertController.create({
        header: 'Aktion nicht erlaubt',
        message: 'Sie sind nicht der Gründer dieser Gruppe und können sie daher nicht löschen.',
        cssClass: 'custom-alert', // Eigene CSS-Klasse zuweisen
        buttons: [
          {
            text: 'OK',
            role: 'cancel',
            cssClass: 'cancel-button', // Klasse für den OK-Button
          },
        ],
      });
  
      await alert.present();
      return;
    }
  
    // Benutzer ist der Gründer, zeige das Lösch-Popup an
    const alert = await this.alertController.create({
      header: 'Gruppe endgültig löschen!',
      message: 'Möchten Sie diese Gruppe wirklich löschen?',
      cssClass: 'custom-alert', // Eigene CSS-Klasse zuweisen
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
          cssClass: 'cancel-button', // Klasse für den Abbrechen-Button
          handler: () => {
            console.log('Löschung abgebrochen');
          },
        },
        {
          text: 'Löschen',
          role: 'destructive',
          cssClass: 'delete-button', // Klasse für den Löschen-Button
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

  generateQRCode() {
    if (this.accessCode) {
      this.showQRCode = !this.showQRCode; // Zustand umschalten
      if (this.showQRCode) {
        this.qrCodeValue = `http://localhost:8100/group/${this.groupId}`; // QR-Code-Daten setzen
        console.log('Generated QR Code URL:', this.qrCodeValue);
      } else {
        this.qrCodeValue = ''; // QR-Code-Daten zurücksetzen, wenn ausgeblendet
        console.log('QR Code hidden');
      }
    }
  }
}

