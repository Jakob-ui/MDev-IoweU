import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

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

  constructor(private router: Router) { }

  ngOnInit() {
  }

  login() {
    // Deine Login-Logik hier
    console.log("Email:", this.email);
    console.log("Password:", this.password);

    // Weiterleitung nach erfolgreicher Registrierung
    this.router.navigate(['/group-overview']);

  }
}
