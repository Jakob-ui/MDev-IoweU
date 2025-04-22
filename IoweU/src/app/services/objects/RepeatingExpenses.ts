import { Products } from './Products';
import { ExpenseMember } from './ExpenseMember';

export interface RepeatingExpenses {
  expenseId: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  date: string;
  lastEdit: string;
  currency: string[];
  category?: string;
  invoice?: string;
  repeat: string;
  splitType: 'prozent' | 'anteile' | 'produkte';
  splitBy: 'alle' | 'frei';
  expenseMember: ExpenseMember[];
}
