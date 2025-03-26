import { Component, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ROUTER_CONFIGURATION, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class LoginPage implements OnInit {
  private authService = inject(AuthService)
  private router = inject(Router)
  
  email: string = "";
  password: string = "";

  ngOnInit() {
  }

  async login() {
    try {
      const userCredential = await this.authService.login(this.email, this.password);
    
      if (userCredential.user) {
      console.log('Login erfolgreich:', userCredential.user);
      
      this.router.navigate(['/group-overview']);
    }
    } catch (error) {
      console.error('Login fehlgeschlagen:', error);
      alert('Login fehlgeschlagen. Bitte überprüfe deine Anmeldedaten.');
    }
  }
}