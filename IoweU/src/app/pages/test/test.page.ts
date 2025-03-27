import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonLabel,
  IonItem,
} from '@ionic/angular/standalone';
import { collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
  standalone: true,
  imports: [
    IonItem,
    IonLabel,
    IonList,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class TestPage implements OnInit {
  tasks$ = collectionData(collection(this.firestore, 'test')) as Observable<
    Task[]
  >;
  constructor(private readonly firestore: Firestore) {}

  ngOnInit() {}
}

export interface Task {
  id: string;
  title: string;
  description: string;
}
