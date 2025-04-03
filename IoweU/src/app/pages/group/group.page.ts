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
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
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
export class GroupPage implements OnInit {
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
  currentGroup: Group | null = null;
  balance: number = -20;
  totalCost: number = 120.5;
  currentMonth: string = 'März 2025';

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter'];

  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher'];

  async ngOnInit() {
    this.loadData();
  }

  async logout() {
    try {
      this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  constructor() {}

  async loadData() {
    try {
      // Simuliertes Datenladen (z. B. API-Aufruf)
      this.iosIcons = this.platform.is('ios');
      this.timeout = setTimeout(() => {this.loading = false}, 3000);
      this.user = sessionStorage.getItem('username');
      const groupId = sessionStorage.getItem('GroupId')!;
      this.currentGroup = await this.groupService.getGroupById(groupId);
    // if (!this.currentGroup) {
    //   console.error('Failed to load group. Redirecting to home.');
    //   this.router.navigate(['home']); // Redirect if group is not found
    //   return;
    // }
    } catch (error) {
      console.error('Fehler beim Laden der Daten', error);
      this.loading = false;
    }
  }
}
