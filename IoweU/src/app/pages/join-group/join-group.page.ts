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
import { PermissionStatus, Camera } from '@capacitor/camera';

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
  private groupService = inject(GroupService);
  private loadingService = inject(LoadingService);
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);

  showScanner: any;
  joinCode: string = '';
  platformIsNative = Capacitor.isNativePlatform();
  error: string = '';
  joinFailed: boolean = false;

  private qrCodeScanner: Html5QrcodeScanner | null = null; 
  Capacitor: any;
  isSupported: boolean | undefined;

  updateExpensesCallback: (() => void) | null = null;

  ngOnInit() {
    BarcodeScanner.isSupported().then(
      (result: { supported: boolean | undefined }) => {
        this.isSupported = result.supported;
      }
    );
    // Optional: direkt fragen, damit's beim ersten Scan nicht hakt
    if (this.platformIsNative) {
      BarcodeScanner.checkPermissions().then((status) => {
        if (status.camera !== 'granted') {
          BarcodeScanner.requestPermissions();
        }
      });
    }
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
        groupId: [this.joinCode],
      };
      console.log('userData', userData);

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

  scanQRCode() {
    if (this.platformIsNative) {
      this.scanNativeQRCode(); // Nutze die native Scanner-Methode
    } else {
      if (this.qrCodeScanner) return; // Verhindere doppelte Initialisierung
      this.showScanner = true;
      setTimeout(() => {
        this.initializeQRCodeScanner(); // Initialisiere den Web-QR-Code-Scanner
      });
    }
  }
  async scanNativeQRCode() {
    try {
      // Berechtigungen anfordern
      const status = await BarcodeScanner.requestPermissions();

      if (status.camera !== 'granted') {
        this.error = 'Kamerazugriff wurde verweigert.';
        this.joinFailed = true;
        return;
      }

      // QR-Code scannen
      const result = await BarcodeScanner.scan();

      if (result.barcodes.length > 0) {
        const qrValue = result.barcodes[0].rawValue;
        const groupId = qrValue.split('/').pop(); // Extrahiere die groupId aus der URL

        console.log('QR-Code erfolgreich gescannt:', qrValue);
        console.log('Extrahierte groupId:', groupId);

        if (groupId) {
          // Setze den `joinCode` und rufe die bestehende Methode auf
          this.joinCode = groupId;
          this.confirmJoinGroup(); // Zeige das Pop-up an
        } else {
          this.error = 'Ungültiger QR-Code-Inhalt.';
          this.joinFailed = true;
        }
      } else {
        this.error = 'Kein QR-Code erkannt.';
        this.joinFailed = true;
      }
    } catch (error) {
      console.error('Fehler beim Scannen:', error);
      this.error = 'Fehler beim Scannen des QR-Codes.';
      this.joinFailed = true;
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
        async (result: string) => {
          this.qrCodeScanner?.clear();

          const groupId = result.split('/').pop();

          if (!groupId) {
            this.error = 'Ungültiger QR-Code.';
            this.joinFailed = true;
            return;
          }

          this.joinCode = groupId;

          try {
            const group = await this.groupService.getGroupByGroupId(groupId);

            if (!group) {
              this.error = 'Gruppe nicht gefunden.';
              this.joinFailed = true;
              return;
            }

            // Optional: Bestätigungsdialog vor dem Beitreten
            await this.confirmJoinGroup();
          } catch (err) {
            console.error('Fehler beim Beitreten zur Gruppe:', err);
            this.error = 'Fehler beim Gruppenbeitritt.';
            this.joinFailed = true;
          }
        },
        (error: string) => {
          console.warn('Scan-Fehler:', error);
        }
      );

      this.qrCodeScanner = scanner;
    } catch (error) {
      console.error('Fehler beim Initialisieren des QR-Code-Scanners:', error);
    } finally {
      this.loadingService.hide(); // Lade-Overlay deaktivieren
    }
  }

  // Popup-Dialog zur Bestätigung des Beitritts zur Gruppe
  async confirmJoinGroup() {
    this.loadingService.show();

    try {
      let group = null;

      if (this.joinCode.length === 5) {
        group = await this.groupService.getGroupByAccessCode(this.joinCode);
      } else {
        group = await this.groupService.getGroupByGroupId(this.joinCode);
        if (group && group.accessCode) {
          this.joinCode = group.accessCode;
        }
      }

      const alert = await this.alertController.create({
        header: 'Gruppe beitreten',
        message: group
          ? `Möchtest du wirklich der Gruppe ${group.groupname} beitreten?`
          : 'Gruppe konnte nicht geladen werden.',
        buttons: [
          {
            text: 'Abbrechen',
            role: 'cancel',
          },
          {
            text: 'Ja',
            handler: () => {
              this.joinGroup(); // Hier wird der eigentliche Beitritt ausgeführt
            },
          },
        ],
      });

      await alert.present();
    } catch (err) {
      console.error(err);
      this.error = 'Fehler beim Laden der Gruppe.';
      this.joinFailed = true;
    } finally {
      this.loadingService.hide();
    }
  }
}
