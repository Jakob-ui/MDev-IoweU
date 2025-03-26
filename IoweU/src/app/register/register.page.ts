import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonInputPasswordToggle, IonList, IonItem, IonListHeader, IonButton } from '@ionic/angular/standalone';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonButton, IonListHeader, IonItem, IonList, IonInput, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class RegisterPage implements OnInit {


  constructor(
    private auth: Auth,
    private router: Router) {

  }
  email = '';
  password = '';
  name = '';

  ngOnInit() {
  }

  async register(email: string, password: string, name: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      console.log('User profile updated with nickname:', name);
    }

    this.router.navigate(['/home']);
  } catch (error) {
    console.error('Error during registration:', error);
  }
}
}
