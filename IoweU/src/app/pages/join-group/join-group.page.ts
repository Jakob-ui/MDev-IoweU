import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-join-group',
  templateUrl: './join-group.page.html',
  styleUrls: ['./join-group.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonItem,
    IonInput,
    FormsModule,
    CommonModule,
    RouterLink,
  ],
})
export class JoinGroupPage {
  joinCode: string = '';
  error: string = '';
  joinFailed: boolean = false;

  private validJoinCodes: string[] = ['abc123', 'xyz456', 'test123']; // Beispiel gültiger Codes

  constructor(private router: Router) {}

  inputChange() {
    this.joinFailed = false;
    this.error = '';
  }

  joinGroup() {
    if (this.validJoinCodes.includes(this.joinCode.trim())) {
      this.router.navigate(['/group']);
    } else {
      this.joinFailed = true;
      this.error = 'Fehler beim Beitreten, bitte versuchen Sie es erneut.';
    }
  }
}
