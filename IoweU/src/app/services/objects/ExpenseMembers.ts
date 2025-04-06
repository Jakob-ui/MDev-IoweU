import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';
import { GroupMemberships } from './GroupMemberships';
export interface ExpenseMembers {
  userId: string;         // Benutzer, dem der Anteil gehört
  amountToPay: number;    // Betrag, den dieses Mitglied zu zahlen hat
  products: Products[];  // Optional: Produkte, die diesem Mitglied zugeordnet sind
}
