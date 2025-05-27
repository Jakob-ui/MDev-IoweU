import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonButton, IonContent, IonHeader, IonTitle, IonToolbar} from '@ionic/angular/standalone';
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-no-connection',
  templateUrl: './no-connection.page.html',
  styleUrls: ['./no-connection.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, RouterLink]
})
export class NoConnectionPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }


  reloadApp() {
    if (navigator.onLine) {
      location.reload();
    } else {
      alert('Noch immer keine Verbindung.');
    }
  }


}
