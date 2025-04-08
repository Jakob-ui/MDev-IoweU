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
  // 🔹 Services injizieren
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private groupService = inject(GroupService);
  private loadingService = inject(LoadingService);
  user: string | null = '';
  displayName: string | null = null;
  groupName: string = '';
  iosIcons: boolean = false;
  group: Groups[] = [];

  groups: { name: string; myBalance: number; link: string }[] = [];

  constructor() {}

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
  
    const userColor = sessionStorage.getItem('usercolor');
    document.documentElement.style.setProperty('--user-color', userColor);
  
    this.loadingService.show(); 
    this.loadMyGroups().then((group) => {
      if (group) {
        this.group = group;
        this.groups = this.group.map((g) => ({
          name: g.groupname,
          myBalance: Math.floor(Math.random() * (200 - -200 + 1)) + -200,
          link: g.groupId,
        }));
      }
      this.loadingService.hide(); 
    });
  }

  async logout() {

    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  async loadMyGroups(): Promise<Groups[] | null> {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      const currentUser = await this.auth.getCurrentUser();
      if (!currentUser) {
        console.error('No user is currently logged in.');
        return null;
      }
  
      const uid = currentUser.uid;
      console.log('User UID:', uid);
  
      const groups = await this.groupService.getGroupsByUserId(uid);
      console.log('Loaded groups:', groups);
      return groups;
    } catch (e) {
      console.log('Error loading Groups:', e);
      return null;
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  navigateToGroup(link: string, groupName: string) {
    sessionStorage.setItem('groupname', groupName);
    console.log(groupName);
    this.router.navigate(['group/' + link]);
  }

  goBack() {
    this.navCtrl.back();
  }
}
