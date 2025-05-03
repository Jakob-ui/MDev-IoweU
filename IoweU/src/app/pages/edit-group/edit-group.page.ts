import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GroupService } from 'src/app/services/group.service';
import { ExpenseService } from 'src/app/services/expense.service';
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
import { ImageService } from 'src/app/services/image.service';


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
  features: string[] = [];
  availableFeatures: string[] = [
    'Einkaufsliste',
    'Anlagegüter',
    'Finanzübersicht',
    'Ausgaben',
  ];
  newFeatures: string[] = [];
  accessCode: string = '';
  selectedTemplate: string[] = [];
  founder: string = '';
  groupImage: string | ArrayBuffer | null = null;
  groupLink: string = '';
  uploadImage: any;
  groupId: string = ''; // groupId sollte als String deklariert werden
  userUid: string = ''; // UID des aktuellen Benutzers
  showQRCode: boolean = false; // Variable zum Steuern der QR-Code-Anzeige
  qrCodeValue: string = ''; // Wert für den QR-Code

  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private authService = inject(AuthService);
  private imageService = inject(ImageService);
  private navController = inject(Router);
  private expenseService = inject(ExpenseService);

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
        this.features = group.features || [];
        this.members = group.members || [];
        this.accessCode = group.accessCode || '';
        this.selectedTemplate = group.features || [];
        this.newFeatures = group.features || [];
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

  isFeatureInDB(feature: string): boolean {
    // Überprüft, ob das Feature in den gespeicherten Features der DB enthalten ist
    return this.features.includes(feature);
  }

  toggleFeatureVisibility(feature: string) {
    // Wenn das Feature bereits in der DB gespeichert ist, entfernen wir es
    if (this.isFeatureInDB(feature)) {
      this.removeFeatures(feature); // Feature entfernen
    } else {
      // Wenn es noch nicht gespeichert ist, fügen wir es hinzu
      this.addFeatures(feature); // Feature hinzufügen
    }
  }

  addFeatures(selectedFeature: string) {
    this.newFeatures.push(selectedFeature);
  }

  removeFeatures(selectedFeature: string) {
    const index = this.newFeatures.indexOf(selectedFeature);
    if (index > - 1) {
      this.newFeatures.splice(index, 1);
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
        if (typeof this.groupImage === 'string') {
          this.uploadImage = this.imageService.dataURLtoBlob(this.groupImage);
        }
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
        message:
          'Sie sind nicht der Gründer dieser Gruppe und können sie daher nicht löschen.',
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

  async saveeditedGroup() {
    await this.groupService.updateGroup(
      this.userUid,
      this.groupId,
      this.groupname,
      this.newFeatures,
      this.uploadImage
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

  async removeMemberFromGroup(member: Members) {
    // Überprüfen, ob der User der Gründer ist
    if (this.userUid !== this.founder) {
      const alert = await this.alertController.create({
        header: 'Aktion nicht erlaubt',
        message: 'Nur der Gründer kann Mitglieder entfernen.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Überprüfe die Balance des Mitglieds
    const hasUnpaidBalance = await this.expenseService.checkMemberBalance(this.groupId, member.uid);
    if (hasUnpaidBalance) {
      const alert = await this.alertController.create({
        header: 'Mitglied kann nicht entfernt werden',
        message: `Mitglied ${member.username} hat noch offene Schulden oder Guthaben und kann nicht entfernt werden.`,
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Bestätigung anzeigen, bevor das Mitglied entfernt wird
    const confirm = await this.alertController.create({
      header: 'Mitglied entfernen',
      message: `Möchtest du ${member.username} wirklich aus der Gruppe entfernen?`,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Entfernen',
          role: 'destructive',
          handler: async () => {
            try {
              // Entferne das Mitglied aus der Gruppe
              await this.groupService.removeUserFromGroupByUid(this.groupId, member.uid);
              this.members = this.members.filter(m => m.uid !== member.uid);
              console.log(`Mitglied ${member.username} entfernt.`);
            } catch (error) {
              console.error('Fehler beim Entfernen des Mitglieds:', error);
              const alert = await this.alertController.create({
                header: 'Fehler',
                message: 'Es gab einen Fehler beim Entfernen des Mitglieds.',
                buttons: ['OK'],
              });
              await alert.present();
            }
          },
        },
      ],
    });

    await confirm.present();
  }


  async leaveGroup(): Promise<void> {
    const group = await this.groupService.getGroupById(this.groupId);

    if (!group) {
      console.error('Gruppe nicht gefunden');
      return;
    }

    if (this.userUid === this.founder) {
      const members = group.members
        .filter((member: any) => member.uid !== this.userUid)
        .map((member: any) => ({
          ...member,
          role: member.role === 'founder' ? 'founder' : 'member' as 'member' | 'founder',
        }));

      const alert = await this.alertController.create({
        header: 'Neuen Gründer festlegen',
        message: 'Bevor du die Gruppe verlässt, musst du einen neuen Gründer festlegen.',
        inputs: members.map((member: any) => ({
          name: 'newFounder',
          type: 'radio', // ✔ gültiger Typ
          label: member.username,
          value: member.uid,
          checked: false,
        })),
        buttons: [
          {
            text: 'Abbrechen',
            role: 'cancel',
          },
          {
            text: 'Bestätigen',
            handler: async (selectedUid) => {
              if (selectedUid) {
                await this.groupService.setNewFounder(this.groupId, this.userUid, selectedUid);
                await this.groupService.removeUserFromGroupByUid(this.groupId, this.userUid);
                const alertSuccess = await this.alertController.create({
                  header: 'Gruppe verlassen',
                  message: 'Du hast die Gruppe erfolgreich verlassen.',
                  buttons: ['OK'],
                });
                await alertSuccess.present();
                this.router.navigate(['/group-overview']);
              }
            },
          },
        ],
      });

      await alert.present();
    } else {
      // Gründer verlässt die Gruppe ohne Notwendigkeit zur Auswahl eines neuen Gründers
      const confirm = await this.alertController.create({
        header: 'Gruppe verlassen',
        message: 'Möchtest du diese Gruppe wirklich verlassen? Du kannst später wieder eingeladen werden.',
        buttons: [
          {
            text: 'Abbrechen',
            role: 'cancel',
          },
          {
            text: 'Verlassen',
            role: 'destructive',
            handler: async () => {
              try {
                // Entferne das Mitglied aus der Gruppe
                await this.groupService.removeUserFromGroupByUid(this.groupId, this.userUid);

                // Optional: Weiterleitung und Bestätigung
                const alert = await this.alertController.create({
                  header: 'Gruppe verlassen',
                  message: 'Du hast die Gruppe erfolgreich verlassen.',
                  buttons: ['OK'],
                });
                await alert.present();

                // Weiterleitung zur Gruppenübersicht
                this.router.navigate([`/groups-overview`]);
              } catch (error) {
                console.error('Fehler beim Verlassen der Gruppe:', error);
                const alertError = await this.alertController.create({
                  header: 'Fehler',
                  message: 'Es gab einen Fehler beim Verlassen der Gruppe.',
                  buttons: ['OK'],
                });
                await alertError.present();
              }
            },
          },
        ],
      });

      await confirm.present();
    }
  }

}

