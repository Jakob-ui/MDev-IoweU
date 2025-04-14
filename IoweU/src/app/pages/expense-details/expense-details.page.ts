import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  fastFoodOutline,
  cartOutline,
  wineOutline,
  carOutline,
  gameControllerOutline,
  homeOutline,
  receiptOutline,
  ellipsisHorizontalOutline,
} from 'ionicons/icons';
import {
  IonContent,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonDatetime,
  IonIcon,
  IonBadge,
  IonLabel,
  IonList,
  IonHeader,
  IonToolbar,
} from '@ionic/angular/standalone';

// Import interfaces
import { Expenses } from 'src/app/services/objects/Expenses';
import { Products } from 'src/app/services/objects/Products';
import { Members } from 'src/app/services/objects/Members';
import { NavController, Platform } from '@ionic/angular';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ExpenseMember } from 'src/app/services/objects/ExpenseMember';
import { GroupService } from 'src/app/services/group.service';
import { AuthService } from '../../services/auth.service';

addIcons({
  'fast-food-outline': fastFoodOutline,
  'cart-outline': cartOutline,
  'wine-outline': wineOutline,
  'car-outline': carOutline,
  'game-controller-outline': gameControllerOutline,
  'home-outline': homeOutline,
  'receipt-outline': receiptOutline,
  'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
});

@Component({
  selector: 'app-expense-details',
  templateUrl: './expense-details.page.html',
  styleUrls: ['./expense-details.page.scss'],
  standalone: true,
  imports: [
    IonList,
    IonLabel,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonDatetime,
    IonIcon,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonBadge,
    RouterLink,
  ],
})
export class ExpenseDetailsPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);

  groupname: string = '';
  iosIcons: boolean = false;

  uid: string | null = '';
  user: string | null = '';
  displayName: string | null = null;
  groupId = this.activeRoute.snapshot.paramMap.get('groupId') || '';
  expenseId: string = '';

  groupMembers: any[] = [];
  memberUsernames: string[] = [];
  memberIds: string[] = [];
  memberColors: string[] = [];
  memberRoles: string[] = [];
  memberUids: string[] = [];

  expenseDescription: string = '';
  expenseTotalAmount: number = 0;
  expensePaidBy: string = '';
  expenseDate: string = '';
  expenseMember: ExpenseMember[] = [];
  expenseMemberIds: string[] = [];
  expenseAmountToPay: number = 0;
  expenseMemberProducts: Products[] = [];
  expenseMemberSplitType: string = '';
  expenseMemberSplitBy: string = '';
  expenseMemberPaidBy: string = '';
  expenseMemberPaidByName: string = '';
  expenseMemberPaidByUid: string = '';


  splitValue: { [uid: string]: number } = {};
  amountToPay: { [uid: string]: number } = {};
  products: Products[] = [];

  visibleProducts: { [key: string]: boolean } = {};

  categories = [
    { name: 'Lebensmittel', icon: 'fast-food-outline' },
    { name: 'Einkäufe', icon: 'cart-outline' },
    { name: 'Restaurant/Bar', icon: 'wine-outline' },
    { name: 'Transport', icon: 'car-outline' },
    { name: 'Freizeit', icon: 'game-controller-outline' },
    { name: 'Wohnen', icon: 'home-outline' },
    { name: 'Rechnungen', icon: 'receipt-outline' },
    { name: 'Sonstiges', icon: 'ellipsis-horizontal-outline' },
  ];

  expense: Partial<Expenses> = { expenseMember: [] };

  async ngOnInit() {
    this.loadingService.show();
    try {
      if (!this.authService.currentUser) {
        console.error('Kein Benutzer eingeloggt.');
        return;
      }

      this.uid = this.authService.currentUser.uid;
      this.user = this.authService.currentUser.username;
      this.displayName = this.authService.currentUser.username;

      this.groupId = this.activeRoute.snapshot.paramMap.get('groupId') || '';
      this.expenseId = this.activeRoute.snapshot.paramMap.get('expenseId') || '';

      if (!this.groupId || !this.expenseId) {
        console.error('Kein groupId oder expenseId in der URL');
        return;
      }

      const currentGroup = await this.groupService.getGroupById(this.groupId);
      if (!currentGroup) {
        console.error(`Gruppe mit der ID ${this.groupId} nicht gefunden`);
        return;
      }

      this.groupname = currentGroup.groupname || 'Unbekannte Gruppe';
      this.groupMembers = currentGroup.members || [];

      this.memberUsernames = this.groupMembers.map(m => m.username || '');
      this.memberIds = this.groupMembers.map(m => m.memberId || '');
      this.memberColors = this.groupMembers.map(m => m.color || '');
      this.memberRoles = this.groupMembers.map(m => m.role || '');
      this.memberUids = this.groupMembers.map(m => m.uid || '');

      await this.expenseService.getExpenseById(this.groupId, this.expenseId, (fetchedExpense) => {
        if (fetchedExpense) {
          this.expense = fetchedExpense;  // Setze die komplette Expense-Daten

          // Extrahiere die Werte aus der Expense und speichere sie in separaten Variablen
          this.expenseDescription = this.expense.description || '';  // Beschreibung der Ausgabe
          this.expenseTotalAmount = this.expense.totalAmount || 0;  // Gesamtbetrag
          this.expensePaidBy = this.expense.paidBy || '';  // Wer hat gezahlt?
          this.expenseDate = this.expense.date || '';  // Datum der Ausgabe
          this.expenseMember = this.expense.expenseMember || [];  // Mitglieder der Ausgabe
          this.expenseMemberIds = this.expenseMember.map(m => m.memberId || '');  // IDs der Mitglieder
          this.expenseMemberSplitType = this.expense.splitType || '';  // Art der Aufteilung
          this.expenseMemberSplitBy = this.expense.splitBy || '';  // Wer hat die Ausgabe geteilt?
          this.expenseMemberPaidBy = this.expense.paidBy || '';  // Wer hat die Ausgabe bezahlt?

          const currentMember = this.expenseMember.find(m => m.memberId === this.uid);
          this.expenseAmountToPay = currentMember?.amountToPay || 0;

          console.log('Geladene Expense:', this.expense);
        } else {
          console.error('Expense nicht gefunden');
        }
      });

      this.iosIcons = this.platform.is('ios');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Seite:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  updateProductVisibility() {
    if (this.expense) {
      this.expense.expenseMember?.forEach((member) => {
        this.visibleProducts[member.memberId] = false;
      });
    }
  }

  toggleProducts(memberName: string) {
    this.visibleProducts[memberName] = !this.visibleProducts[memberName];
  }

  getPurchasedProductsForMember(memberId: string): Products[] {
    // Ensure that this.expense and this.expense.expenseMember are properly defined
    if (!this.expense || !this.expense.expenseMember) {
      return []; // Return an empty array if expense or expenseMember is undefined
    }

    // Find the member in the expenseMember array
    const member = this.expense.expenseMember.find((m) => m.memberId === memberId);

    // If the member is found and they have products, return the products array, otherwise return an empty array
    return member?.products ?? [];
  }

  isProductsVisibleForMember(memberId: string): boolean {
    return this.visibleProducts[memberId] || false;
  }

  getUserAmount(expense: Partial<Expenses>): number {
    // Überprüfe, ob `expense.expenseMember` existiert und nicht leer ist
    if (!expense.expenseMember || expense.expenseMember.length === 0) {
      return 0;
    }

    // Suche den Eintrag des aktuellen Benutzers
    const userEntry = expense.expenseMember.find(
      (member) => member.memberId === this.uid
    );

    // Gib den Betrag zurück, den der Benutzer zu zahlen hat, oder 0, wenn nicht gefunden
    return userEntry?.amountToPay ?? 0;
  }


  getAmountClass(expense?: Partial<Expenses>): string {
    // Wenn `expense` nicht vorhanden oder `paidBy` nicht gesetzt ist, gebe 'neutral' zurück
    if (!expense || !expense.paidBy || typeof expense.paidBy !== 'string') {
      return 'neutral';
    }

    // Hole den Betrag, den der Benutzer bezahlen muss
    const amount = this.getUserAmount(expense);

    // Überprüfe, ob der aktuelle Benutzer die Ausgabe bezahlt hat
    const isPaidByCurrentUser = expense.paidBy === this.uid;

    // Wenn der aktuelle Benutzer die Ausgabe bezahlt hat, gebe 'positive' zurück
    if (isPaidByCurrentUser) {
      return 'positive';
    }

    // Wenn der Betrag negativ ist, gebe 'negative' zurück
    if (amount < 0) {
      return 'negative';
    }

    // Fallback: Gebe 'neutral' zurück, wenn keine der oben genannten Bedingungen zutrifft
    return 'neutral';
  }


  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['login']);
    } catch (e) {
      console.log(e);
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  editExpense() {
    this.router.navigate(['/edit-expense', { id: this.expense?.expenseId }]);
  }

  getPaidByName(paidByUid: string): string {
    const member = this.groupMembers.find((member) => member.uid === paidByUid);  // Verändere hier memberId zu uid
    return member ? member.username : 'Unbekannt';  // Rückgabe des Namens oder 'Unbekannt' falls kein Mitglied gefunden wird
  }




}
