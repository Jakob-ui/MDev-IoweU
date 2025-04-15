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
  IonCardTitle,
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
}
