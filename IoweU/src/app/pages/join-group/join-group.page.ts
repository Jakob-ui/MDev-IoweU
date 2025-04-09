import { Component, inject } from '@angular/core';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonItem } from '@ionic/angular/standalone';
import { GroupService } from 'src/app/services/group.service';
import { Auth } from '@angular/fire/auth';
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
  joinCode: string = '';
  auth = inject(Auth);
  platformIsNative = Capacitor.isNativePlatform();
  error: string = '';
  joinFailed: boolean = false;
  groupService = inject(GroupService);
  isSupported = false;  // Barcode Scanner Support prüfen
  showWebScanner = false;  // Flag, um den Web-Scanner anzuzeigen

  //private validJoinCodes: string[] = ['abc123', 'xyz456', 'test123']; // Beispiel gültiger Codes
  private qrCodeScanner: Html5QrcodeScanner | null = null;  // Verweis auf den QR-Code-Scanner
  Capacitor: any;

  constructor(private router: Router, private alertController: AlertController) {}

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
    // if (this.validJoinCodes.includes(this.joinCode.trim())) {
    //   this.router.navigate(['/group']);
    // } else {
    //   this.joinFailed = true;
    //   this.error = 'Fehler beim Beitreten, bitte versuchen Sie es erneut.';
    // }
    if (this.auth.currentUser) {
      this.groupService.joinGroup(this.auth.currentUser.uid, this.joinCode);
      this.groupService.getGroupByAccessCode(this.joinCode).then((joinedGroup) => {
        if (joinedGroup) {
          this.router.navigate(['/group/' + joinedGroup.groupId]);
        } else {
          this.error = 'Group not found.';
          this.joinFailed = true;
        }
      }).catch((err) => {
        console.error(err);
        this.error = 'An error occurred while joining the group.';
        this.joinFailed = true;
      });
    } else {
      this.error = 'User is not authenticated.';
      this.joinFailed = true;
    }
  }

  initializeQRCodeScanner() {
    const qrScannerContainer = document.getElementById("qr-code-scanner");
    if (!qrScannerContainer) {
      console.error('QR-Code-Scanner Container nicht gefunden.');
      return;
    }
  
    const scanner = new Html5QrcodeScanner("qr-code-scanner", {
      fps: 10,
      qrbox: 250
    }, false);
  
    scanner.render(
      (result: string) => {
        this.qrCodeScanner?.clear();
        this.qrCodeScanner = null;
        this.joinCode = result;
        this.router.navigate(['/group'], { queryParams: { id: result } });
      },
      (error: string) => {
        console.warn('Scan error:', error);
      }
    );
  
    this.qrCodeScanner = scanner;
  }

  // Funktion zum Scannen des QR-Codes
  async scanQRCode() {
    if (Capacitor.isNativePlatform()) {
      // Native (iOS/Android)
      const granted = await this.requestPermissions();
      if (!granted) {
        this.presentAlert();
        return;
      }
  
      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0) {
        const result = barcodes[0].rawValue;
        this.joinCode = result;
        this.router.navigate(['/group'], { queryParams: { id: result } });
      } else {
        console.warn('Kein Barcode erkannt.');
      }
    } else {
      // Web
      this.showWebScanner = true;
      setTimeout(() => this.initializeQRCodeScanner(), 100); // damit DOM Zeit zum Rendern hat

    }
  }

  // Berechtigungen für die Kamera anfordern
  async requestPermissions(): Promise<boolean> {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera === 'granted' || camera === 'limited';
  }

  // Falls die Berechtigungen nicht erteilt wurden, eine Warnung anzeigen
  async presentAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Permission denied',
      message: 'Please grant camera permission to use the barcode scanner.',
      buttons: ['OK'],
    });
    await alert.present();
  }


 
  
}