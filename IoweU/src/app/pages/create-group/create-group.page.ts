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
  IonNote,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GroupService } from 'src/app/services/group.service';
import { Firestore } from '@angular/fire/firestore';
import { Groups } from 'src/app/services/objects/Groups';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { ShoppinglistService } from 'src/app/services/shoppinglist.service';
import { LoadingService } from 'src/app/services/loading.service';
import { AuthService } from 'src/app/services/auth.service';
import { CATEGORIES } from 'src/app/services/objects/Categories';
import { ImageService } from 'src/app/services/image.service';
import {AlertController, ToastController} from "@ionic/angular";

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
    IonNote,
  ],
})
export class CreateGroupPage {
  private loadingService = inject(LoadingService);
  groupService = inject(GroupService);
  private authService = inject(AuthService);
  firestore = inject(Firestore);
  router = inject(Router);
  private userService = inject(UserService);
  private shoppinglistService = inject(ShoppinglistService);
  private imageService = inject(ImageService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  groupname: string = '';
  selectedTemplate: string = '';
  templates: string[] = ['Basic', 'Wohngemeinschaft', 'Reise', 'Projekt'];
  groupImage: string | ArrayBuffer | null = null;
  uploadImage: any;
  showLabel: boolean = true; // Neue Variable zum Steuern der Label-Anzeige
  newGroup: Groups | null = null; // Initialisierung der newGroup-Variable

  defaultCategories = CATEGORIES;

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor() {}

  ionViewWillLeave() {
    this.router.navigate(['/group-overview'], { replaceUrl: true });
  }

  async saveGroup() {
    0;
    if (!this.groupname || !this.selectedTemplate) {
      console.error('Group name and template are required!');
      await this.presentAlert('Fehler','Wähle einen Gruppennamen und Template aus!');
      return;
    }

    const user = this.authService.currentUser;
    if (!user) {
      console.error('User is not logged in!');
      return;
    }

    const founder = user.uid;

    this.loadingService.show();

    try {
      // Hole das vollständige Benutzerobjekt mit getUserData()
      const founder = await this.userService.getUserData();

      // Erstelle die Gruppe mit dem Benutzerobjekt
      await this.groupService.createGroup(
        this.groupname,
        founder,
        this.selectedTemplate,
        this.uploadImage
      );

      const groupId = this.groupService.lastCreatedGroupId;
      await this.shoppinglistService.createEmptyShoppingList(groupId);

      await this.presentToast('Gruppe erfolgreich erstellt!');

      await this.presentToast('Gruppe erfolgreich erstellt!');
      //this.router.navigate(['group', this.groupId]);
      console.log('Group successfully created!');
    } catch (error) {
      console.error('Error creating group:', error);
      await this.presentToast('Fehler beim erstellen der Gruppe!');
    } finally {
      this.loadingService.hide();
    }
  }

  selectImage() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = reader.result as string;
        this.uploadImage = this.imageService.dataURLtoBlob(imageDataUrl);
        this.groupImage = imageDataUrl;
      };
      reader.readAsDataURL(file);
    }
  }

  // **Korrekt platzierte Methode**
  onSelectChange() {
    this.showLabel = !this.selectedTemplate;
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      cssClass: 'custom-toast',
    });
    await toast.present();
  }

}
