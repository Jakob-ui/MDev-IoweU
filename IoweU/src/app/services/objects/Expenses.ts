import { ExpenseMember } from './ExpenseMember';

export interface Expenses {
  expenseId: string;
  description: string;
  totalAmount: number;
  totalAmountInForeignCurrency?: number;
  exchangeRate?: number;
  paidBy: string;
  date: string;
  currency: string[];
  category?: string;
  invoice?: string;
  repeat: string;
  splitType: 'prozent' | 'anteile' | 'produkte';
  splitBy: 'alle' | 'frei';
  expenseMember: ExpenseMember[];
}