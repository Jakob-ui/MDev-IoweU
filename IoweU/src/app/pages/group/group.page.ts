import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonCard,
  IonCardTitle,
  IonCardSubtitle,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { Groups } from 'src/app/services/objects/Groups';
import { LoadingService } from '../../services/loading.service';

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
  private loadingService = inject(LoadingService); // Inject LoadingService

  iosIcons: boolean = false;

  user: string | null = '';
  currentGroup: Groups | null = null;
  balance: number = -20;
  totalCost: number = 120.5;
  displayName: string | null = null;

  groupname: string = '';
  private _groupId: string = '';
  public get groupid(): string {
    return this._groupId;
  }
  public set groupid(value: string) {
    this._groupId = value;
  }
  groupImage: string = '';
  myBalance: number = +200;
  currentMonth: string = 'März 2025';
  features: string[] = [];

  shoppingList: string[] = ['Milch', 'Brot', 'Eier', 'Butter'];

  assetsList: string[] = ['Sofa', 'Küche', 'Fernseher'];

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    this.groupname = sessionStorage.getItem('groupname') || 'Unbekannte Gruppe';

    this.route.params.subscribe((params) => {
      this.groupid = params['id'];
      this.loadingService.show(); // Lade-Overlay aktivieren
      this.loadGroupData(this.groupid).finally(() => {
        this.loadingService.hide(); // Lade-Overlay deaktivieren
      });
    });
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

  async loadGroupData(id: string): Promise<void> {
    this.loadingService.show(); // Lade-Overlay aktivieren
    console.log('searching for groupId' + id);
    try {
      const group = await this.groupService.getGroupById(id);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (group) {
        this.groupname = group.groupname;
        this.groupid = group.groupId;
        this.features = group.features;
      } else {
        console.warn('Groups not found!');
      }
    } catch (e) {
      console.log('Error getting Groups: ' + e);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  getFeatureLink(feature: string): string {
    switch (feature) {
      case 'Finanzübersicht':
        return '/finance';
      case 'Ausgaben':
        return '/expense';
      case 'Einkaufsliste':
        return '/shopping-list';
      case 'Anlagegüter':
        return '/assets';
      default:
        return '/'; // Rückfalloption für unbekannte Features
    }
  }

  async isLoading() {
    try {
      this.loadingService.show(); // Lade-Overlay aktivieren
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }
}