import { User } from './User';
import { Group } from './Group';
import { Expense } from './Expense';
export interface Product {
  member: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}
