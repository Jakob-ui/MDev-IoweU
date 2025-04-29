import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
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
  groups: { name: string; myBalance: number; link: string; position?: number }[] = [];

  draggedGroup: any = null;
  isEditMode = false;
  touchStartY: number | null = null;
  longPressTimeout: any = null;
  autoScrollInterval: any = null;

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
            this.groups = groups.map((group, index) => {
              // Berechne myBalance für jedes Mitglied der Gruppe
              const myBalance = group.members.reduce((totalBalance, member) => {
                // Berechnung der Bilanz für jedes Mitglied
                if (member.uid === uid) { // Nur für das eingeloggte Mitglied
                  const balance = member.sumExpenseAmount - member.sumExpenseMemberAmount;
                  return balance; // Setze die Bilanz auf den berechneten Wert
                }
                return totalBalance;
              }, 0);

              return {
                name: group.groupname,
                myBalance: myBalance, // Berechnete Bilanz für das eingeloggte Mitglied
                link: group.groupId,
                position: index, // Position in der Liste
              };
            });
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
    this.draggedGroup = null;
    this.touchStartY = null;
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
    if (!this.isEditMode) return;
    this.draggedGroup = group;

    if (event instanceof MouseEvent) {
      this.touchStartY = event.clientY;
    }
    event.dataTransfer?.setData("group", JSON.stringify(group));

  }

  onMouseMove(event: MouseEvent) {
    if (!this.isEditMode || !this.draggedGroup) return;
  
    // Scrollen aktivieren
    this.checkAutoScroll(event.clientY);
  
    // Hier könntest du die Logik fürs Verschieben der Gruppen aufrufen (swapping)
    // Hier braucht es noch eine Logik für das Vertauschen, wie du es oben in `onTouchMove` gemacht hast
    this.onDragMove(event.clientY);
  }

  onDragMove(touchY: number) {
    if (!this.isEditMode || !this.draggedGroup) return;
  
    const draggedIndex = this.groups.indexOf(this.draggedGroup);
  
    // Findet das Ziel-Element und überprüft, ob die Position geändert werden soll
    const elements = Array.from(document.querySelectorAll('.my-groups'));
    let targetIndex = -1;
  
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (touchY > rect.top && touchY < rect.bottom) {
        targetIndex = i;
        break;
      }
    }
  
    if (targetIndex !== -1 && targetIndex !== draggedIndex) {
      this.swapGroups(this.groups[targetIndex]);
    }
  }
  
  onDragEnd(event: MouseEvent) {
    this.stopAutoScroll();
    this.draggedGroup = null;
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, targetGroup: any) {
    event.preventDefault();
    if (!this.draggedGroup) return;
    this.swapGroups(targetGroup);
    //this.draggedGroup = null;
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

    // Nur setzen, wenn noch kein Drag aktiv ist
    if (!this.draggedGroup) {
      this.draggedGroup = group;
    }
  
    this.touchStartY = event.touches[0].clientY;
  }

  // Touch-Drag-Move Logik
  onTouchMove(event: TouchEvent, group: any) {
    this.checkAutoScroll(event.touches[0].clientY);
    if (!this.isEditMode || !this.draggedGroup) return;
  
    const touchY = event.touches[0].clientY;
  
    // Finde das Element, über dem du dich gerade befindest
    const elements = Array.from(document.querySelectorAll('.my-groups'));
    let targetIndex = -1;
  
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (touchY > rect.top && touchY < rect.bottom) {
        targetIndex = i;
        break;
      }
    }
  
    const draggedIndex = this.groups.indexOf(this.draggedGroup);
  
    if (targetIndex !== -1 && targetIndex !== draggedIndex) {
      const moved = this.groups.splice(draggedIndex, 1)[0];
      this.groups.splice(targetIndex, 0, moved);
      this.updateGroupPositions();
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.stopAutoScroll();
    if (this.isEditMode && this.draggedGroup) {
      // Hier könntest du eine Logik ergänzen, z. B. zum Speichern der Reihenfolge
    }
  }

  isDraggedGroup(group: any): boolean {
    return this.draggedGroup === group;
  }
  
  updateGroupPositions() {
    this.groups.forEach((group, index) => {
      group.position = index;
    });
  }

  getGroupOffset(index: number): number {
    if (!this.isEditMode) return 0;
    return index * 10; // Beispieloffset – du passt das gleich optisch an
  }

  checkAutoScroll(touchY: number) {
    const edgeThreshold = 80; // Abstand vom oberen oder unteren Rand
    const scrollSpeed = 10;   // Geschwindigkeit des Scrollens
  
    const container = document.querySelector('ion-content')?.shadowRoot?.querySelector('.inner-scroll') as HTMLElement;
  
    if (!container) return;
  
    const containerRect = container.getBoundingClientRect();
  
    if (touchY - containerRect.top < edgeThreshold) {
      // Scroll nach oben
      this.autoScrollInterval = setInterval(() => {
        container.scrollBy(0, -scrollSpeed);
      }, 20);
    } else if (containerRect.bottom - touchY < edgeThreshold) {
      // Scroll nach unten
      this.autoScrollInterval = setInterval(() => {
        container.scrollBy(0, scrollSpeed);
      }, 20);
    } else {
      // Kein Scrollen nötig
      this.stopAutoScroll();
    }
  }
  
  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

}
