import { Component, inject } from '@angular/core';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonItem } from '@ionic/angular/standalone';
import { GroupService } from 'src/app/services/group.service';
import { Auth } from '@angular/fire/auth';

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

  //private validJoinCodes: string[] = ['abc123', 'xyz456', 'test123']; // Beispiel gültiger Codes
  private qrCodeScanner: Html5QrcodeScanner | null = null;  // Verweis auf den QR-Code-Scanner

  constructor(private router: Router) {}

  ngOnInit() {
    // Den QR-Code-Scanner initialisieren
    // Wir initialisieren ihn hier, aber er wird nur aktiviert, wenn der Benutzer auf den Button klickt
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

  // Funktion zum Scannen von QR-Codes, die bei Button-Klick ausgelöst wird
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
        this.router.navigate(['/group'], { queryParams: { id: result } });
      },
      (error: string) => {
        console.warn(error);
      }
    );
  
    this.qrCodeScanner = scanner;
  }
  
}
