import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private auth = inject(Auth);
  private router = inject(Router);
  private authService = inject(AuthService);

  async canActivate(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'ios') {
      if (this.authService.currentUser && this.authService.currentUser.username) {
        console.log("user is authenticated");
        return true;
      } else {
        this.router.navigate(['/login']);
        console.log("user is not yet authenticated");
        return false;
      }
    } else {
      // Web/Android: wie gehabt
      return new Promise((resolve) => {
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
}
