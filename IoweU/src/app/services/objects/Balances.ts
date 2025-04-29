import { Expenses } from './Expenses';
import { Members } from './Members';
import { Groups } from './Groups';

export interface Balances {
  groupId: string;
  fromMemberId: string;
  sumFrom: number;
  toMemberId: string;
  sumTo: number;
  amount: number;
  lastUpdated: string;
  relatedExpenseId: string[];
}
