import { Expenses } from './Expenses';
import { Members } from './Members';

export interface Transactions {
  from: string;
  to: string;
  amount: number;
  reason: string;
  date: string;
}

