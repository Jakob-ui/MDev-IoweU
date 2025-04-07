import { Users } from './Users';
import { Groups } from './Groups';
import { Products } from './Products';
import { Members } from './Members';
import { ExpenseMember } from './ExpenseMember';

export interface Expenses {
  id: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  date: string;
  currency: string;
  category?: string;
  invoice?: string;
  repeat?: string;
  splitBy?: 'alle' | 'frei';
  splitType?: 'prozent' | 'produkte';
  members: ExpenseMember[];
  products: Products[];
}
