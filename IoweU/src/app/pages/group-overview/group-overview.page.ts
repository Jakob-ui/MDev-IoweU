import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonCard,
    IonCardSubtitle,
    IonCardTitle,
    IonList, IonReorderGroup, IonReorder,
    ItemReorderEventDetail, IonBadge, IonIcon
} from '@ionic/angular/standalone';
import { NavController, Platform } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { LoadingService } from 'src/app/services/loading.service';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-group-overview',
  templateUrl: './group-overview.page.html',
  styleUrls: ['./group-overview.page.scss'],
  standalone: true,
    imports: [
        IonReorder,
        IonReorderGroup,
        CommonModule,
        IonContent,
        IonButton,
        RouterModule,
        IonCard,
        IonCardSubtitle,
        IonCardTitle,
        IonList,
        IonBadge,
        IonToolbar,
        IonHeader
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
  private currentScrollSpeed: number | null = null;
  private location = inject(Location);

  username: string | null = '';
  iosIcons: boolean = false;
  groups: {
    name: string;
    myBalance: number;
    link: string;
    position?: number;
  }[] = [];

  draggedGroup: any = null;
  isEditMode = false;
  touchStartY: number | null = null;
  longPressTimeout: any = null;
  autoScrollInterval: any = null;
  isLoading = true;

  constructor() {}

  async ngOnInit() {
    this.isLoading = true;
    try {
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        this.username = this.authService.currentUser.username;
        this.iosIcons = this.platform.is('ios');

        const userColor = this.authService.currentUser.color;
        document.documentElement.style.setProperty('--user-color', userColor);

        // Gruppen laden
        await this.loadMyGroups();
      } else {
        console.error('No user is logged in.');
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzers oder der Gruppen:', error);
      this.isLoading = false;
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
      this.isLoading = true;
      if (this.authService.currentUser) {
        const uid = this.authService.currentUser.uid;

        // Echtzeit-Updates für Gruppen
        this.unsubscribeFromGroups = await this.groupService.getGroupsByUserId(
          uid,
          (groups) => {
            this.groups = groups
              .map((group, index) => {
                const myBalance = group.members.reduce(
                  (totalBalance, member) => {
                    if (member.uid === uid) {
                      const balance =
                        member.sumExpenseAmount - member.sumAmountReceived + member.sumAmountPaid - member.sumExpenseMemberAmount;
                      return balance;
                    }
                    return totalBalance;
                  },
                  0
                );

                return {
                  name: group.groupname,
                  myBalance: myBalance,
                  link: group.groupId,
                  position: group.position ?? undefined,
                };
              })
              .sort((a, b) => {
                const posA = a.position !== undefined && a.position !== null ? a.position : Infinity;
                const posB = b.position !== undefined && b.position !== null ? b.position : Infinity;
                return posA - posB;
              });
            this.isLoading = false;
          }
        );
      } else {
        this.isLoading = false;
      }
    } catch (e) {
      console.log('Error loading Groups:', e);
      this.isLoading = false;
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

  onLongPressStart() {
  this.longPressTimeout = setTimeout(() => {
    this.isEditMode = true;

    // Haptisches Feedback auslösen
    Haptics.impact({
      style: ImpactStyle.Heavy, // Korrekte Verwendung von ImpactStyle
    });
  }, 1500);
}

  onLongPressCancel() {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  goToCreateGroup() {
    this.location.replaceState('/group-overview');
    this.router.navigate(['/create-group'], { replaceUrl: true });
  }

  stopEditMode() {
    this.isEditMode = false;
    this.saveGroupOrderToDatabase();
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const from = event.detail.from;
    const to = event.detail.to;
    const movedItem = this.groups.splice(from, 1)[0];
    this.groups.splice(to, 0, movedItem);

    this.groups.forEach((group, index) => {
      group.position = index;
    });
    event.detail.complete();
  }

  async saveGroupOrderToDatabase() {
    try {
      for (const group of this.groups) {
        if (group.link) {
          await this.groupService.updateGroupOrder(group.link, group.position!);
        }
      }
      console.log('Reihenfolge erfolgreich in der Datenbank gespeichert.');
    } catch (error) {
      console.error('Fehler beim Speichern der Reihenfolge:', error);
    }
  }
}
