import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardSubtitle,
  IonCardTitle, IonList,
} from '@ionic/angular/standalone';
import { NavController, Platform } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-group-overview',
  templateUrl: './group-overview.page.html',
  styleUrls: ['./group-overview.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    RouterModule,
    IonIcon,
    IonCard,
    IonCardSubtitle,
    IonCardTitle,
    IonList,
  ],
})
export class GroupOverviewPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private groupService = inject(GroupService);
  private loadingService = inject(LoadingService);
  private unsubscribeFromGroups: (() => void) | null = null;

  username: string | null = '';
  iosIcons: boolean = false;
  groups: { name: string; myBalance: number; link: string }[] = [];

  draggedGroup: any = null;
  isEditMode = false;
  touchStartY: number | null = null;
  longPressTimeout: any = null;

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();

    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        this.username = this.authService.currentUser.username;
        this.iosIcons = this.platform.is('ios');
        console.log(
          'group overview lodaed: ' + this.authService.currentUser.username
        );

        const userColor = this.authService.currentUser.color;
        document.documentElement.style.setProperty('--user-color', userColor);
        // Gruppen laden
        await this.loadMyGroups();
      } else {
        console.error('No user is logged in.');
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzers oder der Gruppen:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  ngOnDestroy() {
    if (this.unsubscribeFromGroups) {
      this.unsubscribeFromGroups();
      console.log('Unsubscribed from group updates');
    }
  }

  async loadMyGroups() {
    try {
      if (this.authService.currentUser) {
        const uid = this.authService.currentUser.uid;

        // Echtzeit-Updates für Gruppen
        this.unsubscribeFromGroups = await this.groupService.getGroupsByUserId(
          uid,
          (groups) => {
            this.groups = groups.map((group) => ({
              name: group.groupname,
              myBalance: Math.floor(Math.random() * (200 - -200 + 1)) + -200,
              link: group.groupId,
            }));
          }
        );
      }
    } catch (e) {
      console.log('Error loading Groups:', e);
    } finally {
      this.loadingService.hide();
    }
  }

  navigateToGroup(link: string) {
    this.router.navigate(['group/', link]);
  }

  goBack() {
    this.navCtrl.back();
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['login']);
    } catch (e) {
      console.log(e);
    }
  }

  startEditMode() {
    this.isEditMode = true;
  }

  stopEditMode() {
    this.isEditMode = false;
  }

  onLongPressStart(group: any) {
    this.longPressTimeout = setTimeout(() => {
      this.startEditMode();
    }, 500);
  }

  onLongPressCancel() {
    clearTimeout(this.longPressTimeout);
  }

// Für Desktop Drag & Drop
  onDragStart(event: DragEvent, group: any) {
    this.draggedGroup = group;
  }

  onDrop(event: DragEvent, targetGroup: any) {
    event.preventDefault();
    this.swapGroups(targetGroup);
    this.draggedGroup = null;
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  swapGroups(targetGroup: any) {
    const fromIndex = this.groups.indexOf(this.draggedGroup);
    const toIndex = this.groups.indexOf(targetGroup);

    if (fromIndex > -1 && toIndex > -1 && fromIndex !== toIndex) {
      const updatedGroups = [...this.groups];
      const [moved] = updatedGroups.splice(fromIndex, 1);
      updatedGroups.splice(toIndex, 0, moved);
      this.groups = updatedGroups;
    }
  }

// Für Touch Drag & Drop
  onTouchStart(event: TouchEvent, group: any) {
    if (!this.isEditMode) return;
    this.draggedGroup = group;
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchMove(event: TouchEvent, group: any) {
    if (!this.isEditMode || !this.draggedGroup) return;

    const currentY = event.touches[0].clientY;
    const deltaY = currentY - (this.touchStartY ?? 0);

    if (Math.abs(deltaY) > 40) {
      this.swapGroups(group);
      this.touchStartY = currentY;
    }
  }
}
