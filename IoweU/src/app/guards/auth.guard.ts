import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private auth = inject(Auth);
  private router = inject(Router);
  private authService = inject(AuthService);

  canActivate(): Promise<boolean> {
    return new Promise(async (resolve) => {
      this.auth.onAuthStateChanged(async (user) => {
        if (user) {
          try {
            await this.authService.waitForUser();
            resolve(true);
          } catch {
            this.router.navigate(['/login']);
            resolve(false);
          }
        } else {
          this.router.navigate(['/login']);
          resolve(false);
        }
      });
    });
  }
}
