import { Expenses } from './Expenses';
import { Members } from './Members';

export interface Transactions {
  transactionId?: string;
  from: string;
  to: string;
  amount: number;
  reason: string;
  date: string;
  relatedExpenses: string[];
  isSettlement: boolean;
}

