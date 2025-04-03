import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonCardTitle, IonLabel, IonIcon, IonButton, IonBadge } from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { NavController, Platform } from "@ionic/angular";

@Component({
  selector: 'app-expense-details',
  templateUrl: './expense-details.page.html',
  styleUrls: ['./expense-details.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, IonCard, IonCardContent, IonCardTitle, IonLabel, IonIcon, IonButton, IonBadge, RouterLink]
})
export class ExpenseDetailsPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);

  expenseId: number | null = null;
  expenseDetails: any = {}; // Detaillierte Ausgabe

  iosIcons: boolean = false;
  user: string | null = "";

  groupMembers = [
    { name: 'Livia', profileImage: 'assets/profiles/livia.jpg' },
    { name: 'Michaela', profileImage: 'assets/profiles/michaela.jpg' },
    { name: 'Jakob', profileImage: 'assets/profiles/jakob.jpg' },
    { name: 'Sophie', profileImage: 'assets/profiles/sophie.jpg' },
    { name: 'Mateusz', profileImage: 'assets/profiles/mateusz.jpg' },
  ];

  expances = [
    { id: 1, expense: 'Pizza', totalAmount: 50, amountToPay: -10, paidBy: 'Livia', date: new Date(2025, 2, 20) },
    { id: 2, expense: 'Einkauf bei Hofer', totalAmount: 70, amountToPay: -20, paidBy: 'Michaela', date: new Date(2025, 3, 5) },
    { id: 3, expense: 'Kino', totalAmount: 40, amountToPay: -5, paidBy: 'Jakob', date: new Date(2025, 3, 5) },
  ];

  // Neue Eigenschaft für die Sichtbarkeit der Produktliste
  private visibleProducts: { [memberName: string]: boolean } = {};

  // Beispiel für gekaufte Produkte für jedes Mitglied (dies kann dynamisch geladen werden)
  private purchasedProducts: { [memberName: string]: any[] } = {
    Livia: [
      { name: 'Pizza', quantity: 1, price: 50 },
      { name: 'Cola', quantity: 2, price: 2.5 }
    ],
    Michaela: [
      { name: 'Hofer Einkauf', quantity: 1, price: 70 }
    ],
    Jakob: [
      { name: 'Kino Ticket', quantity: 1, price: 40 }
    ]
  };

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.user = sessionStorage.getItem('username');
    this.iosIcons = this.platform.is('ios');
    const userColor = sessionStorage.getItem('usercolor');
    document.documentElement.style.setProperty('--user-color', userColor);

    // Hole die ID aus der URL
    this.expenseId = Number(this.route.snapshot.paramMap.get('id'));

    // Details der Ausgabe basierend auf der ID laden
    this.loadExpenseDetails();
  }

  // Lade Details der Ausgabe basierend auf der ID
  loadExpenseDetails() {
    if (this.expenseId) {
      // Suche die Ausgabe anhand der ID
      this.expenseDetails = this.expances.find(expense => expense.id === this.expenseId);
    }
  }

  // Berechne den Anteil jedes Mitglieds an der Gesamtsumme
  calculateShare(totalAmount: number) {
    const numberOfMembers = this.groupMembers.length;
    return totalAmount / numberOfMembers;
  }

  // Hole das Mitglied basierend auf dem Namen (bezahlt von)
  getMemberByName(name: string) {
    return this.groupMembers.find(member => member.name === name);
  }

  // Überprüfe, ob der Betrag für den eingeloggten Benutzer negativ ist (Schulden)
  isNegativeAmountForUser(name: string): boolean {
    return this.expenseDetails.amountToPay < 0 && this.user === name;
  }

  // Überprüfe, ob der eingeloggte Benutzer für alle anderen Mitglieder bezahlt hat und ob diese ihm Geld schulden
  isPositiveAmountForUser(name: string): boolean {
    if (this.expenseDetails.paidBy === this.user) {
      return this.expenseDetails.amountToPay < 0 && name !== this.user;
    }
    return false;
  }

  // Überprüfe, ob der Betrag für das Mitglied relevant ist (für andere Mitglieder grau)
  isRelevantForUser(name: string): boolean {
    return this.user === name || this.expenseDetails.paidBy === name;
  }

  // Funktion zum Umschalten der Sichtbarkeit der Produktliste
  toggleProducts(memberName: string) {
    this.visibleProducts[memberName] = !this.visibleProducts[memberName];
  }

  // Überprüft, ob die Produktliste für ein Mitglied sichtbar ist
  isProductsVisibleForMember(memberName: string): boolean {
    return !!this.visibleProducts[memberName];
  }

  // Holt die gekauften Produkte für das Mitglied
  getPurchasedProductsForMember(memberName: string) {
    return this.purchasedProducts[memberName] || [];
  }

  async logout() {
    try {
      await this.auth.logout();
      this.router.navigate(['home']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back(); // Navigiert zur vorherigen Seite
  }
}
