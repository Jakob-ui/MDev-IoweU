import { Products } from './Products';
export interface ExpenseMember {
  userId: string; // Benutzer, dem der Anteil gehört
  amountToPay: number; // Betrag, den dieses Mitglied zu zahlen hat
  products: Products[]; // Optional: Produkte, die diesem Mitglied zugeordnet sind
}