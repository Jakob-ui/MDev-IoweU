import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class LoginPage implements OnInit {
  email: string = "";
  password: string = "";
  //router: any;

  constructor(private auth: Auth, private router: Router) { }

  ngOnInit() {
  }

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email.trim(),
        password.trim()
      );

      console.log('Login erfolgreich:', userCredential.user);
      this.router.navigate(['/group-overview']);
    } catch (error) {
      console.error('Login fehlgeschlagen:', error);
      alert('Login fehlgeschlagen. Bitte überprüfe deine Anmeldedaten.');
    }
  }
}