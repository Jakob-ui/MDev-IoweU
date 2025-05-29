import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonButton, IonContent} from '@ionic/angular/standalone';
import {Router} from "@angular/router";
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-no-connection',
  templateUrl: './no-connection.page.html',
  styleUrls: ['./no-connection.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    IonButton,
  ],
})
export class NoConnectionPage implements OnInit {
  constructor(
    private networkService: NetworkService,
    private router: Router,
  ) {
    
  }
  ngOnInit() {}

  reloadApp() {
    this.networkService.isOnline$.subscribe((online) => {
      if (online) {
        this.router.navigate(['/group-overview']);
      } else {
        alert('Noch keine Verbindung.');
      }
    }); 
  }
}
