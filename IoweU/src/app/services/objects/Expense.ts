import { Users } from './User';
import { Group } from './Group';
import { Product } from './Product';
export interface Expense {
  id: number;
  expense: string;
  totalAmount: number;
  amountToPay: number;
  paidBy: string;
  date: string;
  products: Product[];
}
