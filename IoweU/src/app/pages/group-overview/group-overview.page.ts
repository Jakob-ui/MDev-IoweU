import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonIcon,
  IonCard,
  IonCardSubtitle,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { NavController, Platform } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { Groups } from 'src/app/services/objects/Groups';
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
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private groupService = inject(GroupService);
  private loadingService = inject(LoadingService);

  user: string | null = '';
  iosIcons: boolean = false;
  groups: { name: string; myBalance: number; link: string }[] = [];

  constructor() {}

  ngOnInit() {
    setTimeout(() => {
      if (this.auth.currentUser) {
        this.user = this.auth.currentUser.username;
        this.iosIcons = this.platform.is('ios');
        console.log(this.auth.currentUser);

        const userColor = this.auth.currentUser.color;
        document.documentElement.style.setProperty('--user-color', userColor);

        this.loadingService.show();
        this.loadMyGroups();
      } else {
        console.error('No user is logged in.');
      }
    }, 500); // Warte 500ms, bevor du auf currentUser zugreifst
  }



  async loadMyGroups() {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        console.error('No user is currently logged in.');
        this.loadingService.hide();
        return;
      }

      const uid = currentUser.uid;
      console.log('User UID:', uid);

      // Gruppen abrufen, bei denen der Nutzer Mitglied ist
      const groupsAsMember = await this.groupService.getGroupsByUserId(uid);
      console.log('Groups as Member:', groupsAsMember);

      // Kombiniere alle Gruppen in denen der Benutzer Mitglied ist
      this.groups = groupsAsMember.map((g) => ({
        name: g.groupname,
        myBalance: Math.floor(Math.random() * (200 - -200 + 1)) + -200,
        link: g.groupId,
      }));

    } catch (e) {
      console.log('Error loading Groups:', e);
    } finally {
      this.loadingService.hide();
    }
  }


  navigateToGroup(link: string, groupName: string) {
    sessionStorage.setItem('groupname', groupName);
    this.router.navigate(['group/', link]);
  }

  goBack() {
    this.navCtrl.back();
  }

  async logout() {
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }
}
