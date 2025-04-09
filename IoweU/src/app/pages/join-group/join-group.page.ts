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
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { Users } from 'src/app/services/objects/Users';


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
  error: string = '';
  joinFailed: boolean = false;
  groupService = inject(GroupService);
  private loadingService = inject(LoadingService);
  platformIsNative = Capacitor.isNativePlatform();
  showScanner: boolean= false;


  //private validJoinCodes: string[] = ['abc123', 'xyz456', 'test123']; // Beispiel gültiger Codes
  private qrCodeScanner: Html5QrcodeScanner | null = null;  // Verweis auf den QR-Code-Scanner
  Capacitor: any;
  isSupported: boolean | undefined;

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

    const firebaseUser = this.auth.currentUser;
    if (firebaseUser) {
      const userData: Users = {
        uid: firebaseUser.uid,
        username: '', // da müssen noch die richtigen Daten übergeben werden
        email: firebaseUser.email ?? '',
        color: '',
        lastedited: new Date().toISOString(),
        groupId: []
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

  async checkCameraPermission() {
    const permission = await BarcodeScanner.requestPermissions();
    if (permission.camera === 'granted') { // Überprüfe, ob die Kamera-Berechtigung erteilt wurde
      this.scanNativeQRCode(); // Starte den QR-Scan, wenn die Berechtigung erteilt wurde
    } else {
      // Wenn keine Berechtigung erteilt wurde, zeige eine Fehlermeldung oder weise den Benutzer darauf hin
      this.error = 'Kamera-Berechtigung verweigert. Bitte erlaube den Kamerazugriff.';
    }
  }

  async scanNativeQRCode() {
    try {
      const result = await BarcodeScanner.scan();
      if (result && result.barcodes.length > 0) {
        const scannedValue = result.barcodes[0].rawValue;
        this.router.navigate(['/group'], { queryParams: { id: scannedValue } });
      } else {
        this.error = 'Kein gültiger QR-Code erkannt.';
      }
    } catch (err) {
      console.error('Fehler beim nativen Scan:', err);
      this.error = 'Scanner konnte nicht gestartet werden. Bitte prüfe die Kamera-Berechtigung.';
    }
  }  
  

  // Funktion zum Scannen von QR-Codes, die bei Button-Klick ausgelöst wird
  scanQRCode() {
    if (this.platformIsNative) {
      this.scanNativeQRCode(); // neue Methode für native Scanner
    } else {
      if (this.qrCodeScanner) return;
      this.showScanner = true;
      setTimeout(() => {
        this.initializeQRCodeScanner();
      });
    }
  }
  

  // Funktion zum Scannen von QR-Codes, die bei Button-Klick ausgelöst wird
  initializeQRCodeScanner() {
      this.loadingService.show(); // Lade-Overlay aktivieren
    
      try {
        const qrScannerContainer = document.getElementById('qr-code-scanner');
        if (!qrScannerContainer) {
          console.error('QR-Code-Scanner Container nicht gefunden.');
          this.loadingService.hide();
          return;
        }
    
        this.qrCodeScanner = new Html5QrcodeScanner(
          'qr-code-scanner',
          {
            fps: 10,
            qrbox: 250,
          },
          false
        );
    
        this.showScanner = true; // Wichtig! Vor dem rendern
    
        this.qrCodeScanner.render(
          (result: string) => {
            this.qrCodeScanner?.clear();
            this.qrCodeScanner = null;
            this.showScanner = false;
            this.router.navigate(['/group'], { queryParams: { id: result } });
          },
          (error: string) => {
            console.warn(error);
          }
        );
    
      } catch (error) {
        console.error('Fehler beim Initialisieren des QR-Code-Scanners:', error);
      } finally {
        this.loadingService.hide();
      }
    }
    
  
}
