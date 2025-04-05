import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';
import { GroupMemberships } from './GroupMemberships';
export interface Products {
  memberId: string; // ID des Mitglieds, das dieses Produkt gekauft hat
  name: string; // Name des Produkts
  quantity: number; // Menge des Produkts
  unit: string; // Einheit des Produkts (z.B. "kg", "Stück")
  price: number; // Preis des Produkts
}
