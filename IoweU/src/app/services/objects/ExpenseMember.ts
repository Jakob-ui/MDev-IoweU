import { Products } from './Products';
export interface ExpenseMember {
  memberId: string; // Benutzer, dem der Anteil gehört
  username: string;
  color: string;
  amountToPay: number; // Betrag, den dieses Mitglied zu zahlen hat
  split?: number;
  products?: Products[]; // Optional: Produkte, die diesem Mitglied zugeordnet sind
}
