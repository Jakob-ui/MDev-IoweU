import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { Group } from 'src/app/services/objects/Group';

@Component({
  selector: 'app-group',
  templateUrl: './group.page.html',
  styleUrls: ['./group.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonCard,
    IonCardTitle,
    IonCardSubtitle,
    RouterModule,
    IonIcon,
    IonSpinner,
  ],
})
export class GroupPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private route = inject(ActivatedRoute);
  private groupService = inject(GroupService);

  loading: boolean = true;
  timeout: any;

  iosIcons: boolean = false;

  user: string | null = '';
  displayName: string | null = null;

  groupname: string = '';
  goupid: string = '';
  groupImage: string = '';
  myBalance: number = +200;
  totalCost: number = 120.5;
  currentMonth: string = 'März 2025';
  features: string[] = [];

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter'];

  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher'];

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    this.groupname = sessionStorage.getItem('groupname') || 'Unbekannte Gruppe';

    this.route.params.subscribe((params) => {
      this.goupid = params['id'];
      this.loading = true;
      this.loadGroupData(this.goupid).finally(() => {
        this.loading = false;
      });
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

  goBack() {
    this.navCtrl.back();
  }

  constructor() {}

  async loadGroupData(id: string): Promise<void> {
    this.loading = true;
    try {
      const group = await this.groupService.getGroupById(id);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (group) {
        this.groupname = group.name;
        this.goupid = group.id;
        this.features = group.features;
      } else {
        console.warn('Group not found!');
      }
    } catch (e) {
      console.log('Error getting Groups: ' + e);
    } finally {
      this.loading = false;
    }
  }

  async isLoading() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.loading = false;
      clearTimeout(this.timeout);
    } catch (error) {
      console.error('Fehler beim Laden der Daten', error);
      this.loading = false;
    }
  }
}
