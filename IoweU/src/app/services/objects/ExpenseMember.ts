import { Products } from './Products';
export interface ExpenseMember {
  expenseMemberId: string;
  memberId: string; // Benutzer, dem der Anteil gehört
  amountToPay: number; // Betrag, den dieses Mitglied zu zahlen hat
  split?: number;
  products?: Products[]; // Optional: Produkte, die diesem Mitglied zugeordnet sind
}
