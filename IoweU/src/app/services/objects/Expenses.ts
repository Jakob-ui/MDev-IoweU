import { Products } from './Products';
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
  members?: ExpenseMember[];
}
