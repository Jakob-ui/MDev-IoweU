import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';

export interface Products {
  productId: string;
  memberId: string;
  name: string; // Name des Produkts
  quantity: number; // Menge des Produkts
  unit: string; // Einheit des Produkts (z.B. "kg", "Stück")
  price: number; // Preis des Produkts
}
