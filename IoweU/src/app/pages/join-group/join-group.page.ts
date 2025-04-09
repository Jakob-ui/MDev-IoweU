import { Component, inject } from '@angular/core';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
} from '@ionic/angular/standalone';
import { GroupService } from 'src/app/services/group.service';
import { Auth } from '@angular/fire/auth';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { Users } from 'src/app/services/objects/Users';
import { AlertController } from '@ionic/angular';

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
  scanQRCode() {
    throw new Error('Method not implemented.');
  }
  joinCode: string = '';
  auth = inject(Auth);
  authService = inject(AuthService);
  platformIsNative = Capacitor.isNativePlatform();
  error: string = '';
  joinFailed: boolean = false;
  groupService = inject(GroupService);
  private loadingService = inject(LoadingService);
  platformIsNative = Capacitor.isNativePlatform();

  //private validJoinCodes: string[] = ['abc123', 'xyz456', 'test123']; // Beispiel gültiger Codes
  private qrCodeScanner: Html5QrcodeScanner | null = null; // Verweis auf den QR-Code-Scanner
  Capacitor: any;
  isSupported: boolean | undefined;

  constructor(private router: Router) {}
  constructor(private router: Router) {}

  ngOnInit() {
    // Den QR-Code-Scanner initialisieren
    // Wir initialisieren ihn hier, aber er wird nur aktiviert, wenn der Benutzer auf den Button klickt
    // Überprüfen, ob der Barcode Scanner unterstützt wird
    BarcodeScanner.isSupported().then((result) => {
      this.isSupported = result.supported;
    });
  }

  ngOnDestroy() {
    // Zerstöre den Scanner, wenn die Komponente zerstört wird
    if (this.qrCodeScanner) {
      this.qrCodeScanner.clear();
    }
  }

  inputChange() {
    this.joinFailed = false;
    this.error = '';
  }

  joinGroup() {
    this.loadingService.show();
    if (this.authService.currentUser) {
      const userData: Users = {
        uid: this.authService.currentUser?.uid || '',
        username: this.authService.currentUser?.username || '',
        email: this.authService.currentUser?.email || '',
        color: this.authService.currentUser?.color || '',
        lastedited: '',
        groupId: [],
      };

      this.groupService
        .joinGroup(userData, this.joinCode)
        .then(() => {
          return this.groupService.getGroupByAccessCode(this.joinCode);
        })
        .then((joinedGroup) => {
          if (joinedGroup) {
            this.router.navigate(['/group/' + joinedGroup.groupId]);
          } else {
            this.error = 'Group not found.';
            this.joinFailed = true;
          }
        })
        .catch((err) => {
          console.error(err);
          this.error = 'An error occurred while joining the group.';
          this.joinFailed = true;
        })
        .finally(() => {
          this.loadingService.hide();
        });
    } else {
      this.error = 'User is not authenticated.';
      this.joinFailed = true;
      this.loadingService.hide();
    }
  }

  // Funktion zum Scannen von QR-Codes, die bei Button-Klick ausgelöst wird
  initializeQRCodeScanner() {
    this.loadingService.show(); // Lade-Overlay aktivieren
    try {
      const qrScannerContainer = document.getElementById('qr-code-scanner');
      if (!qrScannerContainer) {
        console.error('QR-Code-Scanner Container nicht gefunden.');
        return;
      }

      const scanner = new Html5QrcodeScanner(
        'qr-code-scanner',
        {
          fps: 10,
          qrbox: 250,
        },
        false
      );

      scanner.render(
        (result: string) => {
          this.qrCodeScanner?.clear();
          this.router.navigate(['/group'], { queryParams: { id: result } });
        },
        (error: string) => {
          console.warn(error);
        }
      );

      this.qrCodeScanner = scanner;
    } catch (error) {
      console.error('Fehler beim Initialisieren des QR-Code-Scanners:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }
}
